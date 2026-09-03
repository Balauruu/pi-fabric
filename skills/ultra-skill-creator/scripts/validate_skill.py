#!/usr/bin/env python3
"""Validate a standalone Pi Agent Skill using only the Python standard library."""

from __future__ import annotations

import argparse
import ast
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
TOP_LEVEL_RE = re.compile(r"^([A-Za-z0-9_-]+):(?:[ \t]*(.*))?$")
MARKDOWN_LINK_RE = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")
BLOCK_MARKERS = {">", ">-", "|", "|-"}
ALLOWED_FIELDS = {
    "name",
    "description",
    "license",
    "compatibility",
    "metadata",
    "allowed-tools",
    "disable-model-invocation",
}
IGNORED_PARTS = {"__pycache__", ".git"}
IGNORED_FILES = {".DS_Store"}


def scalar_value(raw: str, errors: list[str], field: str) -> str:
    """Decode the simple scalar forms needed by skill frontmatter."""
    value = raw.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        try:
            parsed = ast.literal_eval(value)
        except (SyntaxError, ValueError):
            errors.append(f"frontmatter field {field!r} has an invalid quoted value")
            return ""
        if not isinstance(parsed, str):
            errors.append(f"frontmatter field {field!r} must be a string")
            return ""
        return parsed
    return value


def parse_frontmatter(text: str, errors: list[str]) -> tuple[dict[str, str], int]:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        errors.append("SKILL.md must start with YAML frontmatter")
        return {}, 0

    try:
        end = next(i for i, line in enumerate(lines[1:], 1) if line.strip() == "---")
    except StopIteration:
        errors.append("SKILL.md frontmatter has no closing delimiter")
        return {}, 0

    fields: dict[str, str] = {}
    i = 1
    while i < end:
        line = lines[i]
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or line[:1].isspace():
            i += 1
            continue

        match = TOP_LEVEL_RE.match(line)
        if not match:
            errors.append(f"invalid top-level frontmatter at line {i + 1}: {line!r}")
            i += 1
            continue

        key, raw = match.group(1), (match.group(2) or "")
        if key in fields:
            errors.append(f"duplicate frontmatter field {key!r}")

        if raw.strip() in BLOCK_MARKERS:
            marker = raw.strip()[0]
            chunks: list[str] = []
            j = i + 1
            while j < end and (not lines[j].strip() or lines[j][:1].isspace()):
                chunks.append(lines[j].lstrip() if lines[j].strip() else "")
                j += 1
            fields[key] = ("\n" if marker == "|" else " ").join(chunks).strip()
            i = j
            continue

        fields[key] = scalar_value(raw, errors, key)
        i += 1

    return fields, end + 1


def first_link_token(raw: str) -> str:
    target = raw.strip()
    if target.startswith("<") and ">" in target:
        return target[1 : target.index(">")]
    return target.split(maxsplit=1)[0]


def local_link(
    raw: str,
    source: Path,
    root: Path,
    errors: list[str],
) -> Path | None:
    target = unquote(first_link_token(raw))
    if target.startswith("#"):
        return None

    parsed = urlsplit(target)
    if parsed.scheme or parsed.netloc or target.startswith(("/", "~")):
        errors.append(f"{source.relative_to(root)} uses a non-relative link: {target}")
        return None

    path_text = parsed.path
    if not path_text:
        return None

    candidate = (source.parent / path_text).resolve()
    try:
        candidate.relative_to(root.resolve())
    except ValueError:
        errors.append(f"{source.relative_to(root)} link escapes the skill directory: {target}")
        return None

    if not candidate.is_file():
        errors.append(f"{source.relative_to(root)} has a missing link target: {target}")
        return None
    return candidate


def skill_files(root: Path) -> set[Path]:
    return {
        path.resolve()
        for path in root.rglob("*")
        if path.is_file()
        and path.name not in IGNORED_FILES
        and not any(part in IGNORED_PARTS for part in path.relative_to(root).parts)
    }


def validate(root: Path) -> list[str]:
    errors: list[str] = []
    if not root.is_dir():
        return [f"skill directory does not exist: {root}"]

    skill_md = root / "SKILL.md"
    if not skill_md.is_file():
        return ["SKILL.md is missing"]

    try:
        text = skill_md.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return ["SKILL.md must be UTF-8 text"]

    fields, body_line = parse_frontmatter(text, errors)
    unknown = sorted(set(fields) - ALLOWED_FIELDS)
    if unknown:
        errors.append(f"unknown frontmatter fields: {', '.join(unknown)}")

    name = fields.get("name", "").strip()
    if not name:
        errors.append("frontmatter name is required")
    elif len(name) > 64:
        errors.append(f"name exceeds 64 characters: {len(name)}")
    elif not NAME_RE.fullmatch(name):
        errors.append("name must be lowercase kebab-case without edge or repeated hyphens")
    elif name != root.name:
        errors.append(f"name {name!r} must match directory {root.name!r}")

    description = fields.get("description", "").strip()
    if not description:
        errors.append("frontmatter description is required")
    elif len(description) > 1024:
        errors.append(f"description exceeds 1024 characters: {len(description)}")

    compatibility = fields.get("compatibility", "")
    if len(compatibility) > 500:
        errors.append(f"compatibility exceeds 500 characters: {len(compatibility)}")

    invocation = fields.get("disable-model-invocation")
    if invocation and invocation not in {"true", "false"}:
        errors.append("disable-model-invocation must be true or false")

    files = skill_files(root)
    direct_links: set[Path] = set()
    for markdown in sorted(path for path in files if path.suffix.lower() == ".md"):
        try:
            markdown_text = markdown.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            errors.append(f"{markdown.relative_to(root)} must be UTF-8 text")
            continue
        for match in MARKDOWN_LINK_RE.finditer(markdown_text):
            resolved = local_link(match.group(1), markdown, root, errors)
            if resolved and markdown.resolve() == skill_md.resolve():
                direct_links.add(resolved)

    support_files = files - {skill_md.resolve()}
    orphans = sorted(path.relative_to(root).as_posix() for path in support_files - direct_links)
    if orphans:
        errors.append("support files not linked directly from SKILL.md: " + ", ".join(orphans))

    body_lines = len(text.splitlines()) - body_line
    if body_lines > 500:
        errors.append(f"SKILL.md body exceeds 500 lines: {body_lines}")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("skill_directory", type=Path)
    args = parser.parse_args()
    root = args.skill_directory.expanduser().resolve()

    errors = validate(root)
    if errors:
        print(f"FAIL {root}")
        for error in errors:
            print(f"- {error}")
        return 1

    count = len(skill_files(root))
    print(f"OK {root.name}: valid frontmatter, local links, and {count} reachable files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
