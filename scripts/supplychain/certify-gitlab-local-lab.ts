import {
  existsSync,
  readFileSync,
  statSync
} from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const labRoot = "labs/supply-chain/environments/gitlab-local";

const requiredFiles = [
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

function read(relativePath: string): string {
  return readFileSync(resolve(root, labRoot, relativePath), "utf8");
}

function assertFile(relativePath: string): void {
  const fullPath = resolve(root, labRoot, relativePath);

  if (!existsSync(fullPath)) {
    throw new Error("Missing GitLab local lab file: " + relativePath);
  }

  if (!statSync(fullPath).isFile()) {
    throw new Error("GitLab local lab path is not a file: " + relativePath);
  }
}

function assertContains(relativePath: string, fragment: string, message: string): void {
  const content = read(relativePath);

  if (!content.includes(fragment)) {
    throw new Error(message + " in " + relativePath);
  }
}

function assertDoesNotContain(relativePath: string, pattern: RegExp, message: string): void {
  const content = read(relativePath);

  if (pattern.test(content)) {
    throw new Error(message + " in " + relativePath);
  }
}

for (const file of requiredFiles) {
  assertFile(file);
}

assertContains("README.md", "GitLab local", "README must document GitLab local");
assertContains("RUNBOOK.md", "Critère de réussite Phase 14", "RUNBOOK must document success criteria");
assertContains("SECURITY_MODEL.md", "Runner non privileged par défaut", "SECURITY_MODEL must document runner policy");

assertContains(
  "docker-compose.template.yml",
  "gitlab/gitlab-ce:17.11.2-ce.0",
  "GitLab image must be pinned"
);

assertContains(
  "docker-compose.template.yml",
  "gitlab/gitlab-runner:v17.11.0",
  "GitLab runner image must be pinned"
);

assertDoesNotContain(
  "docker-compose.template.yml",
  /image:\s*[^@\n:]+:latest\b/i,
  "Undocumented latest image tag is forbidden"
);

assertDoesNotContain(
  "sample-project/Dockerfile",
  /FROM\s+.+:latest\b/i,
  "Dockerfile must not use latest"
);

assertContains(
  "sample-project/Dockerfile",
  "FROM alpine:3.20.3",
  "Sample Dockerfile must use a pinned base image"
);

assertContains(
  "sample-project/.gitlab-ci.yml",
  "$CI_REGISTRY_IMAGE:$IMAGE_TAG",
  "Pipeline must model registry image publication"
);

assertContains(
  "sample-project/.gitlab-ci.yml",
  "--password-stdin",
  "Pipeline must avoid printing registry password"
);

assertDoesNotContain(
  "bootstrap-gitlab-lab.ps1",
  /Write-Host\s+.*GITLAB_RUNNER_REGISTRATION_TOKEN/i,
  "PowerShell bootstrap must not print runner token"
);

assertDoesNotContain(
  "bootstrap-gitlab-lab.sh",
  /echo\s+.*GITLAB_RUNNER_REGISTRATION_TOKEN/i,
  "Bash bootstrap must not print runner token"
);

assertDoesNotContain(
  "bootstrap-gitlab-lab.ps1",
  /validate_certs\s*[:=]\s*false/i,
  "validate_certs false is forbidden"
);

assertDoesNotContain(
  "bootstrap-gitlab-lab.sh",
  /validate_certs\s*[:=]\s*false/i,
  "validate_certs false is forbidden"
);

assertDoesNotContain(
  "docker-compose.template.yml",
  /privileged:\s*true/i,
  "Runner privileged=true is forbidden by default"
);

const evidence = JSON.parse(read("evidence/evidence-pack.gitlab-local.json")) as {
  packId?: string;
  nodes?: unknown[];
  pipeline?: unknown[];
  controls?: unknown[];
  findings?: unknown[];
};

if (evidence.packId !== "gitlab-local-supplychain-demo") {
  throw new Error("Unexpected GitLab local evidence pack id.");
}

if (!Array.isArray(evidence.nodes) || evidence.nodes.length < 5) {
  throw new Error("GitLab local evidence pack must model at least five nodes.");
}

if (!Array.isArray(evidence.pipeline) || evidence.pipeline.length < 3) {
  throw new Error("GitLab local evidence pack must model at least three pipeline steps.");
}

if (!Array.isArray(evidence.controls) || evidence.controls.length < 4) {
  throw new Error("GitLab local evidence pack must model security controls.");
}

if (!Array.isArray(evidence.findings) || evidence.findings.length < 1) {
  throw new Error("GitLab local evidence pack must include at least one finding.");
}

console.log("GitLab local lab certification passed.");
console.log("lab: " + labRoot);
console.log("files: " + requiredFiles.length);
console.log("docs: README.md, RUNBOOK.md, SECURITY_MODEL.md, docs/20_GITLAB_LOCAL_LAB.md");
console.log("evidencePack: " + labRoot + "/evidence/evidence-pack.gitlab-local.json");
console.log("sampleProject: " + labRoot + "/sample-project");
console.log("pipeline modelable: yes");
