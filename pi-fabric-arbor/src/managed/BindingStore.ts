import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ExecutionSpec, NativeOwner, Terminal } from "./contracts.js";
import type { RoleInvocation } from "./RoleBundle.js";

export interface Binding {
  version: 1; spec: ExecutionSpec; owner: NativeOwner; componentId: string; generation: string; revision: number;
  state: "running" | "completed" | "failed" | "cancelled" | "interrupted" | "cleanup_pending";
  dispatches: Array<{ kind: "actor" | "agent"; name: string; nativeId?: string }>;
  actors: string[]; workers: Array<{ id: string; cwd: string; oid: string; task: string; status?: Terminal }>;
  roleInvocations?: RoleInvocation[];
  error?: string;
}
/** PR2 native linkage only. PR3 owns the future transactional research schema. */
export class BindingStore {
  #db: DatabaseSync | undefined;
  #closed = false;
  constructor(readonly path: string) {}
  get closed(): boolean { return this.#closed; }
  #open(): DatabaseSync {
    if (this.#closed) throw new Error("Arbor generation storage is closed");
    if (!this.#db) {
      mkdirSync(dirname(this.path), { recursive: true });
      this.#db = new DatabaseSync(this.path);
      this.#db.exec("PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS execution_bindings (id TEXT PRIMARY KEY, generation TEXT NOT NULL, revision INTEGER NOT NULL, value TEXT NOT NULL)");
    }
    return this.#db;
  }
  get(id: string): Binding | undefined {
    // Inspect on an unused live generation must not create storage.
    if (this.#closed) throw new Error("Arbor generation storage is closed");
    if (!this.#db && !existsSync(this.path)) return undefined;
    const db = this.#db ?? new DatabaseSync(this.path, { readOnly: true });
    try {
      const row = db.prepare("SELECT value FROM execution_bindings WHERE id=?").get(id);
      return row ? JSON.parse(String(row.value)) as Binding : undefined;
    } finally { if (db !== this.#db) db.close(); }
  }
  bind(binding: Binding): Binding {
    const db = this.#open();
    const row = db.prepare("SELECT value FROM execution_bindings WHERE id=?").get(binding.spec.runId);
    if (row) return JSON.parse(String(row.value)) as Binding;
    db.prepare("INSERT INTO execution_bindings VALUES (?, ?, ?, ?)").run(binding.spec.runId, binding.generation, binding.revision, JSON.stringify(binding));
    return binding;
  }
  save(binding: Binding): void {
    const previous = this.get(binding.spec.runId);
    for (const [index, prior] of (previous?.roleInvocations ?? []).entries()) {
      const next = binding.roleInvocations?.[index];
      if (!next) throw new Error("Prior operational invocation attribution cannot be removed");
      const { nativeId: oldNative, ...oldBody } = prior, { nativeId: newNative, ...newBody } = next;
      if (JSON.stringify(oldBody) !== JSON.stringify(newBody) || (oldNative !== undefined && newNative !== oldNative)) throw new Error("Prior operational invocation attribution cannot be rewritten");
    }
    const result = this.#open().prepare("UPDATE execution_bindings SET revision=?, value=? WHERE id=? AND generation=? AND revision<=?")
      .run(binding.revision, JSON.stringify(binding), binding.spec.runId, binding.generation, binding.revision);
    if (result.changes !== 1) throw new Error("Stale generation cannot write execution binding");
  }
  close(): void { if (this.#closed) return; this.#db?.close(); this.#db = undefined; this.#closed = true; }
}
