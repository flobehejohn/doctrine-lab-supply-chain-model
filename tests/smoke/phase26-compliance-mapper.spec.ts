import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertComplianceReportShape,
  loadComplianceMap,
  loadTechnicalContext,
  mapComplianceImpacts,
  renderComplianceSummary,
  SupportedFrameworks,
  toJtablePayload
} from "../../packages/dreps-compliance-engine/src/index.js";

const contextPath = resolve("labs/supply-chain/examples/compliance-engine-fixture/technical-findings.json");

const mapPaths = [
  ".doctrine/compliance.map.slsa.json",
  ".doctrine/compliance.map.dora.json",
  ".doctrine/compliance.map.nis2.json",
  ".doctrine/compliance.map.iso27001.json",
  ".doctrine/compliance.map.cis-kubernetes.json",
  ".doctrine/compliance.map.owasp-asvs.json",
  ".doctrine/compliance.map.owasp-samm.json"
];

function reportForTest() {
  const context = loadTechnicalContext(contextPath);
  const maps = mapPaths.map((path) => loadComplianceMap(resolve(path)));
  return mapComplianceImpacts(context, maps);
}

describe("phase 26 compliance mapper", () => {
  it("loads compliance maps and supported frameworks", () => {
    const frameworks = mapPaths.map((path) => loadComplianceMap(resolve(path)).framework);

    expect(frameworks).toContain("SLSA");
    expect(frameworks).toContain("DORA");
    expect(frameworks).toContain("NIS2");
    expect(frameworks).toContain("ISO27001");
    expect(SupportedFrameworks).toContain("OWASP_SAMM");
  });

  it("maps unsigned image to SLSA impact", () => {
    const report = reportForTest();
    const impact = report.impacts.find(
      (item) => item.findingId === "no-unsigned-container-image" && item.framework === "SLSA"
    );

    expect(impact).toBeTruthy();
    expect(impact?.affectedNodes).toContain("image_checkout_latest");
    expect(impact?.evidenceRefs.length).toBeGreaterThan(0);
  });

  it("maps public critical vulnerable pod to DORA and NIS2", () => {
    const report = reportForTest();

    const dora = report.impacts.find(
      (item) => item.findingId === "no-public-critical-vulnerable-pod" && item.framework === "DORA"
    );

    const nis2 = report.impacts.find(
      (item) => item.findingId === "no-public-critical-vulnerable-pod" && item.framework === "NIS2"
    );

    expect(dora).toBeTruthy();
    expect(nis2).toBeTruthy();
    expect(dora?.affectedNodes).toContain("pod_checkout");
    expect(nis2?.affectedNodes).toContain("pod_checkout");
  });

  it("maps privileged runner to supply-chain impact", () => {
    const report = reportForTest();
    const impact = report.impacts.find(
      (item) =>
        item.findingId === "no-runner-privileged" &&
        item.supplyChainImpact === true &&
        item.affectedNodes.includes("runner_privileged")
    );

    expect(impact).toBeTruthy();
  });

  it("renders summary and jtable payload", () => {
    const report = reportForTest();
    const summary = renderComplianceSummary(report);
    const table = toJtablePayload(report);

    expect(summary).toContain("Compliance Impact Summary");
    expect(summary).toContain("SLSA");
    expect(table.schemaVersion).toBe("jtable.compat.v1");
    expect(table.rows.length).toBeGreaterThanOrEqual(3);
  });

  it("asserts compliance report shape", () => {
    const report = reportForTest();

    expect(report.schemaVersion).toBe("dreps-compliance-impact-report.v1");
    expect(report.impacts.length).toBeGreaterThanOrEqual(6);
    assertComplianceReportShape(report);
  });

  it("declares compliance engine scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["compliance:map"]).toContain("map-compliance.ts");
    expect(pkg.scripts["compliance:certify"]).toContain("certify-compliance-engine.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("compliance:certify");
  });
});
