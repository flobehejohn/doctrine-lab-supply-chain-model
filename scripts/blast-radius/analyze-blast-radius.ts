import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  assertBlastRadiusReportShape,
  calculateBlastRadius,
  loadBlastRadiusInput,
  renderBlastRadiusMermaid,
  renderBlastRadiusSummary,
  toJtablePayload
} from "../../packages/dreps-blast-radius-engine/src/index.js";

const root = process.cwd();

const inputPath = process.argv[2] ?? "labs/supply-chain/examples/blast-radius-fixture/blast-radius-context.json";

const reportPath = ".doctrine/out/blast-radius/blast-radius-report.json";
const mermaidPath = ".doctrine/out/blast-radius/blast-radius.mmd";
const jtablePath = ".doctrine/out/blast-radius/blast-radius-summary.jtable.json";
const summaryPath = ".doctrine/out/blast-radius/blast-radius-summary.md";

const input = loadBlastRadiusInput(resolve(root, inputPath));
const report = calculateBlastRadius(input);
assertBlastRadiusReportShape(report);

const mermaid = renderBlastRadiusMermaid(report);
const jtable = toJtablePayload(report);
const summary = renderBlastRadiusSummary(report);

for (const outputPath of [reportPath, mermaidPath, jtablePath, summaryPath]) {
  mkdirSync(dirname(resolve(root, outputPath)), { recursive: true });
}

writeFileSync(resolve(root, reportPath), JSON.stringify(report, null, 2) + "\n", "utf8");
writeFileSync(resolve(root, mermaidPath), mermaid, "utf8");
writeFileSync(resolve(root, jtablePath), JSON.stringify(jtable, null, 2) + "\n", "utf8");
writeFileSync(resolve(root, summaryPath), summary, "utf8");

console.log("Blast radius analysis completed.");
console.log("scenario: " + report.scenario);
console.log("startNode: " + report.startNode);
console.log("reachableNodes: " + report.reachableNodes.length);
console.log("criticalNodes: " + report.criticalNodes.length);
console.log("sensitiveDataNodes: " + report.sensitiveDataNodes.length);
console.log("blastRadiusScore: " + report.blastRadiusScore);
console.log("report: " + reportPath);
console.log("mermaid: " + mermaidPath);
console.log("jtable: " + jtablePath);
