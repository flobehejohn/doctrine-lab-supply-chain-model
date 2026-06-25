import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertRemediationPlanShape,
  type RemediationPlan
} from "../../packages/dreps-remediation-engine/src/index.js";

const root = process.cwd();

const requiredOutputs = [
  ".doctrine/out/remediation/remediation-plan.json",
  ".doctrine/out/remediation/remediation-plan.md",
  ".doctrine/out/remediation/remediation-plan.jtable.json"
];

for (const file of requiredOutputs) {
  if (!existsSync(resolve(root, file))) {
    throw new Error("Missing remediation output: " + file);
  }
}

const plan = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/remediation/remediation-plan.json"), "utf8")
) as RemediationPlan;

const markdown = readFileSync(resolve(root, ".doctrine/out/remediation/remediation-plan.md"), "utf8");

const jtable = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/remediation/remediation-plan.jtable.json"), "utf8")
) as {
  schemaVersion?: string;
  rows?: unknown[];
};

assertRemediationPlanShape(plan);

if (!markdown.includes("Remediation Plan") || !markdown.includes("Rollback") || !markdown.includes("Verification")) {
  throw new Error("Remediation markdown summary is incomplete");
}

if (jtable.schemaVersion !== "jtable.compat.v1") {
  throw new Error("Remediation jtable payload has invalid schemaVersion");
}

if (!Array.isArray(jtable.rows) || jtable.rows.length < plan.criticalFindings.length) {
  throw new Error("Remediation jtable payload has insufficient rows");
}

console.log("Remediation engine certification passed.");
console.log("plan: .doctrine/out/remediation/remediation-plan.json");
console.log("markdown: .doctrine/out/remediation/remediation-plan.md");
console.log("jtable: .doctrine/out/remediation/remediation-plan.jtable.json");
console.log("critical findings covered: " + plan.summary.criticalFindingsCovered + "/" + plan.criticalFindings.length);
console.log("verification and rollback: yes");
