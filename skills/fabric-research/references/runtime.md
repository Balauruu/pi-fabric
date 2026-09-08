# Runtime

This reference defines the substantive workflow's single interface, shared execution profile, orchestration, persistence ownership, state transitions, and final outcome. Read [researcher](researcher.md), [synthesizer](synthesizer.md), and [last30days integration](last30days.md) completely, then place their request constants and factories between the shared-contract and orchestration blocks below. Do not read or invoke another advanced Fabric skill.

## Invocation interface

Main frames one `ResearchPlan`, serializes it as the named top-level payload `plan`, and runs one TypeScript `fabric_exec` program. Set top-level `agentBudget` to `plan.streams.length + 1`. If `plan.limits.tokenBudget` is present, pass the same value as top-level `tokenBudget`. The guest can inspect the token budget but cannot inspect the top-level agent-call cap, so Main must reject an insufficient requested agent budget before invoking `fabric_exec`.

```ts
payloads: { plan: JSON.stringify(plan) },
agentBudget: plan.streams.length + 1,
...(plan.limits.tokenBudget !== undefined
  ? { tokenBudget: plan.limits.tokenBudget }
  : {}),
```

## Shared contracts and single execution-profile owner

```ts
type ResearchExecutionProfile = {
  runner: "pi";
  model: string;
  thinking: "medium";
  extensions: true;
  recursive: false;
};

const EXECUTION_PROFILE: ResearchExecutionProfile = {
  runner: "pi",
  model: "openai-codex/gpt-5.6-terra",
  thinking: "medium",
  extensions: true,
  recursive: false,
};

const RUN_ROOT = "/home/balauru/.pi-profiles/fabric/runs";

type ResearchQuestionStatus = "supported" | "qualified" | "unknown" | "blocked";
type ResearchOutcome = "complete" | "partial" | "blocked";
type StreamState = "returned" | "failed" | "unavailable";

type ResearchQuestion = {
  id: string;
  text: string;
};

type StreamAssignment = {
  id: string;
  kind: "web" | "recent-discussion";
  uncertainty: string;
  questions: ResearchQuestion[];
  requiredInclusions: string[];
  contribution: string;
  knownSources: string[];
  methodRequirements: string[];
  resourceBudget: string;
};

type ResearchPlan = {
  version: 1;
  question: string;
  intendedUse: string;
  scope: {
    included: string[];
    excluded: string[];
    asOf: string;
    timeHorizon: string;
  };
  assumptions: string[];
  requestedForm: "focused" | "comparative" | "decision-grade";
  persistence: "persisted" | "inline";
  streams: StreamAssignment[];
  limits: {
    maxConcurrent: number;
    tokenBudget?: number;
  };
};

type ResearchNote = {
  streamId: string;
  noteMarkdown: string;
  questionCoverage: Array<{
    questionId: string;
    status: ResearchQuestionStatus;
    explanation: string;
  }>;
  sources: Array<{
    title: string;
    url: string;
    sourceType: "primary" | "secondary" | "local";
    date?: string;
    locator?: string;
    supportsQuestionIds: string[];
  }>;
  limitations: string[];
  stopReason: "saturation" | "access" | "budget";
};

type SynthesisInput = {
  plan: ResearchPlan;
  streams: Array<{
    assignment: StreamAssignment;
    state: StreamState;
    agentId?: string;
    note?: ResearchNote;
    partialText?: string;
    error?: string;
    path?: string;
    storageError?: string;
  }>;
};

type SynthesisResult = {
  reportMarkdown: string;
  conclusion: string;
  questionCoverage: Array<{
    questionId: string;
    status: ResearchQuestionStatus;
    materialGap: boolean;
    explanation: string;
  }>;
  retainedSourceUrls: string[];
  materialLimitations: string[];
};

type ResearchRunResult = {
  outcome: ResearchOutcome;
  question: string;
  coverage: {
    streams: {
      planned: number;
      returned: number;
      failed: number;
      unavailable: number;
    };
    questions: Array<{
      id: string;
      status: ResearchQuestionStatus;
      materialGap: boolean;
      explanation: string;
    }>;
  };
  report:
    | { mode: "saved"; path: string }
    | { mode: "inline"; markdown: string }
    | null;
  conclusion: string | null;
  retainedSourceUrls: string[];
  materialLimitations: string[];
  streams: Array<{
    id: string;
    state: StreamState;
    agentId?: string;
    path?: string;
    hasEvidence: boolean;
    error?: string;
  }>;
  fallbackNotes?: Array<{
    streamId: string;
    markdown: string;
  }>;
};

type StreamExecution = {
  assignment: StreamAssignment;
  state: StreamState;
  agentId?: string;
  note?: ResearchNote;
  partialText?: string;
  path?: string;
  error?: string;
  storageError?: string;
};
```

`EXECUTION_PROFILE` is the only definition of runner, model, thinking level, extension inheritance, and recursion policy. Each role reference owns its tool grant exactly once.

## Canonical orchestration

Use the preceding shared block, followed by the constants and factories from the three linked role references, followed by this block. This is the complete control flow. Adapt only the already-framed `ResearchPlan`; do not add stages or retries.

```ts
const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const nonempty = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
};

const stringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be an array of strings`);
  }
  return value.map((item) => nonempty(item, label));
};

const validatePlan = (candidate: ResearchPlan): ResearchPlan => {
  if (!candidate || typeof candidate !== "object" || candidate.version !== 1) {
    throw new Error("plan.version must be 1");
  }
  nonempty(candidate.question, "plan.question");
  nonempty(candidate.intendedUse, "plan.intendedUse");
  if (!candidate.scope || typeof candidate.scope !== "object") {
    throw new Error("plan.scope is required");
  }
  stringArray(candidate.scope.included, "plan.scope.included");
  stringArray(candidate.scope.excluded, "plan.scope.excluded");
  nonempty(candidate.scope.asOf, "plan.scope.asOf");
  nonempty(candidate.scope.timeHorizon, "plan.scope.timeHorizon");
  stringArray(candidate.assumptions, "plan.assumptions");
  if (!["focused", "comparative", "decision-grade"].includes(candidate.requestedForm)) {
    throw new Error("plan.requestedForm is invalid");
  }
  if (!["persisted", "inline"].includes(candidate.persistence)) {
    throw new Error("plan.persistence is invalid");
  }
  if (!Array.isArray(candidate.streams) || candidate.streams.length === 0) {
    throw new Error("plan.streams must contain at least one stream");
  }
  if (candidate.streams.length > 32) {
    throw new Error("plan.streams exceeds the hard safety cap of 32");
  }
  const questionIds = new Set<string>();
  candidate.streams.forEach((stream, index) => {
    const expectedId = `s${index + 1}`;
    if (stream.id !== expectedId) {
      throw new Error(`stream ${index + 1} must have immutable id ${expectedId}`);
    }
    if (!["web", "recent-discussion"].includes(stream.kind)) {
      throw new Error(`${stream.id}.kind is invalid`);
    }
    nonempty(stream.uncertainty, `${stream.id}.uncertainty`);
    nonempty(stream.contribution, `${stream.id}.contribution`);
    nonempty(stream.resourceBudget, `${stream.id}.resourceBudget`);
    stringArray(stream.requiredInclusions, `${stream.id}.requiredInclusions`);
    stringArray(stream.knownSources, `${stream.id}.knownSources`);
    stringArray(stream.methodRequirements, `${stream.id}.methodRequirements`);
    if (!Array.isArray(stream.questions) || stream.questions.length === 0) {
      throw new Error(`${stream.id}.questions must not be empty`);
    }
    stream.questions.forEach((question) => {
      const id = nonempty(question.id, `${stream.id}.question.id`);
      nonempty(question.text, `${stream.id}.${id}.text`);
      if (questionIds.has(id)) throw new Error(`duplicate question id ${id}`);
      questionIds.add(id);
    });
  });
  if (!candidate.limits || !Number.isSafeInteger(candidate.limits.maxConcurrent)) {
    throw new Error("plan.limits.maxConcurrent must be a safe integer");
  }
  if (candidate.limits.maxConcurrent < 1 || candidate.limits.maxConcurrent > 4) {
    throw new Error("plan.limits.maxConcurrent must be between 1 and 4");
  }
  if (
    candidate.limits.tokenBudget !== undefined &&
    (!Number.isFinite(candidate.limits.tokenBudget) || candidate.limits.tokenBudget <= 0)
  ) {
    throw new Error("plan.limits.tokenBudget must be a positive finite number");
  }
  return candidate;
};

const emptyStreamCounts = (planned: number) => ({
  planned,
  returned: 0,
  failed: 0,
  unavailable: planned,
});

const blockedResult = (
  question: string,
  limitation: string,
  assignments: readonly StreamAssignment[] = [],
): ResearchRunResult => ({
  outcome: "blocked",
  question,
  coverage: { streams: emptyStreamCounts(assignments.length), questions: [] },
  report: null,
  conclusion: null,
  retainedSourceUrls: [],
  materialLimitations: [limitation],
  streams: assignments.map((stream) => ({
    id: stream.id,
    state: "unavailable",
    hasEvidence: false,
    error: limitation,
  })),
});

let plan: ResearchPlan;
try {
  plan = validatePlan(JSON.parse(π.plan) as ResearchPlan);
} catch (error) {
  return blockedResult("Invalid research plan", errorText(error));
}

await workflow.configure({
  name: "Fabric research",
  description: `${plan.streams.length} bounded stream(s), one synthesis attempt`,
});
await phase("Preflight", { total: 1 });

const preflightErrors: string[] = [];
try {
  const models = await tools.models();
  if (!models.some((model) => model.key === EXECUTION_PROFILE.model)) {
    preflightErrors.push(`required model unavailable: ${EXECUTION_PROFILE.model}`);
  }
} catch (error) {
  preflightErrors.push(`model registry unavailable: ${errorText(error)}`);
}

const roleTools = [
  ...RESEARCH_TOOLS,
  ...SYNTHESIS_TOOLS,
  ...(plan.streams.some(
    (stream) => stream.kind === "recent-discussion" && plan.persistence === "persisted",
  )
    ? DISCUSSION_TOOLS
    : []),
];
const coreTools = new Set(["read", "grep", "find", "ls", "bash", "edit", "write"]);
const extensionRefs = [...new Set(roleTools)]
  .filter((name) => !coreTools.has(name))
  .map((name) => `extensions.${name}`)
  .sort();
await Promise.all(
  extensionRefs.map(async (ref) => {
    try {
      await tools.describe({ ref });
    } catch (error) {
      preflightErrors.push(`required action unavailable: ${ref}: ${errorText(error)}`);
    }
  }),
);
if (
  plan.limits.tokenBudget !== undefined &&
  workflow.budget.total !== plan.limits.tokenBudget
) {
  preflightErrors.push(
    `top-level tokenBudget must equal plan.limits.tokenBudget (${plan.limits.tokenBudget})`,
  );
}
if (preflightErrors.length > 0) {
  preflightErrors.sort();
  return blockedResult(plan.question, preflightErrors.join("; "), plan.streams);
}
await workflow.event({ message: "Model and tool preflight passed", level: "success" });

const shellQuote = (value: string): string =>
  "'" + value.replace(/'/g, "'\"'\"'") + "'";

const topicSlug = (question: string): string => {
  const ascii = question.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");
  return ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "topic";
};

const reserveRunDirectory = async (question: string): Promise<string> => {
  const rootReady = await pi.bash({
    command: `mkdir -p -- ${shellQuote(RUN_ROOT)}`,
    settle: true,
  });
  if (!rootReady.ok) throw new Error(`cannot prepare run root: ${rootReady.error}`);

  const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
  const slug = topicSlug(question);
  for (let suffix = 0; suffix <= 9999; suffix += 1) {
    const leaf = `${timestamp}-research-${slug}${suffix === 0 ? "" : `-${suffix}`}`;
    const candidate = `${RUN_ROOT}/${leaf}`;
    const reserved = await pi.bash({
      command: `mkdir -- ${shellQuote(candidate)}`,
      settle: true,
    });
    if (reserved.ok) {
      const streamsReady = await pi.bash({
        command: `mkdir -- ${shellQuote(`${candidate}/streams`)}`,
        settle: true,
      });
      if (!streamsReady.ok) {
        throw new Error(`reserved ${candidate}, but streams directory failed: ${streamsReady.error}`);
      }
      return candidate;
    }
    const exists = await pi.bash({
      command: `test -e ${shellQuote(candidate)}`,
      settle: true,
    });
    if (!exists.ok) {
      throw new Error(`cannot reserve ${candidate}: ${reserved.error}`);
    }
  }
  throw new Error("could not reserve a unique research directory after 10,000 candidates");
};

let runDirectory: string | undefined;
if (plan.persistence === "persisted") {
  await phase("Reserve artifacts", { total: 1 });
  try {
    runDirectory = await reserveRunDirectory(plan.question);
  } catch (error) {
    return blockedResult(plan.question, errorText(error), plan.streams);
  }
}

const isResearchNote = (
  value: unknown,
  stream: StreamAssignment,
): value is ResearchNote => {
  if (!value || typeof value !== "object") return false;
  const note = value as ResearchNote;
  if (
    note.streamId !== stream.id ||
    typeof note.noteMarkdown !== "string" ||
    note.noteMarkdown.trim().length === 0 ||
    !Array.isArray(note.questionCoverage) ||
    !Array.isArray(note.sources) ||
    !Array.isArray(note.limitations)
  ) return false;
  const expectedIds = stream.questions.map((question) => question.id).sort();
  const returnedIds = note.questionCoverage.map((entry) => entry.questionId).sort();
  if (
    returnedIds.length !== expectedIds.length ||
    returnedIds.some((id, index) => id !== expectedIds[index])
  ) return false;
  const expected = new Set(expectedIds);
  return note.sources.every((source) =>
    source.supportsQuestionIds.every((id) => expected.has(id)),
  );
};

const executeStream = async (stream: StreamAssignment): Promise<StreamExecution> => {
  try {
    const request =
      stream.kind === "recent-discussion" && plan.persistence === "persisted"
        ? makeDiscussionRequest(
            EXECUTION_PROFILE,
            plan,
            stream,
            `${runDirectory!}/support/last30days-${stream.id}`,
          )
        : makeResearcherRequest(EXECUTION_PROFILE, plan, stream);
    const result = await agents.run(request);
    const note = isResearchNote(result.value, stream) ? result.value : undefined;
    const partialText = typeof result.text === "string" && result.text.trim().length > 0
      ? result.text.trim()
      : undefined;
    if (result.status === "completed" && note) {
      return {
        assignment: stream,
        state: "returned",
        agentId: result.id,
        note,
      };
    }
    return {
      assignment: stream,
      state: "failed",
      agentId: result.id,
      ...(note ? { note } : {}),
      ...(!note && partialText ? { partialText } : {}),
      error: result.error ||
        (result.status === "completed"
          ? "completed worker returned an invalid or mismatched structured note"
          : `worker ended with status ${result.status}`),
    };
  } catch (error) {
    return {
      assignment: stream,
      state: "failed",
      error: errorText(error),
    };
  }
};

await phase("Research", { total: plan.streams.length });
const concurrency = Math.min(plan.streams.length, plan.limits.maxConcurrent, 4);
const executions = await parallel(
  plan.streams.map((stream) => async () => executeStream(stream)),
  { concurrency },
);

if (runDirectory) {
  await phase("Save stream notes", { total: executions.length });
  for (const execution of executions) {
    const markdown = execution.note?.noteMarkdown || execution.partialText;
    if (!markdown) continue;
    const path = `${runDirectory}/streams/${execution.assignment.id}.md`;
    try {
      const saved = await pi.write({ path, content: markdown });
      if (!saved.ok) throw new Error(saved.output);
      execution.path = path;
    } catch (error) {
      execution.storageError = errorText(error);
    }
  }
}

const hasEvidence = (execution: StreamExecution): boolean =>
  Boolean(execution.note?.noteMarkdown.trim() || execution.partialText?.trim());

const summarizeStreams = (items: readonly StreamExecution[]) =>
  items.map((execution) => ({
    id: execution.assignment.id,
    state: execution.state,
    ...(execution.agentId ? { agentId: execution.agentId } : {}),
    ...(execution.path ? { path: execution.path } : {}),
    hasEvidence: hasEvidence(execution),
    ...(execution.error ? { error: execution.error } : {}),
  }));

const streamCounts = (items: readonly StreamExecution[]) => ({
  planned: items.length,
  returned: items.filter((item) => item.state === "returned").length,
  failed: items.filter((item) => item.state === "failed").length,
  unavailable: items.filter((item) => item.state === "unavailable").length,
});

const fallbackCoverage = (
  currentPlan: ResearchPlan,
  items: readonly StreamExecution[],
): ResearchRunResult["coverage"]["questions"] => {
  const rank: Record<ResearchQuestionStatus, number> = {
    blocked: 0,
    unknown: 1,
    qualified: 2,
    supported: 3,
  };
  return currentPlan.streams.flatMap((stream) => stream.questions).map((question) => {
    const candidates = items.flatMap((item) =>
      item.note?.questionCoverage.filter((entry) => entry.questionId === question.id) || [],
    );
    const best = candidates.sort((a, b) => rank[b.status] - rank[a.status])[0];
    const status: ResearchQuestionStatus = best?.status || "blocked";
    return {
      id: question.id,
      status,
      materialGap: status === "unknown" || status === "blocked",
      explanation: best?.explanation || "No usable evidence returned for this question.",
    };
  });
};

const useful = executions.filter(hasEvidence);
const storageErrors = executions
  .filter((item) => item.storageError)
  .map((item) => `${item.assignment.id} note was not saved: ${item.storageError}`);
const unsavedNotes = useful
  .filter((item) => !item.path)
  .map((item) => ({
    streamId: item.assignment.id,
    markdown: item.note?.noteMarkdown || item.partialText || "",
  }));

if (useful.length === 0) {
  await workflow.event({ message: "No stream returned useful evidence", level: "error" });
  return {
    outcome: "blocked",
    question: plan.question,
    coverage: {
      streams: streamCounts(executions),
      questions: fallbackCoverage(plan, executions),
    },
    report: null,
    conclusion: null,
    retainedSourceUrls: [],
    materialLimitations: [
      "No planned stream returned useful evidence.",
      ...executions.flatMap((item) => item.error ? [`${item.assignment.id}: ${item.error}`] : []),
      ...storageErrors,
    ],
    streams: summarizeStreams(executions),
  } satisfies ResearchRunResult;
}

await phase("Synthesize", { total: 1 });
const synthesisInput: SynthesisInput = {
  plan,
  streams: executions.map((execution) => ({
    assignment: execution.assignment,
    state: execution.state,
    ...(execution.agentId ? { agentId: execution.agentId } : {}),
    ...(execution.note ? { note: execution.note } : {}),
    ...(execution.partialText ? { partialText: execution.partialText } : {}),
    ...(execution.error ? { error: execution.error } : {}),
    ...(execution.path ? { path: execution.path } : {}),
    ...(execution.storageError ? { storageError: execution.storageError } : {}),
  })),
};

let synthesis: SynthesisResult | undefined;
let synthesisError: string | undefined;
try {
  const result = await agents.run(makeSynthesisRequest(EXECUTION_PROFILE, synthesisInput));
  const value = result.value as SynthesisResult | undefined;
  if (
    result.status === "completed" &&
    value &&
    typeof value.reportMarkdown === "string" &&
    value.reportMarkdown.trim().length > 0 &&
    typeof value.conclusion === "string" &&
    Array.isArray(value.questionCoverage) &&
    Array.isArray(value.retainedSourceUrls) &&
    Array.isArray(value.materialLimitations)
  ) {
    synthesis = value;
  } else {
    synthesisError = result.error || `synthesis ended with status ${result.status}`;
  }
} catch (error) {
  synthesisError = errorText(error);
}

if (!synthesis) {
  await workflow.event({ message: "Synthesis failed; returning surviving evidence", level: "warning" });
  return {
    outcome: "partial",
    question: plan.question,
    coverage: {
      streams: streamCounts(executions),
      questions: fallbackCoverage(plan, executions),
    },
    report: null,
    conclusion: null,
    retainedSourceUrls: [...new Set(
      executions.flatMap((item) => item.note?.sources.map((source) => source.url).filter(Boolean) || []),
    )],
    materialLimitations: [
      `Synthesis failed: ${synthesisError || "unknown error"}`,
      ...storageErrors,
    ],
    streams: summarizeStreams(executions),
    ...(unsavedNotes.length > 0 ? { fallbackNotes: unsavedNotes } : {}),
  } satisfies ResearchRunResult;
}

const requiredQuestionIds = plan.streams.flatMap((stream) =>
  stream.questions.map((question) => question.id),
);
const normalizedCoverage: ResearchRunResult["coverage"]["questions"] =
  requiredQuestionIds.map((id) => {
    const matches = synthesis.questionCoverage.filter((entry) => entry.questionId === id);
    if (matches.length !== 1) {
      return {
        id,
        status: "unknown",
        materialGap: true,
        explanation: matches.length === 0
          ? "The synthesizer omitted this required question."
          : "The synthesizer returned duplicate coverage for this required question.",
      };
    }
    const entry = matches[0];
    const forcedGap = entry.status === "unknown" || entry.status === "blocked";
    return {
      id,
      status: entry.status,
      materialGap: forcedGap || entry.materialGap,
      explanation: entry.explanation,
    };
  });

let report: ResearchRunResult["report"];
let reportStorageError: string | undefined;
if (plan.persistence === "inline") {
  report = { mode: "inline", markdown: synthesis.reportMarkdown };
} else {
  const reportPath = `${runDirectory!}/RESEARCH.md`;
  try {
    const saved = await pi.write({ path: reportPath, content: synthesis.reportMarkdown });
    if (!saved.ok) throw new Error(saved.output);
    report = { mode: "saved", path: reportPath };
  } catch (error) {
    reportStorageError = errorText(error);
    report = { mode: "inline", markdown: synthesis.reportMarkdown };
  }
}

const materialLimitations = [
  ...synthesis.materialLimitations,
  ...storageErrors,
  ...(reportStorageError ? [`Final report was not saved: ${reportStorageError}`] : []),
];
const hasMaterialGap = normalizedCoverage.some((entry) => entry.materialGap);
const persistenceFailed = storageErrors.length > 0 || Boolean(reportStorageError);
const outcome: ResearchOutcome = hasMaterialGap || persistenceFailed ? "partial" : "complete";

await workflow.event({
  message: outcome === "complete" ? "Research complete" : "Research completed with material limitations",
  level: outcome === "complete" ? "success" : "warning",
});
return {
  outcome,
  question: plan.question,
  coverage: {
    streams: streamCounts(executions),
    questions: normalizedCoverage,
  },
  report,
  conclusion: synthesis.conclusion,
  retainedSourceUrls: [...new Set(synthesis.retainedSourceUrls)],
  materialLimitations,
  streams: summarizeStreams(executions),
  ...(plan.persistence === "persisted" && unsavedNotes.length > 0
    ? { fallbackNotes: unsavedNotes }
    : {}),
} satisfies ResearchRunResult;
```

## State and outcome invariants

- A stream starts as planned outside the program, becomes running when dispatched, and ends once as `returned`, `failed`, or `unavailable`. No terminal state returns to running.
- A failed worker may still provide useful partial text. Preserve it as evidence but do not relabel the worker `returned`.
- Synthesis runs zero times when no useful evidence exists and exactly once otherwise.
- `blocked` means no synthesized report and no useful stream evidence can be delivered.
- `partial` means useful evidence or a report exists, but synthesis failed, a required question has a material gap, or required persistence failed.
- `complete` requires successful synthesis, no question with `materialGap: true`, and successful required persistence. A failed redundant stream does not force `partial` when every required question is adequately answered.
- A native success status, schema-valid object, or existing path alone never establishes completeness.
- Inline mode takes no filesystem branch. Persisted paths are reported only after successful outer-workflow writes.
