import {
  FABRIC_COMPONENT_DISCOVER_EVENT,
  FABRIC_COMPONENT_REGISTER_EVENT,
  type FabricComponentDiscovery,
  type FabricComponentRegistration,
} from "pi-fabric";
import { resolvePreparedProductionProviderV1 } from "../application/ProductionComposition.js";
import { ARBOR_WEB_COMPONENT_V1, createArborRuntimeComponent } from "../component/definitions.js";
import { createActionDescriptors } from "../public/descriptors.js";
import { createCertificationBlockedProvider } from "../public/provider.js";
import { FIXTURE_SCHEMAS_V1 } from "../schemas/catalog.js";

interface PiEventHostV1 {
  events: {
    emit(event: string, payload: unknown): void;
    on(event: string, listener: (payload: unknown) => void): void;
  };
}

/** Historical v1 characterization entrypoint. It is deliberately absent from package exports and Pi registration. */
export default function piFabricArborV1(pi: PiEventHostV1): void {
  const components = [
    createArborRuntimeComponent(() => {
      const prepared = resolvePreparedProductionProviderV1();
      return prepared.provider ?? createCertificationBlockedProvider({
        descriptors: createActionDescriptors(FIXTURE_SCHEMAS_V1),
        reason: prepared.blockers.length ? prepared.blockers.join("; ") : "graduated production admission is absent",
      });
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
