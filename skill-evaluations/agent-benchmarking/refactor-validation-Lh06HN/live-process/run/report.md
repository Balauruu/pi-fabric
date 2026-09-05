# Benchmark report: task-state-live-probe

Does the candidate instruction improve exact answers on this fixed two-task sample?

## Execution reconciliation

- Planned: 4
- Assigned: 4
- Terminal: 4
- Failed: 0
- Unresolved: 0
- Pending: 0

## Scientific decision

**inconclusive**

## Analysis

```json
{
  "decisions": [
    {
      "hypothesisId": "candidate-v-control.accepted",
      "nonInferiority": {
        "assumptions": [
          "the declared bootstrap clusters represent the intended sampling variation",
          "the margin and direction were fixed before scoring"
        ],
        "boundary": null,
        "estimand": "saved task-weighted oriented contrast",
        "margin": null,
        "oneSidedLower": 0.0,
        "passed": false
      },
      "outcomeQualityVeto": {
        "metricSelected": false,
        "rule": "a saved veto metric must have a complete non-regressing oriented effect",
        "triggered": false
      },
      "pointEffect": 0.0,
      "practicalSuperiority": {
        "intervalLower": 0.0,
        "passed": false,
        "rule": "oriented point effect and lower interval bound must both exceed the saved threshold",
        "threshold": null
      },
      "sharpNull": {
        "adjustedPValue": 1.0,
        "claim": "no position-level outcome changes under condition-label assignment",
        "nominalRejected": false,
        "rawPValue": 1.0,
        "rejected": false,
        "separateFromPracticalAndNonInferiorityClaims": true
      }
    }
  ],
  "diagnostics": [
    {
      "assignment": "independent-block-v1",
      "code": "ASSIGNMENT_INFERENCE_MATCH",
      "inference": "independent-block-v1",
      "passed": true
    },
    {
      "analyzed": 4,
      "code": "COMPLETE_DATASET_RECONCILIATION",
      "passed": true,
      "scheduled": 4
    }
  ],
  "graderUncertainty": {
    "crossedModelDelegated": false,
    "disagreements": [],
    "graderCount": 1,
    "labelBounds": [],
    "labelsPerOutput": [
      1,
      1,
      1,
      1
    ],
    "limitations": [],
    "method": "none",
    "missingLabelAttemptIds": []
  },
  "inference": {
    "bootstrap": [
      {
        "available": true,
        "clusterCount": 2,
        "clusterSizes": {
          "add-2-and-3": 1,
          "add-4-and-3": 1
        },
        "confidenceLevel": 0.95,
        "degenerate": true,
        "diagnostics": {
          "bcaAcceleration": null,
          "bcaBiasCorrection": null
        },
        "draws": 2000,
        "error": null,
        "generator": "numpy-pcg64",
        "hypothesisId": "candidate-v-control.accepted",
        "jackknifeEstimates": 2,
        "jackknifeUnit": "task",
        "lower": 0.0,
        "method": "percentile",
        "oneSidedLower": 0.0,
        "oneSidedUpper": 0.0,
        "pointEstimate": 0.0,
        "reportedInterval": {
          "confidenceLevel": 0.95,
          "label": "marginal-not-multiplicity-adjusted",
          "lower": 0.0,
          "oneSidedLower": 0.0,
          "upper": 0.0
        },
        "seed": 23,
        "status": "complete",
        "stratifyBy": [],
        "stratumClusterCounts": {
          "all": 2
        },
        "uniqueBootstrapEstimates": 1,
        "unit": "task",
        "upper": 0.0,
        "wholeCluster": true
      }
    ],
    "precisionPower": {
      "method": "none",
      "scenarios": [],
      "status": "not-requested"
    },
    "randomization": [
      {
        "allocationCount": 4,
        "approximation": false,
        "assignmentContract": "independent-block-v1",
        "assignmentUnit": "task-repetition-block",
        "conditioning": "fixed-block-order",
        "generatingLaw": {
          "conditionCount": 2,
          "conditioning": "observed-fixed-block-order",
          "duplicateGeneratingPathsMayShareAllocation": false,
          "eachGeneratingPathProbability": "1/(2)^2",
          "equiprobableChoiceFactor": 2,
          "generatingChoiceUnit": "task-repetition-block",
          "generatingPathCountFormula": "(2)^2",
          "independentChoiceCount": 2,
          "method": "independent-block-v1"
        },
        "generatingPathCount": 4,
        "hypothesisId": "candidate-v-control.accepted",
        "inferenceContract": "independent-block-v1",
        "lawScope": "full observed schedule conditional on fixed block order",
        "limitation": null,
        "method": "exact-randomization",
        "minimumAttainableP": 1.0,
        "observedAllocationIncluded": true,
        "observedAllocationProbability": 0.25,
        "observedPathMultiplicity": 1,
        "observedStatistic": 0.0,
        "pValue": 1.0,
        "probabilityMass": 1.0,
        "samplingUnit": "task",
        "sharpNull": "the complete position-level outcome vector is invariant to condition labels",
        "status": "complete",
        "tail": "greater-or-equal",
        "tieConvention": "inclusive using saved absolute and relative tolerance",
        "tieProbability": 1.0,
        "tolerance": {
          "absolute": 1e-12,
          "relative": 1e-12
        }
      }
    ],
    "sequential": {
      "allocatedAlpha": 0.05,
      "globalCoupledLaw": "every look enumerates or samples the full saved schedule law before selecting its task statistic",
      "looks": [
        {
          "completeTasks": 2,
          "crossedHypothesisIds": [],
          "lookId": "final",
          "tests": [
            {
              "allocatedAlpha": 0.05,
              "estimate": {
                "complete": true,
                "completeCaseEffect": 0.0,
                "completeTaskCount": 2,
                "effect": 0.0,
                "hypothesisId": "candidate-v-control.accepted",
                "largestRegressions": [
                  {
                    "orientedEffect": 0.0,
                    "taskId": "add-2-and-3"
                  },
                  {
                    "orientedEffect": 0.0,
                    "taskId": "add-4-and-3"
                  }
                ],
                "losses": 0,
                "missingAttemptIds": [],
                "taskCount": 2,
                "taskEffects": [
                  {
                    "candidateSummary": 1.0,
                    "complete": true,
                    "controlSummary": 1.0,
                    "family": "text-arithmetic",
                    "orientedEffect": 0.0,
                    "stratum": "easy",
                    "taskId": "add-2-and-3",
                    "weight": 1.0
                  },
                  {
                    "candidateSummary": 1.0,
                    "complete": true,
                    "controlSummary": 1.0,
                    "family": "text-transformation",
                    "orientedEffect": 0.0,
                    "stratum": "easy",
                    "taskId": "add-4-and-3",
                    "weight": 1.0
                  }
                ],
                "ties": 2,
                "wins": 0
              },
              "hypothesisId": "candidate-v-control.accepted",
              "inference": {
                "allocationCount": 4,
                "approximation": false,
                "assignmentContract": "independent-block-v1",
                "assignmentUnit": "task-repetition-block",
                "conditioning": "fixed-block-order",
                "generatingLaw": {
                  "conditionCount": 2,
                  "conditioning": "observed-fixed-block-order",
                  "duplicateGeneratingPathsMayShareAllocation": false,
                  "eachGeneratingPathProbability": "1/(2)^2",
                  "equiprobableChoiceFactor": 2,
                  "generatingChoiceUnit": "task-repetition-block",
                  "generatingPathCountFormula": "(2)^2",
                  "independentChoiceCount": 2,
                  "method": "independent-block-v1"
                },
                "generatingPathCount": 4,
                "hypothesisId": "candidate-v-control.accepted",
                "inferenceContract": "independent-block-v1",
                "lawScope": "full observed schedule conditional on fixed block order",
                "limitation": null,
                "method": "exact-randomization",
                "minimumAttainableP": 1.0,
                "observedAllocationIncluded": true,
                "observedAllocationProbability": 0.25,
                "observedPathMultiplicity": 1,
                "observedStatistic": 0.0,
                "pValue": 1.0,
                "probabilityMass": 1.0,
                "samplingUnit": "task",
                "sharpNull": "the complete position-level outcome vector is invariant to condition labels",
                "status": "complete",
                "tail": "greater-or-equal",
                "tieConvention": "inclusive using saved absolute and relative tolerance",
                "tieProbability": 1.0,
                "tolerance": {
                  "absolute": 1e-12,
                  "relative": 1e-12
                }
              },
              "pValue": 1.0,
              "reject": false,
              "uncertainty": null,
              "validConstituentTest": true
            }
          ]
        }
      ],
      "method": "fixed-sample",
      "overallAlpha": 0.05,
      "plannedStop": true,
      "stopReason": "final-look",
      "stoppedAt": "final",
      "unionBoundValidWithoutIndependentLooks": true
    }
  },
  "limitations": [],
  "modelAnalysis": {
    "called": false,
    "delegatedTo": "analysis_models",
    "pairedResultMustRemainVisible": true,
    "requestedMethodIds": []
  },
  "multiplicity": {
    "alpha": 0.05,
    "completeFamily": true,
    "dependenceAssumption": "family-wise procedure or no adjustment as labeled",
    "familyId": "primary-family",
    "hypothesisIds": [
      "candidate-v-control.accepted"
    ],
    "implementation": "none",
    "intervalLabel": "marginal-not-multiplicity-adjusted",
    "intervalPolicy": "marginal",
    "method": "none",
    "results": [
      {
        "adjustedPValue": 1.0,
        "hypothesisId": "candidate-v-control.accepted",
        "rawPValue": 1.0,
        "reject": false
      }
    ],
    "status": "controlled"
  },
  "paired": {
    "contrasts": [
      {
        "complete": true,
        "completeCaseEffect": 0.0,
        "completeTaskCount": 2,
        "effect": 0.0,
        "hypothesisId": "candidate-v-control.accepted",
        "largestRegressions": [
          {
            "orientedEffect": 0.0,
            "taskId": "add-2-and-3"
          },
          {
            "orientedEffect": 0.0,
            "taskId": "add-4-and-3"
          }
        ],
        "losses": 0,
        "missingAttemptIds": [],
        "taskCount": 2,
        "taskEffects": [
          {
            "candidateSummary": 1.0,
            "complete": true,
            "controlSummary": 1.0,
            "family": "text-arithmetic",
            "orientedEffect": 0.0,
            "stratum": "easy",
            "taskId": "add-2-and-3",
            "weight": 1.0
          },
          {
            "candidateSummary": 1.0,
            "complete": true,
            "controlSummary": 1.0,
            "family": "text-transformation",
            "orientedEffect": 0.0,
            "stratum": "easy",
            "taskId": "add-4-and-3",
            "weight": 1.0
          }
        ],
        "ties": 2,
        "wins": 0
      }
    ],
    "dataset": {
      "completeScheduleReconciled": true,
      "failureMappingRefusals": [],
      "mappedRows": [
        {
          "attemptId": "a-000001",
          "attemptStatus": "succeeded",
          "blockId": "b-000001",
          "blockIndex": 1,
          "conditionId": "control",
          "family": "text-transformation",
          "gradeIds": [
            "grade-a-000001-objective-74c56fd2fbf9bccf8842ffda"
          ],
          "orderPosition": 1,
          "outcomes": [
            {
              "available": true,
              "mappedValue": 1.0,
              "mappingAction": "observed",
              "metricId": "accepted",
              "rawStatus": "observed",
              "rawValue": 1.0
            }
          ],
          "repetition": 1,
          "retryOf": null,
          "stratum": "easy",
          "taskId": "add-4-and-3",
          "telemetry": {}
        },
        {
          "attemptId": "a-000002",
          "attemptStatus": "succeeded",
          "blockId": "b-000001",
          "blockIndex": 1,
          "conditionId": "candidate",
          "family": "text-transformation",
          "gradeIds": [
            "grade-a-000002-objective-858480300949c2bbde560375"
          ],
          "orderPosition": 2,
          "outcomes": [
            {
              "available": true,
              "mappedValue": 1.0,
              "mappingAction": "observed",
              "metricId": "accepted",
              "rawStatus": "observed",
              "rawValue": 1.0
            }
          ],
          "repetition": 1,
          "retryOf": null,
          "stratum": "easy",
          "taskId": "add-4-and-3",
          "telemetry": {}
        },
        {
          "attemptId": "a-000003",
          "attemptStatus": "succeeded",
          "blockId": "b-000002",
          "blockIndex": 2,
          "conditionId": "control",
          "family": "text-arithmetic",
          "gradeIds": [
            "grade-a-000003-objective-b5767eba962746c913b45c98"
          ],
          "orderPosition": 1,
          "outcomes": [
            {
              "available": true,
              "mappedValue": 1.0,
              "mappingAction": "observed",
              "metricId": "accepted",
              "rawStatus": "observed",
              "rawValue": 1.0
            }
          ],
          "repetition": 1,
          "retryOf": null,
          "stratum": "easy",
          "taskId": "add-2-and-3",
          "telemetry": {}
        },
        {
          "attemptId": "a-000004",
          "attemptStatus": "succeeded",
          "blockId": "b-000002",
          "blockIndex": 2,
          "conditionId": "candidate",
          "family": "text-arithmetic",
          "gradeIds": [
            "grade-a-000004-objective-79f73fee8b1e0e565285f880"
          ],
          "orderPosition": 2,
          "outcomes": [
            {
              "available": true,
              "mappedValue": 1.0,
              "mappingAction": "observed",
              "metricId": "accepted",
              "rawStatus": "observed",
              "rawValue": 1.0
            }
          ],
          "repetition": 1,
          "retryOf": null,
          "stratum": "easy",
          "taskId": "add-2-and-3",
          "telemetry": {}
        }
      ],
      "scheduledRows": 4,
      "schemaVersion": 1,
      "survivorFiltering": false
    },
    "rawTaskPairedVisible": true,
    "selectedAttemptByRoot": {
      "a-000001": "a-000001",
      "a-000002": "a-000002",
      "a-000003": "a-000003",
      "a-000004": "a-000004"
    },
    "selectionPolicy": "first-attempt",
    "taskConditionSummaries": [
      {
        "availableRepetitions": 1,
        "complete": true,
        "conditionId": "control",
        "metricId": "accepted",
        "repetitions": 1,
        "summary": 1.0,
        "taskId": "add-2-and-3"
      },
      {
        "availableRepetitions": 1,
        "complete": true,
        "conditionId": "candidate",
        "metricId": "accepted",
        "repetitions": 1,
        "summary": 1.0,
        "taskId": "add-2-and-3"
      },
      {
        "availableRepetitions": 1,
        "complete": true,
        "conditionId": "control",
        "metricId": "accepted",
        "repetitions": 1,
        "summary": 1.0,
        "taskId": "add-4-and-3"
      },
      {
        "availableRepetitions": 1,
        "complete": true,
        "conditionId": "candidate",
        "metricId": "accepted",
        "repetitions": 1,
        "summary": 1.0,
        "taskId": "add-4-and-3"
      }
    ]
  },
  "reliability": [
    {
      "byCondition": {
        "candidate": {
          "attemptDenominatorByTask": {
            "add-2-and-3": 1,
            "add-4-and-3": 1
          },
          "estimate": 1.0,
          "taskCount": 2,
          "unavailableTaskIds": []
        },
        "control": {
          "attemptDenominatorByTask": {
            "add-2-and-3": 1,
            "add-4-and-3": 1
          },
          "estimate": 1.0,
          "taskCount": 2,
          "unavailableTaskIds": []
        }
      },
      "k": null,
      "limitations": [],
      "metric": "pass-at-1",
      "outcomeMetricId": "accepted",
      "population": "first-attempts",
      "repetitionsAreNotRetries": true
    }
  ],
  "schemaVersion": 1,
  "scientificDecision": "inconclusive",
  "sensitivities": [
    {
      "fullScheduledTaskWeights": true,
      "hypothesisId": "candidate-v-control.accepted",
      "lower": 0.0,
      "method": "prespecified-missing-outcome-bounds",
      "missingAttemptIds": [],
      "upper": 0.0
    },
    {
      "hypothesisId": "candidate-v-control.accepted",
      "method": "leave-one-task-out",
      "range": [
        0.0,
        0.0
      ],
      "results": [
        {
          "deleted": "add-2-and-3",
          "effect": 0.0,
          "status": "complete"
        },
        {
          "deleted": "add-4-and-3",
          "effect": 0.0,
          "status": "complete"
        }
      ],
      "status": "complete"
    }
  ],
  "status": "complete"
}
```

## Limitations

- maxWallTimeSeconds stops admission between waves per invocation; it does not cancel in-flight calls or bound final analysis.
- timeoutMs requests an override only; Fabric ignores values below its configured timeout floor. No lower per-call enforcement is claimed.
- Results apply to the declared finite task set; no task-population claim was made.
- attempts[0].nativeResult.directUsage.cost: native cost unit is unavailable
- attempts[1].nativeResult.directUsage.cost: native cost unit is unavailable
- attempts[2].nativeResult.directUsage.cost: native cost unit is unavailable
- attempts[3].nativeResult.directUsage.cost: native cost unit is unavailable
