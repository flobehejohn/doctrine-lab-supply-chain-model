import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertMaintenanceCalendarShape,
  buildRemediationCalendar,
  loadMaintenanceRules,
  loadRemediationPlan,
  renderCalendarMarkdown,
  toJtablePayload
} from "../../packages/dreps-maintenance-planner/src/index.js";

const planPath = resolve("labs/supply-chain/examples/maintenance-planner-fixture/remediation-plan.fixture.json");
const rulesPath = resolve("labs/supply-chain/examples/maintenance-planner-fixture/maintenance.rules.json");

function calendarForTest() {
  const plan = loadRemediationPlan(planPath);
  const rules = loadMaintenanceRules(rulesPath);
  return buildRemediationCalendar(plan, rules);
}

describe("phase 29 maintenance planner", () => {
  it("schedules critical remediation earlier than high remediation", () => {
    const calendar = calendarForTest();

    const critical = calendar.items.find((item) => item.riskLevel === "critical");
    const high = calendar.items.find((item) => item.riskLevel === "high");

    expect(critical).toBeTruthy();
    expect(high).toBeTruthy();
    expect(critical!.plannedStart <= high!.plannedStart).toBe(true);
  });

  it("requires maintenance window for destructive remediation", () => {
    const calendar = calendarForTest();
    const destructive = calendar.items.filter((item) => item.destructive);

    expect(destructive.length).toBeGreaterThan(0);

    for (const item of destructive) {
      expect(item.maintenanceWindowRequired).toBe(true);
      expect(item.windowId).toBeTruthy();
    }
  });

  it("exports calendar to Markdown and jtable", () => {
    const calendar = calendarForTest();
    const markdown = renderCalendarMarkdown(calendar);
    const table = toJtablePayload(calendar);

    expect(markdown).toContain("Remediation Calendar");
    expect(markdown).toContain("| Planned start | Finding | Risk |");
    expect(table.schemaVersion).toBe("jtable.compat.v1");
    expect(table.rows.length).toBe(calendar.items.length);
  });

  it("asserts maintenance calendar shape", () => {
    const calendar = calendarForTest();

    expect(calendar.schemaVersion).toBe("dreps-remediation-calendar.v1");
    assertMaintenanceCalendarShape(calendar);
  });

  it("declares maintenance planner scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["maintenance:plan"]).toContain("plan-maintenance.ts");
    expect(pkg.scripts["maintenance:certify"]).toContain("certify-maintenance-planner.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("maintenance:certify");
  });
});
