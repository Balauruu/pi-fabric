import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("unknown top-level CLI commands fail nonzero with precise usage", () => {
  const result = spawnSync(process.execPath, ["dist/bin/pi-fabric-arbor.js", "definitely-unknown"], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(result.status, 2); assert.equal(result.stdout, "");
  assert.match(result.stderr, /^Unknown command 'definitely-unknown'\.\nUsage: pi-fabric-arbor <serve\|authorize> \[options\]/u);
  assert.match(result.stderr, /pi-fabric-arbor serve --database <authority\.sqlite3>/u);
  assert.match(result.stderr, /pi-fabric-arbor authorize promotion\|rollback --challenge <opaque-id>/u);
});

test("CLI help remains successful and uses the same precise usage", () => {
  const result = spawnSync(process.execPath, ["dist/bin/pi-fabric-arbor.js", "--help"], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(result.status, 0); assert.equal(result.stderr, ""); assert.match(result.stdout, /^pi-fabric-arbor 0\.1\.0\nUsage:/u);
});
