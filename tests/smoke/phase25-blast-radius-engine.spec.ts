import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertBlastRadiusReportShape,
  calculateBlastRadius,
  loadBlastRadiusInput,
  renderBlastRadiusMermaid,
  renderBlastRadiusSummary,
  toJtablePayload
} from "../../packages/dreps-blast-radius-engine/src/index.js";

const inputPath = resolve("labs/supply-chain/examples/blast-radius-fixture/blast-radius-context.json");

function reportForTest() {
  const input = loadBlastRadiusInput(inputPath);
  return calculateBlastRadius(input);
}

describe("phase 25 blast radius engine", () => {
  it("reaches pipeline image workload pod and DB from repo-auth-service", () => {
    const report = reportForTest();
    const ids = new Set(report.reachableNodes.map((node) => node.id));

    expect(ids.has("repo-auth-service")).toBe(true);
    expect(ids.has("pipeline-auth-service")).toBe(true);
    expect(ids.has("image-auth-service")).toBe(true);
    expect(ids.has("workload-auth-api")).toBe(true);
    expect(ids.has("pod-auth-api")).toBe(true);
    expect(ids.has("db-auth-users")).toBe(true);
  });

  it("exports top propagation paths and sensitive data nodes", () => {
    const report = reportForTest();
    const dbPath = report.topPropagationPaths.find((path) => path.nodeIds.includes("db-auth-users"));

    expect(dbPath).toBeTruthy();
    expect(report.sensitiveDataNodes.map((node) => node.id)).toContain("db-auth-users");
    expect(report.blastRadiusScore).toBeGreaterThan(0);
  });

  it("reports controls that would block propagation", () => {
    const report = reportForTest();
    const controls = new Set(report.controlsThatWouldBlock.map((control) => control.controlId));

    expect(controls.has("control-codeowners-review")).toBe(true);
    expect(controls.has("control-db-network-policy")).toBe(true);
  });

  it("exports Mermaid and jtable outputs", () => {
    const report = reportForTest();
    const mermaid = renderBlastRadiusMermaid(report);
    const table = toJtablePayload(report);
    const summary = renderBlastRadiusSummary(report);

    expect(mermaid).toContain("flowchart TD");
    expect(mermaid).toContain("db-auth-users");
    expect(table.schemaVersion).toBe("jtable.compat.v1");
    expect(table.rows.length).toBeGreaterThanOrEqual(5);
    expect(summary).toContain("Blast Radius Summary");
  });

  it("asserts report shape", () => {
    const report = reportForTest();

    expect(report.schemaVersion).toBe("dreps-blast-radius-report.v1");
    assertBlastRadiusReportShape(report);
  });

  it("declares blast radius scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["blast:radius:analyze"]).toContain("analyze-blast-radius.ts");
    expect(pkg.scripts["blast:radius:certify"]).toContain("certify-blast-radius.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("blast:radius:certify");
  });
});
