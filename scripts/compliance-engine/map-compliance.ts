import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  assertComplianceReportShape,
  loadComplianceMap,
  loadTechnicalContext,
  mapComplianceImpacts,
  renderComplianceSummary,
  toJtablePayload
} from "../../packages/dreps-compliance-engine/src/index.js";

const root = process.cwd();

const contextPath = "labs/supply-chain/examples/compliance-engine-fixture/technical-findings.json";

const mapPaths = [
  ".doctrine/compliance.map.slsa.json",
  ".doctrine/compliance.map.dora.json",
  ".doctrine/compliance.map.nis2.json",
  ".doctrine/compliance.map.iso27001.json",
  ".doctrine/compliance.map.cis-kubernetes.json",
  ".doctrine/compliance.map.owasp-asvs.json",
  ".doctrine/compliance.map.owasp-samm.json"
];

const reportPath = ".doctrine/out/compliance/compliance-impact-report.json";
const summaryPath = ".doctrine/out/compliance/compliance-summary.md";
const jtablePath = ".doctrine/out/compliance/compliance-impact.jtable.json";

const context = loadTechnicalContext(resolve(root, contextPath));
const maps = mapPaths.map((path) => loadComplianceMap(resolve(root, path)));
const report = mapComplianceImpacts(context, maps);

assertComplianceReportShape(report);

const summary = renderComplianceSummary(report);
const jtable = toJtablePayload(report);

for (const outputPath of [reportPath, summaryPath, jtablePath]) {
  mkdirSync(dirname(resolve(root, outputPath)), { recursive: true });
}

writeFileSync(resolve(root, reportPath), JSON.stringify(report, null, 2) + "\n", "utf8");
writeFileSync(resolve(root, summaryPath), summary, "utf8");
writeFileSync(resolve(root, jtablePath), JSON.stringify(jtable, null, 2) + "\n", "utf8");

console.log("Compliance mapping completed.");
console.log("findingsEvaluated: " + report.findingsEvaluated);
console.log("impacts: " + report.impacts.length);
console.log("frameworks: " + report.frameworks.join(", "));
console.log("report: " + reportPath);
console.log("summary: " + summaryPath);
console.log("jtable: " + jtablePath);
