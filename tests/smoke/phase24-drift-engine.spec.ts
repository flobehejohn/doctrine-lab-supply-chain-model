import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertDriftReportShape,
  compareDrift,
  loadDriftArtifact,
  renderDriftMermaid,
  renderDriftSummary,
  DriftTypes
} from "../../packages/dreps-drift-engine/src/index.js";

const baselinePath = resolve("labs/supply-chain/examples/drift-engine-fixture/baseline.json");
const currentPath = resolve("labs/supply-chain/examples/drift-engine-fixture/current.json");

function reportForTest() {
  const baseline = loadDriftArtifact(baselinePath);
  const current = loadDriftArtifact(currentPath);
  return compareDrift(baseline, current);
}

describe("phase 24 drift engine", () => {
  it("detects a pod added outside baseline", () => {
    const report = reportForTest();
    const drift = report.drifts.find((item) => item.type === "node_added" && item.affectedNodes.includes("pod_shadow"));

    expect(drift?.type).toBe("node_added");
    expect(drift?.severity).toBe("medium");
  });

  it("detects a resolved finding", () => {
    const report = reportForTest();
    const drift = report.drifts.find((item) => item.type === "finding_resolved" && item.id.includes("no-unsigned-container-image"));

    expect(drift?.type).toBe("finding_resolved");
  });

  it("detects compliance regression", () => {
    const report = reportForTest();
    const drift = report.drifts.find((item) => item.type === "compliance_regression" && item.id.includes("iso27001-change-control"));

    expect(drift?.type).toBe("compliance_regression");
    expect(drift?.severity).toBe("critical");
  });

  it("renders summary and mermaid outputs", () => {
    const report = reportForTest();
    const summary = renderDriftSummary(report);
    const mermaid = renderDriftMermaid(report);

    expect(summary).toContain("node_added");
    expect(summary).toContain("finding_resolved");
    expect(summary).toContain("compliance_regression");
    expect(mermaid).toContain("flowchart TD");
    expect(mermaid).toContain("pod_shadow");
  });

  it("asserts drift report shape", () => {
    const report = reportForTest();

    expect(report.schemaVersion).toBe("dreps-drift-report.v1");
    expect(report.driftCount).toBeGreaterThanOrEqual(6);
    assertDriftReportShape(report);
  });

  it("declares drift engine scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["drift:engine:compare"]).toContain("compare-drift.ts");
    expect(pkg.scripts["drift:engine:certify"]).toContain("certify-drift-engine.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("drift:engine:certify");
    expect(DriftTypes).toContain("env_config_drift");
  });
});
