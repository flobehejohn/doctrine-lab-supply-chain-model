import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertConfigMatrixEvidencePackShape,
  ConfigMatrixFindingIds
} from "../../packages/dreps-config-matrix/src/index.js";

const root = process.cwd();

const requiredOutputs = [
  ".doctrine/out/config-matrix/env-matrix.normalized.json",
  ".doctrine/out/config-matrix/env-matrix.jtable.json",
  ".doctrine/out/config-matrix/env-matrix.md",
  ".doctrine/out/config-matrix/config-drift-report.json",
  ".doctrine/out/config-matrix/evidence-pack.config-matrix.json"
];

for (const file of requiredOutputs) {
  if (!existsSync(resolve(root, file))) {
    throw new Error("Missing config matrix output: " + file);
  }
}

const evidencePack = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/config-matrix/evidence-pack.config-matrix.json"), "utf8")
) as unknown;

const jtable = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/config-matrix/env-matrix.jtable.json"), "utf8")
) as {
  schemaVersion?: string;
  rows?: unknown[];
};

const parsed = EvidencePackSchema.parse(evidencePack);
assertConfigMatrixEvidencePackShape(parsed as Record<string, unknown>);

if (jtable.schemaVersion !== "jtable.compat.v1") {
  throw new Error("jtable payload has invalid schemaVersion");
}

if (!Array.isArray(jtable.rows) || jtable.rows.length < 3) {
  throw new Error("jtable payload has no usable matrix rows");
}

console.log("Config matrix certification passed.");
console.log("knownFindings: " + ConfigMatrixFindingIds.length);
console.log("evidencePack: .doctrine/out/config-matrix/evidence-pack.config-matrix.json");
console.log("driftReport: .doctrine/out/config-matrix/config-drift-report.json");
console.log("jtable: .doctrine/out/config-matrix/env-matrix.jtable.json");
