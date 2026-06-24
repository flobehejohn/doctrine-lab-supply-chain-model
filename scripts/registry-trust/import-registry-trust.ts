import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertRegistryTrustEvidencePackShape,
  buildRegistryTrustEvidencePack,
  checkRegistryCertificate,
  loadRegistryCertificate,
  loadRegistryCiTlsPolicy,
  registryTrustFindings,
  type JsonRecord
} from "../../packages/dreps-registry-trust/src/index.js";

const root = process.cwd();

const certPath = "labs/supply-chain/examples/registry-trust-fixture/registry-cert.self-signed.json";
const policyPath = "labs/supply-chain/examples/registry-trust-fixture/ci-tls-policy.json";
const baseEvidencePath = "labs/supply-chain/examples/ecommerce/evidence-pack.json";

const normalizedPath = ".doctrine/out/registry-trust/registry-trust.normalized.json";
const outputPath = ".doctrine/out/registry-trust/evidence-pack.registry-trust.json";

const baseEvidencePack = JSON.parse(
  readFileSync(resolve(root, baseEvidencePath), "utf8")
) as JsonRecord;

const cert = loadRegistryCertificate(resolve(root, certPath));
const policy = loadRegistryCiTlsPolicy(resolve(root, policyPath));
const check = checkRegistryCertificate(cert, policy);

const normalized = {
  ...check,
  findings: registryTrustFindings(check)
};

const evidencePack = buildRegistryTrustEvidencePack(baseEvidencePack, check, certPath, policyPath);
const parsed = EvidencePackSchema.parse(evidencePack);

assertRegistryTrustEvidencePackShape(parsed as Record<string, unknown>);

const normalizedOutput = resolve(root, normalizedPath);
const evidenceOutput = resolve(root, outputPath);

mkdirSync(dirname(normalizedOutput), { recursive: true });
writeFileSync(normalizedOutput, JSON.stringify(normalized, null, 2) + "\n", "utf8");
writeFileSync(evidenceOutput, JSON.stringify(parsed, null, 2) + "\n", "utf8");

console.log("Registry trust imported into DREPS evidence-pack.");
console.log("evidencePack: " + outputPath);
console.log("certificateEvidence: evidence_registry_certificate");
console.log("findings: " + parsed.findings.length);
