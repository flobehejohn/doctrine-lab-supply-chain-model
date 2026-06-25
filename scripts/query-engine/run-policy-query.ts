import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertQueryEvidencePackShape,
  buildQueryEvidencePack,
  evaluateRegoPolicy,
  loadQueryGraph,
  toJtablePayload,
  type JsonRecord
} from "../../packages/dreps-query-engine/src/index.js";

const root = process.cwd();

const graphPath = "labs/supply-chain/examples/query-engine-fixture/query-graph.json";
const policyPath = "labs/supply-chain/examples/query-engine-fixture/policies/critical-exposed-pod.rego";
const baseEvidencePath = "labs/supply-chain/examples/ecommerce/evidence-pack.json";

const resultPath = ".doctrine/out/query-engine/policy-query-result.json";
const jtablePath = ".doctrine/out/query-engine/query-results.jtable.json";
const evidencePackPath = ".doctrine/out/query-engine/evidence-pack.query-engine.json";

const graph = loadQueryGraph(resolve(root, graphPath));
const policy = evaluateRegoPolicy(graph, resolve(root, policyPath));
const jtable = toJtablePayload(policy.result);

const baseEvidencePack = JSON.parse(
  readFileSync(resolve(root, baseEvidencePath), "utf8")
) as JsonRecord;

const evidencePack = buildQueryEvidencePack(baseEvidencePack, graph, policy.result, policy, {
  graphPath,
  queryResultPath: resultPath,
  policyPath,
  jtablePath
});

const parsed = EvidencePackSchema.parse(evidencePack);
assertQueryEvidencePackShape(parsed as Record<string, unknown>);

for (const outputPath of [resultPath, jtablePath, evidencePackPath]) {
  mkdirSync(dirname(resolve(root, outputPath)), { recursive: true });
}

writeFileSync(resolve(root, resultPath), JSON.stringify(policy, null, 2) + "\n", "utf8");
writeFileSync(resolve(root, jtablePath), JSON.stringify(jtable, null, 2) + "\n", "utf8");
writeFileSync(resolve(root, evidencePackPath), JSON.stringify(parsed, null, 2) + "\n", "utf8");

console.log("Policy query executed.");
console.log("policy: " + policyPath);
console.log("query: " + policy.query);
console.log("matchedNodes: " + policy.result.matchedNodes.map((node) => node.id).join(", "));
console.log("finding: " + (policy.finding?.id ?? "none"));
console.log("evidencePack: " + evidencePackPath);
