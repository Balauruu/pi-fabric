import {
  FABRIC_COMPONENT_DISCOVER_EVENT,
  FABRIC_COMPONENT_REGISTER_EVENT,
  type FabricComponentDiscovery,
  type FabricComponentRegistration,
} from "pi-fabric";
import { ARBOR_WEB_COMPONENT_V1, createArborRuntimeComponent } from "./component/definitions.js";
import { createCertificationBlockedProvider } from "./public/provider.js";
import { createActionDescriptors } from "./public/descriptors.js";
import { FIXTURE_SCHEMAS_V1 } from "./schemas/catalog.js";
import { resolvePreparedProductionProviderV1 } from "./application/ProductionComposition.js";

interface PiEventHost {
  events: {
    emit(event: string, payload: unknown): void;
    on(event: string, listener: (payload: unknown) => void): void;
  };
}

/**
 * Registers both supervised definitions through pi-fabric's public eager and
 * discovery protocols. The Arbor provider is published only by arbor-runtime
 * through context.provide(), so no duplicate host-owned provider lifetime exists.
 * The discovery-only provider still rejects invocation until a production
 * composition supplies every independently verified startup gate and adapter.
 */
export default function piFabricArbor(pi: PiEventHost): void {
  const components = [
    createArborRuntimeComponent(() => {
      const prepared = resolvePreparedProductionProviderV1();
      return prepared.provider ?? createCertificationBlockedProvider({ descriptors: createActionDescriptors(FIXTURE_SCHEMAS_V1), reason: prepared.blockers.length ? prepared.blockers.join("; ") : "graduated production admission is absent" });
    }),
    ARBOR_WEB_COMPONENT_V1,
  ] as const;
  for (const component of components) {
    const registration: FabricComponentRegistration = { version: 1, component, overwrite: true };
    pi.events.emit(FABRIC_COMPONENT_REGISTER_EVENT, registration);
  }
  pi.events.on(FABRIC_COMPONENT_DISCOVER_EVENT, (payload) => {
    const discovery = payload as FabricComponentDiscovery;
    if (discovery?.version !== 1 || typeof discovery.register !== "function") return;
    for (const component of components) discovery.register(component, { overwrite: true });
  });
}
