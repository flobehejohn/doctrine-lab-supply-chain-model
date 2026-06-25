import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  evaluatePolicies,
  loadPolicyContext,
  loadPolicyRuleset
} from "../../packages/dreps-policy-engine/src/index.js";

const root = process.cwd();

const contextPath = "labs/supply-chain/examples/policy-engine-fixture/policy-context.json";
const policiesPath = "labs/supply-chain/examples/policy-engine-fixture/policies/policies.json";
const outputPath = ".doctrine/out/policy-engine/policy-evaluation-report.json";

const context = loadPolicyContext(resolve(root, contextPath));
const ruleset = loadPolicyRuleset(resolve(root, policiesPath));
const report = evaluatePolicies(context, ruleset);

mkdirSync(dirname(resolve(root, outputPath)), { recursive: true });
writeFileSync(resolve(root, outputPath), JSON.stringify(report, null, 2) + "\n", "utf8");

console.log("Policy evaluation completed.");
console.log("policiesEvaluated: " + report.policiesEvaluated);
console.log("findings: " + report.findings.length);
console.log("report: " + outputPath);
