import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertRegistryTrustEvidencePackShape,
  RegistryTrustFindingIds
} from "../../packages/dreps-registry-trust/src/index.js";

const root = process.cwd();

const requiredOutputs = [
  ".doctrine/out/registry-trust/registry-trust.normalized.json",
  ".doctrine/out/registry-trust/evidence-pack.registry-trust.json"
];

for (const file of requiredOutputs) {
  if (!existsSync(resolve(root, file))) {
    throw new Error("Missing registry trust output: " + file);
  }
}

const evidencePack = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/registry-trust/evidence-pack.registry-trust.json"), "utf8")
) as unknown;

const parsed = EvidencePackSchema.parse(evidencePack);
assertRegistryTrustEvidencePackShape(parsed as Record<string, unknown>);

console.log("Registry trust certification passed.");
console.log("knownFindings: " + RegistryTrustFindingIds.length);
console.log("evidencePack: .doctrine/out/registry-trust/evidence-pack.registry-trust.json");
console.log("certificate evidence: evidence_registry_certificate");
console.log("self-signed finding: registry-self-signed-cert");
