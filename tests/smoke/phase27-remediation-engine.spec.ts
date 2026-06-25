import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertRemediationPlanShape,
  buildRemediationPlan,
  loadRemediationContext,
  renderRemediationMarkdown,
  toJtablePayload
} from "../../packages/dreps-remediation-engine/src/index.js";

const contextPath = resolve("labs/supply-chain/examples/remediation-engine-fixture/remediation-context.json");

function planForTest() {
  const context = loadRemediationContext(contextPath);
  return buildRemediationPlan(context);
}

describe("phase 27 remediation engine", () => {
  it("generates a remediation for every critical finding", () => {
    const plan = planForTest();

    expect(plan.criticalFindings.length).toBeGreaterThanOrEqual(3);
    expect(plan.summary.criticalFindingsCovered).toBe(plan.criticalFindings.length);

    for (const findingId of plan.criticalFindings) {
      expect(plan.remediations.some((remediation) => remediation.findingId === findingId)).toBe(true);
    }
  });

  it("every remediation has the absolute required fields", () => {
    const plan = planForTest();

    for (const remediation of plan.remediations) {
      expect(remediation.findingId).toBeTruthy();
      expect(remediation.affectedNodes.length).toBeGreaterThan(0);
      expect(remediation.strategy).toBeTruthy();
      expect(remediation.risk).toMatch(/low|medium|high|critical/);
      expect(remediation.commands.length).toBeGreaterThan(0);
      expect(remediation.patches.length).toBeGreaterThan(0);
      expect(remediation.verification.length).toBeGreaterThan(0);
      expect(remediation.rollback.length).toBeGreaterThan(0);
      expect(typeof remediation.approvalRequired).toBe("boolean");
      expect(remediation.maintenanceWindow).toBeTruthy();
    }
  });

  it("every remediation has verification and rollback", () => {
    const plan = planForTest();

    for (const remediation of plan.remediations) {
      expect(remediation.verification.every((item) => item.command && item.expected)).toBe(true);
      expect(remediation.rollback.every((item) => item.command)).toBe(true);
    }
  });

  it("renders markdown and jtable output", () => {
    const plan = planForTest();
    const markdown = renderRemediationMarkdown(plan);
    const table = toJtablePayload(plan);

    expect(markdown).toContain("Remediation Plan");
    expect(markdown).toContain("Rollback");
    expect(markdown).toContain("Verification");
    expect(table.schemaVersion).toBe("jtable.compat.v1");
    expect(table.rows.length).toBe(plan.remediations.length);
  });

  it("asserts remediation plan shape", () => {
    const plan = planForTest();

    expect(plan.schemaVersion).toBe("dreps-remediation-plan.v1");
    assertRemediationPlanShape(plan);
  });

  it("declares remediation engine scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["remediation:generate"]).toContain("generate-remediation-plan.ts");
    expect(pkg.scripts["remediation:certify"]).toContain("certify-remediation-engine.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("remediation:certify");
  });
});
