import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertSecurityScanEvidencePackShape,
  SecurityScanFindingIds
} from "../../packages/dreps-adapters/src/security-scans.js";

const root = process.cwd();

const requiredOutputs = [
  ".doctrine/out/security-scans/trivy.normalized.json",
  ".doctrine/out/security-scans/syft.normalized.json",
  ".doctrine/out/security-scans/checkov.normalized.json",
  ".doctrine/out/security-scans/kubescape.normalized.json",
  ".doctrine/out/security-scans/sonarqube.normalized.json",
  ".doctrine/out/security-scans/dependency-track.normalized.json",
  ".doctrine/out/security-scans/evidence-pack.security-scans.json"
];

for (const file of requiredOutputs) {
  if (!existsSync(resolve(root, file))) {
    throw new Error("Missing security scan adapter output: " + file);
  }
}

const evidencePack = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/security-scans/evidence-pack.security-scans.json"), "utf8")
) as unknown;

const parsed = EvidencePackSchema.parse(evidencePack);
assertSecurityScanEvidencePackShape(parsed as Record<string, unknown>);

console.log("Security scan adapters certification passed.");
console.log("findings: " + SecurityScanFindingIds.length);
console.log("evidencePack: .doctrine/out/security-scans/evidence-pack.security-scans.json");
console.log("links: trivy->image, kubescape->namespace/pod, checkov->terraform/k8s runtime nodes");
