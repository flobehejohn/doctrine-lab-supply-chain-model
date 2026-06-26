import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateAuditPack,
  loadAuditPackConfig
} from "../../packages/dreps-audit-pack/src/index.js";
import {
  assertAuditPackExplorerShape,
  generateAuditPackExplorer
} from "../../packages/dreps-audit-pack-explorer/src/index.js";

const auditPackConfigPath = resolve("labs/supply-chain/examples/audit-pack-fixture/audit-pack.config.json");

function buildForTest() {
  mkdirSync(resolve(".doctrine/out"), { recursive: true });

  const tempRoot = mkdtempSync(resolve(".doctrine/out/test-phase33-explorer-"));

  const baseConfig = loadAuditPackConfig(auditPackConfigPath);
  const config = {
    ...baseConfig,
    outputRoot: join(tempRoot, "audit-pack")
  };

  generateAuditPack(config);

  const result = generateAuditPackExplorer(config.outputRoot);

  return {
    config,
    result
  };
}

describe("phase 33 audit pack explorer", () => {
  it("generates auditor explorer files", () => {
    const { result } = buildForTest();

    expect(existsSync(result.readmePath)).toBe(true);
    expect(existsSync(result.findingsCriticalPath)).toBe(true);
    expect(existsSync(result.complianceFailedPath)).toBe(true);
    expect(existsSync(result.jqExamplesPath)).toBe(true);
    expect(existsSync(result.supplychainMermaidPath)).toBe(true);

    assertAuditPackExplorerShape(result);
  });

  it("exports critical findings and failed compliance jtable YAML views", () => {
    const { result } = buildForTest();

    const findings = readFileSync(result.findingsCriticalPath, "utf8");
    const compliance = readFileSync(result.complianceFailedPath, "utf8");

    expect(findings).toContain("schemaVersion:");
    expect(findings).toContain("Critical findings");
    expect(findings).toContain("rows:");

    expect(compliance).toContain("schemaVersion:");
    expect(compliance).toContain("Failed compliance impacts");
    expect(compliance).toContain("rows:");
  });

  it("contains jq commands for findings compliance and blast radius", () => {
    const { result } = buildForTest();

    const jq = readFileSync(result.jqExamplesPath, "utf8");

    expect(jq).toContain("findings.json");
    expect(jq).toContain("compliance-report.json");
    expect(jq).toContain("blast-radius-report.json");
    expect(jq).toContain("jq -r");
  });

  it("contains a supplychain Mermaid graph", () => {
    const { result } = buildForTest();

    const mermaid = readFileSync(result.supplychainMermaidPath, "utf8");

    expect(mermaid).toContain("flowchart");
  });

  it("declares audit pack explorer scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["auditpack:explorer:generate"]).toContain("generate-audit-pack-explorer.ts");
    expect(pkg.scripts["auditpack:explorer:certify"]).toContain("certify-audit-pack-explorer.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("auditpack:explorer:certify");
    expect(pkg.scripts["signature:generate"]).toContain("auditpack:explorer:certify");
  });
});
