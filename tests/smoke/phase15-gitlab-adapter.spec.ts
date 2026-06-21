import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertGitLabEvidencePackShape,
  GitLabFindingIds,
  GitLabNodeKinds,
  importGitLabToDrepsEvidencePack,
  renderGitLabGraphMermaid,
  type GitLabAdapterFixture,
  type JsonRecord
} from "../../packages/dreps-gitlab-adapter/src/index.js";

const fixture = JSON.parse(
  readFileSync("labs/supply-chain/environments/gitlab-local/fixtures/gitlab-export.fixture.json", "utf8")
) as GitLabAdapterFixture;

const baseEvidencePack = JSON.parse(
  readFileSync("labs/supply-chain/examples/ecommerce/evidence-pack.json", "utf8")
) as JsonRecord;

describe("phase 15 GitLab adapter", () => {
  it("imports a GitLab fixture into a valid DREPS evidence-pack", () => {
    const evidencePack = importGitLabToDrepsEvidencePack(fixture, baseEvidencePack);
    const parsed = EvidencePackSchema.parse(evidencePack);

    expect(parsed.packId).toBe("gitlab-local-dreps-evidence-pack");
    assertGitLabEvidencePackShape(parsed as Record<string, unknown>);
  });

  it("creates the expected GitLab node kinds", () => {
    const evidencePack = importGitLabToDrepsEvidencePack(fixture, baseEvidencePack);
    const nodes = evidencePack.nodes as Array<{ id: string }>;
    const nodeIds = new Set(nodes.map((node) => node.id));

    for (const kind of GitLabNodeKinds) {
      expect(nodeIds.has(kind), kind).toBe(true);
    }
  });

  it("creates the expected GitLab findings", () => {
    const evidencePack = importGitLabToDrepsEvidencePack(fixture, baseEvidencePack);
    const findings = evidencePack.findings as Array<{ id: string }>;
    const findingIds = new Set(findings.map((finding) => finding.id));

    for (const findingId of GitLabFindingIds) {
      expect(findingIds.has(findingId), findingId).toBe(true);
    }
  });

  it("renders the expected project to registry graph", () => {
    const evidencePack = importGitLabToDrepsEvidencePack(fixture, baseEvidencePack);
    const mermaid = renderGitLabGraphMermaid(evidencePack);

    expect(mermaid).toContain("flowchart LR");
    expect(mermaid).toContain("gitlab_project --> ci_pipeline");
    expect(mermaid).toContain("ci_pipeline --> gitlab_runner");
    expect(mermaid).toContain("gitlab_runner --> container_image");
    expect(mermaid).toContain("container_image --> registry");
  });

  it("declares GitLab adapter scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["gitlab:import"]).toContain("import-gitlab.ts");
    expect(pkg.scripts["gitlab:import:ci"]).toContain("import-gitlab-ci.ts");
    expect(pkg.scripts["gitlab:import:runner"]).toContain("import-gitlab-runner.ts");
    expect(pkg.scripts["gitlab:import:registry"]).toContain("import-gitlab-registry.ts");
    expect(pkg.scripts["gitlab:adapter:certify"]).toContain("certify-gitlab-adapter.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("gitlab:adapter:certify");
  });
});
