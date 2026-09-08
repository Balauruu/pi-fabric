#!/usr/bin/env python3
"""Validate a Wayfinder Ultra Git-backed map using only the Python standard library."""

from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

TYPES = {
    "investigation": {"established", "disproved", "inconclusive"},
    "experiment": {"observed", "inconclusive", "aborted"},
    "decision": {"accepted", "deferred", "rejected"},
    "design": {"approved", "changes-requested"},
    "implementation": {"delivered", "failed", "abandoned"},
    "verification": {"pass", "fail", "inconclusive"},
    "release": {"successful", "rolled-back", "failed"},
    "enabler": {"ready", "not-ready", "expired"},
}
SUCCESS_RESULT = {
    "investigation": "established",
    "experiment": "observed",
    "decision": "accepted",
    "design": "approved",
    "implementation": "delivered",
    "verification": "pass",
    "release": "successful",
    "enabler": "ready",
}
COMMON_RESULTS = {"cancelled", "superseded", "duplicate"}
TICKET_STATUSES = {"open", "active", "review", "closed"}
DISPOSITIONS = {"pending", "completed", "cancelled", "superseded", "duplicate"}
EXECUTIONS = {"autonomous", "collaborative", "human"}
PRIORITIES = {"critical", "high", "normal", "low"}
PRIORITY_RANK = {"critical": 0, "high": 1, "normal": 2, "low": 3}
PLANNING_TYPES = {"investigation", "experiment", "decision", "design", "enabler", "verification"}
OPTIONAL_TICKET_FIELDS = {"acceptance-outcome", "applicability", "verification-scope"}
MAP_MODES = {"planning", "delivery"}
MAP_STATUSES = {"active", "paused", "complete", "cancelled"}
MAP_FIELDS = {
    "id", "mode", "status", "owner", "mode-approved-by", "mode-approved-at",
    "mode-approval", "coordination", "tracker", "mirror-status", "mirror-checked-at",
    "frontier", "completion-requires", "created", "updated",
}
TICKET_FIELDS = {
    "id", "map", "type", "status", "result", "disposition", "execution", "priority",
    "owner", "approver", "claimed-by", "claimed-at", "created", "updated", "requires",
    "relates", "implements", "verifies", "supersedes", "discipline", "change-kind",
    "method", "subject-revision", "expires-at", "tracker",
}
MAP_HEADINGS = {
    "Destination", "Success criteria", "Notes", "Current route", "Fog",
    "Out of scope", "Residual risks", "Coordination",
}
TICKET_HEADINGS = {
    "Outcome", "Context and scope", "Ownership", "Required inputs",
    "Acceptance", "Constraints", "References",
}
RESOLUTION_HEADINGS = {
    "Resolution", "Evidence and artifacts", "Acceptance check", "Consequences", "Approval",
}
RELATION_FIELDS = ("relates", "implements", "verifies", "supersedes")
KEY_RE = re.compile(r"^([a-z][a-z0-9-]*):(?:\s*(.*))?$")
HEADING_RE = re.compile(r"^##\s+(.+?)\s*$", re.MULTILINE)
PLACEHOLDER_RE = re.compile(r"<[^>]+>")
UNCHECKED_RE = re.compile(r"^\s*[-*+]\s*\[\s\]", re.MULTILINE)
CHECKBOX_RE = re.compile(r"^\s*[-*+]\s*\[[ xX]\]", re.MULTILINE)


@dataclass
class Diagnostic:
    code: str
    message: str


@dataclass
class Inspection:
    diagnostics: list[Diagnostic] = field(default_factory=list)
    frontier: list[str] = field(default_factory=list)
    blockers: dict[str, list[str]] = field(default_factory=dict)
    reassessment: dict[str, list[str]] = field(default_factory=dict)
    completion: dict[str, object] = field(default_factory=lambda: {
        "mechanical-ready": False, "unmet": ["inspection incomplete"],
    })


def _report(errors: list[str], **kwargs) -> Inspection:
    return Inspection(diagnostics=[Diagnostic("invalid-record", error) for error in sorted(set(errors))], **kwargs)


def _field_types(data: dict[str, object], lists: set[str], path: Path) -> list[str]:
    return [
        f"{path}: `{key}` must be a {'JSON list' if key in lists else 'scalar string'}"
        for key, value in data.items()
        if not isinstance(value, list if key in lists else str)
    ]


class ValidationError(Exception):
    pass


def parse_frontmatter(path: Path) -> tuple[dict[str, object], str]:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        raise ValidationError("missing opening frontmatter delimiter")
    try:
        end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
    except StopIteration as exc:
        raise ValidationError("missing closing frontmatter delimiter") from exc

    data: dict[str, object] = {}
    for number, line in enumerate(lines[1:end], start=2):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line[:1].isspace():
            raise ValidationError(f"line {number}: nested YAML is unsupported; use JSON inline lists")
        match = KEY_RE.match(line)
        if not match:
            raise ValidationError(f"line {number}: expected `key: value`")
        key, raw = match.group(1), (match.group(2) or "").strip()
        if key in data:
            raise ValidationError(f"line {number}: duplicate key `{key}`")
        if raw.startswith("["):
            try:
                value = json.loads(raw)
            except json.JSONDecodeError as exc:
                raise ValidationError(f"line {number}: invalid JSON list for `{key}`: {exc.msg}") from exc
            if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
                raise ValidationError(f"line {number}: `{key}` must be a JSON list of strings")
            data[key] = value
        else:
            if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in {"'", '"'}:
                raw = raw[1:-1]
            data[key] = raw
    return data, text


def parse_iso(value: str) -> datetime | None:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, OverflowError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def section(text: str, name: str) -> str:
    match = re.search(
        rf"^##\s+{re.escape(name)}\s*$\n(.*?)(?=^##\s+|\Z)",
        text,
        re.MULTILINE | re.DOTALL,
    )
    return match.group(1).strip() if match else ""


def require_fields(
    data: dict[str, object], required: set[str], path: Path, errors: list[str]
) -> None:
    missing = sorted(key for key in required if key not in data)
    if missing:
        errors.append(f"{path}: missing fields: {', '.join(missing)}")


def require_headings(text: str, required: set[str], path: Path, errors: list[str]) -> None:
    present = set(HEADING_RE.findall(text))
    missing = sorted(required - present)
    if missing:
        errors.append(f"{path}: missing headings: {', '.join(missing)}")


def require_concrete_section(text: str, name: str, path: Path, errors: list[str]) -> None:
    body = section(text, name)
    if not body or PLACEHOLDER_RE.search(body):
        errors.append(f"{path}: `{name}` must be concrete and non-empty")


def split_predicate(
    raw: str, path: Path, field: str, errors: list[str]
) -> tuple[str, str] | None:
    if ":" not in raw:
        errors.append(f"{path}: {field} `{raw}` must be `<ticket-id>:<result>`")
        return None
    target_id, expected = raw.rsplit(":", 1)
    if not target_id or not expected:
        errors.append(f"{path}: invalid {field} `{raw}`")
        return None
    return target_id, expected


def inspect_map(map_dir: Path, *, now: datetime) -> Inspection:
    """Read and assess a map at an explicit time; never mutate records."""
    if now.tzinfo is None or now.utcoffset() is None:
        raise ValueError("now must be timezone-aware")
    now = now.astimezone(timezone.utc)
    map_dir = Path(map_dir)
    errors: list[str] = []
    map_path = map_dir / "MAP.md"
    if not map_path.is_file():
        return _report([f"{map_path}: missing map file"])

    try:
        map_data, map_text = parse_frontmatter(map_path)
    except (OSError, UnicodeError, ValidationError) as exc:
        return _report([f"{map_path}: {exc}"])

    type_errors = _field_types(map_data, {"frontier", "completion-requires"}, map_path)
    if type_errors:
        return _report(type_errors)

    require_fields(map_data, MAP_FIELDS, map_path, errors)
    require_headings(map_text, MAP_HEADINGS, map_path, errors)
    unknown_map = sorted(set(map_data) - MAP_FIELDS)
    if unknown_map:
        errors.append(f"{map_path}: unknown fields: {', '.join(unknown_map)}")

    map_id = str(map_data.get("id", ""))
    if not map_id or PLACEHOLDER_RE.search(map_id):
        errors.append(f"{map_path}: `id` must be concrete")
    if map_data.get("mode") not in MAP_MODES:
        errors.append(f"{map_path}: invalid mode `{map_data.get('mode', '')}`")
    if map_data.get("status") not in MAP_STATUSES:
        errors.append(f"{map_path}: invalid status `{map_data.get('status', '')}`")

    for field in ("owner", "created", "updated"):
        value = str(map_data.get(field, ""))
        if not value or PLACEHOLDER_RE.search(value):
            errors.append(f"{map_path}: `{field}` must be concrete")
    for field in ("created", "updated"):
        value = str(map_data.get(field, ""))
        if value and parse_iso(value) is None:
            errors.append(f"{map_path}: `{field}` must be an ISO date or timestamp")
    for list_field in ("frontier", "completion-requires"):
        if not isinstance(map_data.get(list_field), list):
            errors.append(f"{map_path}: `{list_field}` must be a JSON list")

    coordination = str(map_data.get("coordination", ""))
    if coordination not in {"serial", "tracker"}:
        errors.append(f"{map_path}: invalid coordination `{coordination}`")
    tracker = str(map_data.get("tracker", ""))
    mirror_status = str(map_data.get("mirror-status", ""))
    mirror_checked_at = str(map_data.get("mirror-checked-at", ""))
    if mirror_status not in {"not-configured", "pending", "reconciled", "failed"}:
        errors.append(f"{map_path}: invalid mirror-status `{mirror_status}`")
    if mirror_checked_at and parse_iso(mirror_checked_at) is None:
        errors.append(f"{map_path}: `mirror-checked-at` must be an ISO date or timestamp")
    if mirror_status == "reconciled" and not mirror_checked_at:
        errors.append(f"{map_path}: reconciled mirror requires `mirror-checked-at`")
    if coordination == "tracker":
        if not tracker:
            errors.append(f"{map_path}: tracker coordination requires `tracker`")
        if mirror_status == "not-configured":
            errors.append(f"{map_path}: tracker coordination cannot use mirror-status `not-configured`")
    elif tracker:
        errors.append(f"{map_path}: serial coordination must leave `tracker` empty")
    elif mirror_status != "not-configured":
        errors.append(f"{map_path}: serial coordination requires mirror-status `not-configured`")

    if map_data.get("mode") == "delivery":
        for field in ("mode-approved-by", "mode-approved-at", "mode-approval"):
            value = str(map_data.get(field, ""))
            if not value or PLACEHOLDER_RE.search(value):
                errors.append(f"{map_path}: delivery mode requires concrete `{field}`")
        approved_at = str(map_data.get("mode-approved-at", ""))
        if approved_at and parse_iso(approved_at) is None:
            errors.append(f"{map_path}: `mode-approved-at` must be an ISO date or timestamp")
    else:
        populated = [
            field for field in ("mode-approved-by", "mode-approved-at", "mode-approval")
            if str(map_data.get(field, ""))
        ]
        if populated:
            errors.append(
                f"{map_path}: planning mode must leave delivery approval fields blank: {', '.join(populated)}"
            )

    for name in MAP_HEADINGS:
        require_concrete_section(map_text, name, map_path, errors)
    criteria = section(map_text, "Success criteria")
    if not CHECKBOX_RE.search(criteria):
        errors.append(f"{map_path}: `Success criteria` must contain at least one Markdown checkbox")
    residual = section(map_text, "Residual risks")
    residual_without_comments = re.sub(r"<!--.*?-->", "", residual, flags=re.DOTALL).strip()
    if residual_without_comments not in {"None.", "- None."}:
        lines = [line.strip() for line in residual_without_comments.splitlines() if line.strip()]
        def has_named_value(line: str, name: str) -> bool:
            return re.search(rf"(?:^|;\s*){name}:\s*[^;\s][^;]*", line, re.IGNORECASE) is not None
        if not lines or any(
            not re.match(r"^[-*+]\s+", line)
            or not has_named_value(line, "owner")
            or not has_named_value(line, "destination")
            for line in lines
        ):
            errors.append(
                f"{map_path}: every residual-risk bullet must name non-empty `owner:` and `destination:`"
            )

    tickets_dir = map_dir / "tickets"
    ticket_paths = sorted(tickets_dir.rglob("*.md")) if tickets_dir.is_dir() else []
    tickets: dict[str, tuple[dict[str, object], Path]] = {}
    ticket_texts: dict[str, str] = {}

    for path in ticket_paths:
        try:
            data, text = parse_frontmatter(path)
        except (OSError, UnicodeError, ValidationError) as exc:
            errors.append(f"{path}: {exc}")
            continue

        type_errors = _field_types(data, {"requires", *RELATION_FIELDS}, path)
        if type_errors:
            errors.extend(type_errors)
            continue

        require_fields(data, TICKET_FIELDS, path, errors)
        require_headings(text, TICKET_HEADINGS, path, errors)
        unknown = sorted(set(data) - TICKET_FIELDS - OPTIONAL_TICKET_FIELDS)
        if unknown:
            errors.append(f"{path}: unknown fields: {', '.join(unknown)}")

        ticket_id = str(data.get("id", ""))
        if not ticket_id or PLACEHOLDER_RE.search(ticket_id):
            errors.append(f"{path}: `id` must be concrete")
            continue
        if path.stem != ticket_id:
            errors.append(f"{path}: filename must be `{ticket_id}.md`")
        if ticket_id in tickets:
            errors.append(f"{path}: duplicate ticket id `{ticket_id}` also in {tickets[ticket_id][1]}")
        else:
            tickets[ticket_id] = (data, path)
            ticket_texts[ticket_id] = text

        ticket_type = str(data.get("type", ""))
        status = str(data.get("status", ""))
        result = str(data.get("result", ""))
        disposition = str(data.get("disposition", ""))
        execution = str(data.get("execution", ""))
        priority = str(data.get("priority", ""))

        if data.get("map") != map_id:
            errors.append(f"{path}: map `{data.get('map', '')}` does not match `{map_id}`")
        if ticket_type not in TYPES:
            errors.append(f"{path}: invalid type `{ticket_type}`")
        if status not in TICKET_STATUSES:
            errors.append(f"{path}: invalid status `{status}`")
        if disposition not in DISPOSITIONS:
            errors.append(f"{path}: invalid disposition `{disposition}`")
        if execution not in EXECUTIONS:
            errors.append(f"{path}: invalid execution `{execution}`")
        if priority not in PRIORITIES:
            errors.append(f"{path}: invalid priority `{priority}`")
        if map_data.get("mode") == "planning" and ticket_type not in PLANNING_TYPES:
            errors.append(f"{path}: `{ticket_type}` is not allowed while the map mode is planning")

        if data.get("verification-scope", "") not in {"", "planning", "delivery"}:
            errors.append(f"{path}: invalid verification-scope")
        if (map_data.get("mode") == "planning" and ticket_type == "verification"
                and data.get("verification-scope") != "planning"):
            errors.append(f"{path}: planning verification requires verification-scope `planning`")
        if data.get("applicability", "current") not in {"current", "needs-reassessment"}:
            errors.append(f"{path}: invalid applicability")
        assessment = data.get("acceptance-outcome")
        if assessment is not None:
            if assessment not in {"pending", "satisfied", "not-satisfied", "not-assessed"}:
                errors.append(f"{path}: invalid acceptance-outcome")
            if status == "closed" and assessment == "pending":
                errors.append(f"{path}: closed ticket requires final acceptance-outcome")
            if status in {"open", "active"} and assessment != "pending":
                errors.append(f"{path}: {status} ticket requires pending acceptance-outcome")
            if status == "closed" and result == SUCCESS_RESULT.get(ticket_type) and assessment != "satisfied":
                errors.append(f"{path}: successful result requires satisfied acceptance-outcome")

        for field in ("owner", "created", "updated"):
            value = str(data.get(field, ""))
            if not value or PLACEHOLDER_RE.search(value):
                errors.append(f"{path}: `{field}` must be concrete")
        for field in ("created", "updated", "claimed-at", "expires-at"):
            value = str(data.get(field, ""))
            if value and parse_iso(value) is None:
                errors.append(f"{path}: `{field}` must be an ISO date or timestamp")
        for list_field in ("requires", *RELATION_FIELDS):
            if not isinstance(data.get(list_field), list):
                errors.append(f"{path}: `{list_field}` must be a JSON list")
        for name in TICKET_HEADINGS:
            require_concrete_section(text, name, path, errors)
        if not CHECKBOX_RE.search(section(text, "Acceptance")):
            errors.append(f"{path}: `Acceptance` must contain at least one Markdown checkbox")

        if status in {"review", "closed"}:
            require_headings(text, RESOLUTION_HEADINGS, path, errors)
            for name in RESOLUTION_HEADINGS:
                require_concrete_section(text, name, path, errors)
        if status == "closed":
            allowed = TYPES.get(ticket_type, set()) | COMMON_RESULTS
            if result not in allowed:
                errors.append(f"{path}: result `{result}` is invalid for `{ticket_type}`")
            if disposition == "pending":
                errors.append(f"{path}: closed ticket cannot have pending disposition")
            if result in COMMON_RESULTS and disposition != result:
                errors.append(f"{path}: result `{result}` requires matching disposition")
            if result not in COMMON_RESULTS and disposition != "completed":
                errors.append(f"{path}: productive result `{result}` requires disposition `completed`")
            if assessment in {None, "satisfied"} and UNCHECKED_RE.search(section(text, "Acceptance")):
                errors.append(f"{path}: closed ticket has unchecked acceptance criteria")
            acceptance_check = section(text, "Acceptance check")
            if not CHECKBOX_RE.search(acceptance_check) or UNCHECKED_RE.search(acceptance_check):
                errors.append(f"{path}: closed ticket requires a complete `Acceptance check` checklist")
        elif result != "pending" or disposition != "pending":
            errors.append(f"{path}: non-closed ticket must have pending result and disposition")

        claimed_by = str(data.get("claimed-by", ""))
        claimed_at = str(data.get("claimed-at", ""))
        if status in {"active", "review"} and (not claimed_by or not claimed_at):
            errors.append(f"{path}: {status} ticket requires `claimed-by` and `claimed-at`")
        if status in {"open", "closed"} and (claimed_by or claimed_at):
            errors.append(f"{path}: {status} ticket must not retain a claim")
        if result in {"accepted", "approved", "successful"} and not str(data.get("approver", "")):
            errors.append(f"{path}: result `{result}` requires an approver")

        needs_revision = (
            status == "closed" and disposition == "completed" and ticket_type == "implementation"
        ) or (
            ticket_type in {"verification", "release"}
            and not (status == "closed" and disposition != "completed")
        )
        if needs_revision:
            revision = str(data.get("subject-revision", ""))
            if not revision or PLACEHOLDER_RE.search(revision):
                errors.append(f"{path}: `{ticket_type}` at status `{status}` requires a concrete `subject-revision`")

        expiry = str(data.get("expires-at", ""))
        expiry_time = parse_iso(expiry) if expiry else None
        if ticket_type == "enabler" and result == "expired" and expiry_time is None:
            errors.append(f"{path}: expired enabler requires a valid `expires-at`")

    graph: dict[str, list[str]] = {ticket_id: [] for ticket_id in tickets}
    parsed_requirements: dict[str, list[tuple[str, str]]] = {ticket_id: [] for ticket_id in tickets}

    for ticket_id, (data, path) in tickets.items():
        requirements = data.get("requires")
        if isinstance(requirements, list):
            for raw in requirements:
                parsed = split_predicate(raw, path, "requirement", errors)
                if parsed is None:
                    continue
                target_id, expected = parsed
                if target_id == ticket_id:
                    errors.append(f"{path}: ticket cannot require itself")
                    continue
                target = tickets.get(target_id)
                if target is None:
                    errors.append(f"{path}: missing required ticket `{target_id}`")
                    continue
                target_type = str(target[0].get("type", ""))
                allowed = TYPES.get(target_type, set()) | COMMON_RESULTS
                if expected not in allowed:
                    errors.append(f"{path}: `{expected}` is not a valid result for {target_id} ({target_type})")
                graph[ticket_id].append(target_id)
                parsed_requirements[ticket_id].append((target_id, expected))

        status = str(data.get("status", ""))
        disposition = str(data.get("disposition", ""))
        must_be_ready = status in {"active", "review"}
        if must_be_ready:
            for target_id, expected in parsed_requirements[ticket_id]:
                target_data = tickets[target_id][0]
                if target_data.get("status") != "closed" or target_data.get("result") != expected:
                    errors.append(
                        f"{path}: unsatisfied requirement `{target_id}:{expected}` "
                        f"(status={target_data.get('status', '')}, result={target_data.get('result', '')})"
                    )

        release_needs_pass = data.get("type") == "release" and not (
            status == "closed" and disposition != "completed"
        )
        if release_needs_pass:
            release_revision = str(data.get("subject-revision", ""))
            pass_targets = [
                target_id
                for target_id, expected in parsed_requirements[ticket_id]
                if expected == "pass" and tickets[target_id][0].get("type") == "verification"
                and tickets[target_id][0].get("verification-scope") != "planning"
            ]
            if not pass_targets:
                errors.append(f"{path}: release requires a `verification:pass` dependency")
            elif not any(
                str(tickets[target_id][0].get("subject-revision", "")) == release_revision
                for target_id in pass_targets
            ):
                errors.append(
                    f"{path}: release requires passing verification for subject revision `{release_revision}`"
                )

        for relation_field in RELATION_FIELDS:
            relations = data.get(relation_field)
            if not isinstance(relations, list):
                continue
            for related in relations:
                if related == ticket_id:
                    errors.append(f"{path}: `{relation_field}` cannot reference itself")
                elif related not in tickets:
                    errors.append(f"{path}: `{relation_field}` ticket `{related}` does not exist")

    effective_superseders: dict[str, list[str]] = {}
    for ticket_id, (data, path) in tickets.items():
        supersedes = data.get("supersedes")
        if not isinstance(supersedes, list):
            continue
        effective = (
            data.get("status") == "closed"
            and data.get("disposition") == "completed"
            and data.get("result") == SUCCESS_RESULT.get(str(data.get("type", "")))
        )
        for old_id in supersedes:
            old = tickets.get(old_id)
            if old is not None and old[0].get("type") != data.get("type"):
                errors.append(f"{path}: superseded ticket `{old_id}` must have the same type")
            if effective and old is not None:
                effective_superseders.setdefault(old_id, []).append(ticket_id)
                if old[0].get("result") != "superseded" or old[0].get("disposition") != "superseded":
                    errors.append(
                        f"{path}: effective superseder requires `{old_id}` result/disposition `superseded`"
                    )
    for ticket_id, (data, path) in tickets.items():
        if data.get("result") == "superseded" and ticket_id not in effective_superseders:
            errors.append(f"{path}: superseded result requires an effective same-type replacement")

    # Explicit DFS stack supports long maps without Python recursion limits.
    visiting: set[str] = set()
    visited: set[str] = set()
    for root in graph:
        if root in visited:
            continue
        trail = [root]
        visiting.add(root)
        stack = [iter(graph[root])]
        while stack:
            dependency = next(stack[-1], None)
            if dependency is None:
                visited.add(trail[-1])
                visiting.remove(trail.pop())
                stack.pop()
            elif dependency in visiting:
                start = trail.index(dependency)
                errors.append("dependency cycle: " + " -> ".join(trail[start:] + [dependency]))
            elif dependency not in visited:
                visiting.add(dependency)
                trail.append(dependency)
                stack.append(iter(graph[dependency]))

    reassessment: dict[str, list[str]] = {}
    for ticket_id, (data, _) in tickets.items():
        reasons = []
        if data.get("applicability", "current") == "needs-reassessment":
            reasons.append("explicit reassessment required")
        expiry = parse_iso(str(data.get("expires-at", "")))
        if data.get("type") == "enabler" and data.get("result") == "ready" and expiry and expiry <= now:
            reasons.append(f"enabler expired at {data['expires-at']}")
        if reasons:
            reassessment[ticket_id] = reasons

    # Monotone propagation preserves historical resolutions while blocking reliance.
    changed = True
    while changed:
        changed = False
        for ticket_id, (data, _) in tickets.items():
            if data.get("status") not in {"active", "review", "closed"}:
                continue
            if data.get("status") == "closed" and data.get("disposition") != "completed":
                continue
            reasons = reassessment.setdefault(ticket_id, [])
            for target_id, expected in parsed_requirements[ticket_id]:
                target = tickets[target_id][0]
                if target.get("status") != "closed" or target.get("result") != expected or reassessment.get(target_id):
                    reason = f"required result {target_id}:{expected} is not currently applicable"
                    if reason not in reasons:
                        reasons.append(reason)
                        changed = True
    reassessment = {key: sorted(value) for key, value in reassessment.items() if value}
    for ticket_id in reassessment:
        data, path = tickets[ticket_id]
        if data.get("status") in {"active", "review"}:
            errors.append(f"{path}: active/review work requires reassessment")

    derived_frontier: list[str] = []
    for ticket_id, (data, _) in tickets.items():
        if data.get("status") != "open" or data.get("claimed-by") or data.get("claimed-at") or ticket_id in reassessment:
            continue
        ready = len(parsed_requirements[ticket_id]) == len(data.get("requires", [])) and all(
            tickets[target_id][0].get("status") == "closed"
            and tickets[target_id][0].get("result") == expected
            and target_id not in reassessment
            for target_id, expected in parsed_requirements[ticket_id]
        )
        if ready:
            derived_frontier.append(ticket_id)
    derived_frontier.sort(
        key=lambda ticket_id: (
            PRIORITY_RANK.get(str(tickets[ticket_id][0].get("priority", "")), 99),
            parse_iso(str(tickets[ticket_id][0].get("created", "")))
            or datetime.max.replace(tzinfo=timezone.utc),
            ticket_id,
        )
    )
    if isinstance(map_data.get("frontier"), list) and map_data.get("frontier") != derived_frontier:
        errors.append(f"{map_path}: frontier {map_data.get('frontier')} does not match derived {derived_frontier}")

    active_count = sum(
        1 for data, _ in tickets.values() if data.get("status") in {"active", "review"}
    )
    if map_data.get("coordination") == "serial" and active_count > 1:
        errors.append(f"{map_path}: serial coordination permits at most one active/review ticket")

    completion = map_data.get("completion-requires")
    if isinstance(completion, list):
        if map_data.get("status") == "complete" and not completion:
            errors.append(f"{map_path}: complete map requires at least one `completion-requires` predicate")
        for raw in completion:
            parsed = split_predicate(raw, map_path, "completion predicate", errors)
            if parsed is None:
                continue
            target_id, expected = parsed
            target = tickets.get(target_id)
            if target is None:
                errors.append(f"{map_path}: missing completion ticket `{target_id}`")
                continue
            target_type = str(target[0].get("type", ""))
            allowed = TYPES.get(target_type, set()) | COMMON_RESULTS
            if expected not in allowed:
                errors.append(f"{map_path}: invalid completion result `{expected}` for `{target_id}`")
            if map_data.get("status") == "complete" and (
                target[0].get("status") != "closed" or target[0].get("result") != expected
                or target_id in reassessment
            ):
                errors.append(f"{map_path}: unsatisfied completion predicate `{raw}`")

    if map_data.get("status") == "complete":
        nonclosed = sorted(
            ticket_id for ticket_id, (data, _) in tickets.items() if data.get("status") != "closed"
        )
        if nonclosed:
            errors.append(f"{map_path}: complete map has non-closed tickets: {', '.join(nonclosed)}")
        fog = re.sub(r"<!--.*?-->", "", section(map_text, "Fog"), flags=re.DOTALL).strip()
        if fog not in {"", "None.", "- None."}:
            errors.append(f"{map_path}: complete map still contains fog")
        criteria = section(map_text, "Success criteria")
        if UNCHECKED_RE.search(criteria):
            errors.append(f"{map_path}: complete map has unchecked success criteria")
        if map_data.get("coordination") == "tracker":
            if map_data.get("mirror-status") != "reconciled" or not map_data.get("mirror-checked-at"):
                errors.append(f"{map_path}: complete tracker-coordinated map requires a reconciled mirror and verified read time")

    blockers: dict[str, list[str]] = {}
    for ticket_id, (data, _) in tickets.items():
        reasons = list(reassessment.get(ticket_id, []))
        if data.get("status") != "open":
            reasons.append(f"status is {data.get('status')}")
        if data.get("claimed-by") or data.get("claimed-at"):
            reasons.append("ticket has a claim")
        if map_data.get("status") != "active":
            reasons.append(f"map is {map_data.get('status')}")
        if coordination == "serial" and active_count and data.get("status") == "open":
            reasons.append("serial capacity occupied")
        for raw in data.get("requires", []):
            target_id, separator, expected = raw.rpartition(":")
            target = tickets.get(target_id)
            if not separator or target is None or target[0].get("status") != "closed" or target[0].get("result") != expected or target_id in reassessment:
                reasons.append(f"unmatched requirement {raw}")
        if reasons:
            blockers[ticket_id] = sorted(set(reasons))

    unmet: list[str] = []
    if errors:
        unmet.append("validation diagnostics remain")
    if map_data.get("status") == "cancelled":
        unmet.append("map is cancelled")
    if not completion:
        unmet.append("completion-requires is empty")
    for raw in completion if isinstance(completion, list) else []:
        target_id, separator, expected = raw.rpartition(":")
        target = tickets.get(target_id)
        if not separator or target is None or target[0].get("status") != "closed" or target[0].get("result") != expected or target_id in reassessment:
            unmet.append(f"unmatched completion predicate {raw}")
    if any(data.get("status") != "closed" for data, _ in tickets.values()):
        unmet.append("non-closed tickets remain")
    if reassessment:
        unmet.append("reassessment remains")
    fog = re.sub(r"<!--.*?-->", "", section(map_text, "Fog"), flags=re.DOTALL).strip()
    if fog not in {"", "None.", "- None."}:
        unmet.append("fog remains")
    if UNCHECKED_RE.search(section(map_text, "Success criteria")):
        unmet.append("unchecked success criteria")
    if coordination == "tracker" and (mirror_status != "reconciled" or not mirror_checked_at):
        unmet.append("tracker mirror not recorded reconciled")
    if map_data.get("status") == "complete" and reassessment:
        errors.append(f"{map_path}: complete map still requires reassessment")
    return _report(errors, frontier=derived_frontier, blockers=blockers, reassessment=reassessment,
                   completion={"mechanical-ready": not unmet, "unmet": unmet})


def validate(map_dir: Path) -> list[str]:
    """Compatibility interface for existing callers."""
    return [item.message for item in inspect_map(map_dir, now=datetime.now(timezone.utc)).diagnostics]


def ticket_text(
    ticket_id: str,
    ticket_type: str,
    result: str,
    requires: list[str],
    approver: str = "",
    disposition: str = "completed",
    supersedes: list[str] | None = None,
) -> str:
    return f'''---
id: {ticket_id}
map: sample-map
type: {ticket_type}
status: closed
result: {result}
disposition: {disposition}
execution: autonomous
priority: normal
owner: agent
approver: {approver}
claimed-by:
claimed-at:
created: 2026-09-07
updated: 2026-09-07
requires: {json.dumps(requires)}
relates: []
implements: []
verifies: []
supersedes: {json.dumps(supersedes or [])}
discipline:
change-kind:
method:
subject-revision: abc123
expires-at:
tracker:
---
# {ticket_id}
## Outcome
Test outcome.
## Context and scope
Test context.
## Ownership
Test owner.
## Required inputs
Test inputs.
## Acceptance
- [x] Tested.
## Constraints
None.
## References
abc123
## Resolution
Recorded.
## Evidence and artifacts
- abc123
## Acceptance check
- [x] Passed.
## Consequences
None.
## Approval
{approver or 'No approval required by fixture policy.'}
'''


def self_test() -> int:
    with tempfile.TemporaryDirectory(prefix="wayfinder-ultra-") as temporary:
        root = Path(temporary)
        (root / "tickets").mkdir(parents=True)
        (root / "MAP.md").write_text(
            '''---
id: sample-map
mode: delivery
status: active
owner: test-owner
mode-approved-by: delivery-owner
mode-approved-at: 2026-09-07
mode-approval: test-approval
coordination: serial
tracker:
mirror-status: not-configured
mirror-checked-at:
frontier: []
completion-requires: ["REL-01:successful"]
created: 2026-09-07
updated: 2026-09-07
---
# Sample
## Destination
Test the validator.
## Success criteria
- [ ] Complete.
## Notes
Fixture.
## Current route
No open work.
## Fog
- None.
## Out of scope
- None.
## Residual risks
- None.
## Coordination
- Tracker mirror: none
''',
            encoding="utf-8",
        )
        files = {
            "INV-01.md": ticket_text("INV-01", "investigation", "established", []),
            "DEC-01.md": ticket_text(
                "DEC-01", "decision", "accepted", ["INV-01:established"], "decision-owner"
            ),
            "VER-01.md": ticket_text("VER-01", "verification", "pass", []),
            "REL-01.md": ticket_text(
                "REL-01", "release", "successful", ["VER-01:pass"], "release-owner"
            ),
        }
        for name, text in files.items():
            (root / "tickets" / name).write_text(text, encoding="utf-8")

        happy_errors = validate(root)
        if happy_errors:
            print("self-test happy path failed:", *happy_errors, sep="\n- ", file=sys.stderr)
            return 1

        verification = root / "tickets" / "VER-01.md"
        verification.write_text(
            files["VER-01.md"].replace("result: pass", "result: fail"), encoding="utf-8"
        )
        if 'REL-01' not in inspect_map(root, now=datetime.now(timezone.utc)).reassessment:
            print("self-test failed: failed verification did not block release", file=sys.stderr)
            return 1
        verification.write_text(files["VER-01.md"], encoding="utf-8")

        old_path = root / "tickets" / "DEC-OLD.md"
        new_path = root / "tickets" / "DEC-NEW.md"
        old_text = ticket_text("DEC-OLD", "decision", "accepted", [], "decision-owner")
        old_path.write_text(old_text, encoding="utf-8")
        new_path.write_text(
            ticket_text(
                "DEC-NEW", "decision", "accepted", [], "decision-owner", supersedes=["DEC-OLD"]
            ),
            encoding="utf-8",
        )
        supersession_errors = validate(root)
        if not any("effective superseder requires `DEC-OLD`" in error for error in supersession_errors):
            print("self-test failed: effective supersession did not invalidate old result", file=sys.stderr)
            return 1
        old_path.write_text(
            old_text.replace("result: accepted", "result: superseded").replace(
                "disposition: completed", "disposition: superseded"
            ),
            encoding="utf-8",
        )
        final_errors = validate(root)
        if final_errors:
            print("self-test supersession path failed:", *final_errors, sep="\n- ", file=sys.stderr)
            return 1

        print(
            "self-test passed: valid map accepted; failed verification blocked release; "
            "effective supersession invalidated the old result"
        )
        return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("map_dir", nargs="?", type=Path, help="directory containing MAP.md and tickets/")
    parser.add_argument("--self-test", action="store_true", help="run built-in happy and negative checks")
    parser.add_argument("--json", action="store_true", help="emit a read-only structured inspection")
    parser.add_argument("--now", help="pin inspection time to an ISO timestamp")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if args.map_dir is None:
        parser.error("map_dir is required unless --self-test is used")
    now = parse_iso(args.now) if args.now else datetime.now(timezone.utc)
    if now is None:
        parser.error("--now must be an ISO date or timestamp")
    report = inspect_map(args.map_dir.resolve(), now=now)
    if args.json:
        print(json.dumps(asdict(report), indent=2, sort_keys=True))
        return 1 if report.diagnostics else 0
    errors = [item.message for item in report.diagnostics]
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    count = (
        len(list((args.map_dir / "tickets").rglob("*.md")))
        if (args.map_dir / "tickets").is_dir()
        else 0
    )
    print(f"valid Wayfinder Ultra map: {args.map_dir} ({count} tickets)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
