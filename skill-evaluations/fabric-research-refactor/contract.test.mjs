import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const profile = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
assert.equal(profile, '/home/balauru/.pi-profiles/fabric');
process.env.PI_CODING_AGENT_DIR = profile;
const skill = resolve(profile, 'skills/fabric-research');
const entry = resolve(skill, 'SKILL.md');
const integration = resolve(skill, 'references/last30days.md');
const read = path => readFileSync(path, 'utf8');
const within = (root, path) => path === root || path.startsWith(root + sep);

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(item => {
    const path = resolve(dir, item.name);
    assert.ok(!item.isSymbolicLink(), `Unexpected skill-owned symlink: ${path}`);
    return item.isDirectory() ? filesUnder(path) : [path];
  });
}

// Import the public SDK only after selecting the profile. Never load defaults.
test('public Pi loader discovers one explicit-only skill without target diagnostics', async () => {
  const packageDir = resolve(profile, 'npm/node_modules/@earendil-works/pi-coding-agent');
  const manifest = JSON.parse(read(resolve(packageDir, 'package.json')));
  const publicEntry = manifest.exports['.'].import;
  assert.equal(typeof publicEntry, 'string');
  const { loadSkills, loadSkillsFromDir, formatSkillsForPrompt } =
    await import(pathToFileURL(resolve(packageDir, publicEntry)));
  const loaded = loadSkills({
    cwd: profile, agentDir: profile, skillPaths: [skill], includeDefaults: false,
  });
  assert.deepEqual(loaded.diagnostics, []);
  assert.equal(loaded.skills.length, 1);
  const [found] = loaded.skills;
  assert.equal(found.name, 'fabric-research');
  assert.equal(found.filePath, entry);
  assert.equal(found.disableModelInvocation, true);
  assert.equal(formatSkillsForPrompt(loaded.skills).trim(), '');

  const catalog = loadSkillsFromDir({ dir: resolve(profile, 'skills'), source: 'active-profile' });
  const matches = catalog.skills.filter(item => item.name === found.name);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].filePath, entry);
  assert.equal(matches[0].disableModelInvocation, true);
  const targetDiagnostics = catalog.diagnostics.filter(diagnostic =>
    diagnostic.collision?.name === found.name ||
    [diagnostic.path, diagnostic.collision?.winnerPath, diagnostic.collision?.loserPath]
      .some(path => path && within(skill, resolve(path))));
  assert.deepEqual(targetDiagnostics, []);
});

test('current skill-owned Markdown links resolve, including last30days dependencies', () => {
  assert.ok(statSync(entry).isFile());
  assert.ok(statSync(integration).isFile());
  const targets = new Set();
  for (const path of filesUnder(skill).filter(path => extname(path) === '.md')) {
    // Current docs use inline Markdown links. Do not traverse the linked engine's docs.
    for (const [, href] of read(path).matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
      if (/^[a-z][a-z\d+.-]*:|^#|^\/\//i.test(href)) continue;
      const target = resolve(dirname(path), decodeURIComponent(href.split('#')[0]));
      assert.ok(within(profile, target), `Link leaves the authorized profile: ${href}`);
      assert.ok(existsSync(target), `Broken link in ${path}: ${href}`);
      targets.add(target);
    }
  }
  for (const target of [integration,
    resolve(profile, 'skills/last30days/skills/last30days/SKILL.md'),
    resolve(profile, 'skills/last30days/docs/reference/json-export.md')]) {
    assert.ok(targets.has(target), `Missing integration link: ${target}`);
    assert.ok(statSync(target).isFile());
  }
});

test('current direct TS example compiles with Fabric and performs only a mocked search', async () => {
  const { typeCheckFabricCode } = await import(
    '../../npm/node_modules/pi-fabric/dist/runtime/type-checker.js');
  const { guestTypeDeclarations } = await import(
    '../../npm/node_modules/pi-fabric/dist/runtime/guest-types.js');
  const examples = [...read(entry).matchAll(/^```(?:ts|typescript)\s*\n([\s\S]*?)^```/gm)]
    .map(match => match[1]);
  assert.ok(examples.length > 0, 'Missing direct TypeScript example');
  for (const code of examples) {
    const checked = typeCheckFabricCode(code, guestTypeDeclarations(true));
    assert.deepEqual(checked.errors, []);
    assert.equal(typeof checked.javascript, 'string');
    const calls = [];
    const query = 'HTTP conditional request If-None-Match semantics';
    const response = Object.freeze({ content: [], text: 'mock search result', isError: false,
      source: { path: 'mock', source: 'fixture', scope: 'test', origin: 'fixture' } });
    const extensions = new Proxy(Object.create(null), {
      get(_target, name) {
        assert.equal(name, 'web_search', `Unexpected extension: ${String(name)}`);
        return async args => { calls.push(args); return response; };
      },
    });
    // Execute the compiler's actual wrapper, not a copied example or a research runner.
    // No agents, generic dispatch, process, browser, network or filesystem API is supplied.
    const result = await runInNewContext(`${checked.javascript}\n__piFabricMain();`, {
      extensions, π: Object.freeze({ query }),
    }, { timeout: 1000 });
    assert.equal(result, response);
    // Normalize the VM realm's object prototype, retaining all supplied argument keys.
    assert.deepEqual(calls.map(args => ({ ...args })), [{ query, workflow: 'none' }]);
  }
});

test('no skill-owned program, legacy links, temporal fields or mandatory accounting contract', () => {
  const obsolete = [
    'scripts/workflow-program.js', 'references/workflow-program.md',
    'references/stream-contracts.md', 'references/synthesis-and-reporting.md',
  ];
  for (const path of obsolete) assert.ok(!existsSync(resolve(skill, path)), `Obsolete file: ${path}`);
  const executable = /\.(?:[cm]?[jt]sx?|py|sh|bash|zsh|fish|ps1|rb|pl|lua|wasm|exe)$/i;
  for (const path of filesUnder(skill)) {
    assert.ok(!executable.test(path), `Skill-owned executable source: ${path}`);
    assert.equal(statSync(path).mode & 0o111, 0, `Executable file: ${path}`);
    const text = read(path);
    assert.doesNotMatch(text, /^#!/, path);
    if (extname(path) !== '.md') continue;
    assert.doesNotMatch(text, /\b(?:workflow-program\.(?:js|md)|stream-contracts\.md|synthesis-and-reporting\.md)\b/i, path);
    // Removed research-owned identifiers, not validation of dates or native telemetry.
    assert.doesNotMatch(text, /\b(?:runStartedAtUTC|requestedAsOfUTC|retrievedAtUTC|publishedOrRevisedAt|effectiveAt|temporalMode|temporalStatus|researchReceipt)\b/i, path);
    // Lexical regression guard for obligations, not a semantic policy enforcement test.
    assert.doesNotMatch(text, /\b(?:must|requires?|required|mandatory|always|every (?:run|answer|task))\b[^.!?\n]*\b(?:manifests?|receipts?)\b|\b(?:manifests?|receipts?)\b[^.!?\n]*\b(?:must|required|mandatory)\b/i, path);
  }
});
