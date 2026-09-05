import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { loadSkills, loadSkillsFromDir, formatSkillsForPrompt } from '/home/balauru/.local/share/pi-node/node-v22.23.1-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/skills.js';
import { AgentSession } from '/home/balauru/.local/share/pi-node/node-v22.23.1-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/agent-session.js';

const root = resolve('/home/balauru/.pi-profiles/fabric');
const dir = resolve(root, 'skills/create-fabric-skill');
const expectedPath = resolve(dir, 'SKILL.md');
const direct = loadSkillsFromDir({dir, source: 'user'});
assert.deepEqual(direct.diagnostics, []);
assert.equal(direct.skills.length, 1);
const [skill] = direct.skills;
assert.equal(skill.name, 'create-fabric-skill');
assert.equal(skill.filePath, expectedPath);
assert.equal(skill.disableModelInvocation, true);
assert.equal(formatSkillsForPrompt(direct.skills), '');
const profile = loadSkills({cwd: root, agentDir: root, skillPaths: [], includeDefaults: true});
const matches = profile.skills.filter(s => s.name === skill.name);
assert.equal(matches.length, 1);
assert.equal(matches[0].filePath, expectedPath);
assert.deepEqual(profile.diagnostics.filter(d => d.path === expectedPath || d.message.includes('create-fabric-skill')), []);
assert(!formatSkillsForPrompt(profile.skills).includes('create-fabric-skill'));

const body = readFileSync(expectedPath, 'utf8');
const sourceFiles = [expectedPath];
for (const match of body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
  const target = resolve(dirname(expectedPath), match[1]);
  assert(target.startsWith(`${dir}/`));
  assert(existsSync(target));
  assert(readFileSync(target, 'utf8').length > 0);
  sourceFiles.push(target);
}
assert.equal(sourceFiles.length, 2);
assert.deepEqual(readdirSync(dir).sort(), ['SKILL.md', 'references']);
assert.deepEqual(readdirSync(resolve(dir, 'references')), ['mechanism-selection.md']);
assert(!existsSync(resolve(root, 'prompts/create-fabric-skill.md')));

const errors = [];
const receiver = {
  resourceLoader: { getSkills: () => direct },
  _extensionRunner: { emitError: (error) => errors.push(error) },
};
const args = 'Adapt my architecture-review process';
const expanded = AgentSession.prototype._expandSkillCommand.call(receiver, `/skill:create-fabric-skill ${args}`);
assert(expanded.startsWith(`<skill name="create-fabric-skill" location="${expectedPath}">`));
assert(expanded.includes('## 1. Interview the preference frontier'));
assert(expanded.includes('## 4. Return the proposal and stop'));
assert(expanded.includes('references/mechanism-selection.md'));
assert(expanded.endsWith(`</skill>\n\n${args}`));
assert.deepEqual(errors, []);
for (const prompt of ['Explain Fabric workflows.', 'Create a normal component.', '/create-fabric-skill', '/skill:create-fabrc-skill']) {
  assert.equal(AgentSession.prototype._expandSkillCommand.call(receiver, prompt), prompt);
}
console.log(JSON.stringify({
  status: 'passed',
  discovery: 'isolated and profile-default loading, one matching skill, no target diagnostics',
  invocation: 'explicit-only; excluded from model prompt; native slash expansion preserves body and arguments',
  boundaries: 'ordinary prompts, absent alias and misspelled slash command are not expanded',
  relativePointers: 'one existing, readable support file',
  files: sourceFiles.map(path => ({path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex')})),
  aliasCreated: false,
}, null, 2));
