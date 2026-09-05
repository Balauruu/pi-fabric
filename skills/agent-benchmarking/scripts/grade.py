#!/usr/bin/env python3
"""Pure objective grading, blinded judge planning, and adjudication policy.

The fixed runner owns all model dispatch and file publication.  This module only
turns frozen grading inputs into deterministic grade records or prepared jobs,
and turns later native returns into individual labels.
"""

from __future__ import annotations

from collections import Counter
from copy import deepcopy
import hashlib
import json
import math
import re
from typing import Any, Callable, Mapping, Sequence

import benchmark_lib as lib

Document = dict[str, Any]
_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
_PHASES = {"deterministic", "judge", "adjudicate"}
_GRADE_STATUSES = {"valid", "abstained", "malformed", "missing", "failed"}
_FIXTURE_CLASSES = {
    "known-good",
    "known-bad",
    "isolated-defect",
    "boundary",
    "malformed",
}


class GradingContractError(ValueError):
    """Raised by focused pure helpers when their inputs are not gradeable."""

    def __init__(self, issues: Sequence[str]):
        self.issues = tuple(issues)
        super().__init__("; ".join(self.issues))


def _error(code: str, message: str, *, work_id: str | None = None, severity: str = "error") -> Document:
    return {"code": code, "message": message, "workId": work_id, "severity": severity}


def _response(*, status: str, grades: Sequence[Mapping[str, Any]] = (), jobs: Sequence[Mapping[str, Any]] = (), errors: Sequence[Mapping[str, Any]] = ()) -> Document:
    return {
        "schemaVersion": 1,
        "status": status,
        "grades": [deepcopy(dict(row)) for row in grades],
        "jobs": [deepcopy(dict(row)) for row in jobs],
        "errors": [deepcopy(dict(row)) for row in errors],
    }


def _canonical_copy(value: Any, field: str) -> Any:
    try:
        return json.loads(lib.canonical_json_bytes(value))
    except lib.BenchmarkError as exc:
        raise GradingContractError((f"{field}: {exc}",)) from None


def _require_id(value: Any, field: str) -> str:
    if not isinstance(value, str) or _ID.fullmatch(value) is None:
        raise GradingContractError((f"{field}: expected a non-empty benchmark ID",))
    return value


def _work_id(prefix: str, *parts: Any) -> str:
    """Build a bounded deterministic work ID without ambiguous concatenation."""
    text_parts = [str(part) for part in parts]
    digest = hashlib.sha256(lib.canonical_json_bytes([prefix, *text_parts])).hexdigest()[:24]
    room = 127 - len(prefix) - len(digest) - 2
    stem = re.sub(r"[^A-Za-z0-9._-]", "-", "-".join(text_parts))[:max(0, room)].rstrip("-.")
    return f"{prefix}-{stem + '-' if stem else ''}{digest}"


def _attempt_id(item: Mapping[str, Any]) -> str:
    assignment = item.get("assignment")
    if not isinstance(assignment, Mapping):
        raise GradingContractError(("item.assignment: expected an object",))
    value = assignment.get("attemptId", assignment.get("attempt_id"))
    return _require_id(value, "item.assignment.attemptId")


def _task_id(item: Mapping[str, Any]) -> str:
    assignment = item.get("assignment")
    if not isinstance(assignment, Mapping):
        raise GradingContractError(("item.assignment: expected an object",))
    value = assignment.get("taskId", assignment.get("task_id"))
    return _require_id(value, "item.assignment.taskId")


def _score_mapping(plan: Mapping[str, Any]) -> tuple[dict[str, float | int], str, str]:
    rows = plan.get("scoreMapping")
    issues: list[str] = []
    mapping: dict[str, float | int] = {}
    if not isinstance(rows, list) or len(rows) < 2:
        issues.append("gradingPlan.scoreMapping: at least two label mappings are required")
    else:
        for index, row in enumerate(rows):
            if not isinstance(row, Mapping):
                issues.append(f"gradingPlan.scoreMapping[{index}]: expected an object")
                continue
            label = row.get("label")
            score = row.get("score")
            if not isinstance(label, str) or not label:
                issues.append(f"gradingPlan.scoreMapping[{index}].label: expected a non-empty string")
                continue
            if label in mapping:
                issues.append(f"gradingPlan.scoreMapping: duplicate label {label!r}")
            if isinstance(score, bool) or not isinstance(score, (int, float)) or not math.isfinite(score):
                issues.append(f"gradingPlan.scoreMapping[{index}].score: expected a finite number")
                continue
            mapping[label] = score
    if issues:
        raise GradingContractError(issues)
    ordered = sorted(mapping, key=lambda label: (mapping[label], label))
    if mapping[ordered[0]] == mapping[ordered[-1]]:
        raise GradingContractError(("gradingPlan.scoreMapping: pass and fail scores must differ",))
    return mapping, ordered[0], ordered[-1]


def _validate_plan(plan: Any, phase: str) -> Document:
    if not isinstance(plan, Mapping):
        raise GradingContractError(("gradingPlan: expected an object",))
    copied = _canonical_copy(dict(plan), "gradingPlan")
    if not isinstance(copied.get("rubric"), str) or not copied["rubric"].strip():
        raise GradingContractError(("gradingPlan.rubric: expected a non-empty frozen rubric",))
    _score_mapping(copied)
    method = copied.get("method")
    if phase == "deterministic":
        if method != "deterministic" or not isinstance(copied.get("deterministic"), dict):
            raise GradingContractError(("deterministic phase requires gradingPlan.method='deterministic' and a deterministic rule",))
        rule = copied["deterministic"]
        if rule.get("kind") not in {"exact-text", "exact-json", "json-schema", "command", "predicate", "final-state"}:
            raise GradingContractError((f"unsupported deterministic grader kind {rule.get('kind')!r}",))
        if not isinstance(rule.get("expectedByTask"), dict):
            raise GradingContractError(("gradingPlan.deterministic.expectedByTask: expected an object",))
        if not isinstance(rule.get("caseSensitive"), bool):
            raise GradingContractError(("gradingPlan.deterministic.caseSensitive: expected a boolean",))
        if rule.get("malformedAction") not in {"fail", "evaluator-failure", "missing"}:
            raise GradingContractError(("gradingPlan.deterministic.malformedAction: unsupported action",))
        if rule.get("timeoutAction") not in {"fail", "agent-failure", "missing"}:
            raise GradingContractError(("gradingPlan.deterministic.timeoutAction: unsupported action",))
    else:
        if method not in {"model", "human"} or not isinstance(copied.get("judgment"), dict):
            raise GradingContractError((f"{phase} phase requires a model or human judgment plan",))
        judgment = copied["judgment"]
        grader_ids = judgment.get("graderIds")
        if not isinstance(grader_ids, list) or not grader_ids:
            raise GradingContractError(("gradingPlan.judgment.graderIds: at least one grader is required",))
        normalized = [_require_id(value, f"gradingPlan.judgment.graderIds[{index}]") for index, value in enumerate(grader_ids)]
        if len(normalized) != len(set(normalized)):
            raise GradingContractError(("gradingPlan.judgment.graderIds: values must be unique",))
        repetitions = judgment.get("repetitions")
        if isinstance(repetitions, bool) or not isinstance(repetitions, int) or repetitions < 1:
            raise GradingContractError(("gradingPlan.judgment.repetitions: expected a positive integer",))
        labels = judgment.get("labelSet")
        if not isinstance(labels, list) or len(labels) < 2 or any(not isinstance(value, str) or not value for value in labels):
            raise GradingContractError(("gradingPlan.judgment.labelSet: at least two non-empty labels are required",))
        if len(labels) != len(set(labels)):
            raise GradingContractError(("gradingPlan.judgment.labelSet: values must be unique",))
        mapping, _, _ = _score_mapping(copied)
        absent = sorted(set(labels) - set(mapping))
        if absent:
            raise GradingContractError(("gradingPlan.judgment.labelSet has no score mapping for: " + ", ".join(absent),))
        if method == "model":
            for field in ("runner", "model", "rubric"):
                if not isinstance(judgment.get(field), str) or not judgment[field].strip():
                    raise GradingContractError((f"gradingPlan.judgment.{field}: expected a non-empty string",))
            calibration = judgment.get("calibrationInputPaths")
            if not isinstance(calibration, list) or not calibration or any(not isinstance(path, str) or not path for path in calibration):
                raise GradingContractError(("model grading requires at least one frozen calibration input path",))
        if not isinstance(judgment.get("retainUncertainty"), bool):
            raise GradingContractError(("gradingPlan.judgment.retainUncertainty: expected a boolean",))
    return copied


def _dispatch_status(result: Any) -> str | None:
    if not isinstance(result, Mapping):
        return None
    value = result.get("dispatchStatus", result.get("dispatch_status", result.get("status")))
    if not isinstance(value, str):
        return None
    normalized = value.lower().replace("_", "-")
    if normalized in {"completed", "complete", "succeeded", "success", "passed"}:
        return "completed"
    if normalized in {"timeout", "timed-out"}:
        return "timeout"
    if normalized in {"cancelled", "canceled"}:
        return "cancelled"
    if normalized in {"failed", "agent-failure", "infrastructure-failure", "error"}:
        return "failed"
    return normalized


def _native_result(result: Any) -> Any:
    if not isinstance(result, Mapping):
        return None
    if "nativeResult" in result:
        return result["nativeResult"]
    if "native_result" in result:
        return result["native_result"]
    return result


def _outcome_forms(value: Any) -> set[bytes]:
    forms = {lib.canonical_json_bytes(value)}
    if isinstance(value, str):
        try:
            forms.add(lib.canonical_json_bytes(lib.parse_json_bytes(value.encode("utf-8"), "native text/value comparison")))
        except lib.BenchmarkError:
            pass
    return forms


def _actual_output(result: Any) -> tuple[Any, str | None]:
    native = _native_result(result)
    if native is None:
        return None, "native result is missing"
    if not isinstance(native, Mapping):
        return native, None
    candidates: list[tuple[str, Any]] = []
    for key in ("output", "text", "value"):
        if key in native and native[key] is not None:
            candidates.append((key, native[key]))
    if not candidates:
        return None, "native result has no outcome output"
    try:
        forms = [_outcome_forms(value) for _, value in candidates]
    except lib.BenchmarkError:
        return None, "native outcome is not finite JSON"
    if any(forms[0].isdisjoint(other) for other in forms[1:]):
        names = ", ".join(name for name, _ in candidates)
        return None, f"native result has conflicting outcome fields: {names}"
    return candidates[0][1], None


def _label_record(criterion_id: str, label: str, score: float | int | None, uncertainty: float | int | None, rationale: str) -> Document:
    return {
        "criterionId": _require_id(criterion_id, "criterionId"),
        "label": label,
        "score": score,
        "uncertainty": uncertainty,
        "rationale": rationale,
    }


def _base_grade(*, grade_id: str, attempt_id: str, stage: str, method: str, grader_id: str, blinded_item_id: str | None, status: str, labels: Sequence[Mapping[str, Any]], native_result_path: str | None = None, error: Mapping[str, Any] | None = None, repetition: int | None = None, residual_unblinding: Sequence[str] = ()) -> Document:
    record: Document = {
        "schemaVersion": 1,
        "gradeId": _require_id(grade_id, "gradeId"),
        "attemptId": _require_id(attempt_id, "attemptId"),
        "stage": stage,
        "method": method,
        "graderId": _require_id(grader_id, "graderId"),
        "blindedItemId": blinded_item_id,
        "status": status,
        "labels": [deepcopy(dict(label)) for label in labels],
        "nativeResultPath": native_result_path,
        "error": None if error is None else deepcopy(dict(error)),
        "residualUnblinding": sorted(set(residual_unblinding)),
    }
    if repetition is not None:
        record["graderRepetition"] = repetition
    return record


def _action_grade(plan: Mapping[str, Any], item: Mapping[str, Any], *, action: str, code: str, message: str) -> Document:
    attempt_id = _attempt_id(item)
    rule = plan["deterministic"]
    mapping, low_label, _ = _score_mapping(plan)
    if action == "fail":
        return _base_grade(
            grade_id=_work_id("grade", attempt_id, "objective"),
            attempt_id=attempt_id,
            stage="deterministic",
            method="deterministic",
            grader_id=f"deterministic-{rule['kind']}",
            blinded_item_id=None,
            status="valid",
            labels=[_label_record("outcome", low_label, mapping[low_label], None, message)],
        )
    status = "missing" if action == "missing" else "failed"
    return _base_grade(
        grade_id=_work_id("grade", attempt_id, "objective"),
        attempt_id=attempt_id,
        stage="deterministic",
        method="deterministic",
        grader_id=f"deterministic-{rule['kind']}",
        blinded_item_id=None,
        status=status,
        labels=[],
        error={"code": code, "message": message},
    )


def _parse_json_actual(actual: Any) -> Any:
    if isinstance(actual, str):
        return lib.parse_json_bytes(actual.encode("utf-8"), "model output")
    _canonical_copy(actual, "model output")
    return actual


def _path_value(value: Any, path: str) -> tuple[bool, Any]:
    current = value
    if path == "":
        return True, current
    for segment in path.split("."):
        if isinstance(current, Mapping) and segment in current:
            current = current[segment]
        elif isinstance(current, list) and segment.isdigit() and int(segment) < len(current):
            current = current[int(segment)]
        else:
            return False, None
    return True, current


def _evaluate_predicate(actual: Any, descriptor: Any) -> tuple[bool, str]:
    if not isinstance(descriptor, Mapping):
        return actual == descriptor, "actual value equals the frozen predicate target" if actual == descriptor else "actual value differs from the frozen predicate target"
    operator = descriptor.get("operator")
    path = descriptor.get("path", "")
    if not isinstance(path, str):
        raise lib.InputError("predicate path must be a string")
    exists, selected = _path_value(actual, path)
    target = descriptor.get("value")
    if operator == "exists":
        passed = exists is bool(target)
    elif not exists:
        return False, f"predicate path {path!r} is absent"
    elif operator == "equals":
        passed = selected == target
    elif operator == "not-equals":
        passed = selected != target
    elif operator == "contains":
        passed = isinstance(selected, (str, list, dict)) and target in selected
    elif operator == "matches":
        if not isinstance(selected, str) or not isinstance(target, str):
            raise lib.InputError("matches requires string actual and value")
        passed = re.fullmatch(target, selected) is not None
    elif operator == "minimum":
        passed = isinstance(selected, (int, float)) and not isinstance(selected, bool) and selected >= target
    elif operator == "maximum":
        passed = isinstance(selected, (int, float)) and not isinstance(selected, bool) and selected <= target
    else:
        raise lib.InputError(f"unsupported predicate operator {operator!r}")
    return passed, f"frozen predicate {operator!r} {'passed' if passed else 'failed'} at path {path!r}"


def grade_deterministic_item(grading_plan: Mapping[str, Any], item: Mapping[str, Any]) -> Document:
    """Grade one actual outcome without model calls or input mutation."""
    plan = _validate_plan(grading_plan, "deterministic")
    item_copy = _canonical_copy(dict(item), "item")
    attempt_id = _attempt_id(item_copy)
    task_id = _task_id(item_copy)
    rule = plan["deterministic"]
    kind = rule.get("kind")
    if kind not in {"exact-text", "exact-json", "json-schema", "command", "predicate", "final-state"}:
        raise GradingContractError((f"unsupported deterministic grader kind {kind!r}",))
    expected_by_task = rule.get("expectedByTask")
    if not isinstance(expected_by_task, Mapping) or task_id not in expected_by_task:
        raise GradingContractError((f"gradingPlan.deterministic.expectedByTask has no entry for {task_id!r}",))
    expected = expected_by_task[task_id]
    result = item_copy.get("result")
    status = _dispatch_status(result)
    if status == "timeout":
        return _action_grade(plan, item_copy, action=rule.get("timeoutAction"), code="DETERMINISTIC_TIMEOUT", message="attempt timed out; the frozen timeout action was applied")
    if status not in {None, "completed"}:
        return _action_grade(plan, item_copy, action="missing", code="DETERMINISTIC_OUTCOME_UNAVAILABLE", message=f"actual outcome is unavailable after dispatch status {status!r}")

    native = _native_result(result)
    evidence = result.get("deterministicEvidence") if isinstance(result, Mapping) else None

    try:
        if kind in {"command", "final-state"} and isinstance(evidence, Mapping):
            evidence_status = evidence.get("status")
            if evidence_status not in {"passed", "failed"}:
                raise lib.InputError("deterministic evidence status must be 'passed' or 'failed'")
            passed = evidence_status == "passed"
            rationale = evidence.get("rationale") if isinstance(evidence.get("rationale"), str) and evidence["rationale"] else f"runner-supplied {kind} evidence {evidence_status}"
            criterion_id = evidence.get("criterionId", "outcome")
        elif kind == "final-state":
            if not isinstance(result, Mapping) or "finalState" not in result:
                raise lib.InputError("runner supplied no final-state evidence outside the agent-native result")
            passed = result["finalState"] == expected
            rationale = "final state equals the frozen expected state" if passed else "final state differs from the frozen expected state"
            criterion_id = "outcome"
        elif kind == "command":
            raise lib.InputError("runner supplied no command outcome evidence")
        else:
            actual, output_error = _actual_output(result)
            if output_error:
                raise lib.InputError(output_error)
            criterion_id = "outcome"
            if kind == "exact-text":
                if not isinstance(actual, str) or not isinstance(expected, str):
                    raise lib.InputError("exact-text requires string actual and expected values")
                left = actual.strip()
                right = expected.strip()
                if not rule.get("caseSensitive"):
                    left, right = left.casefold(), right.casefold()
                passed = left == right
                rationale = "trimmed text exactly matches the frozen answer" if passed else "trimmed text does not match the frozen answer"
            elif kind == "exact-json":
                parsed = _parse_json_actual(actual)
                passed = parsed == expected
                rationale = "strict JSON equals the frozen value" if passed else "strict JSON differs from the frozen value"
            elif kind == "json-schema":
                parsed = _parse_json_actual(actual)
                if not isinstance(expected, dict):
                    raise lib.InputError("json-schema expectedByTask entry must be a schema object")
                schema_issues = lib.validate_json_schema(parsed, expected)
                passed = not schema_issues
                rationale = "output satisfies the frozen JSON schema" if passed else "output violates the frozen JSON schema: " + "; ".join(schema_issues)
            else:
                parsed = _parse_json_actual(actual)
                passed, rationale = _evaluate_predicate(parsed, expected)
    except (lib.BenchmarkError, TypeError, ValueError) as exc:
        return _action_grade(plan, item_copy, action=rule.get("malformedAction"), code="DETERMINISTIC_MALFORMED", message=f"malformed deterministic outcome: {exc}")

    mapping, low_label, high_label = _score_mapping(plan)
    label = high_label if passed else low_label
    return _base_grade(
        grade_id=_work_id("grade", attempt_id, "objective"),
        attempt_id=attempt_id,
        stage="deterministic",
        method="deterministic",
        grader_id=f"deterministic-{kind}",
        blinded_item_id=None,
        status="valid",
        labels=[_label_record(criterion_id, label, mapping[label], None, rationale)],
    )


def _seed_bytes(plan: Mapping[str, Any], purpose: str) -> bytes:
    frozen = lib.canonical_json_bytes({"purpose": purpose, "gradingPlan": plan})
    return hashlib.sha256(frozen).digest()


def _rank(seed: bytes, value: str) -> bytes:
    return hashlib.sha256(seed + b"\0" + value.encode("utf-8")).digest()


def _identity_values(assignment: Mapping[str, Any]) -> list[tuple[str, str]]:
    values: list[tuple[str, str]] = []
    for key in ("conditionId", "condition_id", "model", "provider", "runner"):
        value = assignment.get(key)
        if isinstance(value, str) and len(value) >= 3:
            values.append((key, value))
    request = assignment.get("request")
    if isinstance(request, Mapping):
        for key in ("model", "provider", "runner"):
            value = request.get(key)
            if isinstance(value, str) and len(value) >= 3:
                values.append((f"request.{key}", value))
    return values


def _residual_unblinding(assignment: Mapping[str, Any], evidence: Any, rubric: str) -> list[str]:
    haystacks = [("evidence", json.dumps(evidence, ensure_ascii=False, sort_keys=True)), ("rubric", rubric)]
    reasons: list[str] = []
    for identity_field, identity in _identity_values(assignment):
        for location, text in haystacks:
            if identity.casefold() in text.casefold():
                reasons.append(f"{location}-contains-{identity_field}")
    return sorted(set(reasons))


def project_pairwise_judgment_input(grading_plan: Mapping[str, Any], item: Mapping[str, Any], *, blinded_item_id: str, presentation_key: bytes | None = None) -> tuple[Document, list[Document], list[str]]:
    """Randomize pairwise position while keeping its reverse map out of the request."""
    plan = _validate_plan(grading_plan, "judge")
    item_copy = _canonical_copy(dict(item), "item")
    _require_id(blinded_item_id, "blindedItemId")
    assignment = item_copy.get("assignment")
    explicit = assignment.get("criterionEvidence") if isinstance(assignment, Mapping) else None
    rows = explicit.get("presentations") if isinstance(explicit, Mapping) else None
    if not isinstance(rows, list) or len(rows) != 2:
        raise GradingContractError(("pairwise criterionEvidence.presentations must contain exactly two items",))
    normalized: list[tuple[int, Any, Document]] = []
    for index, row in enumerate(rows):
        if isinstance(row, Mapping):
            if "output" not in row:
                raise GradingContractError((f"pairwise presentation {index} has no output",))
            output = row["output"]
            private = {key: deepcopy(value) for key, value in row.items() if key != "output"}
        else:
            output = row
            private = {}
        normalized.append((index, output, private))
    key = presentation_key or _seed_bytes(plan, f"pairwise:{blinded_item_id}")
    ordered = sorted(normalized, key=lambda row: (_rank(key, lib.canonical_json_bytes(row[1]).decode("utf-8")), row[0]))
    positions = ("left", "right")
    public_rows = []
    reverse_map = []
    for position, (source_index, output, private) in zip(positions, ordered, strict=True):
        public_rows.append({"position": position, "output": output})
        reverse_map.append({"position": position, "sourceIndex": source_index, "private": private})
    evidence: Document = {"presentations": public_rows}
    criteria = explicit.get("criteria") if isinstance(explicit, Mapping) else None
    if criteria is not None:
        evidence["criteria"] = deepcopy(criteria)
    rubric = plan["judgment"]["rubric"]
    projection = {"schemaVersion": 1, "blindedItemId": blinded_item_id, "rubric": rubric, "evidence": evidence}
    return projection, reverse_map, _residual_unblinding(assignment, evidence, rubric)


def project_judgment_input(grading_plan: Mapping[str, Any], item: Mapping[str, Any], *, blinded_item_id: str, presentation_key: bytes | None = None) -> tuple[Document, list[str]]:
    """Return only rubric and outcome evidence suitable for a blinded grader."""
    plan = _validate_plan(grading_plan, "judge")
    item_copy = _canonical_copy(dict(item), "item")
    _require_id(blinded_item_id, "blindedItemId")
    assignment = item_copy["assignment"]
    explicit = assignment.get("criterionEvidence") if isinstance(assignment, Mapping) else None
    if isinstance(explicit, Mapping) and "presentations" in explicit:
        projection, _, residual = project_pairwise_judgment_input(
            plan,
            item_copy,
            blinded_item_id=blinded_item_id,
            presentation_key=presentation_key,
        )
        return projection, residual
    if explicit is not None:
        if not isinstance(explicit, Mapping) or set(explicit) - {"output", "criteria"}:
            raise GradingContractError(("criterionEvidence may expose only output and criteria",))
        evidence: Any = deepcopy(explicit)
    else:
        actual, output_error = _actual_output(item_copy.get("result"))
        if output_error:
            raise GradingContractError((f"item {_attempt_id(item_copy)}: {output_error}",))
        evidence = {"output": actual}
    rubric = plan["judgment"]["rubric"]
    projection = {
        "schemaVersion": 1,
        "blindedItemId": blinded_item_id,
        "rubric": rubric,
        "evidence": evidence,
    }
    return projection, _residual_unblinding(assignment, evidence, rubric)


def _job_prompt(projection: Mapping[str, Any], labels: Sequence[str], *, criterion_ids: Sequence[str] = ("outcome",)) -> str:
    response = {
        "labels": [{
            "criterionId": criterion_id,
            "label": f"one of {list(labels)!r}, or abstain",
            "uncertainty": "number from 0 to 1 or null",
            "rationale": "criterion-relevant explanation",
        } for criterion_id in criterion_ids]
    }
    return (
        "Grade only the blinded evidence under the supplied frozen rubric. "
        "Do not infer condition, model, provider, price, timing, or previous scores. "
        "Use no tools. Return exactly one JSON object matching this shape: "
        + json.dumps(response, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        + "\nINPUT\n"
        + json.dumps(projection, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    )


def _blind_map(plan: Mapping[str, Any], items: Sequence[Mapping[str, Any]]) -> dict[str, str]:
    attempt_ids = [_attempt_id(item) for item in items]
    if len(attempt_ids) != len(set(attempt_ids)):
        raise GradingContractError(("items: attempt IDs must be unique when planning grading",))
    seed = _seed_bytes(plan, "blind-item-order-v1")
    ordered = sorted(attempt_ids, key=lambda value: (_rank(seed, value), value))
    return {attempt_id: f"blind-{index:06d}" for index, attempt_id in enumerate(ordered, 1)}


def plan_judge_jobs(grading_plan: Mapping[str, Any], items: Sequence[Mapping[str, Any]]) -> list[Document]:
    """Create deterministic no-tools jobs; this function never launches them."""
    plan = _validate_plan(grading_plan, "judge")
    copied_items = [_canonical_copy(dict(item), f"items[{index}]") for index, item in enumerate(items)]
    mapping = _blind_map(plan, copied_items)
    judgment = plan["judgment"]
    existing_ids: set[str] = set()
    existing_issues: list[str] = []
    for item in copied_items:
        attempt_id = _attempt_id(item)
        expected = {
            _work_id("grade", attempt_id, "judge", grader_id, f"r{repetition:03d}")
            for grader_id in judgment["graderIds"]
            for repetition in range(1, judgment["repetitions"] + 1)
        }
        seen: set[str] = set()
        labels = item.get("existingLabels", [])
        if not isinstance(labels, list):
            existing_issues.append(f"item {attempt_id}: existingLabels must be an array")
            continue
        for label in labels:
            if not isinstance(label, Mapping) or label.get("stage") != "judge":
                continue
            grade_id = label.get("gradeId")
            if grade_id in seen:
                existing_issues.append(f"item {attempt_id}: duplicate existing judge grade {grade_id!r}")
                continue
            seen.add(grade_id)
            if grade_id not in expected:
                existing_issues.append(f"item {attempt_id}: unplanned existing judge grade {grade_id!r}")
            elif label.get("status") not in {"valid", "abstained"}:
                existing_issues.append(f"item {attempt_id}: existing judge grade {grade_id!r} has explicit status {label.get('status')!r}")
            elif isinstance(grade_id, str):
                existing_ids.add(grade_id)
    if existing_issues:
        raise GradingContractError(existing_issues)
    jobs: list[Document] = []
    seed = _seed_bytes(plan, "judge-job-order-v1")
    for item in copied_items:
        attempt_id = _attempt_id(item)
        blind_id = mapping[attempt_id]
        criterion_evidence = item["assignment"].get("criterionEvidence")
        if isinstance(criterion_evidence, Mapping) and "presentations" in criterion_evidence:
            projection, _, residual = project_pairwise_judgment_input(
                plan, item, blinded_item_id=blind_id, presentation_key=seed
            )
        else:
            projection, residual = project_judgment_input(plan, item, blinded_item_id=blind_id, presentation_key=seed)
        explicit_criteria = projection["evidence"].get("criteria") if isinstance(projection["evidence"], Mapping) else None
        criterion_ids = explicit_criteria if isinstance(explicit_criteria, list) and explicit_criteria else ["outcome"]
        criterion_ids = [_require_id(value, "criterionEvidence.criteria") for value in criterion_ids]
        if len(criterion_ids) != len(set(criterion_ids)):
            raise GradingContractError((f"item {attempt_id}: criterion IDs must be unique",))
        for grader_id in judgment["graderIds"]:
            for repetition in range(1, judgment["repetitions"] + 1):
                grade_id = _work_id("grade", attempt_id, "judge", grader_id, f"r{repetition:03d}")
                if grade_id in existing_ids:
                    continue
                job_id = _work_id("judge", blind_id, grader_id, f"r{repetition:03d}")
                jobs.append({
                    "schemaVersion": 1,
                    "jobId": job_id,
                    "gradeId": grade_id,
                    "workType": "grade-job",
                    "phase": "judge",
                    "attemptId": attempt_id,
                    "graderId": grader_id,
                    "graderRepetition": repetition,
                    "blindedItemId": blind_id,
                    "criterionIds": criterion_ids,
                    "projection": projection,
                    "residualUnblinding": residual,
                    "request": {
                        "runner": judgment["runner"],
                        "model": judgment["model"],
                        "prompt": _job_prompt(projection, judgment["labelSet"], criterion_ids=criterion_ids),
                        "tools": [],
                        "settings": {},
                    },
                })
    jobs.sort(key=lambda job: (_rank(seed, job["jobId"]), job["jobId"]))
    for index, job in enumerate(jobs, 1):
        job["presentationIndex"] = index
    return jobs


def _is_job_assignment(value: Any, phase: str) -> bool:
    return isinstance(value, Mapping) and value.get("workType") == "grade-job" and value.get("phase") == phase


def _judgment_failure(plan: Mapping[str, Any], job: Mapping[str, Any], *, status: str, code: str, message: str) -> Document:
    return _base_grade(
        grade_id=job["gradeId"],
        attempt_id=job["attemptId"],
        stage=job["phase"],
        method=plan["method"],
        grader_id=job["graderId"],
        blinded_item_id=job["blindedItemId"],
        status=status,
        labels=[],
        native_result_path=None,
        error={"code": code, "message": message},
        repetition=job.get("graderRepetition"),
        residual_unblinding=job.get("residualUnblinding", []),
    )


def _parse_judgment_payload(result: Any) -> tuple[Mapping[str, Any] | None, str | None, str]:
    if result is None:
        return None, None, "judge native result is missing"
    status = _dispatch_status(result)
    if status not in {None, "completed"}:
        return None, status, f"judge dispatch did not complete: {status}"
    actual, output_error = _actual_output(result)
    if output_error:
        return None, status, output_error
    try:
        parsed = _parse_json_actual(actual)
    except lib.BenchmarkError as exc:
        return None, status, str(exc)
    if not isinstance(parsed, Mapping):
        return None, status, "judge output must be one JSON object"
    return parsed, status, ""


def parse_judgment_item(grading_plan: Mapping[str, Any], item: Mapping[str, Any], *, expected_phase: str) -> Document:
    """Validate one later native judge/adjudicator return into one grade record."""
    plan = _validate_plan(grading_plan, expected_phase)
    item_copy = _canonical_copy(dict(item), "item")
    job = item_copy.get("assignment")
    if not _is_job_assignment(job, expected_phase):
        raise GradingContractError((f"item.assignment is not a prepared {expected_phase} job",))
    for field in ("jobId", "gradeId", "attemptId", "graderId", "blindedItemId"):
        _require_id(job.get(field), f"item.assignment.{field}")
    payload, dispatch_status, issue = _parse_judgment_payload(item_copy.get("result"))
    if payload is None:
        missing = item_copy.get("result") is None or "missing" in issue
        code = "GRADER_RESULT_MISSING" if missing else ("GRADER_DISPATCH_FAILED" if dispatch_status not in {None, "completed"} else "GRADER_RESULT_MALFORMED")
        return _judgment_failure(plan, job, status="missing" if missing else ("failed" if dispatch_status not in {None, "completed"} else "malformed"), code=code, message=issue)

    allowed_top = {"labels", "abstain", "abstained", "uncertainty", "rationale"}
    extra_top = sorted(set(payload) - allowed_top)
    if extra_top:
        return _judgment_failure(plan, job, status="malformed", code="GRADER_RESULT_MALFORMED", message="judge output has criterion-irrelevant fields: " + ", ".join(extra_top))
    judgment = plan["judgment"]
    mapping, _, _ = _score_mapping(plan)
    retain_uncertainty = judgment["retainUncertainty"]
    native_path = item_copy.get("nativeResultPath")
    if native_path is not None and (not isinstance(native_path, str) or not native_path):
        return _judgment_failure(plan, job, status="malformed", code="GRADER_RESULT_PATH_INVALID", message="nativeResultPath must be null or a non-empty string")

    if payload.get("abstain") is True or payload.get("abstained") is True:
        criterion_ids = job.get("criterionIds", [job.get("criterionId", "outcome")])
        uncertainty = payload.get("uncertainty")
        rationale = payload.get("rationale")
        if retain_uncertainty and "uncertainty" not in payload:
            return _judgment_failure(plan, job, status="malformed", code="GRADER_UNCERTAINTY_MISSING", message="frozen plan requires an explicit uncertainty value")
        if uncertainty is not None and (isinstance(uncertainty, bool) or not isinstance(uncertainty, (int, float)) or not math.isfinite(uncertainty) or not 0 <= uncertainty <= 1):
            return _judgment_failure(plan, job, status="malformed", code="GRADER_UNCERTAINTY_INVALID", message="uncertainty must be null or a finite number from 0 to 1")
        if not isinstance(rationale, str) or not rationale:
            return _judgment_failure(plan, job, status="malformed", code="GRADER_RATIONALE_MISSING", message="abstention requires a rationale")
        labels = [_label_record(criterion_id, "abstain", None, uncertainty, rationale) for criterion_id in criterion_ids]
        status = "abstained"
    else:
        rows = payload.get("labels")
        if not isinstance(rows, list) or not rows:
            return _judgment_failure(plan, job, status="malformed", code="GRADER_LABELS_MISSING", message="judge output requires a non-empty labels array or explicit abstention")
        labels = []
        seen: set[str] = set()
        for index, row in enumerate(rows):
            if not isinstance(row, Mapping):
                return _judgment_failure(plan, job, status="malformed", code="GRADER_RESULT_MALFORMED", message=f"labels[{index}] must be an object")
            allowed = {"criterionId", "label", "uncertainty", "rationale"}
            extra = sorted(set(row) - allowed)
            if extra:
                return _judgment_failure(plan, job, status="malformed", code="GRADER_RESULT_MALFORMED", message=f"labels[{index}] has criterion-irrelevant fields: {', '.join(extra)}")
            try:
                criterion_id = _require_id(row.get("criterionId"), f"labels[{index}].criterionId")
            except GradingContractError as exc:
                return _judgment_failure(plan, job, status="malformed", code="GRADER_RESULT_MALFORMED", message=str(exc))
            if criterion_id in seen:
                return _judgment_failure(plan, job, status="malformed", code="GRADER_DUPLICATE_CRITERION", message=f"duplicate criterion {criterion_id!r}")
            seen.add(criterion_id)
            if expected_phase == "adjudicate" and criterion_id != job.get("criterionId"):
                return _judgment_failure(plan, job, status="malformed", code="ADJUDICATION_CRITERION_MISMATCH", message=f"adjudicator returned criterion {criterion_id!r}, expected {job.get('criterionId')!r}")
            label = row.get("label")
            uncertainty = row.get("uncertainty")
            rationale = row.get("rationale")
            if label in {"abstain", "abstained"}:
                score = None
            elif label not in judgment["labelSet"] or label not in mapping:
                return _judgment_failure(plan, job, status="malformed", code="GRADER_LABEL_INVALID", message=f"label {label!r} is not in the frozen label set")
            else:
                score = mapping[label]
            if retain_uncertainty and "uncertainty" not in row:
                return _judgment_failure(plan, job, status="malformed", code="GRADER_UNCERTAINTY_MISSING", message=f"criterion {criterion_id!r} lacks explicit uncertainty")
            if uncertainty is not None and (isinstance(uncertainty, bool) or not isinstance(uncertainty, (int, float)) or not math.isfinite(uncertainty) or not 0 <= uncertainty <= 1):
                return _judgment_failure(plan, job, status="malformed", code="GRADER_UNCERTAINTY_INVALID", message=f"criterion {criterion_id!r} uncertainty must be null or from 0 to 1")
            if not isinstance(rationale, str) or not rationale:
                return _judgment_failure(plan, job, status="malformed", code="GRADER_RATIONALE_MISSING", message=f"criterion {criterion_id!r} requires a rationale")
            labels.append(_label_record(criterion_id, label, score, uncertainty, rationale))
        expected_criteria = set(job.get("criterionIds", [job.get("criterionId", "outcome")]))
        if seen != expected_criteria:
            return _judgment_failure(
                plan,
                job,
                status="malformed",
                code="GRADER_CRITERION_COVERAGE_INVALID",
                message=f"criterion coverage {sorted(seen)!r} does not equal frozen {sorted(expected_criteria)!r}",
            )
        status = "abstained" if any(label["score"] is None for label in labels) else "valid"

    return _base_grade(
        grade_id=job["gradeId"],
        attempt_id=job["attemptId"],
        stage=expected_phase,
        method=plan["method"],
        grader_id=job["graderId"],
        blinded_item_id=job["blindedItemId"],
        status=status,
        labels=labels,
        native_result_path=native_path,
        repetition=job.get("graderRepetition"),
        residual_unblinding=job.get("residualUnblinding", []),
    )


def _expected_judge_keys(plan: Mapping[str, Any]) -> set[tuple[str, int]]:
    judgment = plan["judgment"]
    return {(grader_id, repetition) for grader_id in judgment["graderIds"] for repetition in range(1, judgment["repetitions"] + 1)}


def _blind_from_labels(labels: Sequence[Mapping[str, Any]]) -> str | None:
    values = {row.get("blindedItemId") for row in labels if isinstance(row.get("blindedItemId"), str)}
    return next(iter(values)) if len(values) == 1 else None


def plan_adjudication_jobs(grading_plan: Mapping[str, Any], items: Sequence[Mapping[str, Any]]) -> tuple[list[Document], list[Document]]:
    """Plan only complete, predeclared disagreements and enforce max extra calls."""
    plan = _validate_plan(grading_plan, "adjudicate")
    adjudication = plan.get("adjudication")
    if not isinstance(adjudication, Mapping):
        raise GradingContractError(("gradingPlan.adjudication: expected an object",))
    required = {"enabled", "trigger", "resolverIds", "maxCalls", "precedence"}
    missing = sorted(required - set(adjudication))
    if missing:
        raise GradingContractError(("gradingPlan.adjudication missing: " + ", ".join(missing),))
    if not adjudication["enabled"] or adjudication["trigger"] == "never":
        return [], []
    if adjudication["trigger"] != "declared-disagreement":
        raise GradingContractError((f"unsupported adjudication trigger {adjudication['trigger']!r}",))
    resolvers = adjudication["resolverIds"]
    if not isinstance(resolvers, list) or not resolvers:
        raise GradingContractError(("enabled adjudication requires at least one resolverId",))
    resolver_ids = [_require_id(value, f"resolverIds[{index}]") for index, value in enumerate(resolvers)]
    if len(resolver_ids) != len(set(resolver_ids)):
        raise GradingContractError(("resolverIds must be unique",))
    maximum = adjudication["maxCalls"]
    if isinstance(maximum, bool) or not isinstance(maximum, int) or maximum < 0:
        raise GradingContractError(("adjudication.maxCalls must be a non-negative integer",))
    if adjudication["precedence"] not in {"resolver", "majority", "retain-disagreement"}:
        raise GradingContractError(("enabled adjudication requires resolver, majority, or retain-disagreement precedence",))

    copied_items = [_canonical_copy(dict(item), f"items[{index}]") for index, item in enumerate(items)]
    generated_blinds = _blind_map(plan, copied_items)
    expected_keys = _expected_judge_keys(plan)
    errors: list[Document] = []
    candidates: list[Document] = []
    eligible_count = 0
    judgment = plan["judgment"]
    seed = _seed_bytes(plan, "adjudication-job-order-v1")

    for item in copied_items:
        attempt_id = _attempt_id(item)
        labels = item.get("existingLabels")
        if not isinstance(labels, list):
            errors.append(_error("JUDGE_LABELS_MISSING", "existingLabels must contain all planned judge grade records", work_id=attempt_id))
            continue
        judge_records = [row for row in labels if isinstance(row, Mapping) and row.get("stage") == "judge"]
        by_key: dict[tuple[str, int], Mapping[str, Any]] = {}
        fatal = False
        for row in judge_records:
            grader_id = row.get("graderId")
            repetition = row.get("graderRepetition", 1)
            key = (grader_id, repetition)
            if key in by_key:
                errors.append(_error("JUDGE_LABEL_DUPLICATE", f"duplicate judge result for {grader_id!r} repetition {repetition}", work_id=attempt_id))
                fatal = True
            else:
                by_key[key] = row
        missing_keys = sorted(expected_keys - set(by_key))
        extra_keys = sorted(set(by_key) - expected_keys)
        if missing_keys:
            errors.append(_error("JUDGE_LABEL_MISSING", "missing planned judge results: " + ", ".join(f"{grader}/r{rep}" for grader, rep in missing_keys), work_id=attempt_id))
            fatal = True
        if extra_keys:
            errors.append(_error("JUDGE_LABEL_UNPLANNED", "unplanned judge results: " + ", ".join(f"{grader}/r{rep}" for grader, rep in extra_keys), work_id=attempt_id))
            fatal = True
        for row in by_key.values():
            if row.get("status") in {"missing", "malformed", "failed"}:
                errors.append(_error("JUDGE_LABEL_INVALID", f"judge grade {row.get('gradeId')!r} has explicit status {row.get('status')!r}", work_id=attempt_id))
                fatal = True
            elif row.get("status") == "abstained":
                errors.append(_error("JUDGE_ABSTAINED", f"judge grade {row.get('gradeId')!r} abstained; it is retained and not treated as agreement", work_id=attempt_id, severity="warning"))
        if fatal:
            continue

        by_criterion: dict[str, set[str]] = {}
        for row in by_key.values():
            for label in row.get("labels", []):
                if not isinstance(label, Mapping) or label.get("score") is None:
                    continue
                criterion_id = label.get("criterionId")
                label_value = label.get("label")
                if isinstance(criterion_id, str) and isinstance(label_value, str):
                    by_criterion.setdefault(criterion_id, set()).add(label_value)
        blind_id = _blind_from_labels(judge_records) or generated_blinds[attempt_id]
        for criterion_id in sorted(by_criterion):
            if len(by_criterion[criterion_id]) < 2:
                continue
            anonymized = []
            for row in by_key.values():
                for label in row.get("labels", []):
                    if isinstance(label, Mapping) and label.get("criterionId") == criterion_id:
                        anonymized.append({"label": label.get("label"), "uncertainty": label.get("uncertainty")})
            anonymized.sort(key=lambda value: (_rank(seed, json.dumps(value, sort_keys=True)), json.dumps(value, sort_keys=True)))
            projection = {
                "schemaVersion": 1,
                "blindedItemId": blind_id,
                "criterionId": criterion_id,
                "rubric": judgment["rubric"],
                "labels": anonymized,
            }
            for resolver_id in resolver_ids:
                eligible_count += 1
                grade_id = _work_id("grade", attempt_id, "adjudicate", criterion_id, resolver_id)
                existing = [row for row in labels if isinstance(row, Mapping) and row.get("gradeId") == grade_id]
                if len(existing) > 1:
                    errors.append(_error("ADJUDICATOR_RESULT_DUPLICATE", f"duplicate adjudicator grade {grade_id!r}", work_id=attempt_id))
                    continue
                if existing:
                    if existing[0].get("status") not in {"valid", "abstained"}:
                        errors.append(_error("ADJUDICATOR_RESULT_INVALID", f"adjudicator grade {grade_id!r} has explicit status {existing[0].get('status')!r}", work_id=attempt_id))
                    continue
                candidates.append({
                    "schemaVersion": 1,
                    "jobId": _work_id("adjudicate", blind_id, criterion_id, resolver_id),
                    "gradeId": grade_id,
                    "workType": "grade-job",
                    "phase": "adjudicate",
                    "attemptId": attempt_id,
                    "graderId": resolver_id,
                    "blindedItemId": blind_id,
                    "criterionId": criterion_id,
                    "criterionIds": [criterion_id],
                    "projection": projection,
                    "residualUnblinding": sorted({reason for row in judge_records for reason in row.get("residualUnblinding", []) if isinstance(reason, str)}),
                    "request": {
                        "runner": judgment["runner"],
                        "model": judgment["model"],
                        "prompt": _job_prompt(projection, judgment["labelSet"], criterion_ids=[criterion_id]),
                        "tools": [],
                        "settings": {},
                    },
                })

    candidates.sort(key=lambda job: (_rank(seed, job["jobId"]), job["jobId"]))
    if any(error["severity"] == "error" for error in errors):
        return [], errors
    if eligible_count > maximum:
        errors.append(_error("ADJUDICATION_CALL_LIMIT_EXCEEDED", f"{eligible_count} eligible adjudication jobs exceed frozen maxCalls={maximum}"))
        return [], errors
    for index, job in enumerate(candidates, 1):
        job["presentationIndex"] = index
    return candidates, errors


def resolve_labels(grading_plan: Mapping[str, Any], grades: Sequence[Mapping[str, Any]]) -> Document:
    """Apply the frozen adjudication precedence without collapsing raw labels."""
    plan = _validate_plan(grading_plan, "adjudicate")
    rows = [_canonical_copy(dict(row), f"grades[{index}]") for index, row in enumerate(grades)]
    criteria = sorted({label.get("criterionId") for row in rows for label in row.get("labels", []) if isinstance(label, Mapping) and isinstance(label.get("criterionId"), str)})
    precedence = plan["adjudication"]["precedence"]
    results = []
    for criterion_id in criteria:
        judges = [label for row in rows if row.get("stage") == "judge" and row.get("status") in {"valid", "abstained"} for label in row.get("labels", []) if label.get("criterionId") == criterion_id]
        resolvers = [label for row in rows if row.get("stage") == "adjudicate" and row.get("status") in {"valid", "abstained"} for label in row.get("labels", []) if label.get("criterionId") == criterion_id]
        judge_values = [label["label"] for label in judges if label.get("score") is not None]
        resolver_values = [label["label"] for label in resolvers if label.get("score") is not None]
        chosen: str | None = None
        reason: str
        if len(set(judge_values)) == 1 and judge_values:
            chosen, reason = judge_values[0], "judge-agreement"
        elif precedence == "resolver" and len(set(resolver_values)) == 1 and resolver_values:
            chosen, reason = resolver_values[0], "resolver-precedence"
        elif precedence == "majority" and judge_values:
            counts = Counter(judge_values)
            largest = max(counts.values())
            winners = sorted(label for label, count in counts.items() if count == largest)
            if len(winners) == 1:
                chosen, reason = winners[0], "judge-majority"
            elif len(set(resolver_values)) == 1 and resolver_values:
                chosen, reason = resolver_values[0], "resolver-tie-break"
            else:
                reason = "unresolved-majority-tie"
        else:
            reason = "retained-disagreement" if precedence == "retain-disagreement" else "missing-valid-resolver"
        results.append({
            "criterionId": criterion_id,
            "status": "resolved" if chosen is not None else "unresolved",
            "label": chosen,
            "reason": reason,
            "judgeLabels": deepcopy(judges),
            "adjudicatorLabels": deepcopy(resolvers),
        })
    return {"schemaVersion": 1, "precedence": precedence, "criteria": results}


def validate_criterion_fixtures(grading_plan: Mapping[str, Any], fixtures: Sequence[Mapping[str, Any]], *, evaluator: Callable[[Mapping[str, Any], Mapping[str, Any]], Mapping[str, Any]] | None = None) -> Document:
    """Exercise the reusable five-class criterion matrix and reject constants."""
    plan = _validate_plan(grading_plan, "deterministic")
    evaluate = evaluator or grade_deterministic_item
    rows = [_canonical_copy(dict(row), f"fixtures[{index}]") for index, row in enumerate(fixtures)]
    classes = {row.get("fixtureClass") for row in rows}
    missing = sorted(_FIXTURE_CLASSES - classes)
    issues: list[str] = []
    if missing:
        issues.append("fixture matrix missing classes: " + ", ".join(missing))
    observed = []
    mapping, low_label, high_label = _score_mapping(plan)
    for index, row in enumerate(rows):
        fixture_id = row.get("fixtureId")
        if not isinstance(fixture_id, str) or not fixture_id:
            issues.append(f"fixtures[{index}].fixtureId: expected a non-empty string")
            continue
        if row.get("fixtureClass") not in _FIXTURE_CLASSES:
            issues.append(f"fixture {fixture_id!r}: unknown fixtureClass {row.get('fixtureClass')!r}")
            continue
        item = row.get("item")
        expected = row.get("expected")
        if not isinstance(item, Mapping) or not isinstance(expected, Mapping):
            issues.append(f"fixture {fixture_id!r}: item and expected must be objects")
            continue
        try:
            result = dict(evaluate(plan, item))
        except Exception as exc:  # fixture certification records evaluator crashes as a failure
            issues.append(f"fixture {fixture_id!r}: evaluator raised {type(exc).__name__}: {exc}")
            continue
        label = result.get("labels", [{}])[0].get("label") if result.get("labels") else None
        score = result.get("labels", [{}])[0].get("score") if result.get("labels") else None
        if "status" in expected and result.get("status") != expected["status"]:
            issues.append(f"fixture {fixture_id!r}: status {result.get('status')!r} != expected {expected['status']!r}")
        if "label" in expected and label != expected["label"]:
            issues.append(f"fixture {fixture_id!r}: label {label!r} != expected {expected['label']!r}")
        observed.append({"fixtureId": fixture_id, "fixtureClass": row["fixtureClass"], "status": result.get("status"), "label": label, "score": score})
    valid_scores = [row["score"] for row in observed if row["status"] == "valid"]
    if mapping[high_label] not in valid_scores:
        issues.append("fixture matrix detected an always-fail grader: no valid high-score outcome")
    if mapping[low_label] not in valid_scores:
        issues.append("fixture matrix detected an always-pass grader: no valid low-score outcome")
    good = [row for row in observed if row["fixtureClass"] == "known-good"]
    bad = [row for row in observed if row["fixtureClass"] in {"known-bad", "isolated-defect"}]
    if not any(row["status"] == "valid" and row["score"] == mapping[high_label] for row in good):
        issues.append("known-good fixtures do not demonstrate a passing grader")
    if not any(row["status"] == "valid" and row["score"] == mapping[low_label] for row in bad):
        issues.append("known-bad/isolated-defect fixtures do not demonstrate a failing grader")
    if issues:
        raise GradingContractError(issues)
    return {"schemaVersion": 1, "status": "passed", "requiredClasses": sorted(_FIXTURE_CLASSES), "cases": observed}


def grade(request: Mapping[str, Any]) -> Document:
    """Shared grading interface.  It is deterministic and performs no dispatch."""
    try:
        if not isinstance(request, Mapping):
            raise GradingContractError(("request: expected an object",))
        if set(request) != {"schemaVersion", "phase", "gradingPlan", "items"}:
            raise GradingContractError(("request: expected exactly schemaVersion, phase, gradingPlan, and items",))
        if request.get("schemaVersion") != 1:
            raise GradingContractError(("schemaVersion: expected 1",))
        phase = request.get("phase")
        if phase not in _PHASES:
            raise GradingContractError((f"phase: expected one of {sorted(_PHASES)}",))
        plan = _validate_plan(request.get("gradingPlan"), phase)
        raw_items = request.get("items")
        if not isinstance(raw_items, list):
            raise GradingContractError(("items: expected an array",))
        items = [_canonical_copy(item, f"items[{index}]") for index, item in enumerate(raw_items)]
        if any(not isinstance(item, dict) for item in items):
            raise GradingContractError(("items: every item must be an object",))

        if phase == "deterministic":
            grades = [grade_deterministic_item(plan, item) for item in items]
            failures = [row for row in grades if row["status"] != "valid"]
            errors = [dict(row["error"], workId=row["attemptId"], severity="error") for row in failures if row["error"]]
            return _response(status="failed" if failures else "complete", grades=grades, errors=errors)

        consumed = [item for item in items if _is_job_assignment(item.get("assignment"), phase)]
        planned = [item for item in items if item not in consumed]
        grades = [parse_judgment_item(plan, item, expected_phase=phase) for item in consumed]
        errors = [dict(row["error"], workId=row["gradeId"], severity="error") for row in grades if row["status"] in {"missing", "malformed", "failed"} and row["error"]]
        jobs: list[Document] = []
        if phase == "judge" and planned:
            jobs = plan_judge_jobs(plan, planned)
        elif phase == "adjudicate" and planned:
            jobs, planning_errors = plan_adjudication_jobs(plan, planned)
            errors.extend(planning_errors)
        fatal = any(error.get("severity", "error") == "error" for error in errors)
        status = "failed" if fatal else ("checkpoint" if jobs else "complete")
        return _response(status=status, grades=grades, jobs=jobs, errors=errors)
    except GradingContractError as exc:
        return _response(status="failed", errors=[_error("GRADING_CONTRACT_INVALID", issue) for issue in exc.issues])
