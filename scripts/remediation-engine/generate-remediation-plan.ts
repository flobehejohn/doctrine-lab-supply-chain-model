import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  assertRemediationPlanShape,
  buildRemediationPlan,
  loadRemediationContext,
  renderRemediationMarkdown,
  toJtablePayload
} from "../../packages/dreps-remediation-engine/src/index.js";

const root = process.cwd();

const contextPath = "labs/supply-chain/examples/remediation-engine-fixture/remediation-context.json";

const planPath = ".doctrine/out/remediation/remediation-plan.json";
const markdownPath = ".doctrine/out/remediation/remediation-plan.md";
const jtablePath = ".doctrine/out/remediation/remediation-plan.jtable.json";

const context = loadRemediationContext(resolve(root, contextPath));
const plan = buildRemediationPlan(context);
assertRemediationPlanShape(plan);

const markdown = renderRemediationMarkdown(plan);
const jtable = toJtablePayload(plan);

for (const outputPath of [planPath, markdownPath, jtablePath]) {
  mkdirSync(dirname(resolve(root, outputPath)), { recursive: true });
}

writeFileSync(resolve(root, planPath), JSON.stringify(plan, null, 2) + "\n", "utf8");
writeFileSync(resolve(root, markdownPath), markdown, "utf8");
writeFileSync(resolve(root, jtablePath), JSON.stringify(jtable, null, 2) + "\n", "utf8");

console.log("Remediation plan generated.");
console.log("findingsEvaluated: " + plan.findingsEvaluated);
console.log("criticalFindings: " + plan.criticalFindings.length);
console.log("remediations: " + plan.remediations.length);
console.log("plan: " + planPath);
console.log("markdown: " + markdownPath);
console.log("jtable: " + jtablePath);
