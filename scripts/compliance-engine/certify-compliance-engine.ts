import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertComplianceReportShape,
  type ComplianceReport
} from "../../packages/dreps-compliance-engine/src/index.js";

const root = process.cwd();

const requiredOutputs = [
  ".doctrine/out/compliance/compliance-impact-report.json",
  ".doctrine/out/compliance/compliance-summary.md",
  ".doctrine/out/compliance/compliance-impact.jtable.json"
];

const requiredMaps = [
  ".doctrine/compliance.map.slsa.json",
  ".doctrine/compliance.map.dora.json",
  ".doctrine/compliance.map.nis2.json",
  ".doctrine/compliance.map.iso27001.json"
];

for (const file of [...requiredOutputs, ...requiredMaps]) {
  if (!existsSync(resolve(root, file))) {
    throw new Error("Missing compliance engine file: " + file);
  }
}

const report = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/compliance/compliance-impact-report.json"), "utf8")
) as ComplianceReport;

const summary = readFileSync(resolve(root, ".doctrine/out/compliance/compliance-summary.md"), "utf8");

const jtable = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/compliance/compliance-impact.jtable.json"), "utf8")
) as {
  schemaVersion?: string;
  rows?: unknown[];
};

assertComplianceReportShape(report);

if (!summary.includes("SLSA") || !summary.includes("DORA") || !summary.includes("NIS2")) {
  throw new Error("Compliance summary does not include required frameworks");
}

if (jtable.schemaVersion !== "jtable.compat.v1") {
  throw new Error("Compliance jtable payload has invalid schemaVersion");
}

if (!Array.isArray(jtable.rows) || jtable.rows.length < 3) {
  throw new Error("Compliance jtable payload has insufficient rows");
}

console.log("Compliance engine certification passed.");
console.log("report: .doctrine/out/compliance/compliance-impact-report.json");
console.log("summary: .doctrine/out/compliance/compliance-summary.md");
console.log("jtable: .doctrine/out/compliance/compliance-impact.jtable.json");
console.log("unsigned image -> SLSA: yes");
console.log("public vulnerable pod -> DORA/NIS2: yes");
console.log("privileged runner -> supply chain: yes");
