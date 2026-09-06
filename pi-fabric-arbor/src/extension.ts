import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { ARBOR_PACKAGED_ASSETS, getArborAvailability } from "./package-layout.js";
import { createArborComponent, type DiagnosticReader } from "./managed/definitions.js";
import { doctorArbor, setupArbor } from "./managed/setup.js";

export default async function piFabricArbor(pi: ExtensionAPI): Promise<void> {
  let diagnostic: DiagnosticReader = () => undefined;
  let installed = false;
  let registrationError: string | undefined;
  // Dynamic public import keeps setup/doctor usable even if Fabric isn't installed.
  try {
    const protocol = await import("pi-fabric/protocol");
    installed = true;
    const component = createArborComponent(read => { diagnostic = read; });
    pi.events.emit(protocol.FABRIC_COMPONENT_REGISTER_EVENT, { version: 1, component, overwrite: true });
    pi.events.on(protocol.FABRIC_COMPONENT_DISCOVER_EVENT, (event) => {
      (event as import("pi-fabric/protocol").FabricComponentDiscovery).register(component, { overwrite: true });
    });
  } catch (error) { registrationError = String(error); }
  pi.registerCommand("arbor", {
    description: "Arbor setup, doctor and package inspection; research effects use the owning Fabric provider",
    async handler(rawArgs, context) {
      const args = rawArgs.trim().split(/\s+/u).filter(Boolean);
      const operation = args[0] ?? "doctor";
      if (args.length > 1) throw new Error("Usage: /arbor [setup|doctor|availability|assets]");
      let result: unknown;
      if (operation === "setup") result = await setupArbor(context);
      else if (operation === "doctor") result = await doctorArbor(context, installed, diagnostic(), registrationError);
      else if (operation === "availability") result = getArborAvailability();
      else if (operation === "assets") result = ARBOR_PACKAGED_ASSETS;
      else throw new Error("Use the owning Pi Fabric arbor.start/inspect/cancel provider for PR2 execution. Product research commands await PR3+. CLI/browser remain read-only.");
      const message = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      if (context.hasUI) context.ui.notify(message, "info");
      else process.stdout.write(`${message}\n`);
    },
  });
}
