import { PiPresentation } from "./presentation/PiPresentation.js";
import { getAgentDir, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";
import {readSourceCatalog} from "./research/SourceCatalog.js";
import { readCatalog } from "./evaluators/catalog.js";
import { ARBOR_PACKAGED_ASSETS, getArborAvailability } from "./package-layout.js";
import { createArborComponent, type DiagnosticReader } from "./managed/definitions.js";
import { doctorArbor, setupArbor } from "./managed/setup.js";
import { commandProgram } from "./research/commands.js";

export default async function piFabricArbor(pi: ExtensionAPI): Promise<void> {
  let activeStateDirectory:string|undefined;
  const presentation = new PiPresentation(pi,()=>activeStateDirectory);
  pi.on("session_shutdown", () => presentation.close());
  let diagnostic: DiagnosticReader = () => undefined;
  let installed = false;
  let registrationError: string | undefined;
  // Dynamic public import keeps setup/doctor usable even if Fabric isn't installed.
  try {
    const protocol = await import("pi-fabric/protocol");
    installed = true;
    // Catalog is read once at definition registration, never from a run or activation.
    // Changing it requires a quiescent owning-Pi /reload and explicit run resume.
    const catalog = readCatalog(join(getAgentDir(), "arbor.evaluators.json"));
    const sources=readSourceCatalog(join(getAgentDir(), "arbor.sources.json"));
    const component = createArborComponent((read,directory) => { diagnostic = read; activeStateDirectory=directory; }, catalog, async (ref, invocation) => {
      // Public provider discovery is descriptor inspection only. Never invoke a
      // discovered provider directly or widen the committed optional catalog.
      if (!catalog.some(entry => entry.ref === ref)&&!sources.some(entry=>entry.search.ref===ref||entry.fetch.ref===ref)) throw new Error("Unconfigured evaluator descriptor request");
      const [namespace, action] = ref.split(".");
      let selected: import("pi-fabric/protocol").FabricProvider | undefined;
      pi.events.emit(protocol.FABRIC_PROVIDER_DISCOVER_EVENT, { version: 1, register(provider: import("pi-fabric/protocol").FabricProvider) { if (provider.name === namespace) selected = provider; } });
      return selected?.describe(action!, invocation);
    }, sources);
    pi.events.emit(protocol.FABRIC_COMPONENT_REGISTER_EVENT, { version: 1, component, overwrite: true });
    pi.events.on(protocol.FABRIC_COMPONENT_DISCOVER_EVENT, (event) => {
      (event as import("pi-fabric/protocol").FabricComponentDiscovery).register(component, { overwrite: true });
    });
  } catch (error) { registrationError = String(error); }
  pi.registerCommand("arbor", {
    description: "Arbor setup/doctor and owning-Pi research commands through normal Fabric policy; CLI/browser stay read-only",
    async handler(rawArgs, context) {
      const args = rawArgs.trim().split(/\s+/u).filter(Boolean);
      const operation = args[0] ?? "dashboard";
      if (!["setup", "doctor", "availability", "assets"].includes(operation)) {
        if (!context.isProjectTrusted?.()) throw new Error("Trust the owning Pi project before research commands");
        if (["dashboard", "show", "browser"].includes(operation)) {
          await presentation.prepare(operation, rawArgs.trim().slice(operation === "dashboard" ? rawArgs.length : operation.length).trim(), context);
          return;
        }
        if (diagnostic()?.state !== "active") {
          const result = await doctorArbor(context, installed, diagnostic(), registrationError);
          const message = `Arbor research unavailable; no action submitted. ${JSON.stringify(result)}`;
          if (context.hasUI) context.ui.notify(message, "warning"); else process.stdout.write(`${message}\n`);
          return;
        }
        const request = await presentation.prepare(operation, rawArgs.trim().slice(operation.length).trim(), context);
        if (!request) return;
        const code = commandProgram(request);
        const message = `Arbor owning-Pi action request. Execute this exact program once through fabric_exec, preserving all host permissions; report the actual receipt or denial. Do not replace it with direct file/service calls. Submission is not completion.\nARBOR_COMMAND_PROGRAM=${JSON.stringify(code)}`;
        if (context.isIdle()) pi.sendUserMessage(message);
        else pi.sendUserMessage(message, { deliverAs: "followUp" });
        if (context.hasUI) context.ui.notify("Arbor action submitted to the normal Pi/Fabric path, not yet a control receipt or completion.", "info");
        return;
      }
      if (args.length > 1) throw new Error("Usage: /arbor [setup|doctor|availability|assets]");
      let result: unknown;
      if (operation === "setup") result = await setupArbor(context);
      else if (operation === "doctor") result = await doctorArbor(context, installed, diagnostic(), registrationError);
      else if (operation === "availability") result = getArborAvailability();
      else if (operation === "assets") result = ARBOR_PACKAGED_ASSETS;
      else throw new Error("Unknown Arbor diagnostic");
      const message = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      if (context.hasUI) context.ui.notify(message, "info");
      else process.stdout.write(`${message}\n`);
    },
  });
}
