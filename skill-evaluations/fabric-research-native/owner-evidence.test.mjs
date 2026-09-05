import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import test from 'node:test';
const here = new URL('./', import.meta.url);
const load = name => JSON.parse(readFileSync(new URL(name, here), 'utf8'));
const owner = load('coordinator-owner-trace.json');
const searchEntries = load('search-native-entry.json');
const receipt = load('live-canonical-receipt.json');
const starts = new Map(owner.starts.map(entry => [entry.toolCallId, entry]));
const direct = owner.ends.filter(entry => {
  const name = starts.get(entry.toolCallId)?.args.display?.name;
  return ['Direct research: configured search', 'Direct verification and fresh ordinary startup', 'Verify decisive passage and failure recovery'].includes(name);
});
const calls = owner.ends.flatMap(entry => (entry.result.details.trace?.operations ?? []).filter(op => op.type === 'call').map(op => ({ ...op, outer: entry.toolCallId, milestone: starts.get(entry.toolCallId)?.args.display?.name })));
const audits = owner.ends.flatMap(entry => (entry.result.details.audits ?? []).map(audit => ({ ...audit, outer: entry.toolCallId })));
const browserCalls = calls.filter(op => /browser|betterwright|playwright|puppeteer|curator/i.test(op.ref));
const canonical = owner.ends.find(entry => entry.result.details.phases?.includes('Research'));
const nativeSearch = searchEntries.find(event => event.entry?.customType === 'web-search-results' && event.entry.data.id === 'mtocuw8c11xs6l');

test('complete owner-held tool starts and ends reconcile to 60 native calls', () => {
  assert.equal(owner.complete, true);
  assert.equal(owner.starts.length, 60);
  assert.equal(owner.ends.length, 60);
  assert.equal(starts.size, 60);
  assert.deepEqual(new Set(owner.ends.map(entry => entry.toolCallId)), new Set(starts.keys()));
  for (const end of owner.ends) {
    assert.ok(end.result.details.trace, `missing finalized trace: ${end.toolCallId}`);
    assert.equal(end.result.details.trace.counts.droppedOperations, 0);
  }
  // The three oversized API lines were redundant agent_end/progress snapshots, not starts/ends.
  assert.equal(owner.skipped.length, 3);
  assert.ok(owner.skipped.every(entry => /agent_end|tool_execution_update/.test(entry.preview)));
});

test('direct research invokes four existing tools and no native children or browser calls', () => {
  assert.equal(direct.length, 3);
  const ops = direct.flatMap(entry => entry.result.details.trace.operations);
  const refs = new Set(ops.map(op => op.ref));
  for (const ref of ['extensions.web_search', 'extensions.fetch_content', 'extensions.get_search_content', 'extensions.source_check']) assert.ok(refs.has(ref));
  assert.ok(!ops.some(op => op.ref?.startsWith('agents.')));
  assert.ok(!ops.some(op => /browser|betterwright|curator/i.test(op.ref ?? '')));
  const search = audits.find(audit => audit.ref === 'extensions.web_search');
  assert.equal(search.success, true);
  assert.equal(search.args.workflow, 'none');
  assert.ok(!('provider' in search.args));
  assert.ok(!('model' in search.args));
});

test('ordinary search selected Exa in its authoritative native result entry', () => {
  assert.ok(nativeSearch);
  assert.equal(nativeSearch.entry.data.queries[0].provider, 'exa');
  assert.equal(nativeSearch.entry.data.queries[0].error, null);
  assert.equal(nativeSearch.entry.data.queries[0].results[0].url, 'https://www.iana.org/help/example-domains');
});

test('real native phases, parallelism, items and budget refusal are retained', () => {
  assert.deepEqual(canonical.result.details.phases, ['Preflight', 'Research', 'Account']);
  const ops = canonical.result.details.trace.operations;
  assert.ok(ops.some(op => op.ref === 'fabric.workflow.configure' && op.outcome === 'succeeded'));
  assert.ok(ops.some(op => op.ref === 'fabric.workflow.parallel' && op.args.itemCount === 3 && op.args.concurrency === 2));
  assert.equal(ops.filter(op => op.ref === 'agents.run' && op.outcome === 'succeeded').length, 2);
  assert.equal(ops.filter(op => op.ref === 'agents.run' && op.outcome === 'failed' && /budget exhausted/.test(op.error)).length, 1);
  assert.equal(ops.filter(op => op.ref === 'fabric.workflow.item' && op.args.status === 'completed').length, 2);
  assert.ok(ops.some(op => op.ref === 'fabric.workflow.event' && op.outcome === 'succeeded'));
});

test('sole coordinator browser invocation is the separate non-research acceptance probe', () => {
  assert.equal(browserCalls.length, 1);
  assert.equal(browserCalls[0].ref, 'extensions.browser');
  assert.equal(browserCalls[0].milestone, 'NON-RESEARCH ordinary BetterWright probe');
  const researchOps = calls.filter(op => op.outer !== browserCalls[0].outer);
  assert.ok(!researchOps.some(op => /browser|betterwright|playwright|puppeteer|curator/i.test(op.ref)));
  // The explained /proc/1111/environ PermissionError belongs to startup profile inspection,
  // before the recorded direct route. It is not research recovery or browser denial.
  const researchOuterIds = new Set([...direct.map(entry => entry.toolCallId), canonical.toolCallId]);
  const actualResearchOps = researchOps.filter(op => researchOuterIds.has(op.outer));
  assert.ok(!actualResearchOps.some(op => op.outcome === 'failed' && /browser|qa[- ]|research[- ]latch|denied/i.test(op.error ?? '')));
  const unrelatedPermissionError = researchOps.filter(op => op.outcome === 'failed' && /Permission denied/.test(op.error ?? ''));
  assert.equal(unrelatedPermissionError.length, 1);
  assert.equal(unrelatedPermissionError[0].ref, 'pi.bash');
  assert.equal(unrelatedPermissionError[0].milestone, 'Verify parent inheritance before dispatch');
  assert.match(unrelatedPermissionError[0].error, /\/proc\/1111\/environ/);
  assert.ok(!researchOuterIds.has(unrelatedPermissionError[0].outer));
});

writeFileSync(new URL('owner-trace-summary.json', here), JSON.stringify({
  source: 'agents.log owner-held finalized traces; 426 paginated API reads, no session-file scraping',
  coordinator: owner.id,
  completeToolStarts: owner.starts.length,
  completeToolEnds: owner.ends.length,
  finalizedTracesDroppedOperations: owner.ends.reduce((n, end) => n + end.result.details.trace.counts.droppedOperations, 0),
  oversizedRedundantSnapshotsSkipped: owner.skipped.map(({ offset, originalChars }) => ({ offset, originalChars })),
  direct: { outerCalls: direct.length, childDispatches: 0, browserInvocations: 0, responseId: nativeSearch.entry.data.id, selectedProvider: nativeSearch.entry.data.queries[0].provider, searchModel: 'not exposed by Exa search; no model override or model-completion attribution claimed' },
  canonical: { phases: canonical.result.details.phases, operations: canonical.result.details.trace.operations },
  researchBrowserInvocations: 0,
  separateNonResearchBrowserInvocations: browserCalls,
  allActualCallRefs: [...new Set(calls.map(op => op.ref))],
}, null, 2) + '\n');
