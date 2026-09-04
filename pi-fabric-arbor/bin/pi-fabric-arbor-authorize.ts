#!/usr/bin/env node
import { runAuthorizationCli } from "../src/authorization/cli.js";

try {
  await runAuthorizationCli({ argv: process.argv.slice(2) });
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 2;
}
