import { ARBOR_PACKAGED_ASSETS, getArborAvailability } from "./package-layout.js";

interface ArborCommandContext {
  ui: {
    notify(message: string, type?: "info" | "warning" | "error"): void;
  };
}

interface PiExtensionHost {
  registerCommand(name: string, command: {
    description: string;
    handler(args: string, context: ArborCommandContext): void | Promise<void>;
  }): void;
}

const MUTATING_WORDS = new Set([
  "setup", "start", "pause", "resume", "cancel", "steer", "keep", "discard",
  "review", "apply", "undo", "undo-apply", "export", "generate", "authorize", "certify", "serve",
]);

function availabilityText(): string {
  const value = getArborAvailability();
  return [
    `pi-fabric-arbor ${value.version} (${value.sourceSentinel})`,
    `extension: ${value.extension}`,
    `CLI: ${value.cli}; Web: ${value.web}`,
    `research: ${value.research}`,
    `component: ${value.component}`,
    "PR1 provides packaging inspection only. Setup/doctor and research operations are not implemented until later PRs.",
  ].join("\n");
}

export default function piFabricArbor(pi: PiExtensionHost): void {
  pi.registerCommand("arbor", {
    description: "Inspect source-loaded Arbor package availability (PR1 is read-only)",
    handler: (rawArgs, context) => {
      const args = rawArgs.trim().split(/\s+/u).filter(Boolean);
      const operation = args[0] ?? "availability";
      if (MUTATING_WORDS.has(operation)) {
        throw new Error(`Arbor PR1 is read-only; '${operation}' is available only from the owning Pi surface after its later implementation.`);
      }
      if (operation === "availability" && args.length === 1) {
        context.ui.notify(availabilityText(), "info");
        return;
      }
      if (operation === "assets" && args.length === 1) {
        context.ui.notify(Object.entries(ARBOR_PACKAGED_ASSETS).map(([id, path]) => `${id}: ${path}`).join("\n"), "info");
        return;
      }
      throw new Error("Usage: /arbor [availability|assets]. PR1 exposes no setup, doctor, research, review, apply, export-generation, or attachment command.");
    },
  });
}
