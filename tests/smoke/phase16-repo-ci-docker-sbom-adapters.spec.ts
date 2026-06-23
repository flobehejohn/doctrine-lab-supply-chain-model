import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  adaptDockerfile,
  adaptGithubWorkflow,
  adaptGithubSbom,
  adaptGitlabCi,
  adaptPackageLock,
  adaptPnpmLock,
  adaptSyftSbom,
  assertLocalRepoEvidencePackShape,
  buildLocalRepoEvidencePack,
  renderLocalRepoGraphMermaid,
  scanLocalRepo,
  type JsonRecord
} from "../../packages/dreps-adapters/src/index.js";

const fixtureRoot = resolve("labs/supply-chain/examples/local-repo-fixture");
const baseEvidencePack = JSON.parse(
  readFileSync("labs/supply-chain/examples/ecommerce/evidence-pack.json", "utf8")
) as JsonRecord;

describe("phase 16 repo / CI / Docker / SBOM adapters", () => {
  it("scans a local repo fixture", () => {
    const scan = scanLocalRepo(fixtureRoot);

    expect(scan.repoName).toBe("local-repo-fixture");
    expect(scan.files).toContain("Dockerfile");
    expect(scan.files).toContain(".github/workflows/ci.yml");
    expect(scan.files).toContain(".gitlab-ci.yml");
    expect(scan.files).toContain("sbom/syft-sbom.json");
  });

  it("adapts Dockerfile into an inferred container image", () => {
    const dockerfile = adaptDockerfile(fixtureRoot);

    expect(dockerfile.exists).toBe(true);
    expect(dockerfile.baseImages).toContain("node:24.11.1-alpine3.22");
    expect(dockerfile.usesLatest).toBe(false);
    expect(dockerfile.inferredImageName).toBe("local-repo-fixture");
  });

  it("adapts CI workflows and lockfiles", () => {
    const githubWorkflow = adaptGithubWorkflow(fixtureRoot);
    const gitlabCi = adaptGitlabCi(fixtureRoot);
    const packageLock = adaptPackageLock(fixtureRoot);
    const pnpmLock = adaptPnpmLock(fixtureRoot);

    expect(githubWorkflow.exists).toBe(true);
    expect(githubWorkflow.dockerBuildObserved).toBe(true);
    expect(githubWorkflow.usesUnpinnedActions).toBe(true);
    expect(gitlabCi.exists).toBe(true);
    expect(gitlabCi.dockerBuildObserved).toBe(true);
    expect(packageLock.dependencyCount).toBeGreaterThanOrEqual(1);
    expect(pnpmLock.dependencyCount).toBeGreaterThanOrEqual(1);
  });

  it("adapts Syft and GitHub SBOM fixtures", () => {
    const syft = adaptSyftSbom(fixtureRoot);
    const github = adaptGithubSbom(fixtureRoot);

    expect(syft.exists).toBe(true);
    expect(syft.componentCount).toBeGreaterThanOrEqual(2);
    expect(github.exists).toBe(true);
    expect(github.componentCount).toBeGreaterThanOrEqual(1);
  });

  it("imports local repo into a valid DREPS evidence-pack", () => {
    const scan = scanLocalRepo(fixtureRoot);
    const evidencePack = buildLocalRepoEvidencePack(scan, baseEvidencePack);
    const parsed = EvidencePackSchema.parse(evidencePack);

    expect(parsed.packId).toBe("local-repo-dreps-evidence-pack");
    assertLocalRepoEvidencePackShape(parsed as Record<string, unknown>);
  });

  it("renders expected local repo graph", () => {
    const scan = scanLocalRepo(fixtureRoot);
    const evidencePack = buildLocalRepoEvidencePack(scan, baseEvidencePack);
    const mermaid = renderLocalRepoGraphMermaid(evidencePack);

    expect(mermaid).toContain("flowchart LR");
    expect(mermaid).toContain("repository --> github_workflow");
    expect(mermaid).toContain("repository --> gitlab_ci_pipeline");
    expect(mermaid).toContain("dockerfile --> container_image");
    expect(mermaid).toContain("syft_sbom --> container_image");
  });

  it("declares adapter scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["adapters:import:repo"]).toContain("import-repo.ts");
    expect(pkg.scripts["adapters:import:github-workflow"]).toContain("import-github-workflow.ts");
    expect(pkg.scripts["adapters:import:gitlab-ci"]).toContain("import-gitlab-ci.ts");
    expect(pkg.scripts["adapters:import:dockerfile"]).toContain("import-dockerfile.ts");
    expect(pkg.scripts["adapters:import:package-lock"]).toContain("import-package-lock.ts");
    expect(pkg.scripts["adapters:import:pnpm-lock"]).toContain("import-pnpm-lock.ts");
    expect(pkg.scripts["adapters:import:syft-sbom"]).toContain("import-syft-sbom.ts");
    expect(pkg.scripts["adapters:import:github-sbom"]).toContain("import-github-sbom.ts");
    expect(pkg.scripts["adapters:certify"]).toContain("certify-adapters.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("adapters:certify");
  });
});
