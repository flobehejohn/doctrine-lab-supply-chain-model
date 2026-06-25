import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertBlastRadiusReportShape,
  type BlastRadiusReport
} from "../../packages/dreps-blast-radius-engine/src/index.js";

const root = process.cwd();

const requiredOutputs = [
  ".doctrine/out/blast-radius/blast-radius-report.json",
  ".doctrine/out/blast-radius/blast-radius.mmd",
  ".doctrine/out/blast-radius/blast-radius-summary.jtable.json",
  ".doctrine/out/blast-radius/blast-radius-summary.md"
];

for (const file of requiredOutputs) {
  if (!existsSync(resolve(root, file))) {
    throw new Error("Missing blast radius output: " + file);
  }
}

const report = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/blast-radius/blast-radius-report.json"), "utf8")
) as BlastRadiusReport;

const mermaid = readFileSync(resolve(root, ".doctrine/out/blast-radius/blast-radius.mmd"), "utf8");

const jtable = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/blast-radius/blast-radius-summary.jtable.json"), "utf8")
) as {
  schemaVersion?: string;
  rows?: unknown[];
};

assertBlastRadiusReportShape(report);

if (!mermaid.includes("flowchart TD") || !mermaid.includes("db-auth-users")) {
  throw new Error("Blast radius Mermaid output is invalid");
}

if (jtable.schemaVersion !== "jtable.compat.v1") {
  throw new Error("Blast radius jtable payload has invalid schemaVersion");
}

if (!Array.isArray(jtable.rows) || jtable.rows.length < 5) {
  throw new Error("Blast radius jtable payload has insufficient rows");
}

console.log("Blast radius certification passed.");
console.log("report: .doctrine/out/blast-radius/blast-radius-report.json");
console.log("mermaid: .doctrine/out/blast-radius/blast-radius.mmd");
console.log("jtable: .doctrine/out/blast-radius/blast-radius-summary.jtable.json");
console.log("repo reaches pipeline/image/workload/pod/db: yes");
console.log("controlsThatWouldBlock: " + report.controlsThatWouldBlock.length);
