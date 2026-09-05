#!/usr/bin/env python3
"""Behavioral acceptance evidence for the WP5 model backend.

The stochastic budgets and tolerances below are frozen test inputs.  A failed
run is reported once; this suite never retries an unchanged fit hoping for a
favorable chain.  The tests distinguish label observations, raw outputs and
tasks; exercise both supported statsmodels covariance constructions; and use
direct PyMC prior, posterior and posterior-predictive sampling.
"""

from __future__ import annotations

import copy
import importlib.util
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "analysis_models.py"
ARTIFACT_ROOT = ROOT / "tests" / ".tmp-analysis-models"

spec = importlib.util.spec_from_file_location("analysis_models", SCRIPT)
assert spec is not None and spec.loader is not None
analysis_models = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = analysis_models
spec.loader.exec_module(analysis_models)

# Prespecified once for this suite.  These compact budgets test the adapter,
# not certify a production posterior.  Tolerances are deliberately explicit.
BAYES_DRAWS = 140
BAYES_TUNE = 140
BAYES_CHAINS = 2
TEST_DIAGNOSTICS = {
    "rhatMax": 1.25,
    "essBulkMin": 8.0,
    "essTailMin": 8.0,
    "mcseRelativeMax": 0.9,
    "maxDivergences": 2,
}


def paired(tasks: list[str], *, threshold: float = 0.0) -> dict[str, object]:
    return {
        "contrast": {
            "metricId": "quality",
            "candidateConditionId": "candidate",
            "controlConditionId": "control",
            "direction": "higher",
            "practicalThreshold": threshold,
            "nonInferiorityMargin": 0.1,
            "taskWeights": {task: index + 1 for index, task in enumerate(tasks)},
        },
        "rawPairedEstimate": "retained-verbatim",
    }


def method(
    name: str,
    *,
    random_effects: list[str],
    seed: int,
    priors: dict[str, object] | None = None,
) -> dict[str, object]:
    bayesian = name.startswith("bayesian-")
    configured_priors: dict[str, object] = {"metricId": "quality"}
    if bayesian:
        configured_priors.update(
            {
                "tune": BAYES_TUNE,
                "priorPredictiveDraws": 40,
                **TEST_DIAGNOSTICS,
            }
        )
    else:
        configured_priors.update({"varianceTolerance": 1e-8, "fitMaxIterations": 1000})
    if priors:
        configured_priors.update(priors)
    return {
        "id": name + "-test",
        "method": name,
        "likelihood": "bernoulli" if name == "bayesian-bernoulli" else "gaussian",
        "fixedEffects": ["intercept", "condition"],
        "randomEffects": random_effects,
        "priors": configured_priors,
        "sampler": "nuts" if bayesian else "not-applicable",
        "intervalProbability": 0.9,
        "draws": BAYES_DRAWS if bayesian else 0,
        "chains": BAYES_CHAINS if bayesian else 0,
        "seed": seed,
    }


def request(
    selected_method: dict[str, object],
    rows: list[dict[str, object]],
    tasks: list[str],
    *,
    labels: list[dict[str, object]] | None = None,
    artifact_directory: Path | None = None,
) -> dict[str, object]:
    dataset: dict[str, object] = {"schemaVersion": 1, "rows": rows}
    if labels is not None:
        dataset["labels"] = labels
    result: dict[str, object] = {
        "schemaVersion": 1,
        "method": selected_method,
        "dataset": dataset,
        "pairedResult": paired(tasks),
    }
    if artifact_directory is not None:
        result["artifactDirectory"] = str(artifact_directory.resolve())
    return result


def continuous_rows(
    *,
    tasks: int = 18,
    repetitions: int = 3,
    zero_variance: bool = False,
    condition_effect: float = 0.75,
) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for task_index in range(tasks):
        task_id = f"task-{task_index:02d}"
        task_effect = 0.0 if zero_variance else ((task_index % 7) - 3) * 0.22
        task_slope = 0.0 if zero_variance else ((task_index % 5) - 2) * 0.13
        for condition_index, condition_id in enumerate(("control", "candidate")):
            for repetition in range(repetitions):
                residual = 0.0 if zero_variance else (((task_index * 11 + repetition * 7 + condition_index) % 9) - 4) * 0.025
                value = 1.0 if zero_variance else 0.2 + task_effect + condition_index * (condition_effect + task_slope) + residual
                attempt_id = f"out-{task_index:02d}-{condition_id}-{repetition}"
                rows.append(
                    {
                        "attemptId": attempt_id,
                        "taskId": task_id,
                        "family": f"family-{task_index % 4}",
                        "conditionId": condition_id,
                        "repetition": repetition + 1,
                        "outcomes": [
                            {"metricId": "quality", "status": "observed", "value": value}
                        ],
                    }
                )
    return rows


def crossed_gaussian_data() -> tuple[list[dict[str, object]], list[dict[str, object]], list[str]]:
    rows: list[dict[str, object]] = []
    labels: list[dict[str, object]] = []
    tasks = [f"task-{index:02d}" for index in range(12)]
    grader_effects = {"grader-a": -0.18, "grader-b": 0.04, "grader-c": 0.14}
    for task_index, task_id in enumerate(tasks):
        task_effect = ((task_index % 5) - 2) * 0.24
        for condition_index, condition_id in enumerate(("control", "candidate")):
            output_id = f"crossed-{task_id}-{condition_id}"
            output_effect = ((task_index * 3 + condition_index) % 5 - 2) * 0.16
            rows.append(
                {
                    "attemptId": output_id,
                    "outputId": output_id,
                    "taskId": task_id,
                    "conditionId": condition_id,
                    "family": f"family-{task_index % 3}",
                    "outcomes": [],
                }
            )
            for grader_index, (grader_id, grader_effect) in enumerate(grader_effects.items()):
                value = (
                    0.1
                    + task_effect
                    + condition_index * 0.62
                    + output_effect
                    + grader_effect
                    + ((task_index + grader_index) % 3 - 1) * 0.055
                )
                labels.append(
                    {
                        "gradeId": f"grade-{output_id}-{grader_id}",
                        "attemptId": output_id,
                        "outputId": output_id,
                        "graderId": grader_id,
                        "status": "valid",
                        "labels": [
                            {"criterionId": "quality", "score": value, "status": "valid"}
                        ],
                    }
                )
    return rows, labels, tasks


def gaussian_bayes_rows() -> tuple[list[dict[str, object]], list[str]]:
    rows = continuous_rows(tasks=8, repetitions=2)
    tasks = sorted({str(row["taskId"]) for row in rows})
    return rows, tasks


def binary_crossed_data() -> tuple[list[dict[str, object]], list[dict[str, object]], list[str]]:
    """Perfect condition separation with every output crossed by three graders."""
    tasks = [f"task-{index:02d}" for index in range(8)]
    rows: list[dict[str, object]] = []
    labels: list[dict[str, object]] = []
    graders = ("grader-a", "grader-b", "grader-c")
    for task_index, task_id in enumerate(tasks):
        for condition_id in ("control", "candidate"):
            output_id = f"binary-{task_id}-{condition_id}"
            rows.append(
                {
                    "attemptId": output_id,
                    "outputId": output_id,
                    "taskId": task_id,
                    "conditionId": condition_id,
                    "family": f"family-{task_index % 3}",
                    "outcomes": [],
                }
            )
            for grader_index, grader_id in enumerate(graders):
                # Perfect separation is intentional. Proper priors must keep the
                # Bayesian posterior finite; no Gaussian binary fallback exists.
                score = 1 if condition_id == "candidate" else 0
                labels.append(
                    {
                        "gradeId": f"grade-{output_id}-{grader_id}",
                        "attemptId": output_id,
                        "outputId": output_id,
                        "graderId": grader_id,
                        "status": "valid",
                        "labels": [
                            {
                                "criterionId": "quality",
                                "score": score,
                                "status": "valid",
                                "uncertainty": 0.05 + grader_index * 0.01,
                            }
                        ],
                    }
                )
    return rows, labels, tasks


def diagnostic(result: dict[str, object], code: str) -> dict[str, object]:
    matches = [row for row in result["diagnostics"] if row["code"] == code]
    if len(matches) != 1:
        raise AssertionError(f"expected one diagnostic {code!r}, got {matches!r}")
    return matches[0]


class ContractAndFailureEvidence(unittest.TestCase):
    """Lazy loading, exact framework selection and identifiability failures."""

    def test_import_and_saved_report_inspection_need_no_numerical_backend(self) -> None:
        report_path = ARTIFACT_ROOT / "saved-model-report.json"
        ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)
        expected = {
            "schemaVersion": 1,
            "status": "complete",
            "pairedResult": {"effect": 0.4},
            "model": {"method": "already-saved"},
            "diagnostics": [],
            "artifacts": [],
            "limitations": [],
        }
        report_path.write_text(json.dumps(expected), encoding="utf-8")
        payload = """
import importlib.abc, importlib.util, json, sys
class BlockBackends(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname.split(".")[0] in {"numpy", "scipy", "statsmodels", "pymc", "arviz"}:
            raise RuntimeError("numerical backend import attempted: " + fullname)
        return None
sys.meta_path.insert(0, BlockBackends())
module_spec = importlib.util.spec_from_file_location("isolated_analysis_models", sys.argv[1])
module = importlib.util.module_from_spec(module_spec)
sys.modules[module_spec.name] = module
module_spec.loader.exec_module(module)
print(json.dumps(module.inspect_model_report(sys.argv[2]), sort_keys=True))
"""
        completed = subprocess.run(
            [sys.executable, "-c", payload, str(SCRIPT), str(report_path)],
            cwd=ROOT,
            check=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        self.assertEqual(json.loads(completed.stdout), expected)
        self.assertNotIn("numpy", analysis_models.__dict__)
        report_path.unlink()
        ARTIFACT_ROOT.rmdir()

    def test_missing_selected_backend_is_actionable_and_never_substitutes(self) -> None:
        rows, tasks = gaussian_bayes_rows()
        selected = method("bayesian-gaussian", random_effects=["task-intercept"], seed=11)
        original = copy.deepcopy(request(selected, rows, tasks))
        real_import = analysis_models.importlib.import_module

        def missing(name: str, *args: object, **kwargs: object) -> object:
            if name == "pymc":
                raise ModuleNotFoundError("deliberately absent")
            return real_import(name, *args, **kwargs)

        with mock.patch.object(analysis_models.importlib, "import_module", side_effect=missing):
            result = analysis_models.analysis_models(original)
        self.assertEqual(result["status"], "unsupported")
        self.assertIsNone(result["model"])
        row = diagnostic(result, "MODEL_BACKEND_UNAVAILABLE")
        self.assertIn("requirements-models.txt", row["message"])
        self.assertIn("no alternative model", row["message"])

    def test_existing_posterior_artifact_refuses_before_stochastic_fit(self) -> None:
        rows, tasks = gaussian_bayes_rows()
        selected = method("bayesian-gaussian", random_effects=["task-intercept"], seed=12)
        destination = ARTIFACT_ROOT / "collision"
        destination.mkdir(parents=True, exist_ok=True)
        existing = destination / f"{selected['id']}-posterior.npz"
        existing.write_bytes(b"existing")
        with mock.patch.object(analysis_models, "_sample_bayesian") as sampler:
            result = analysis_models.analysis_models(
                request(selected, rows, tasks, artifact_directory=destination)
            )
        sampler.assert_not_called()
        self.assertEqual(result["status"], "failed")
        diagnostic(result, "MODEL_ARTIFACT_EXISTS")
        shutil.rmtree(destination)
        ARTIFACT_ROOT.rmdir()

    def test_unknown_prior_setting_is_not_silently_ignored(self) -> None:
        rows, tasks = gaussian_bayes_rows()
        selected = method("bayesian-gaussian", random_effects=["task-intercept"], seed=13)
        selected["priors"]["conditionScael"] = 2.0
        result = analysis_models.analysis_models(request(selected, rows, tasks))
        self.assertEqual(result["status"], "unsupported")
        diagnostic(result, "UNSUPPORTED_PRIOR_SETTING")

    def test_general_frequentist_binary_glmm_is_rejected_specifically(self) -> None:
        rows, labels, tasks = binary_crossed_data()
        selected = method(
            "gaussian-mixedlm",
            random_effects=["task-intercept", "grader-intercept"],
            seed=17,
        )
        selected["likelihood"] = "bernoulli"
        result = analysis_models.analysis_models(request(selected, rows, tasks, labels=labels))
        self.assertEqual(result["status"], "unsupported")
        self.assertIsNone(result["model"])
        self.assertEqual(
            diagnostic(result, "UNSUPPORTED_FREQUENTIST_BINARY_GLMM")["severity"],
            "error",
        )

    def test_request_is_not_mutated_and_paired_result_is_retained_on_failure(self) -> None:
        rows, tasks = gaussian_bayes_rows()
        selected = method("bayesian-gaussian", random_effects=["task-condition"], seed=19)
        supplied = request(selected, rows, tasks)
        supplied["dataset"]["rows"] = [
            row
            for row in supplied["dataset"]["rows"]
            if not (row["taskId"] == tasks[-1] and row["conditionId"] == "candidate")
        ]
        before = copy.deepcopy(supplied)
        result = analysis_models.analysis_models(supplied)
        self.assertEqual(supplied, before)
        self.assertEqual(result["pairedResult"], supplied["pairedResult"])
        self.assertEqual(result["status"], "failed")
        diagnostic(result, "TASK_CONDITION_NOT_IDENTIFIABLE")

    def test_single_grader_and_disconnected_crossed_designs_fail_before_fit(self) -> None:
        rows, labels, tasks = binary_crossed_data()
        selected = method(
            "bayesian-bernoulli",
            random_effects=["task-intercept", "grader-intercept"],
            seed=23,
        )
        single = [label for label in labels if label["graderId"] == "grader-a"]
        one_result = analysis_models.analysis_models(request(selected, rows, tasks, labels=single))
        self.assertEqual(one_result["status"], "failed")
        diagnostic(one_result, "SINGLE_GRADER_NOT_IDENTIFIABLE")

        disconnected = []
        for label in labels:
            task_number = int(str(label["attemptId"]).split("-")[2])
            wanted = "grader-a" if task_number < 4 else "grader-b"
            if label["graderId"] == wanted:
                disconnected.append(label)
        disconnected_result = analysis_models.analysis_models(
            request(selected, rows, tasks, labels=disconnected)
        )
        self.assertEqual(disconnected_result["status"], "failed")
        diagnostic(disconnected_result, "DISCONNECTED_GRADER_OUTPUT_DESIGN")

    def test_same_output_cannot_be_recast_as_multiple_tasks(self) -> None:
        rows, labels, tasks = binary_crossed_data()
        labels[3]["outputId"] = labels[0]["outputId"]
        labels[3]["attemptId"] = labels[0]["attemptId"]
        labels[3]["taskId"] = "task-conflict"
        selected = method("bayesian-bernoulli", random_effects=["task-intercept"], seed=29)
        result = analysis_models.analysis_models(request(selected, rows, tasks, labels=labels))
        self.assertEqual(result["status"], "failed")
        diagnostic(result, "OUTPUT_IDENTITY_CONFLICT")

    def test_two_task_frequentist_random_slope_is_identifiability_failure(self) -> None:
        rows = continuous_rows(tasks=2)
        tasks = ["task-00", "task-01"]
        selected = method(
            "gaussian-mixedlm",
            random_effects=["task-intercept", "task-condition"],
            seed=31,
        )
        result = analysis_models.analysis_models(request(selected, rows, tasks))
        self.assertEqual(result["status"], "failed")
        diagnostic(result, "TOO_FEW_FREQUENTIST_CLUSTERS")


class ModelAuditRegressions(unittest.TestCase):
    """Independent red-capable finite-task and real ArviZ audit reproductions."""

    def test_random_slopes_weighted_prediction_and_joint_uncertainty_oracle(self):
        import numpy as np
        import pandas as pd
        import statsmodels.formula.api as smf
        rows = continuous_rows()
        tasks = sorted({r['taskId'] for r in rows})
        frame = pd.DataFrame({'y': [r['outcomes'][0]['value'] for r in rows],
                              'x': [float(r['conditionId'] == 'candidate') for r in rows],
                              'task': [r['taskId'] for r in rows]})
        # Independent fit and marginal-V BLUP/error-covariance oracle, not a
        # call to the adapter or its joint-precision reconstruction.
        fit = smf.mixedlm('y ~ x', frame, groups=frame.task, re_formula='1 + x').fit(
            reml=False, method=['lbfgs', 'bfgs', 'cg'], disp=False)
        X = np.column_stack([np.ones(len(rows)), frame.x])
        Z = np.zeros((len(rows), 2 * len(tasks)))
        for i, row in enumerate(rows):
            j = tasks.index(row['taskId'])
            Z[i, 2*j:2*j+2] = X[i]
        G = np.kron(np.eye(len(tasks)), np.asarray(fit.cov_re))
        V = Z @ G @ Z.T + fit.scale * np.eye(len(rows))
        ViX = np.linalg.solve(V, X)
        Cbeta = np.linalg.inv(X.T @ ViX)
        beta = Cbeta @ ViX.T @ frame.y
        A = G @ Z.T @ ViX
        Cb = G - G @ Z.T @ np.linalg.solve(V, Z @ G)
        b = G @ Z.T @ np.linalg.solve(V, frame.y - X @ beta)
        estimates = []
        for focus in ('task-00', 'task-04'):
            q = request(method('gaussian-mixedlm', random_effects=['task-intercept', 'task-condition'], seed=37), rows, tasks)
            weights = np.array([1e6 if t == focus else 1. for t in tasks]); weights /= weights.sum()
            q['pairedResult']['contrast']['taskWeights'] = dict(zip(tasks, weights))
            r = analysis_models.analysis_models(q)
            self.assertEqual(r['status'], 'complete', r)
            c = r['model']['outcomeScaleContrast']
            l = np.zeros(2 * len(tasks)); l[1::2] = weights
            k = np.array([0., 1.]) - l @ A
            expected_variance = l @ Cb @ l + k @ Cbeta @ k
            self.assertAlmostEqual(c['estimate'], float(beta[1] + l @ b), delta=1e-7)
            self.assertAlmostEqual(c['standardError']**2, float(expected_variance), delta=1e-8)
            self.assertEqual(c['target'], 'saved-finite-task-conditional-mean-difference')
            for j, p in enumerate(c['taskPredictions']):
                self.assertAlmostEqual(p['control'], float(beta[0] + b[2*j]), delta=1e-7)
                self.assertAlmostEqual(p['orientedDifference'], float(beta[1] + b[2*j+1]), delta=1e-7)
            estimates.append(c['estimate'])
        self.assertGreater(estimates[1] - estimates[0], .3)

    def test_crossed_random_slopes_weights_and_covariance_oracle(self):
        import numpy as np
        import pandas as pd
        import statsmodels.formula.api as smf
        rows = continuous_rows(tasks=18, repetitions=4)
        tasks = sorted({r['taskId'] for r in rows})
        labels = []
        for i, row in enumerate(rows):
            value = row['outcomes'][0]['value']
            row['outcomes'] = []
            for j, offset in enumerate([-.25, .05, .2]):
                labels.append({'gradeId': f'g-{i}-{j}', 'attemptId': row['attemptId'],
                               'graderId': f'grader-{j}', 'status': 'valid',
                               'labels': [{'criterionId': 'quality', 'score': value + offset + .04*((i+2*j)%5-2), 'status': 'valid'}]})
        # Independent crossed formula fit. Its prediction mean is reconstructed
        # by literal variance-component labels; covariance via marginal V.
        frame = pd.DataFrame([{'y': l['labels'][0]['score'], 'task': rows[i//3]['taskId'],
                               'x': float(rows[i//3]['conditionId'] == 'candidate'),
                               'output': l['attemptId'], 'grader': l['graderId'], 'group': 'all'}
                              for i, l in enumerate(labels)])
        fit = smf.mixedlm('y ~ x', frame, groups=frame.group, re_formula='0',
                         vc_formula={'task': '0 + C(task)', 'task_condition_0': '0 + C(task):x',
                                     'grader': '0 + C(grader)', 'output': '0 + C(output)'}).fit(
                                         reml=False, method=['lbfgs', 'bfgs', 'cg'], disp=False)
        X = np.column_stack([np.ones(len(frame)), frame.x])
        Zparts = []
        for name in fit.model.exog_vc.names:
            if name == 'task_condition_0':
                part = np.column_stack([(frame.task == t).astype(float) * frame.x for t in tasks])
            else:
                levels = sorted(frame[name].unique())
                part = np.column_stack([(frame[name] == t).astype(float) for t in levels])
            Zparts.append(part)
        Z = np.column_stack(Zparts)
        gv = np.concatenate([np.repeat(v, z.shape[1]) for v, z in zip(fit.vcomp, Zparts)])
        G = np.diag(gv); V = Z @ G @ Z.T + fit.scale * np.eye(len(X))
        ViX = np.linalg.solve(V, X); Cbeta = np.linalg.inv(X.T @ ViX)
        beta = Cbeta @ ViX.T @ frame.y
        b = G @ Z.T @ np.linalg.solve(V, frame.y - X @ beta)
        A = G @ Z.T @ ViX; Cb = G - G @ Z.T @ np.linalg.solve(V, Z @ G)
        estimates = []
        for focus in ['task-00', 'task-04']:
            weights = np.array([1e6 if t == focus else 1. for t in tasks]); weights /= weights.sum()
            q = request(method('gaussian-mixedlm', random_effects=['task-intercept', 'task-condition', 'grader-intercept'], seed=51), rows, tasks, labels=labels)
            q['pairedResult']['contrast']['taskWeights'] = dict(zip(tasks, weights))
            r = analysis_models.analysis_models(q)
            self.assertEqual(r['status'], 'complete', r)
            l = np.concatenate([weights if n == 'task_condition_0' else np.zeros(z.shape[1])
                                for n, z in zip(fit.model.exog_vc.names, Zparts)])
            k = np.array([0., 1.]) - l @ A
            c = r['model']['outcomeScaleContrast']
            self.assertAlmostEqual(c['estimate'], float(beta[1] + l @ b), delta=1e-6)
            self.assertAlmostEqual(c['standardError']**2, float(l @ Cb @ l + k @ Cbeta @ k), delta=1e-7)
            estimates.append(c['estimate'])
        self.assertGreater(estimates[1] - estimates[0], .3)

    @staticmethod
    def diagnostic_fixture(*, frozen=False, bad_contrast=False):
        import numpy as np
        import arviz as az
        import xarray as xr
        from types import SimpleNamespace
        rng = np.random.default_rng(126)
        n = 2000
        post = xr.Dataset({'intercept': (('chain', 'draw'), rng.normal(size=(2, n))),
                           'beta_condition': (('chain', 'draw', 'condition'),
                                              np.zeros((2, n, 1)) if frozen else rng.normal(size=(2, n, 1)))})
        stats = xr.Dataset({'diverging': (('chain', 'draw'), np.zeros((2, n), dtype=bool))})
        y = xr.Dataset({'y_obs': (('chain', 'draw', 'observation'), rng.normal(size=(2, n, 4)))})
        contrast = np.zeros((2, n)) if frozen else rng.normal(size=(2, n))
        if bad_contrast:
            contrast[1] += 4
        fit = analysis_models._BayesianFit(
            idata=xr.DataTree.from_dict({'posterior': post, 'sample_stats': stats}),
            prior=xr.DataTree.from_dict({'prior_predictive': y}),
            posterior_predictive=xr.DataTree.from_dict({'posterior_predictive': y}),
            contrast_draws=contrast, elapsed_seconds=0, memory={},
            priors=dict(analysis_models._DEFAULT_PRIORS, tune=100),
            diagnostic_variables=('intercept', 'beta_condition'), model_metadata={})
        data = SimpleNamespace(observations=[SimpleNamespace(value=0.)]*4,
                               output_count=4, tasks=['a', 'b'], graders=[], repeated_label_count=0)
        return fit, {'sampler': 'nuts', 'draws': n, 'chains': 2}, data, {'numpy': np, 'arviz': az}

    def test_actual_frozen_parameter_nan_rhat_blocks_inference(self):
        rows, ok = analysis_models._arviz_diagnostics(*self.diagnostic_fixture(frozen=True))
        self.assertFalse(ok)
        self.assertFalse(next(r for r in rows if r['code'] == 'RANK_NORMALIZED_SPLIT_RHAT')['passed'])
        json.dumps(rows, allow_nan=False)

    def test_reported_contrast_has_its_own_diagnostics(self):
        rows, ok = analysis_models._arviz_diagnostics(*self.diagnostic_fixture(bad_contrast=True))
        self.assertFalse(ok)
        self.assertFalse(next(r for r in rows if r['code'] == 'RANK_NORMALIZED_SPLIT_RHAT')['passed'])

    def test_missing_coordinate_or_nuts_divergences_blocks_inference(self):
        from dataclasses import replace
        import numpy as np
        args = list(self.diagnostic_fixture())
        fit = args[0]
        tree = fit.idata.copy(deep=True)
        # A genuinely two-coordinate sampled parameter, with only one omitted
        # from a backend summary. Diagnose ALL coordinates, not only variables.
        post = tree['posterior'].to_dataset().drop_dims('condition')
        rng = np.random.default_rng(918)
        post['beta_condition'] = (('chain', 'draw', 'condition'), rng.normal(size=(2, 2000, 2)))
        tree['posterior'] = post
        args[0] = replace(fit, idata=tree)
        az = args[-1]['arviz']; original = az.ess
        def missing_coordinate(*a, **kw):
            result = original(*a, **kw)
            return result.isel(condition=[0])
        with mock.patch.object(az, 'ess', side_effect=missing_coordinate):
            self.assertFalse(analysis_models._arviz_diagnostics(*args)[1])
        tree['sample_stats'] = tree['sample_stats'].to_dataset().drop_vars('diverging')
        self.assertFalse(analysis_models._arviz_diagnostics(*args)[1])

    def test_nonfinite_or_missing_diagnostic_coordinates_never_filtered(self):
        import numpy as np
        args = self.diagnostic_fixture()
        az = args[-1]['arviz']
        self.assertTrue(analysis_models._arviz_diagnostics(*args)[1])  # real baseline
        for api, mode in [('rhat', 'rank'), ('ess', 'bulk'), ('ess', 'tail'), ('mcse', 'mean')]:
            original = getattr(az, api)
            for defect in ('nan', 'inf', 'missing'):
                def corrupt(*a, **kw):
                    result = original(*a, **kw).copy(deep=True)
                    if kw.get('method') == mode:
                        if defect == 'missing':
                            result = result.drop_vars('beta_condition')
                        else:
                            result['beta_condition'].values[...] = np.nan if defect == 'nan' else np.inf
                    return result
                with self.subTest(api=api, mode=mode, defect=defect), mock.patch.object(az, api, side_effect=corrupt):
                    rows, ok = analysis_models._arviz_diagnostics(*args)
                    self.assertFalse(ok)
                    json.dumps(rows, allow_nan=False)


class FrequentistGaussianEvidence(unittest.TestCase):
    """Actual statsmodels Gaussian recovery and covariance-family behavior."""

    @classmethod
    def setUpClass(cls) -> None:
        rows = continuous_rows()
        tasks = sorted({str(row["taskId"]) for row in rows})
        selected = method(
            "gaussian-mixedlm",
            random_effects=["task-intercept", "task-condition"],
            seed=37,
        )
        cls.task_result = analysis_models.analysis_models(request(selected, rows, tasks))

        null_rows = continuous_rows(condition_effect=0.0)
        null_method = copy.deepcopy(selected)
        null_method["priors"] = {}
        null_request = request(null_method, null_rows, tasks)
        null_request["pairedResult"]["contrast"]["taskWeights"] = {task: 1 for task in tasks}
        cls.null_result = analysis_models.analysis_models(null_request)

        crossed_rows, labels, crossed_tasks = crossed_gaussian_data()
        crossed_method = method(
            "gaussian-mixedlm",
            random_effects=["task-intercept", "grader-intercept"],
            seed=41,
        )
        cls.crossed_result = analysis_models.analysis_models(
            request(crossed_method, crossed_rows, crossed_tasks, labels=labels)
        )

    def test_correlated_task_covariance_and_gaussian_recovery(self) -> None:
        result = self.task_result
        self.assertEqual(result["status"], "complete", result)
        json.dumps(result, allow_nan=False)
        model_result = result["model"]
        self.assertEqual(model_result["covarianceFamily"], "unstructured-task-group")
        contrast = model_result["outcomeScaleContrast"]
        self.assertAlmostEqual(contrast["estimate"], 0.75, delta=0.14)
        self.assertLess(contrast["interval"][0], contrast["estimate"])
        self.assertGreater(contrast["interval"][1], contrast["estimate"])
        self.assertEqual(contrast["intervalProbability"], 0.9)
        self.assertEqual(contrast["confidenceProbability"], 0.9)
        self.assertIn("wald-normal", contrast["intervalConstruction"])
        diagnostic(result, "MIXEDLM_RESIDUAL_ADEQUACY")

    def test_gaussian_null_behavior_does_not_manufacture_an_effect(self) -> None:
        result = self.null_result
        self.assertEqual(result["status"], "complete", result)
        contrast = result["model"]["outcomeScaleContrast"]
        self.assertAlmostEqual(contrast["estimate"], 0.0, delta=0.12)
        self.assertGreater(contrast["pValue"], 0.05)

    def test_crossed_task_output_grader_variance_components(self) -> None:
        result = self.crossed_result
        self.assertEqual(result["status"], "complete", result)
        model_result = result["model"]
        self.assertEqual(
            model_result["covarianceFamily"],
            "independent-crossed-variance-components",
        )
        self.assertTrue(
            any("Correlated crossed random slopes" in item for item in model_result["covarianceRestrictions"])
        )
        replication = diagnostic(result, "MEASUREMENT_REPLICATION")
        self.assertEqual(replication["observationCount"], 72)
        self.assertEqual(replication["rawOutputCount"], 24)
        self.assertEqual(replication["taskCount"], 12)
        self.assertEqual(replication["graderCount"], 3)
        self.assertAlmostEqual(
            model_result["outcomeScaleContrast"]["estimate"],
            0.62,
            delta=0.18,
        )

    def test_singular_gaussian_fit_is_not_returned_as_plausible(self) -> None:
        rows = continuous_rows(tasks=8, repetitions=2, zero_variance=True)
        tasks = [f"task-{index:02d}" for index in range(8)]
        selected = method(
            "gaussian-mixedlm",
            random_effects=["task-intercept", "task-condition"],
            seed=43,
        )
        result = analysis_models.analysis_models(request(selected, rows, tasks))
        self.assertEqual(result["status"], "failed")
        self.assertIsNone(result["model"])
        self.assertIn(
            result["diagnostics"][0]["code"],
            {"MIXEDLM_SINGULAR", "MIXEDLM_FIT_FAILED", "MIXEDLM_NOT_CONVERGED"},
        )


class BayesianEvidence(unittest.TestCase):
    """Adapter SMOKE only: tiny/weak fixtures do not validate scientific inference.

    The permissive TEST_DIAGNOSTICS inputs are retained, not evidence of valid
    inference. Scientific recovery uses the separate strict suite below.
    """

    @classmethod
    def setUpClass(cls) -> None:
        if ARTIFACT_ROOT.exists():
            shutil.rmtree(ARTIFACT_ROOT)
        ARTIFACT_ROOT.mkdir(parents=True)

        gaussian_rows, gaussian_tasks = gaussian_bayes_rows()
        gaussian_method = method(
            "bayesian-gaussian",
            random_effects=["task-intercept", "task-condition"],
            seed=47,
            priors={
                "conditionScale": 1.2,
                "taskScale": 0.8,
                "taskConditionScale": 0.5,
                "residualScale": 0.5,
                "sensitivity": [
                    {"id": "narrow-condition", "conditionScale": 0.55},
                    {"id": "wide-condition", "conditionScale": 2.5},
                ],
            },
        )
        cls.gaussian_result = analysis_models.analysis_models(
            request(
                gaussian_method,
                gaussian_rows,
                gaussian_tasks,
                artifact_directory=ARTIFACT_ROOT / "gaussian",
            )
        )

        binary_rows, binary_labels, binary_tasks = binary_crossed_data()
        binary_method = method(
            "bayesian-bernoulli",
            random_effects=["task-intercept", "task-condition", "grader-intercept"],
            seed=53,
            priors={
                "conditionScale": 1.5,
                "taskScale": 0.7,
                "taskConditionScale": 0.6,
                "graderScale": 0.5,
                "outputScale": 0.7,
                "targetAccept": 0.92,
                "sensitivity": [
                    {"id": "skeptical-condition", "conditionScale": 0.45},
                    {"id": "wide-condition", "conditionScale": 3.0},
                ],
            },
        )
        cls.binary_result = analysis_models.analysis_models(
            request(
                binary_method,
                binary_rows,
                binary_tasks,
                labels=binary_labels,
                artifact_directory=ARTIFACT_ROOT / "binary",
            )
        )

    @classmethod
    def tearDownClass(cls) -> None:
        if ARTIFACT_ROOT.exists():
            shutil.rmtree(ARTIFACT_ROOT)

    def assert_sampler_diagnostics(self, result: dict[str, object]) -> None:
        self.assertEqual(result["status"], "complete", result)
        json.dumps(result, allow_nan=False)
        sampling = diagnostic(result, "BAYESIAN_SAMPLING")
        self.assertEqual(sampling["sampler"], "nuts")
        self.assertEqual(sampling["draws"], BAYES_DRAWS)
        self.assertEqual(sampling["tune"], BAYES_TUNE)
        self.assertEqual(sampling["chains"], BAYES_CHAINS)
        self.assertTrue(diagnostic(result, "RANK_NORMALIZED_SPLIT_RHAT")["passed"])
        ess = diagnostic(result, "EFFECTIVE_SAMPLE_SIZE")
        self.assertTrue(ess["passed"])
        self.assertTrue(diagnostic(result, "MONTE_CARLO_STANDARD_ERROR")["passed"])
        self.assertTrue(diagnostic(result, "DIVERGENCES")["passed"])
        self.assertTrue(diagnostic(result, "PRIOR_PREDICTIVE")["allFinite"])
        self.assertTrue(diagnostic(result, "POSTERIOR_PREDICTIVE")["allFinite"])

    def test_gaussian_recovery_predictive_checks_and_prior_sensitivity(self) -> None:
        result = self.gaussian_result
        self.assert_sampler_diagnostics(result)
        model_result = result["model"]
        contrast = model_result["outcomeScaleContrast"]
        self.assertAlmostEqual(contrast["estimate"], 0.75, delta=0.28)
        self.assertEqual(contrast["intervalProbability"], 0.9)
        self.assertEqual(contrast["credibleProbability"], 0.9)
        self.assertEqual(contrast["intervalConstruction"], "arviz-highest-density-nearest")
        self.assertEqual(len(model_result["priorSensitivity"]), 2)
        for row in model_result["priorSensitivity"]:
            self.assertGreater(row["importanceEffectiveSampleSize"], 0)
            self.assertTrue(math.isfinite(row["outcomeScaleContrastMean"]))
        sensitivity_means = {
            round(row["outcomeScaleContrastMean"], 8)
            for row in model_result["priorSensitivity"]
        }
        self.assertGreater(len(sensitivity_means), 1)
        self.assertTrue(any("Only 8 task clusters" in item for item in result["limitations"]))

    def test_binary_separation_uses_outcome_rate_not_log_odds(self) -> None:
        result = self.binary_result
        self.assert_sampler_diagnostics(result)
        model_result = result["model"]
        self.assertTrue(model_result["automaticOutputIntercept"])
        contrast = model_result["outcomeScaleContrast"]
        self.assertGreater(contrast["estimate"], 0.35)
        self.assertLessEqual(contrast["estimate"], 1.0)
        self.assertGreater(contrast["posteriorProbabilityImprovement"], 0.95)
        link_mean = model_result["linkScaleConditionCoefficient"]["mean"]
        self.assertGreater(link_mean, contrast["estimate"])
        self.assertIn("log-odds coefficient is not", model_result["linkScaleConditionCoefficient"]["note"])
        replication = diagnostic(result, "MEASUREMENT_REPLICATION")
        self.assertEqual(replication["observationCount"], 48)
        self.assertEqual(replication["rawOutputCount"], 16)
        self.assertEqual(replication["taskCount"], 8)
        self.assertEqual(replication["repeatedLabelCount"], 32)

    def test_artifacts_preserve_chain_draw_arrays_and_coordinate_metadata(self) -> None:
        import numpy as np

        for result in (self.gaussian_result, self.binary_result):
            artifacts = {row["kind"]: row for row in result["artifacts"]}
            self.assertEqual(set(artifacts), {"posterior-arrays", "coordinate-metadata"})
            arrays_path = Path(artifacts["posterior-arrays"]["path"])
            metadata_path = Path(artifacts["coordinate-metadata"]["path"])
            self.assertGreater(artifacts["posterior-arrays"]["bytes"], 0)
            with np.load(arrays_path, allow_pickle=False) as arrays:
                contrast = arrays["derived__outcome_scale_contrast"]
                self.assertEqual(contrast.shape, (BAYES_CHAINS, BAYES_DRAWS))
                self.assertIn("prior_predictive__y_obs", arrays.files)
                self.assertIn("posterior_predictive__y_obs", arrays.files)
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            self.assertEqual(
                metadata["sampleDimensions"],
                {"chain": BAYES_CHAINS, "draw": BAYES_DRAWS},
            )
            self.assertEqual(
                metadata["dimensions"]["derived__outcome_scale_contrast"],
                ["chain", "draw"],
            )
            self.assertIn("task", metadata["coordinates"])

    def test_actual_import_fit_and_posterior_footprints_are_measured(self) -> None:
        payload = """
import importlib, json, resource, time
started = time.perf_counter()
for name in ("numpy", "scipy", "statsmodels.api", "pymc", "arviz"):
    importlib.import_module(name)
seconds = time.perf_counter() - started
threads = None
try:
    for line in open("/proc/self/status", encoding="utf-8"):
        if line.startswith("Threads:"):
            threads = int(line.split()[1])
except OSError:
    pass
from threadpoolctl import threadpool_info
print(json.dumps({
    "coldImportSeconds": seconds,
    "maximumResidentKiB": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
    "processThreads": threads,
    "threadPools": [
        {"internal_api": row.get("internal_api"), "num_threads": row.get("num_threads")}
        for row in threadpool_info()
    ],
}))
"""
        completed = subprocess.run(
            [str(ROOT / ".venv" / "bin" / "python"), "-c", payload],
            cwd=ROOT,
            check=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        footprint = json.loads(completed.stdout.strip().splitlines()[-1])
        self.assertGreater(footprint["coldImportSeconds"], 0)
        self.assertGreater(footprint["maximumResidentKiB"], 0)
        self.assertIsInstance(footprint["threadPools"], list)
        fit_seconds = {
            "gaussian": diagnostic(self.gaussian_result, "BAYESIAN_SAMPLING")["elapsedSeconds"],
            "binary": diagnostic(self.binary_result, "BAYESIAN_SAMPLING")["elapsedSeconds"],
        }
        fit_memory = {
            "gaussian": diagnostic(self.gaussian_result, "BAYESIAN_SAMPLING")["fitMemory"],
            "binary": diagnostic(self.binary_result, "BAYESIAN_SAMPLING")["fitMemory"],
        }
        posterior_bytes = {
            result["model"]["likelihood"]: next(
                row["bytes"] for row in result["artifacts"] if row["kind"] == "posterior-arrays"
            )
            for result in (self.gaussian_result, self.binary_result)
        }
        self.assertTrue(all(value > 0 for value in fit_seconds.values()))
        self.assertTrue(all(value > 0 for value in posterior_bytes.values()))
        self.assertTrue(all(value["maximumResidentKiB"] for value in fit_memory.values()))
        print(
            "MODEL_FOOTPRINT "
            + json.dumps(
                {
                    **footprint,
                    "fitSeconds": fit_seconds,
                    "fitMemory": fit_memory,
                    "posteriorBytes": posterior_bytes,
                },
                sort_keys=True,
            )
        )


# Prespecified scientific checks, separate from adapter smoke. Four fits, each
# run ONCE: 4 chains x (1500 tuning + 2000 retained) NUTS; no retry loop. The
# tolerances below were written before sampling. These are synthetic recovery
# and null examples, not a repeated-experiment coverage/FPR calibration study.
SCIENTIFIC_DIAGNOSTICS = {
    'rhatMax': 1.01, 'essBulkMin': 400., 'essTailMin': 400.,
    'mcseRelativeMax': .05, 'maxDivergences': 0,
}


def scientific_rows(likelihood, effect, seed):
    import numpy as np
    rng = np.random.default_rng(seed)
    count = 20
    repetitions = 16 if likelihood == 'gaussian' else 40
    tasks = [f'scientific-{i:02d}' for i in range(count)]
    weights = np.arange(1., count + 1); weights /= weights.sum()
    intercepts = rng.normal(0, .55, count)
    slopes = rng.normal(0, .45, count)
    slopes -= weights @ slopes  # finite-task Gaussian null is exactly zero
    if likelihood == 'bernoulli':
        from scipy.optimize import brentq
        from scipy.special import expit
        # Center on a zero *rate* contrast, not a zero log-odds coefficient.
        shift = brentq(lambda a: float(weights @ (expit(-.2 + intercepts + slopes + a) - expit(-.2 + intercepts))), -5., 5.)
        slopes += shift
    rows, truths = [], []
    for i, task in enumerate(tasks):
        mu0 = -.2 + intercepts[i]
        mu1 = mu0 + effect + slopes[i]
        if likelihood == 'bernoulli':
            mu0, mu1 = 1 / (1 + np.exp(-mu0)), 1 / (1 + np.exp(-mu1))
        truths.append(mu1 - mu0)
        for c, mu in [('control', mu0), ('candidate', mu1)]:
            values = rng.normal(mu, .45, repetitions) if likelihood == 'gaussian' else rng.binomial(1, mu, repetitions)
            for j, value in enumerate(values):
                rows.append({'attemptId': f'{task}-{c}-{j}', 'taskId': task, 'conditionId': c,
                             'outcomes': [{'metricId': 'quality', 'status': 'observed', 'value': float(value)}]})
    return rows, tasks, float(weights @ truths)


class BayesianScientificValidation(unittest.TestCase):
    """Known Gaussian/rate contrasts, null behavior, strict diagnostics and PPC."""

    @classmethod
    def setUpClass(cls):
        cls.fits = {}
        for likelihood, effect, data_seed, sampler_seed in [
            ('gaussian', .7, 202601, 701), ('gaussian', 0., 202602, 702),
            ('bernoulli', .9, 202603, 703), ('bernoulli', 0., 202604, 704),
        ]:
            rows, tasks, truth = scientific_rows(likelihood, effect, data_seed)
            selected = method('bayesian-' + likelihood,
                              random_effects=['task-intercept', 'task-condition'], seed=sampler_seed,
                              priors={**SCIENTIFIC_DIAGNOSTICS, 'tune': 1500, 'priorPredictiveDraws': 200,
                                      'targetAccept': .95, 'taskScale': 1., 'taskConditionScale': 1.,
                                      'sensitivity': [{'id': 'skeptical', 'conditionScale': .8},
                                                      {'id': 'diffuse', 'conditionScale': 2.5}]})
            selected.update(draws=2000, chains=4, intervalProbability=.95)
            result = analysis_models.analysis_models(request(selected, rows, tasks))
            cls.fits[likelihood, effect] = (result, truth, rows)
            evidence = {'likelihood': likelihood, 'effect': effect, 'truth': truth, 'status': result['status']}
            if result['model']:
                evidence.update(contrast=result['model']['outcomeScaleContrast'],
                                sensitivity=result['model']['priorSensitivity'],
                                diagnostics=[r for r in result['diagnostics'] if r['code'] in
                                             ['RANK_NORMALIZED_SPLIT_RHAT', 'EFFECTIVE_SAMPLE_SIZE',
                                              'MONTE_CARLO_STANDARD_ERROR', 'DIVERGENCES', 'POSTERIOR_PREDICTIVE', 'BAYESIAN_SAMPLING']])
            else:
                evidence['diagnostics'] = result['diagnostics']
            print('SCIENTIFIC_MODEL_EVIDENCE ' + json.dumps(evidence, allow_nan=False), flush=True)

    def assert_scientific_fit(self, likelihood, effect):
        import numpy as np
        result, truth, rows = self.fits[likelihood, effect]
        self.assertEqual(result['status'], 'complete', result)
        self.assertTrue(result['model']['inferenceUsable'])
        for code in ['RANK_NORMALIZED_SPLIT_RHAT', 'EFFECTIVE_SAMPLE_SIZE', 'MONTE_CARLO_STANDARD_ERROR', 'DIVERGENCES']:
            self.assertTrue(diagnostic(result, code)['passed'])
        self.assertEqual(diagnostic(result, 'DIVERGENCES')['count'], 0)
        coords = diagnostic(result, 'PARAMETER_COORDINATE_DIAGNOSTICS')['coordinates']
        self.assertTrue(any(r['variable'] == 'outcome_scale_contrast' for r in coords))
        self.assertTrue(all(r['samplesFinite'] and all(r[k] is not None for k in ['rhat', 'bulk', 'tail', 'mcse', 'relativeMcse']) for r in coords))
        c = result['model']['outcomeScaleContrast']
        self.assertAlmostEqual(c['estimate'], truth, delta=.10 if likelihood == 'gaussian' else .07)
        self.assertLess(c['interval'][0], truth)
        self.assertGreater(c['interval'][1], truth)
        self.assertLess(c['interval'][1] - c['interval'][0], .25 if likelihood == 'gaussian' else .20)
        if effect:
            self.assertGreater(c['interval'][0], 0)
            self.assertGreater(c['posteriorProbabilityImprovement'], .975)
        else:
            self.assertLess(c['interval'][0], 0)
            self.assertGreater(c['interval'][1], 0)
            self.assertGreater(c['posteriorProbabilityImprovement'], .025)
            self.assertLess(c['posteriorProbabilityImprovement'], .975)
        observed = np.array([r['outcomes'][0]['value'] for r in rows])
        prior = diagnostic(result, 'PRIOR_PREDICTIVE')
        ppc = diagnostic(result, 'POSTERIOR_PREDICTIVE')
        self.assertTrue(prior['allFinite'] and ppc['allFinite'])
        self.assertLess(abs(ppc['predictiveMean'] - observed.mean()), .04)
        self.assertGreater(ppc['meanDiscrepancyTailProbability'], .05)
        self.assertGreater(ppc['predictiveStandardDeviation'] / observed.std(), .85)
        self.assertLess(ppc['predictiveStandardDeviation'] / observed.std(), 1.15)
        if likelihood == 'gaussian':
            self.assertGreater(prior['predictiveStandardDeviation'], observed.std())
        else:
            self.assertEqual(ppc['predictiveMinimum'], 0)
            self.assertEqual(ppc['predictiveMaximum'], 1)
        for s in result['model']['priorSensitivity']:
            self.assertTrue(s['stable'])
            self.assertGreater(s['importanceEffectiveSampleSize'], .5 * s['posteriorDrawCount'])
            self.assertLess(abs(s['outcomeScaleContrastMean'] - c['estimate']), .025)

    def test_gaussian_known_effect(self):
        self.assert_scientific_fit('gaussian', .7)

    def test_gaussian_null(self):
        self.assert_scientific_fit('gaussian', 0.)

    def test_bernoulli_known_rate_effect(self):
        self.assert_scientific_fit('bernoulli', .9)

    def test_bernoulli_null(self):
        self.assert_scientific_fit('bernoulli', 0.)


if __name__ == "__main__":
    unittest.main(verbosity=2)
