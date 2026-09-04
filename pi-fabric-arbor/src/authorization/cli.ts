import { resolve } from "node:path";
import { ArborApplication } from "../application/ArborApplication.js";
import { NO_CERTIFICATIONS_V1, UnavailableCleanupAdapter, UnavailableEvaluator, UnavailableFabricAgentAdapter, UnavailableReportPublisher, UnavailableWorkspaceManager } from "../compatibility/fail-closed.js";
import { ArborError } from "../domain/errors.js";
import { PrivateRepositoryPromotionGitIntegrator } from "../git/PromotionGitIntegrator.js";
import { SqliteRunStore } from "../persistence/SqliteRunStore.js";
import { RandomIdFactory, SystemClock, type Clock } from "../util/clock.js";
import { CURRENT_OS_IDENTITY_V1, LocalTtyAuthorizationCoordinator, NodeLocalTerminal, OwnerOnlyEd25519KeyStore, TrustedPrincipalRegistry, loadOwnerOnlyPrincipalConfiguration, type LocalTerminalV1, type OsIdentityV1 } from "./TrustedPrincipal.js";

export interface AuthorizationCliEnvironmentV1 {
  PI_FABRIC_ARBOR_DATABASE?: string;
  PI_FABRIC_ARBOR_STATE_ROOT?: string;
  PI_FABRIC_ARBOR_PRIVATE_GIT_DIR?: string;
  PI_FABRIC_ARBOR_TRUSTED_PRINCIPALS?: string;
  PI_FABRIC_ARBOR_KEY_ROOT?: string;
  PI_FABRIC_ARBOR_HELD_OUT_CERTIFICATE_DIGEST?: string;
  PI_FABRIC_ARBOR_GIT_OID_LENGTH?: string;
}

function required(environment: AuthorizationCliEnvironmentV1, key: keyof AuthorizationCliEnvironmentV1): string {
  const value = environment[key];
  if (!value) throw new ArborError("VALIDATION_FAILED", `Authorization CLI requires ${key}`);
  return resolve(value);
}

export async function runAuthorizationCli(input: {
  argv: readonly string[];
  environment?: AuthorizationCliEnvironmentV1;
  terminal?: LocalTerminalV1;
  osIdentity?: OsIdentityV1;
  clock?: Clock;
  writeResult?: (text: string) => void;
}): Promise<void> {
  const [kind, challengeFlag, challengeId, ...rest] = input.argv;
  if ((kind !== "promotion" && kind !== "rollback") || challengeFlag !== "--challenge" || !challengeId || rest.length !== 0) throw new ArborError("VALIDATION_FAILED", "Usage: pi-fabric-arbor authorize promotion|rollback --challenge <opaque-id>");
  const action = kind === "promotion" ? "promote" as const : "rollback" as const;
  const environment = input.environment ?? process.env;
  const database = required(environment, "PI_FABRIC_ARBOR_DATABASE");
  const stateRoot = required(environment, "PI_FABRIC_ARBOR_STATE_ROOT");
  const privateGitDir = required(environment, "PI_FABRIC_ARBOR_PRIVATE_GIT_DIR");
  const configurationPath = required(environment, "PI_FABRIC_ARBOR_TRUSTED_PRINCIPALS");
  const keyRoot = required(environment, "PI_FABRIC_ARBOR_KEY_ROOT");
  const heldOutDigest = environment.PI_FABRIC_ARBOR_HELD_OUT_CERTIFICATE_DIGEST;
  if (!heldOutDigest || !/^[0-9a-f]{64}$/u.test(heldOutDigest)) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Authorization CLI requires the active B8 certificate digest");
  const osIdentity = input.osIdentity ?? CURRENT_OS_IDENTITY_V1; const uid = osIdentity.uid();
  const registry = new TrustedPrincipalRegistry(loadOwnerOnlyPrincipalConfiguration(configurationPath, uid));
  const keyStore = new OwnerOnlyEd25519KeyStore({ root: keyRoot, ownerUid: uid, browserReachableRoots: [stateRoot] });
  const oidLength = environment.PI_FABRIC_ARBOR_GIT_OID_LENGTH === "64" ? 64 : 40;
  const store = await SqliteRunStore.open(database);
  try {
    const application = new ArborApplication({
      store, workspace: new UnavailableWorkspaceManager(NO_CERTIFICATIONS_V1), agent: new UnavailableFabricAgentAdapter(NO_CERTIFICATIONS_V1),
      evaluator: new UnavailableEvaluator(NO_CERTIFICATIONS_V1), reportPublisher: new UnavailableReportPublisher(), cleanup: new UnavailableCleanupAdapter(NO_CERTIFICATIONS_V1),
      clock: input.clock ?? new SystemClock(), ids: new RandomIdFactory(), gitOidLength: oidLength, executionMode: "productionBlocked",
      phase5: { git: new PrivateRepositoryPromotionGitIntegrator({ privateGitDir, stateRoot, gitOidLength: oidLength }), authorization: registry, heldOutIsolationCertificateDigest: heldOutDigest },
    });
    const coordinator = new LocalTtyAuthorizationCoordinator({ application, registry, keyStore, terminal: input.terminal ?? new NodeLocalTerminal(), osIdentity, clock: input.clock ?? new SystemClock() });
    const authorization = await coordinator.authorize(action, challengeId);
    (input.writeResult ?? ((text) => process.stdout.write(text)))(`${JSON.stringify({ version: 1, authorizationId: authorization.authorizationId, kind: authorization.payload.kind, state: authorization.state })}\n`);
  } finally { await store.close(); }
}
