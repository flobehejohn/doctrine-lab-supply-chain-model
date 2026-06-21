import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  exportWorkflowToMermaid,
  parseWorkflowYaml,
  validateWorkflow
} from "../../packages/dreps-workflow-dag/src/index.js";

describe("phase 13 workflow DAG engine", () => {
  it("validates a workflow YAML document", () => {
    const yaml = readFileSync("workflows/remediate-network-policy.workflow.yml", "utf8");
    const document = parseWorkflowYaml(yaml);
    const validation = validateWorkflow(document);

    expect(document.workflow.id).toBe("remediate-network-policy");
    expect(validation.valid).toBe(true);
    expect(validation.jobCount).toBe(4);
    expect(validation.topologicalOrder).toEqual([
      "generate_patch",
      "dry_run",
      "validate_policy",
      "create_pr"
    ]);
  });

  it("exports a valid workflow to Mermaid", () => {
    const yaml = readFileSync("workflows/audit-pack-publication.workflow.yml", "utf8");
    const document = parseWorkflowYaml(yaml);
    const mermaid = exportWorkflowToMermaid(document);

    expect(mermaid).toContain("flowchart TD");
    expect(mermaid).toContain("generate_reports --> build_audit_pack");
    expect(mermaid).toContain("zip_pack --> publish_vault");
  });

  it("rejects a workflow with a missing dependency", () => {
    const document = parseWorkflowYaml(`
workflow:
  id: broken-workflow
  title: Broken workflow
  kind: remediation_workflow
  jobs:
    - id: second
      dependsOn: first
`);

    const validation = validateWorkflow(document);

    expect(validation.valid).toBe(false);
    expect(validation.diagnostics.join("\n")).toContain("missing job");
  });

  it("rejects a cyclic workflow", () => {
    const document = parseWorkflowYaml(`
workflow:
  id: cyclic-workflow
  title: Cyclic workflow
  kind: training_workflow
  jobs:
    - id: a
      dependsOn: b
    - id: b
      dependsOn: a
`);

    const validation = validateWorkflow(document);

    expect(validation.valid).toBe(false);
    expect(validation.diagnostics.join("\n")).toContain("Cycle detected");
  });

  it("declares workflow scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["workflow:certify"]).toContain("certify-workflows.ts");
    expect(pkg.scripts["artifact:certify"]).toContain("workflow:certify");
  });
});
