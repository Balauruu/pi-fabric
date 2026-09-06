#!/usr/bin/env node
import { register } from "tsx/esm/api";

const unregister = register();
try {
  const { runReadOnlyCli } = await import("../src/cli/read-only.ts");
  process.exitCode = await runReadOnlyCli(process.argv.slice(2), {
    stdout: process.stdout,
    stderr: process.stderr,
  });
} finally {
  await unregister();
}
