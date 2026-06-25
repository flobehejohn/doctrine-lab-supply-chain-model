import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertConfigMatrixEvidencePackShape,
  buildConfigMatrixEvidencePack,
  compareEnvMatrix,
  loadEnvMatrix,
  type JsonRecord
} from "../../packages/dreps-config-matrix/src/index.js";

const root = process.cwd();

const matrixPath = "labs/supply-chain/examples/config-matrix-fixture/env-matrix.json";
const normalizedPath = ".doctrine/out/config-matrix/env-matrix.normalized.json";
const driftReportPath = ".doctrine/out/config-matrix/config-drift-report.json";
const jtablePath = ".doctrine/out/config-matrix/env-matrix.jtable.json";
const markdownTablePath = ".doctrine/out/config-matrix/env-matrix.md";
const evidencePackPath = ".doctrine/out/config-matrix/evidence-pack.config-matrix.json";
const baseEvidencePath = "labs/supply-chain/examples/ecommerce/evidence-pack.json";

const matrix = loadEnvMatrix(resolve(root, matrixPath));
const report = compareEnvMatrix(matrix);
const baseEvidencePack = JSON.parse(
  readFileSync(resolve(root, baseEvidencePath), "utf8")
) as JsonRecord;

const evidencePack = buildConfigMatrixEvidencePack(baseEvidencePack, report, {
  matrixPath: normalizedPath,
  driftReportPath,
  jtablePath,
  markdownTablePath
});

const parsed = EvidencePackSchema.parse(evidencePack);
assertConfigMatrixEvidencePackShape(parsed as Record<string, unknown>);

for (const outputPath of [driftReportPath, evidencePackPath]) {
  mkdirSync(dirname(resolve(root, outputPath)), { recursive: true });
}

writeFileSync(resolve(root, driftReportPath), JSON.stringify(report, null, 2) + "\n", "utf8");
writeFileSync(resolve(root, evidencePackPath), JSON.stringify(parsed, null, 2) + "\n", "utf8");

console.log("Environment matrix drift compared.");
console.log("driftReport: " + driftReportPath);
console.log("evidencePack: " + evidencePackPath);
console.log("findings: " + parsed.findings.length);
