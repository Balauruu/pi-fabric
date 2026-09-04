import { ArborError } from "./errors.js";
import type { CanonicalDecimal, CanonicalQuantum } from "./types.js";

const DECIMAL = /^-?(?:0|[1-9][0-9]{0,26})(?:\.[0-9]{1,9})?$/;
const INT128_MAX = (1n << 127n) - 1n;
const INT128_MIN = -(1n << 127n);
const QUANTUM_SCALE: Readonly<Record<CanonicalQuantum, number>> = Object.freeze({
  "1": 0,
  "0.1": 1,
  "0.01": 2,
  "0.001": 3,
  "0.0001": 4,
  "0.00001": 5,
  "0.000001": 6,
  "0.0000001": 7,
  "0.00000001": 8,
  "0.000000001": 9,
});

export interface ParsedDecimal {
  coefficient: bigint;
  scale: number;
}

function checked128(value: bigint, label: string): bigint {
  if (value < INT128_MIN || value > INT128_MAX) {
    throw new ArborError("VALIDATION_FAILED", `${label} exceeds signed 128-bit arithmetic`);
  }
  return value;
}

function power10(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

export function parseCanonicalDecimal(input: string): ParsedDecimal {
  if (!DECIMAL.test(input)) throw new ArborError("VALIDATION_FAILED", `Non-canonical decimal: ${input}`);
  if (input.startsWith("-") && /^-0(?:\.0+)?$/.test(input)) {
    throw new ArborError("VALIDATION_FAILED", "Negative zero is not canonical");
  }
  const unsigned = input.startsWith("-") ? input.slice(1) : input;
  const [integer = "", fraction = ""] = unsigned.split(".");
  if (fraction.endsWith("0")) throw new ArborError("VALIDATION_FAILED", "Fractional trailing zero is not canonical");
  const significant = `${integer}${fraction}`.replace(/^0+/, "");
  if ((significant.length || 1) > 27) throw new ArborError("VALIDATION_FAILED", "Decimal has more than 27 significant digits");
  const magnitude = BigInt(`${integer}${fraction}`);
  const coefficient = input.startsWith("-") ? -magnitude : magnitude;
  return { coefficient: checked128(coefficient, "Decimal coefficient"), scale: fraction.length };
}

export function quantumScale(quantum: CanonicalQuantum): number {
  return QUANTUM_SCALE[quantum];
}

export function quantizeHalfEven(input: CanonicalDecimal, quantum: CanonicalQuantum): bigint {
  const parsed = parseCanonicalDecimal(input);
  const targetScale = quantumScale(quantum);
  if (parsed.scale <= targetScale) {
    return checked128(parsed.coefficient * power10(targetScale - parsed.scale), "Quantized value");
  }

  const divisor = power10(parsed.scale - targetScale);
  let quotient = parsed.coefficient / divisor;
  const remainder = parsed.coefficient % divisor;
  const absoluteRemainder = remainder < 0n ? -remainder : remainder;
  const twice = absoluteRemainder * 2n;
  const awayFromZero = parsed.coefficient < 0n ? -1n : 1n;
  if (twice > divisor || (twice === divisor && (quotient < 0n ? -quotient : quotient) % 2n === 1n)) {
    quotient += awayFromZero;
  }
  return checked128(quotient, "Quantized value");
}

export function exactUnits(input: CanonicalDecimal, quantum: CanonicalQuantum): bigint {
  const parsed = parseCanonicalDecimal(input);
  const targetScale = quantumScale(quantum);
  if (parsed.scale > targetScale) {
    const divisor = power10(parsed.scale - targetScale);
    if (parsed.coefficient % divisor !== 0n) {
      throw new ArborError("VALIDATION_FAILED", `${input} is not exactly representable at quantum ${quantum}`);
    }
  }
  return quantizeHalfEven(input, quantum);
}

export function compareCanonicalDecimals(left: CanonicalDecimal, right: CanonicalDecimal): -1 | 0 | 1 {
  const leftParsed = parseCanonicalDecimal(left);
  const rightParsed = parseCanonicalDecimal(right);
  const scale = Math.max(leftParsed.scale, rightParsed.scale);
  const leftCoefficient = checked128(leftParsed.coefficient * power10(scale - leftParsed.scale), "Decimal comparison");
  const rightCoefficient = checked128(rightParsed.coefficient * power10(scale - rightParsed.scale), "Decimal comparison");
  return leftCoefficient < rightCoefficient ? -1 : leftCoefficient > rightCoefficient ? 1 : 0;
}

export function assertNonnegativeExact(input: CanonicalDecimal, quantum: CanonicalQuantum, label: string): bigint {
  const units = exactUnits(input, quantum);
  if (units < 0n) throw new ArborError("VALIDATION_FAILED", `${label} must be nonnegative`);
  return units;
}

export function formatQuantumUnits(units: bigint, quantum: CanonicalQuantum): CanonicalDecimal {
  checked128(units, "Rendered value");
  if (units === 0n) return "0";
  const scale = quantumScale(quantum);
  const sign = units < 0n ? "-" : "";
  const digits = (units < 0n ? -units : units).toString();
  if (scale === 0) return `${sign}${digits}`;
  const padded = digits.padStart(scale + 1, "0");
  const whole = padded.slice(0, -scale);
  const fraction = padded.slice(-scale).replace(/0+$/, "");
  return fraction.length === 0 ? `${sign}${whole}` : `${sign}${whole}.${fraction}`;
}

export interface AggregatedEvaluation {
  quantized: bigint[];
  aggregate: bigint;
  spread: bigint;
  nondeterministic: boolean;
}

export function aggregateTrials(
  trials: readonly CanonicalDecimal[],
  quantum: CanonicalQuantum,
  aggregation: "single" | "median",
  tolerance: CanonicalDecimal,
): AggregatedEvaluation {
  if (aggregation === "single" && trials.length !== 1) {
    throw new ArborError("EVIDENCE_INVALID", "single aggregation requires exactly one trial");
  }
  if (aggregation === "median" && (trials.length < 3 || trials.length > 99 || trials.length % 2 !== 1)) {
    throw new ArborError("EVIDENCE_INVALID", "median aggregation requires an odd trial count from 3 through 99");
  }
  const quantized = trials.map((trial) => quantizeHalfEven(trial, quantum));
  const sorted = [...quantized].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
  const minimum = sorted[0];
  const maximum = sorted.at(-1);
  if (minimum === undefined || maximum === undefined) throw new ArborError("EVIDENCE_INVALID", "Evaluation has no trials");
  const aggregate = aggregation === "single" ? minimum : sorted[Math.floor(sorted.length / 2)];
  if (aggregate === undefined) throw new ArborError("EVIDENCE_INVALID", "Evaluation aggregate is missing");
  const spread = checked128(maximum - minimum, "Evaluation spread");
  const toleranceUnits = assertNonnegativeExact(tolerance, quantum, "nondeterminismTolerance");
  return { quantized, aggregate, spread, nondeterministic: spread > toleranceUnits };
}

export interface ComparisonResult {
  normalizedImprovement: bigint;
  passes: boolean;
  tie: boolean;
}

export function compareAggregates(
  candidate: bigint,
  baseline: bigint,
  direction: "maximize" | "minimize",
  minimumImprovement: CanonicalDecimal,
  quantum: CanonicalQuantum,
): ComparisonResult {
  const normalizedImprovement = checked128(
    direction === "maximize" ? candidate - baseline : baseline - candidate,
    "Normalized improvement",
  );
  const threshold = assertNonnegativeExact(minimumImprovement, quantum, "minimumImprovement");
  return {
    normalizedImprovement,
    passes: normalizedImprovement >= threshold,
    tie: candidate === baseline,
  };
}
