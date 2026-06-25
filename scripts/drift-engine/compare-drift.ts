import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  assertDriftReportShape,
  compareDrift,
  loadDriftArtifact,
  renderDriftMermaid,
  renderDriftSummary
} from "../../packages/dreps-drift-engine/src/index.js";

const root = process.cwd();

const baselinePath = process.argv[2] ?? "labs/supply-chain/examples/drift-engine-fixture/baseline.json";
const currentPath = process.argv[3] ?? "labs/supply-chain/examples/drift-engine-fixture/current.json";

const reportPath = ".doctrine/out/drift-engine/drift-report.json";
const summaryPath = ".doctrine/out/drift-engine/drift-summary.md";
const mermaidPath = ".doctrine/out/drift-engine/drift.mmd";

const baseline = loadDriftArtifact(resolve(root, baselinePath));
const current = loadDriftArtifact(resolve(root, currentPath));

const report = compareDrift(baseline, current);
assertDriftReportShape(report);

const summary = renderDriftSummary(report);
const mermaid = renderDriftMermaid(report);

for (const outputPath of [reportPath, summaryPath, mermaidPath]) {
  mkdirSync(dirname(resolve(root, outputPath)), { recursive: true });
}

writeFileSync(resolve(root, reportPath), JSON.stringify(report, null, 2) + "\n", "utf8");
writeFileSync(resolve(root, summaryPath), summary, "utf8");
writeFileSync(resolve(root, mermaidPath), mermaid, "utf8");

console.log("Drift comparison completed.");
console.log("baseline: " + baseline.packId);
console.log("current: " + current.packId);
console.log("drifts: " + report.driftCount);
console.log("report: " + reportPath);
console.log("summary: " + summaryPath);
console.log("mermaid: " + mermaidPath);
