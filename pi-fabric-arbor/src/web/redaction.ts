const SENSITIVE_KEY = /^(?:secret|password|credential|credentialAliases|token|accessToken|refreshToken|apiKey|opaqueToken|nonce|authorizationNonce|privateKey|signingKey|childHandle|internalHandle|lease|fence|sqliteLocation|environment|env|cwd|hostPath|idempotencyKey|prompt|rawPrompt)$/iu;
const UNIX_PATH = /(?<![A-Za-z0-9_.-])\/(?:home|Users|var|tmp|etc|opt|run|mnt|srv|proc)(?:\/[A-Za-z0-9_.@%+,:=-]+)+/gu;
const WINDOWS_PATH = /\b[A-Za-z]:\\(?:[^\\\s]+\\)*[^\\\s]*/gu;
const FILE_URI = /file:\/\/[^\s"']+/gu;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/giu;
const SECRET_TOKEN = /\b(?:sk|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_-]{8,}\b/gu;
const ENV_SECRET = /\b(?:AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN|GITHUB_TOKEN|OPENAI_API_KEY|ANTHROPIC_API_KEY)=[^\s"']+/gu;
const DETECTORS = [UNIX_PATH, WINDOWS_PATH, FILE_URI, BEARER, SECRET_TOKEN, ENV_SECRET] as const;

function replace(input: string, pattern: RegExp, replacement: string): string {
  pattern.lastIndex = 0; return input.replace(pattern, replacement);
}

function contains(input: string, pattern: RegExp): boolean {
  pattern.lastIndex = 0; const result = pattern.test(input); pattern.lastIndex = 0; return result;
}

export function redactText(input: string): string {
  return replace(replace(replace(replace(replace(replace(input, BEARER, "[REDACTED_SECRET]"), SECRET_TOKEN, "[REDACTED_SECRET]"), ENV_SECRET, "[REDACTED_SECRET]"), FILE_URI, "[REDACTED_PATH]"), WINDOWS_PATH, "[REDACTED_PATH]"), UNIX_PATH, "[REDACTED_PATH]");
}

export function redactValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") return redactText(value);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[REDACTED_CYCLE]";
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((entry) => redactValue(entry, seen));
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY.test(key)
        ? key.toLowerCase() === "credentialaliases" ? [] : "[REDACTED]"
        : redactValue(item, seen);
    }
    return output;
  } finally {
    // Repeated references are valid JSON values. Only an active ancestor is a cycle.
    seen.delete(value);
  }
}

export function assertNoRawPathOrSecret(value: unknown): void {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  if (DETECTORS.some((pattern) => contains(serialized, pattern))) throw new Error("Unredacted secret or raw host path detected");
}
