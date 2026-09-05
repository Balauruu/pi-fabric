#!/usr/bin/env node
// Public Pi loader and transitive documentation checks. No inference or builds.
import assert from 'node:assert/strict';
import {readFileSync, existsSync, statSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const profile = resolve(skill, '../..');
process.env.PI_CODING_AGENT_DIR = profile;
const packageDirectory = process.env.PI_SDK_PACKAGE ?? resolve(profile, 'npm/node_modules/@earendil-works/pi-coding-agent');
const manifest = JSON.parse(readFileSync(resolve(packageDirectory, 'package.json'), 'utf8'));
const publicEntry = manifest.exports['.'].import;
assert.equal(typeof publicEntry, 'string');
const {loadSkills, loadSkillsFromDir, formatSkillsForPrompt} = await import(pathToFileURL(resolve(packageDirectory, publicEntry)));
const loaded = loadSkills({cwd: profile, agentDir: profile, skillPaths: [skill], includeDefaults: false});
assert.deepEqual(loaded.diagnostics, []);
assert.equal(loaded.skills.length, 1);
assert.equal(loaded.skills[0].name, 'agent-benchmarking');
assert.equal(loaded.skills[0].filePath, resolve(skill, 'SKILL.md'));
assert.equal(loaded.skills[0].disableModelInvocation, false);
const catalog = loadSkillsFromDir({dir: resolve(profile, 'skills'), source: 'active-profile'});
assert.equal(catalog.skills.filter(s => s.name === 'agent-benchmarking').length, 1);
assert.ok(formatSkillsForPrompt(loaded.skills).includes(loaded.skills[0].filePath));
const visited = new Set();
const queue = [resolve(skill, 'SKILL.md')];
let links = 0;
while (queue.length) {
  const path = queue.shift();
  if (visited.has(path)) continue;
  visited.add(path);
  const text = readFileSync(path, 'utf8');
  for (const match of text.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const href = match[1];
    if (/^[a-z]+:|^#/i.test(href)) continue;
    const target = resolve(dirname(path), decodeURIComponent(href.split('#')[0]));
    assert.ok(existsSync(target), `Broken link in ${path}: ${href}`);
    links++;
    if (target.startsWith(skill + '/') && target.endsWith('.md') && statSync(target).isFile()) queue.push(target);
  }
}
const body = readFileSync(resolve(skill, 'SKILL.md'), 'utf8');
assert.ok(body.length < 6500, 'Normal instruction path should remain compact');
assert.ok(!/exact[- ]once|Requires Pi >=|Requires.*Fabric >=/.test(body));
console.log(JSON.stringify({status:'passed', discoveryCount:1, nativeDiagnostics:loaded.diagnostics, linkedMarkdownFiles:visited.size, checkedLinks:links, modelCalls:0}));
