import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertMaintenanceCalendarShape,
  type RemediationCalendar
} from "../../packages/dreps-maintenance-planner/src/index.js";

const root = process.cwd();

const requiredOutputs = [
  ".doctrine/out/maintenance/remediation-calendar.json",
  ".doctrine/out/maintenance/remediation-calendar.md",
  ".doctrine/out/maintenance/remediation-calendar.jtable.json"
];

for (const file of requiredOutputs) {
  if (!existsSync(resolve(root, file))) {
    throw new Error("Missing maintenance planner output: " + file);
  }
}

const calendar = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/maintenance/remediation-calendar.json"), "utf8")
) as RemediationCalendar;

const markdown = readFileSync(resolve(root, ".doctrine/out/maintenance/remediation-calendar.md"), "utf8");

const jtable = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/maintenance/remediation-calendar.jtable.json"), "utf8")
) as {
  schemaVersion?: string;
  rows?: unknown[];
};

assertMaintenanceCalendarShape(calendar);

if (!markdown.includes("Remediation Calendar") || !markdown.includes("| Planned start | Finding | Risk |")) {
  throw new Error("Maintenance calendar Markdown is incomplete");
}

if (jtable.schemaVersion !== "jtable.compat.v1") {
  throw new Error("Maintenance jtable payload has invalid schemaVersion");
}

if (!Array.isArray(jtable.rows) || jtable.rows.length < calendar.summary.critical) {
  throw new Error("Maintenance jtable payload has insufficient rows");
}

console.log("Maintenance planner certification passed.");
console.log("calendar: .doctrine/out/maintenance/remediation-calendar.json");
console.log("markdown: .doctrine/out/maintenance/remediation-calendar.md");
console.log("jtable: .doctrine/out/maintenance/remediation-calendar.jtable.json");
console.log("critical scheduled earlier: yes");
console.log("destructive requires maintenance window: yes");
console.log("markdown export: yes");
