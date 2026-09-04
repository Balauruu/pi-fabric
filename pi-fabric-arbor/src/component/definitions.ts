import { resolve } from "node:path";
import type { FabricComponentContext, FabricComponentDefinition, FabricProvider } from "pi-fabric";
import { ArborApplication } from "../application/ArborApplication.js";
import { NO_CERTIFICATIONS_V1, UnavailableCleanupAdapter, UnavailableEvaluator, UnavailableFabricAgentAdapter, UnavailableReportPublisher, UnavailableWorkspaceManager } from "../compatibility/fail-closed.js";
import { ArborError } from "../domain/errors.js";
import { ArtifactStore } from "../persistence/ArtifactStore.js";
import { SqliteRunStore } from "../persistence/SqliteRunStore.js";
import { RandomIdFactory, SystemClock } from "../util/clock.js";
import { DetachedMonitorAuthority } from "../web/DetachedMonitorAuthority.js";
import { DetachedMonitorServer, type DetachedMonitorServerAddressV1 } from "../web/DetachedMonitorServer.js";

export interface ArborRuntimeComponentConfigV1 { version: 1; enabled: boolean }
export interface ArborWebComponentConfigV1 {
  version: 1;
  enabled?: boolean;
  database?: string;
  artifactRoot?: string;
  host?: "127.0.0.1" | "::1";
  port?: number;
  bootstrapToken?: string;
  gitOidLength?: 40 | 64;
}

export interface ArborWebComponentFactoryOptionsV1 { onStarted?(address: DetachedMonitorServerAddressV1): void }

export function createArborWebComponent(options: ArborWebComponentFactoryOptionsV1 = {}): FabricComponentDefinition<ArborWebComponentConfigV1> {
  return Object.freeze({
    name: "arbor-web",
    description: "Owns a release-built loopback Web server that can only query, stream, read bounded artifacts, and append durable inbox intents.",
    requires: [],
    provides: [],
    guarantee: "managed",
    async activate(context: FabricComponentContext, config: ArborWebComponentConfigV1) {
      if (config.version !== 1) throw new ArborError("VALIDATION_FAILED", "arbor-web config version must be 1");
      if (config.enabled === false) return;
      const database = config.database ?? process.env.PI_FABRIC_ARBOR_DATABASE;
      if (!database) throw new ArborError("VALIDATION_FAILED", "arbor-web requires a database config or PI_FABRIC_ARBOR_DATABASE");
      await context.effect(async () => {
        const store = await SqliteRunStore.open(resolve(database)); let server: DetachedMonitorServer | undefined; let disposal: Promise<void> | undefined;
        const dispose = (): Promise<void> => {
          disposal ??= (async () => { await server?.close().catch(() => undefined); await store.close(); })();
          return disposal;
        };
        try {
          const application = new ArborApplication({
            store,
            workspace: new UnavailableWorkspaceManager(NO_CERTIFICATIONS_V1),
            agent: new UnavailableFabricAgentAdapter(NO_CERTIFICATIONS_V1),
            evaluator: new UnavailableEvaluator(NO_CERTIFICATIONS_V1),
            reportPublisher: new UnavailableReportPublisher(),
            cleanup: new UnavailableCleanupAdapter(NO_CERTIFICATIONS_V1),
            clock: new SystemClock(), ids: new RandomIdFactory(), gitOidLength: config.gitOidLength ?? 40, executionMode: "productionBlocked",
          });
          const artifacts = config.artifactRoot ? await ArtifactStore.open(resolve(config.artifactRoot)) : undefined;
          const authority = new DetachedMonitorAuthority(application, store, (runId) => store.readEventCompactionFloor(runId), () => new Date().toISOString(), artifacts);
          server = new DetachedMonitorServer({ authority, host: config.host ?? "127.0.0.1", port: config.port ?? 0, ...(config.bootstrapToken ? { bootstrapToken: config.bootstrapToken } : {}) });
          const address = await server.start();
          if (context.signal.aborted) { await dispose(); throw new ArborError("INDETERMINATE", "arbor-web activation was cancelled"); }
          const abort = () => { void dispose(); };
          context.signal.addEventListener("abort", abort, { once: true });
          options.onStarted?.(address);
          const ui = context.invocation.extensionContext.ui;
          if (context.invocation.extensionContext.hasUI) ui.notify(`Arbor Web: ${address.bootstrapUrl}`, "info");
          context.invocation.activity?.({ type: "progress", message: `Arbor Web listening at ${address.url}; No active Fabric driver` });
          return async () => { context.signal.removeEventListener("abort", abort); await dispose(); };
        } catch (error) { await dispose(); throw error; }
      }, { label: "arbor-web-server", kind: "scoped", resources: ["arbor:web:loopback"], ordering: "ordered" });
    },
  });
}

export const ARBOR_WEB_COMPONENT_V1 = createArborWebComponent();

export function createArborRuntimeComponent(providerFactory: () => FabricProvider): FabricComponentDefinition<ArborRuntimeComponentConfigV1> {
  return Object.freeze({
    name: "arbor-runtime",
    description: "Supervised Arbor provider lifecycle. It never autonomously dispatches Fabric children.",
    requires: [],
    provides: [{ provider: "arbor" }],
    guarantee: "managed",
    async activate(context: FabricComponentContext, config: ArborRuntimeComponentConfigV1) {
      if (config.version !== 1) throw new ArborError("VALIDATION_FAILED", "arbor-runtime config version must be 1");
      if (!config.enabled) return;
      if (context.signal.aborted) throw new ArborError("INDETERMINATE", "arbor-runtime activation was cancelled");
      context.provide(providerFactory());
    },
  });
}
