import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertGitLabEvidencePackShape,
  GitLabFindingIds,
  GitLabNodeKinds
} from "../../packages/dreps-gitlab-adapter/src/index.js";

const root = process.cwd();

const requiredFiles = [
  ".doctrine/out/gitlab-adapter/gitlab-ci.normalized.json",
  ".doctrine/out/gitlab-adapter/gitlab-runner.normalized.json",
  ".doctrine/out/gitlab-adapter/gitlab-registry.normalized.json",
  ".doctrine/out/gitlab-adapter/evidence-pack.gitlab-local.json",
  ".doctrine/out/gitlab-adapter/gitlab-dreps-graph.mmd"
];

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) {
    throw new Error("Missing GitLab adapter output: " + file);
  }
}

const evidencePack = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/gitlab-adapter/evidence-pack.gitlab-local.json"), "utf8")
) as unknown;

const parsed = EvidencePackSchema.parse(evidencePack);
assertGitLabEvidencePackShape(parsed as Record<string, unknown>);

const mermaid = readFileSync(
  resolve(root, ".doctrine/out/gitlab-adapter/gitlab-dreps-graph.mmd"),
  "utf8"
);

for (const fragment of [
  "gitlab_project --> ci_pipeline",
  "ci_pipeline --> gitlab_runner",
  "gitlab_runner --> container_image",
  "container_image --> registry"
]) {
  if (!mermaid.includes(fragment)) {
    throw new Error("GitLab Mermaid graph missing fragment: " + fragment);
  }
}

console.log("GitLab adapter certification passed.");
console.log("nodes: " + GitLabNodeKinds.length);
console.log("findings: " + GitLabFindingIds.length);
console.log("evidencePack: .doctrine/out/gitlab-adapter/evidence-pack.gitlab-local.json");
console.log("graph: .doctrine/out/gitlab-adapter/gitlab-dreps-graph.mmd");
