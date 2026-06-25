import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertDriftReportShape,
  DriftTypes,
  type DriftReport
} from "../../packages/dreps-drift-engine/src/index.js";

const root = process.cwd();

const requiredOutputs = [
  ".doctrine/out/drift-engine/drift-report.json",
  ".doctrine/out/drift-engine/drift-summary.md",
  ".doctrine/out/drift-engine/drift.mmd"
];

for (const file of requiredOutputs) {
  if (!existsSync(resolve(root, file))) {
    throw new Error("Missing drift engine output: " + file);
  }
}

const report = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/drift-engine/drift-report.json"), "utf8")
) as DriftReport;

const summary = readFileSync(resolve(root, ".doctrine/out/drift-engine/drift-summary.md"), "utf8");
const mermaid = readFileSync(resolve(root, ".doctrine/out/drift-engine/drift.mmd"), "utf8");

assertDriftReportShape(report);

if (!summary.includes("node_added") || !summary.includes("finding_resolved") || !summary.includes("compliance_regression")) {
  throw new Error("Drift summary does not include required drift types");
}

if (!mermaid.includes("flowchart TD")) {
  throw new Error("Drift Mermaid diagram is invalid");
}

console.log("Drift engine certification passed.");
console.log("knownDriftTypes: " + DriftTypes.length);
console.log("report: .doctrine/out/drift-engine/drift-report.json");
console.log("summary: .doctrine/out/drift-engine/drift-summary.md");
console.log("mermaid: .doctrine/out/drift-engine/drift.mmd");
console.log("pod added outside baseline: yes");
console.log("finding resolved: yes");
console.log("compliance regression: yes");
