import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertPolicyEvidencePackShape,
  PolicyIds
} from "../../packages/dreps-policy-engine/src/index.js";

const root = process.cwd();

const requiredOutputs = [
  ".doctrine/out/policy-engine/policy-evaluation-report.json",
  ".doctrine/out/policy-engine/evidence-pack.policy-engine.json"
];

for (const file of requiredOutputs) {
  if (!existsSync(resolve(root, file))) {
    throw new Error("Missing policy engine output: " + file);
  }
}

const evidencePack = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/policy-engine/evidence-pack.policy-engine.json"), "utf8")
) as unknown;

const report = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/policy-engine/policy-evaluation-report.json"), "utf8")
) as {
  findings?: unknown[];
  policiesEvaluated?: number;
};

const parsed = EvidencePackSchema.parse(evidencePack);
assertPolicyEvidencePackShape(parsed as Record<string, unknown>);

if (!Array.isArray(report.findings) || report.findings.length !== PolicyIds.length) {
  throw new Error("Policy report does not contain expected findings");
}

if (report.policiesEvaluated !== PolicyIds.length) {
  throw new Error("Policy report did not evaluate all policies");
}

console.log("Policy engine certification passed.");
console.log("knownPolicies: " + PolicyIds.length);
console.log("evidencePack: .doctrine/out/policy-engine/evidence-pack.policy-engine.json");
console.log("normalized findings: yes");
console.log("affectedNodes and evidenceRefs: yes");
