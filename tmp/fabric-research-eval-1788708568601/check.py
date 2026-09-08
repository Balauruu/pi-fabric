from pathlib import Path
import importlib.util, re, json
root=Path('/home/balauru/.pi-profiles/fabric/skills/fabric-research')
validator=Path('/home/balauru/.pi-profiles/fabric/skills/ultra-skill-creator/scripts/validate_skill.py')
spec=importlib.util.spec_from_file_location('validator',validator); mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
expected={f'references/last30days.md link escapes the skill directory: {p}' for p in ['../../last30days/skills/last30days/SKILL.md','../../last30days/docs/reference/json-export.md']}
errors=mod.validate(root)
assert set(errors)==expected, errors
files=list(root.rglob('*.md'))
for f in files:
    text=f.read_text()
    assert '<!-- methodology -->' not in text and '<!-- reporting -->' not in text
    for link in re.findall(r'\[[^\]]*\]\(([^)]+)\)',text):
        assert (f.parent/link).resolve().is_file(),(f,link)
main=(root/'SKILL.md').read_text()
for anchor in ['disable-model-invocation: true','model: "openai-codex/gpt-5.6-terra"','tools: ["fabric_exec"]','did not successfully discover and invoke','PI_CODING_AGENT_DIR','workflow: "none"','references/stream-contracts.md','references/synthesis-and-reporting.md','references/last30days.md']:
    assert anchor in main,anchor
expected_files={'SKILL.md','references/stream-contracts.md','references/synthesis-and-reporting.md','references/last30days.md'}
assert {str(f.relative_to(root)) for f in files}==expected_files
print(json.dumps({'checks':'pass','files':len(files),'existing_standalone_validator_exceptions':sorted(expected),'external_dependency_links':'exist','preserved_policy_anchors':9}))
