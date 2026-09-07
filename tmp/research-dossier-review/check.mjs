import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { loadSkills, formatSkillsForPrompt } from '/home/balauru/.local/share/pi-node/node-v22.23.1-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/skills.js';

const root = '/home/balauru/.pi-profiles/fabric';
const dir = join(root, 'skills/fabric-research');
const loaded = loadSkills({cwd: root, agentDir: root, includeDefaults: false, skillPaths: [dir]});
assert.deepEqual(loaded.diagnostics, []);
assert.equal(loaded.skills.length, 1);
assert.equal(loaded.skills[0].name, 'fabric-research');
assert.equal(loaded.skills[0].filePath, join(dir, 'SKILL.md'));
assert.equal(loaded.skills[0].disableModelInvocation, true);
assert.equal(formatSkillsForPrompt(loaded.skills), '');
const files = ['SKILL.md', ...readdirSync(join(dir,'references')).map(p=>'references/'+p)];
assert.equal(files.length, 5);
assert(files.every(p=>p.endsWith('.md')));
const skill = readFileSync(join(dir,'SKILL.md'),'utf8');
const runtime = readFileSync(join(dir,'references/runtime.md'),'utf8');
const all = files.map(p=>readFileSync(join(dir,p),'utf8')).join('\n');
assert(skill.includes('/home/balauru/.pi-profiles/fabric/runs/research-<topic>-<timestamp>/'));
assert(skill.includes('REPORT.md') && skill.includes('RESEARCH.md') && skill.includes('streams/<owned-question>.md'));
assert(!/research-runs|researchPacket|saveJSON|loadJSON|evidence\.schema|candidates\.json|synthesis-input\.json|gen-XXXXXX/.test(all));
assert(runtime.includes('model: "openai-codex/gpt-5.6-terra"'));
assert(runtime.includes('web_search.workflow: "none"'));
assert(runtime.includes('Before launching, reserve'));
assert(runtime.includes('Do not silently relaunch'));
console.log('PASS: Pi loader, explicit-only invocation, five reachable Markdown files, runs path, removed packet machinery, retained runtime contract');

for (const arg of process.argv.slice(2)) {
  const run = resolve(arg);
  assert(run.startsWith(join(root,'runs/research-dossier-')));
  const names = readdirSync(run);
  assert(names.includes('REPORT.md') && names.includes('RESEARCH.md'));
  assert(names.every(n=>['REPORT.md','RESEARCH.md','streams','state.json','support'].includes(n)), names.join(', '));
  const report = readFileSync(join(run,'REPORT.md'),'utf8');
  const research = readFileSync(join(run,'RESEARCH.md'),'utf8');
  assert(/https?:\/\//.test(report), 'Report needs original source URLs');
  assert(/\]\(RESEARCH\.md(?:#[^)]*)?\)/.test(report), 'Report needs local research link');
  assert(!/\bTODO\b|\bTBD\b|Status:\s*in progress/i.test(report), 'Completed report has placeholders');
  let count=2;
  if (names.includes('streams')) {
    const streams = readdirSync(join(run,'streams'));
    assert.equal(streams.length,1,'Exact one-worker smoke should have one owned document');
    assert(streams[0].endsWith('.md'));
    const notes = readFileSync(join(run,'streams',streams[0]),'utf8');
    assert(/https?:\/\//.test(notes));
    assert(research.includes('streams/'+streams[0]), 'Research index must link the stream');
    count++;
  }
  for (const path of [join(run,'REPORT.md'),join(run,'RESEARCH.md'),...(names.includes('streams')?readdirSync(join(run,'streams')).map(p=>join(run,'streams',p)):[])]) {
    const text=readFileSync(path,'utf8');
    for (const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const href=m[1];
      if (/^https?:|^mailto:/.test(href)) continue;
      const [file, anchor]=href.split('#');
      const target=resolve(path,'..',file || path);
      assert(existsSync(target),`Missing local link ${href} from ${path}`);
      if (anchor) {
        const dest=readFileSync(target,'utf8');
        const headings=[...dest.matchAll(/^#{1,6}\s+(.+)$/gm)].map(h=>h[1].toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/\s/g,'-'));
        assert(headings.includes(decodeURIComponent(anchor)) || dest.includes(`id="${anchor}"`),`Missing anchor ${href} from ${path}`);
      }
    }
  }
  console.log(`PASS: ${run}: ${count} core Markdown documents, citations, no placeholders, local files/anchors resolve`);
}
