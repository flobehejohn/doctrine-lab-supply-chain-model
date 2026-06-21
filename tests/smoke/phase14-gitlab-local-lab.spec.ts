import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const labRoot = "labs/supply-chain/environments/gitlab-local";

describe("phase 14 GitLab local lab", () => {
  it("versions all required lab files and documentation", () => {
    const files = [
      "README.md",
      "RUNBOOK.md",
      "SECURITY_MODEL.md",
      ".gitignore",
      "docker-compose.template.yml",
      "bootstrap-gitlab-lab.ps1",
      "bootstrap-gitlab-lab.sh",
      "sample-project/README.md",
      "sample-project/Dockerfile",
      "sample-project/.gitlab-ci.yml",
      "evidence/evidence-pack.gitlab-local.json"
    ];

    for (const file of files) {
      expect(existsSync(labRoot + "/" + file), file).toBe(true);
    }

    expect(existsSync("docs/20_GITLAB_LOCAL_LAB.md")).toBe(true);
  });

  it("uses pinned container images and avoids latest", () => {
    const compose = readFileSync(labRoot + "/docker-compose.template.yml", "utf8");
    const dockerfile = readFileSync(labRoot + "/sample-project/Dockerfile", "utf8");
    const ci = readFileSync(labRoot + "/sample-project/.gitlab-ci.yml", "utf8");

    expect(compose).toContain("gitlab/gitlab-ce:17.11.2-ce.0");
    expect(compose).toContain("gitlab/gitlab-runner:v17.11.0");
    expect(dockerfile).toContain("FROM alpine:3.20.3");
    expect(ci).toContain("docker:27.5.1-cli");
    expect(ci).toContain("docker:27.5.1-dind");

    expect(compose).not.toMatch(/image:\s*[^@\n:]+:latest\b/i);
    expect(dockerfile).not.toMatch(/FROM\s+.+:latest\b/i);
  });

  it("does not enable privileged runner by default", () => {
    const compose = readFileSync(labRoot + "/docker-compose.template.yml", "utf8");

    expect(compose).not.toMatch(/privileged:\s*true/i);
    expect(compose).toContain("privileged is intentionally not enabled by default");
  });

  it("does not print tokens in bootstrap scripts", () => {
    const ps1 = readFileSync(labRoot + "/bootstrap-gitlab-lab.ps1", "utf8");
    const sh = readFileSync(labRoot + "/bootstrap-gitlab-lab.sh", "utf8");

    expect(ps1).toContain("***REDACTED***");
    expect(sh).toContain("***REDACTED***");
    expect(ps1).not.toMatch(/Write-Host\s+.*GITLAB_RUNNER_REGISTRATION_TOKEN/i);
    expect(sh).not.toMatch(/echo\s+.*GITLAB_RUNNER_REGISTRATION_TOKEN/i);
  });

  it("models the sample GitLab CI pipeline and evidence pack", () => {
    const ci = readFileSync(labRoot + "/sample-project/.gitlab-ci.yml", "utf8");
    const evidence = JSON.parse(
      readFileSync(labRoot + "/evidence/evidence-pack.gitlab-local.json", "utf8")
    ) as {
      packId: string;
      nodes: unknown[];
      pipeline: unknown[];
      controls: unknown[];
      findings: unknown[];
    };

    expect(ci).toContain("lint:metadata");
    expect(ci).toContain("build:image");
    expect(ci).toContain("publish:image");
    expect(ci).toContain("--password-stdin");
    expect(evidence.packId).toBe("gitlab-local-supplychain-demo");
    expect(evidence.nodes.length).toBeGreaterThanOrEqual(5);
    expect(evidence.pipeline.length).toBeGreaterThanOrEqual(3);
    expect(evidence.controls.length).toBeGreaterThanOrEqual(4);
    expect(evidence.findings.length).toBeGreaterThanOrEqual(1);
  });

  it("documents runbook and security model", () => {
    const runbook = readFileSync(labRoot + "/RUNBOOK.md", "utf8");
    const security = readFileSync(labRoot + "/SECURITY_MODEL.md", "utf8");
    const rootDoc = readFileSync("docs/20_GITLAB_LOCAL_LAB.md", "utf8");

    expect(runbook).toContain("Critère de réussite Phase 14");
    expect(security).toContain("Runner non privileged par défaut");
    expect(rootDoc).toContain("Definition of Done");
  });

  it("declares the GitLab local lab certify script", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["gitlab:lab:certify"]).toContain("certify-gitlab-local-lab.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("gitlab:lab:certify");
  });
});
