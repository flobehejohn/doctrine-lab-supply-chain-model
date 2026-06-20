import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const expectedViews = [
  "reporting/jtable/views/findings-all.yml",
  "reporting/jtable/views/findings-critical.yml",
  "reporting/jtable/views/compliance-summary.yml",
  "reporting/jtable/views/blast-radius-summary.yml",
  "reporting/jtable/views/drift-summary.yml",
  "reporting/jtable/views/remediation-pr-table.yml"
];

describe("phase 6 jtable reporting layer", () => {
  it("versions all expected reporting views", () => {
    for (const view of expectedViews) {
      expect(existsSync(view), view).toBe(true);

      const content = readFileSync(view, "utf8");

      expect(content).toContain("viewId:");
      expect(content).toContain("dataset:");
      expect(content).toContain("columns:");
    }
  });

  it("declares the native fallback renderer", () => {
    expect(existsSync("scripts/reporting/render-jtable.ps1")).toBe(true);

    const script = readFileSync("scripts/reporting/render-jtable.ps1", "utf8");

    expect(script).toContain("Optional jtable command not found");
    expect(script).toContain("Native PowerShell fallback renderer used");
  });

  it("declares package scripts for findings and compliance reports", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["report:jtable:findings"]).toContain("findings-all.yml");
    expect(pkg.scripts["report:jtable:compliance"]).toContain("compliance-summary.yml");
  });
});
