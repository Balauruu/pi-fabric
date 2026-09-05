#!/usr/bin/env python3
"""Small public run/report interface and fixed-guest lifecycle bridge.

Public Python API:

    run({"specPath": absolute_path, "outputDirectory": absolute_path}, dispatch=...)
    report({"outputDirectory": absolute_path, "format": "json" | "markdown"})

The ``internal-*`` CLI commands are implementation details used by the one
fixed Fabric guest.  They admit work, publish a native return, or checkpoint;
they are not public experiment stages.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

import benchmark_lib as lib
import lifecycle_store as lifecycle

Document = dict[str, Any]
Dispatch = lifecycle.Dispatch


def run(request: Mapping[str, Any], *, dispatch: Dispatch) -> Document:
    """Advance one repeatable, internally bounded benchmark invocation."""
    return lifecycle.execute_run(request, dispatch=dispatch)


def report(request: Mapping[str, Any]) -> Document:
    """Inspect a saved run without dispatch, capability checks, or mutation."""
    return lifecycle.inspect_report(request)


def _bridge_envelope(public: Document, *, token: str | None = None, jobs: list[Document] | None = None) -> Document:
    return {
        "schemaVersion": 1,
        "public": public,
        "invocationToken": token,
        "jobs": jobs or [],
    }


def _bridge_error(run_dir: Path, error: lifecycle.LifecycleError, token: str | None) -> Document:
    if token is not None:
        try:
            lifecycle.release_lock(run_dir, token)
        except lifecycle.LifecycleError:
            pass
    return _bridge_envelope(lifecycle._error_result(run_dir, error))


def _bridge_context(spec_path: Path, run_dir: Path) -> lifecycle.RunContext:
    materialized = lifecycle.materialize_spec(spec_path)
    return lifecycle.initialize_or_resume(materialized, run_dir)


def _fixed_guest_capability_error(spec: Document, capabilities: Document | None = None) -> lifecycle.LifecycleError | None:
    def fixed_dispatch(_: Document) -> Document:
        raise AssertionError("capability marker is never dispatched")

    fixed_dispatch.capabilities = {  # type: ignore[attr-defined]
        "agentsRun": True,
        "nativeResult": True,
        "recursiveHardCallCap": False,
        "settingFields": lifecycle.FIXED_GUEST_SETTING_FIELDS,
    }
    if capabilities is not None:
        fixed_dispatch.capabilities.update(capabilities)  # type: ignore[attr-defined]
    return lifecycle.selected_capability_error(spec, fixed_dispatch)


def internal_admit(
    request: Mapping[str, Any],
    *,
    token: str | None,
    requested_call_ceiling: int,
    configured_call_ceiling: int,
    usable_call_ceiling: int | None,
    fresh_invocation: bool,
    capabilities: Document | None = None,
) -> Document:
    """Acquire/continue one guest invocation and admit at most one wave."""
    run_dir = Path(os.path.abspath(os.fspath(request.get("outputDirectory", "."))))
    active_token = token
    try:
        _, spec_path, run_dir = lifecycle.validate_run_request(request)
        materialized = lifecycle.materialize_spec(spec_path)
        complete = lifecycle._verify_complete_request(materialized, run_dir) if run_dir.exists() else None
        if complete is not None:
            return _bridge_envelope(complete)
        capability_error = _fixed_guest_capability_error(materialized.resolved, capabilities)
        if capability_error is not None:
            raise capability_error

        if active_token is None:
            if usable_call_ceiling is None and not fresh_invocation:
                raise lifecycle.LifecycleError(
                    "UNKNOWN_REMAINING_INVOCATION_BUDGET",
                    "remaining invocation call budget is unknown; the installed public API must expose a usable direct-call allowance before this guest can assign work",
                    status="unsupported",
                )
            for label, value in (
                ("requested", requested_call_ceiling),
                ("configured", configured_call_ceiling),
            ):
                if isinstance(value, bool) or not isinstance(value, int) or value < 0:
                    raise lifecycle.LifecycleError("INVALID_CALL_CEILING", f"{label} call ceiling is invalid", status="unsupported")
            if usable_call_ceiling is not None and (
                isinstance(usable_call_ceiling, bool)
                or not isinstance(usable_call_ceiling, int)
                or usable_call_ceiling < 0
            ):
                raise lifecycle.LifecycleError("INVALID_CALL_CEILING", "usable call ceiling is invalid", status="unsupported")
            effective = min(
                requested_call_ceiling,
                configured_call_ceiling,
                usable_call_ceiling if usable_call_ceiling is not None else configured_call_ceiling,
                lifecycle.HARD_INVOCATION_CALL_CEILING,
            )
            active_token = lifecycle.acquire_lock(run_dir, admitted=0, ceiling=effective)
        lock = lifecycle.read_lock(run_dir, active_token)
        admitted = lock.get("admitted")
        ceiling = lock.get("ceiling")
        if not isinstance(admitted, int) or not isinstance(ceiling, int) or admitted < 0 or ceiling < 0:
            raise lifecycle.LifecycleError("RUN_LOCKED", "invocation lock has invalid budget state", status="blocked")

        context = lifecycle.initialize_or_resume(materialized, run_dir)
        inspection = lifecycle.reconcile_recoverable(context)
        blocked = lifecycle._blocked_from_inspection(context, inspection)
        if blocked is not None:
            lifecycle._checkpoint(context, inspection, "execute", calls_admitted=admitted)
            lifecycle.release_lock(run_dir, active_token)
            return _bridge_envelope(blocked)

        remaining_global = (
            context.spec["stoppingAndBudgets"]["maxDirectCalls"]
            - len(inspection.assignments)
            - lifecycle.grade_job_count(context)
        )
        phase = "grade" if not inspection.pending_ids and context.spec["grading"]["method"] != "deterministic" else "execute"
        if not inspection.pending_ids:
            if context.spec["grading"]["method"] == "deterministic":
                public = lifecycle.finalize(context, inspection)
                lifecycle.release_lock(run_dir, active_token)
                _clean_bridge_directory(run_dir, active_token)
                return _bridge_envelope(public)
            _, grading_complete = lifecycle.admit_model_grade_jobs(context, inspection, maximum=0)
            if grading_complete:
                inspection = lifecycle.reconcile_recoverable(context)
                public = lifecycle.finalize(context, inspection)
                lifecycle.release_lock(run_dir, active_token)
                _clean_bridge_directory(run_dir, active_token)
                return _bridge_envelope(public)
        started = lifecycle.datetime.fromisoformat(lock["startedAt"].replace("Z", "+00:00"))
        elapsed = (lifecycle.datetime.now(lifecycle.timezone.utc) - started).total_seconds()
        time_exhausted = elapsed >= context.spec["stoppingAndBudgets"]["maxWallTimeSeconds"]
        if admitted >= ceiling or remaining_global <= 0 or time_exhausted:
            lifecycle._checkpoint(context, inspection, phase, calls_admitted=admitted)
            if remaining_global <= 0:
                public = lifecycle.public_result(
                    run_dir,
                    status="blocked",
                    phase=phase,
                    counts=inspection.counts,
                    next_action="The saved global direct-call budget cannot admit pending work.",
                    errors=[{"code": "DIRECT_CALL_BUDGET_EXHAUSTED", "message": "No pending call can be admitted.", "workId": None}],
                    limitations=[],
                )
            else:
                public = lifecycle.public_result(
                    run_dir,
                    status="checkpoint",
                    phase=phase,
                    counts=inspection.counts,
                    next_action="Repeat the identical run request; pending work is selected internally.",
                    errors=[],
                    limitations=[],
                )
            lifecycle.release_lock(run_dir, active_token)
            _clean_bridge_directory(run_dir, active_token)
            return _bridge_envelope(public)

        concurrency = min(1 if "taskState" in context.spec else context.spec["design"]["concurrency"]["max"], ceiling - admitted, remaining_global)
        if not inspection.pending_ids:
            grade_jobs, grading_complete = lifecycle.admit_model_grade_jobs(
                context,
                inspection,
                maximum=concurrency,
            )
            if grading_complete:
                inspection = lifecycle.reconcile_recoverable(context)
                public = lifecycle.finalize(context, inspection)
                lifecycle.release_lock(run_dir, active_token)
                _clean_bridge_directory(run_dir, active_token)
                return _bridge_envelope(public)
            jobs = [
                {
                    "workId": job["jobId"],
                    "role": "judge" if job["phase"] == "judge" else "adjudicator",
                    "request": job["request"],
                }
                for job in grade_jobs
            ]
            admitted += len(jobs)
            lifecycle.update_lock(run_dir, active_token, admitted=admitted, ceiling=ceiling)
            lifecycle._checkpoint(context, inspection, "grade", calls_admitted=admitted)
            public = lifecycle.public_result(
                run_dir,
                status="checkpoint",
                phase="grade",
                counts=inspection.counts,
                next_action="The fixed guest will dispatch the internally admitted grading wave.",
                errors=[],
                limitations=[],
            )
            return _bridge_envelope(public, token=active_token, jobs=jobs)
        wave_ids = inspection.pending_ids[:concurrency]
        jobs: list[Document] = []
        for attempt_id in wave_ids:
            assignment = lifecycle.publish_assignment(
                context,
                lifecycle._row_for_id(context, inspection, attempt_id),
            )
            jobs.append(
                {
                    "workId": attempt_id,
                    "role": "retry" if assignment["retryOf"] is not None else "measured",
                    "request": assignment["request"],
                }
            )
        admitted += len(jobs)
        lifecycle.update_lock(run_dir, active_token, admitted=admitted, ceiling=ceiling)
        inspection = lifecycle.inspect_records(context)
        lifecycle._checkpoint(context, inspection, "execute", calls_admitted=admitted)
        public = lifecycle.public_result(
            run_dir,
            status="checkpoint",
            phase="execute",
            counts=inspection.counts,
            next_action="The fixed guest will dispatch the internally admitted wave.",
            errors=[],
            limitations=[],
        )
        return _bridge_envelope(public, token=active_token, jobs=jobs)
    except lifecycle.LifecycleError as exc:
        return _bridge_error(run_dir, exc, active_token)
    except Exception as exc:
        error = lifecycle.LifecycleError("INTERNAL_ERROR", f"internal admission failed: {exc}")
        return _bridge_error(run_dir, error, active_token)


def _exception_from_bridge(value: Mapping[str, Any]) -> BaseException:
    name = value.get("name")
    message = str(value.get("message") or name or "agents.run failed")
    lowered = str(name).lower()
    if "timeout" in lowered or "timed" in lowered:
        return TimeoutError(message)
    if "cancel" in lowered or "abort" in lowered:
        class CancelledError(Exception):
            pass

        return CancelledError(message)
    return RuntimeError(message)


def internal_publish_result(
    *,
    spec_path: Path,
    run_dir: Path,
    token: str,
    attempt_id: str,
    result_path: Path,
) -> Document:
    """Publish one complete native return, then derive its terminal."""
    try:
        lock = lifecycle.read_lock(run_dir, token)
        context = _bridge_context(spec_path, run_dir)
        assignment_path = run_dir / "attempts" / attempt_id / "assignment.json"
        grade_assignment_path = run_dir / "grading" / "jobs" / attempt_id / "assignment.json"
        is_grade_job = not assignment_path.exists() and grade_assignment_path.exists()
        selected_assignment_path = grade_assignment_path if is_grade_job else assignment_path
        assignment = lib.load_json(selected_assignment_path)
        if not isinstance(assignment, dict):
            raise lifecycle.LifecycleError("MALFORMED_ASSIGNMENT", "assignment is not an object", work_id=attempt_id)
        payload = lib.load_json(result_path)
        if not isinstance(payload, dict) or set(payload) - {"native", "error"}:
            raise lifecycle.LifecycleError("MALFORMED_BRIDGE_RESULT", "bridge result payload is invalid", work_id=attempt_id)
        if "error" in payload:
            error_value = payload["error"]
            if not isinstance(error_value, dict):
                raise lifecycle.LifecycleError("MALFORMED_BRIDGE_RESULT", "bridge error must be an object", work_id=attempt_id)
            result_record = lifecycle.make_result_record(attempt_id, error=_exception_from_bridge(error_value))
        elif "native" in payload:
            result_record = lifecycle.make_result_record(attempt_id, native=payload["native"])
        else:
            raise lifecycle.LifecycleError("MALFORMED_BRIDGE_RESULT", "bridge result has neither native nor error", work_id=attempt_id)
        if is_grade_job:
            lifecycle.publish_grade_result(context, assignment, result_record)
            lifecycle.consume_grade_result(context, assignment)
            phase = "grade"
        else:
            lifecycle.publish_result(context, attempt_id, result_record)
            if (
                result_record["dispatchStatus"] != "completed"
                or context.spec["grading"]["method"] == "deterministic"
            ):
                lifecycle.derive_terminal(context, attempt_id, assignment, result_record)
            phase = "execute"
        inspection = lifecycle.inspect_records(context)
        lifecycle._checkpoint(context, inspection, phase, calls_admitted=int(lock.get("admitted", 0)))
        try:
            result_path.unlink()
        except OSError:
            pass
        public = lifecycle.public_result(
            run_dir,
            status="checkpoint",
            phase=phase,
            counts=inspection.counts,
            next_action="Continue the internally admitted wave.",
            errors=[],
            limitations=[],
        )
        return _bridge_envelope(public, token=token)
    except lifecycle.LifecycleError as exc:
        return _bridge_error(run_dir, exc, token)
    except (lib.BenchmarkError, OSError, Exception) as exc:
        error = lifecycle.LifecycleError("INTERNAL_PUBLICATION_ERROR", f"internal result publication failed: {exc}", work_id=attempt_id)
        return _bridge_error(run_dir, error, token)


def internal_checkpoint(*, spec_path: Path, run_dir: Path, token: str) -> Document:
    """Reconcile a completed guest wave and publish its replaceable checkpoint."""
    try:
        lock = lifecycle.read_lock(run_dir, token)
        context = _bridge_context(spec_path, run_dir)
        inspection = lifecycle.reconcile_recoverable(context)
        phase = "grade" if not inspection.pending_ids and context.spec["grading"]["method"] != "deterministic" else "execute"
        lifecycle._checkpoint(context, inspection, phase, calls_admitted=int(lock.get("admitted", 0)))
        blocked = lifecycle._blocked_from_inspection(context, inspection)
        if blocked is not None:
            lifecycle.release_lock(run_dir, token)
            return _bridge_envelope(blocked)
        public = lifecycle.public_result(
            run_dir,
            status="checkpoint",
            phase=phase,
            counts=inspection.counts,
            next_action="The fixed guest will request the next internal admission decision.",
            errors=[],
            limitations=[],
        )
        return _bridge_envelope(public, token=token)
    except lifecycle.LifecycleError as exc:
        return _bridge_error(run_dir, exc, token)
    except Exception as exc:
        return _bridge_error(run_dir, lifecycle.LifecycleError("INTERNAL_CHECKPOINT_ERROR", str(exc)), token)


def _clean_bridge_directory(run_dir: Path, token: str) -> None:
    path = run_dir / ".bridge" / token
    try:
        shutil.rmtree(path)
        parent = path.parent
        if parent.exists() and not any(parent.iterdir()):
            parent.rmdir()
    except OSError:
        pass


def _parse_nonnegative(value: str) -> int:
    parsed = int(value)
    if parsed < 0:
        raise argparse.ArgumentTypeError("expected a non-negative integer")
    return parsed


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    report_parser = subparsers.add_parser("report", help="read a saved run without mutation")
    report_parser.add_argument("--run-dir", required=True)
    report_parser.add_argument("--format", choices=("json", "markdown"), required=True)

    admit = subparsers.add_parser("internal-admit", help=argparse.SUPPRESS)
    admit.add_argument("--spec-path", required=True)
    admit.add_argument("--output-directory", required=True)
    admit.add_argument("--token")
    admit.add_argument("--requested-call-ceiling", type=_parse_nonnegative, default=100)
    admit.add_argument("--configured-call-ceiling", type=_parse_nonnegative, default=100)
    admit.add_argument("--usable-call-ceiling", type=_parse_nonnegative)
    admit.add_argument("--fresh-invocation", action="store_true")
    admit.add_argument("--capabilities", type=json.loads)

    preflight = subparsers.add_parser("internal-preflight", help=argparse.SUPPRESS)
    preflight.add_argument("--spec-path", required=True)
    preflight.add_argument("--output-directory", required=True)

    publish = subparsers.add_parser("internal-publish-result", help=argparse.SUPPRESS)
    publish.add_argument("--spec-path", required=True)
    publish.add_argument("--output-directory", required=True)
    publish.add_argument("--token", required=True)
    publish.add_argument("--attempt-id", required=True)
    publish.add_argument("--result-path", required=True)

    checkpoint = subparsers.add_parser("internal-checkpoint", help=argparse.SUPPRESS)
    checkpoint.add_argument("--spec-path", required=True)
    checkpoint.add_argument("--output-directory", required=True)
    checkpoint.add_argument("--token", required=True)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    if args.command == "report":
        run_dir = Path(args.run_dir)
        try:
            _, canonical, format_name = lifecycle.validate_report_request(
                {"outputDirectory": os.fspath(run_dir), "format": args.format}
            )
            sys.stdout.write(lifecycle.read_report_view(canonical, format_name))
            return 0
        except (lifecycle.LifecycleError, lib.BenchmarkError, OSError) as exc:
            print(str(exc), file=sys.stderr)
            return 2

    request = {"specPath": args.spec_path, "outputDirectory": args.output_directory}
    if args.command == "internal-preflight":
        try:
            _, spec_path, run_dir = lifecycle.validate_run_request(request)
            materialized = lifecycle.materialize_spec(spec_path)
            complete = lifecycle._verify_complete_request(materialized, run_dir) if run_dir.exists() else None
            result = _bridge_envelope(complete or lifecycle.public_result(run_dir, status="checkpoint", phase="execute", counts={}, next_action="Inspect selected capabilities.", errors=[], limitations=[]))
        except lifecycle.LifecycleError as exc:
            result = _bridge_error(Path(args.output_directory), exc, None)
    elif args.command == "internal-admit":
        result = internal_admit(
            request,
            token=args.token,
            requested_call_ceiling=args.requested_call_ceiling,
            configured_call_ceiling=args.configured_call_ceiling,
            usable_call_ceiling=args.usable_call_ceiling,
            fresh_invocation=args.fresh_invocation,
            capabilities=args.capabilities,
        )
    elif args.command == "internal-publish-result":
        result = internal_publish_result(
            spec_path=Path(args.spec_path),
            run_dir=Path(args.output_directory),
            token=args.token,
            attempt_id=args.attempt_id,
            result_path=Path(args.result_path),
        )
    else:
        result = internal_checkpoint(
            spec_path=Path(args.spec_path),
            run_dir=Path(args.output_directory),
            token=args.token,
        )
    sys.stdout.write(json.dumps(result, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
