import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertSecurityScanEvidencePackShape,
  attachSecurityScansToEvidencePack,
  importAllSecurityScans,
  type JsonRecord
} from "../../packages/dreps-adapters/src/security-scans.js";

const root = process.cwd();

const runtimePackPath = ".doctrine/out/runtime/evidence-pack.runtime.json";
const outputPath = ".doctrine/out/security-scans/evidence-pack.security-scans.json";

const runtimeEvidencePack = JSON.parse(
  readFileSync(resolve(root, runtimePackPath), "utf8")
) as JsonRecord;

const scanRoot = "labs/supply-chain/examples/security-scans-fixture";

const scans = importAllSecurityScans({
  trivy: resolve(root, scanRoot, "trivy.json"),
  syft: resolve(root, scanRoot, "syft.json"),
  checkov: resolve(root, scanRoot, "checkov.json"),
  kubescape: resolve(root, scanRoot, "kubescape.json"),
  sonarqube: resolve(root, scanRoot, "sonarqube.json"),
  dependencyTrack: resolve(root, scanRoot, "dependency-track.json")
});

const evidencePack = attachSecurityScansToEvidencePack(runtimeEvidencePack, scans);
const parsed = EvidencePackSchema.parse(evidencePack);

assertSecurityScanEvidencePackShape(parsed as Record<string, unknown>);

const output = resolve(root, outputPath);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(parsed, null, 2) + "\n", "utf8");

console.log("Security scans imported into DREPS evidence-pack.");
console.log("evidencePack: " + outputPath);
console.log("findings: " + parsed.findings.length);
