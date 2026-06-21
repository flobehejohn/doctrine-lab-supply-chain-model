import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getTemplateValue,
  renderTemplate
} from "../../packages/dreps-template-engine/src/index.js";

const templates = [
  "reporting/markdown/templates/audit-report.md.eta",
  "reporting/markdown/templates/pr-remediation.md.eta",
  "reporting/mermaid/templates/supplychain.mmd.eta",
  "reporting/marp/templates/executive-summary.marp.md.eta"
];

describe("phase 9 template engine", () => {
  it("versions all expected templates", () => {
    for (const template of templates) {
      expect(existsSync(template), template).toBe(true);

      const content = readFileSync(template, "utf8");

      expect(content.length).toBeGreaterThan(20);
    }
  });

  it("renders eta-like variables", () => {
    const output = renderTemplate("Pack: <%= pack.id %>", {
      pack: {
        id: "demo-pack"
      }
    });

    expect(output).toBe("Pack: demo-pack");
  });

  it("renders mustache-like each blocks", () => {
    const output = renderTemplate(
      "{{#each findings}}- {{this.id}} {{this.severity}}\n{{/each}}",
      {
        findings: [
          {
            id: "finding-a",
            severity: "high"
          },
          {
            id: "finding-b",
            severity: "critical"
          }
        ]
      }
    );

    expect(output).toContain("- finding-a high");
    expect(output).toContain("- finding-b critical");
  });

  it("resolves nested template values", () => {
    const value = getTemplateValue(
      {
        remediation: {
          rollback: {
            description: "restore previous policy"
          }
        }
      },
      "remediation.rollback.description"
    );

    expect(value).toBe("restore previous policy");
  });

  it("declares package scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["template:generate"]).toContain("generate-template-artifacts.ts");
    expect(pkg.scripts["template:certify"]).toContain("template:generate");
  });
});
