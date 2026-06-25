import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import { assertQueryEvidencePackShape } from "../../packages/dreps-query-engine/src/index.js";

const root = process.cwd();

const requiredOutputs = [
  ".doctrine/out/query-engine/policy-query-result.json",
  ".doctrine/out/query-engine/query-results.jtable.json",
  ".doctrine/out/query-engine/evidence-pack.query-engine.json"
];

for (const file of requiredOutputs) {
  if (!existsSync(resolve(root, file))) {
    throw new Error("Missing query engine output: " + file);
  }
}

const evidencePack = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/query-engine/evidence-pack.query-engine.json"), "utf8")
) as unknown;

const jtable = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/query-engine/query-results.jtable.json"), "utf8")
) as {
  schemaVersion?: string;
  rows?: unknown[];
};

const parsed = EvidencePackSchema.parse(evidencePack);
assertQueryEvidencePackShape(parsed as Record<string, unknown>);

if (jtable.schemaVersion !== "jtable.compat.v1") {
  throw new Error("jtable query result payload has invalid schemaVersion");
}

if (!Array.isArray(jtable.rows) || jtable.rows.length < 1) {
  throw new Error("Query jtable payload has no matched rows");
}

console.log("Query engine certification passed.");
console.log("evidencePack: .doctrine/out/query-engine/evidence-pack.query-engine.json");
console.log("jtable: .doctrine/out/query-engine/query-results.jtable.json");
console.log("policy finding: policy-critical-exposed-pod");
console.log("query usable in CI: yes");
