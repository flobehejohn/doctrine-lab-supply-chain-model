import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertAuditPackShape,
  generateAuditPack,
  loadAuditPackConfig,
  type AuditPackManifest
} from "../../packages/dreps-audit-pack/src/index.js";

const configPath = resolve("labs/supply-chain/examples/audit-pack-fixture/audit-pack.config.json");

function buildForTest() {
  const config = loadAuditPackConfig(configPath);
  rmSync(config.outputRoot, { recursive: true, force: true });
  const result = generateAuditPack(config);
  return { config, result };
}

describe("phase 31 audit pack engine", () => {
  it("generates the portable audit pack", () => {
    const { config, result } = buildForTest();

    expect(existsSync(result.outputRoot)).toBe(true);
    expect(existsSync(join(result.outputRoot, "manifest.json"))).toBe(true);
    expect(existsSync(join(result.outputRoot, "checksums.sha256"))).toBe(true);

    assertAuditPackShape(config, result.outputRoot);
  });

  it("lists every required top-level file in manifest", () => {
    const { config, result } = buildForTest();

    const manifest = JSON.parse(
      readFileSync(join(result.outputRoot, "manifest.json"), "utf8")
    ) as AuditPackManifest;

    const paths = new Set(manifest.files.map((file) => file.path));

    for (const required of config.requiredTopLevelFiles) {
      expect(paths.has(required)).toBe(true);
    }
  });

  it("checksums cover JSON files", () => {
    const { result } = buildForTest();
    const checksumText = readFileSync(join(result.outputRoot, "checksums.sha256"), "utf8");

    expect(checksumText).toContain("manifest.json");
    expect(checksumText).toContain("supplychain.evidence-pack.json");
    expect(checksumText).toContain("simulation-results.json");
    expect(checksumText).toContain("compliance-report.json");
  });

  it("explorer contains jtable jq and mermaid material", () => {
    const { result } = buildForTest();

    const explorer = readFileSync(join(result.outputRoot, "explorer", "README.md"), "utf8");
    const jq = readFileSync(join(result.outputRoot, "explorer", "jq-examples.md"), "utf8");

    expect(explorer).toContain("jtable");
    expect(explorer).toContain("jq");
    expect(jq).toContain("jq -r");
    expect(existsSync(join(result.outputRoot, "explorer", "jtable-views", "README.md"))).toBe(true);
    expect(existsSync(join(result.outputRoot, "explorer", "mermaid", "attack-path.mmd"))).toBe(true);
  });

  it("declares audit pack scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["auditpack:generate"]).toContain("generate-audit-pack.ts");
    expect(pkg.scripts["auditpack:certify"]).toContain("certify-audit-pack.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("auditpack:certify");
  });
});
