import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, existsSync, resolve } from "node:path";
import {
  assertMaintenanceCalendarShape,
  buildRemediationCalendar,
  loadMaintenanceRules,
  loadRemediationPlan,
  renderCalendarMarkdown,
  toJtablePayload
} from "../../packages/dreps-maintenance-planner/src/index.js";

const root = process.cwd();

const defaultPlanPath = ".doctrine/out/remediation/remediation-plan.json";
const fallbackPlanPath = "labs/supply-chain/examples/maintenance-planner-fixture/remediation-plan.fixture.json";
const rulesPath = "labs/supply-chain/examples/maintenance-planner-fixture/maintenance.rules.json";

const planPath = existsSync(resolve(root, defaultPlanPath)) ? defaultPlanPath : fallbackPlanPath;

const calendarPath = ".doctrine/out/maintenance/remediation-calendar.json";
const markdownPath = ".doctrine/out/maintenance/remediation-calendar.md";
const jtablePath = ".doctrine/out/maintenance/remediation-calendar.jtable.json";

const plan = loadRemediationPlan(resolve(root, planPath));
const rules = loadMaintenanceRules(resolve(root, rulesPath));
const calendar = buildRemediationCalendar(plan, rules);

assertMaintenanceCalendarShape(calendar);

const markdown = renderCalendarMarkdown(calendar);
const jtable = toJtablePayload(calendar);

for (const outputPath of [calendarPath, markdownPath, jtablePath]) {
  mkdirSync(dirname(resolve(root, outputPath)), { recursive: true });
}

writeFileSync(resolve(root, calendarPath), JSON.stringify(calendar, null, 2) + "\n", "utf8");
writeFileSync(resolve(root, markdownPath), markdown, "utf8");
writeFileSync(resolve(root, jtablePath), JSON.stringify(jtable, null, 2) + "\n", "utf8");

console.log("Maintenance calendar generated.");
console.log("inputPlan: " + planPath);
console.log("items: " + calendar.items.length);
console.log("critical: " + calendar.summary.critical);
console.log("destructive: " + calendar.summary.destructive);
console.log("calendar: " + calendarPath);
console.log("markdown: " + markdownPath);
console.log("jtable: " + jtablePath);
