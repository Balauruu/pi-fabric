import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ArborApplication } from "../src/application/ArborApplication.js";
import { FixtureCleanupAdapter, FixtureEvaluator, FixtureWorkspaceManager, ScriptedFixtureAgent, type FixtureTrialPlan } from "../src/fixtures/adapters.js";
import { InMemoryRunStore } from "../src/persistence/InMemoryRunStore.js";
import { FileReportPublisher } from "../src/reports/FileReportPublisher.js";
import { DeterministicIdFactory, ManualClock } from "../src/util/clock.js";

export async function makeFixtureApplication(plan: FixtureTrialPlan = {}) {
  const root = await mkdtemp(join(tmpdir(), "arbor-test-"));
  const store = new InMemoryRunStore();
  const clock = new ManualClock();
  const ids = new DeterministicIdFactory();
  const workspace = new FixtureWorkspaceManager();
  const agent = new ScriptedFixtureAgent();
  const evaluator = new FixtureEvaluator(ids, plan);
  const cleanup = new FixtureCleanupAdapter();
  const reportPublisher = await FileReportPublisher.open(join(root, "reports", "run_fixture"));
  const application = new ArborApplication({ store, workspace, agent, evaluator, cleanup, reportPublisher, clock, ids, gitOidLength: 40, executionMode: "fixture" });
  return { root, store, clock, ids, workspace, agent, evaluator, cleanup, reportPublisher, application };
}

export function errorCode(expected: string) {
  return (error: unknown): boolean => Boolean(error && typeof error === "object" && "code" in error && (error as { code: string }).code === expected);
}
