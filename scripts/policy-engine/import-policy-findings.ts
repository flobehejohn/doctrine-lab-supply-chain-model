import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertPolicyEvidencePackShape,
  buildPolicyEvidencePack,
  evaluatePolicies,
  loadPolicyContext,
  loadPolicyRuleset,
  type JsonRecord
} from "../../packages/dreps-policy-engine/src/index.js";

const root = process.cwd();

const contextPath = "labs/supply-chain/examples/policy-engine-fixture/policy-context.json";
const policiesPath = "labs/supply-chain/examples/policy-engine-fixture/policies/policies.json";
const reportPath = ".doctrine/out/policy-engine/policy-evaluation-report.json";
const evidencePackPath = ".doctrine/out/policy-engine/evidence-pack.policy-engine.json";
const baseEvidencePath = "labs/supply-chain/examples/ecommerce/evidence-pack.json";

const context = loadPolicyContext(resolve(root, contextPath));
const ruleset = loadPolicyRuleset(resolve(root, policiesPath));
const report = evaluatePolicies(context, ruleset);

const baseEvidencePack = JSON.parse(
  readFileSync(resolve(root, baseEvidencePath), "utf8")
) as JsonRecord;

const evidencePack = buildPolicyEvidencePack(baseEvidencePack, context, report, {
  contextPath,
  policiesPath,
  reportPath
});

const parsed = EvidencePackSchema.parse(evidencePack);
assertPolicyEvidencePackShape(parsed as Record<string, unknown>);

for (const outputPath of [reportPath, evidencePackPath]) {
  mkdirSync(dirname(resolve(root, outputPath)), { recursive: true });
}

writeFileSync(resolve(root, reportPath), JSON.stringify(report, null, 2) + "\n", "utf8");
writeFileSync(resolve(root, evidencePackPath), JSON.stringify(parsed, null, 2) + "\n", "utf8");

console.log("Policy findings imported into DREPS evidence-pack.");
console.log("evidencePack: " + evidencePackPath);
console.log("findings: " + parsed.findings.length);
