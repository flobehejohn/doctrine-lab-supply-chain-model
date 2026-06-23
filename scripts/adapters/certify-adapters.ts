import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertLocalRepoEvidencePackShape,
  RepoAdapterFindingIds,
  RepoAdapterNodeIds
} from "../../packages/dreps-adapters/src/index.js";

const root = process.cwd();

const requiredOutputs = [
  ".doctrine/out/adapters/repo.normalized.json",
  ".doctrine/out/adapters/github-workflow.normalized.json",
  ".doctrine/out/adapters/gitlab-ci.normalized.json",
  ".doctrine/out/adapters/dockerfile.normalized.json",
  ".doctrine/out/adapters/package-lock.normalized.json",
  ".doctrine/out/adapters/pnpm-lock.normalized.json",
  ".doctrine/out/adapters/syft-sbom.normalized.json",
  ".doctrine/out/adapters/github-sbom.normalized.json",
  ".doctrine/out/adapters/evidence-pack.local-repo.json",
  ".doctrine/out/adapters/local-repo-graph.mmd"
];

for (const file of requiredOutputs) {
  if (!existsSync(resolve(root, file))) {
    throw new Error("Missing adapter output: " + file);
  }
}

const evidencePack = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/adapters/evidence-pack.local-repo.json"), "utf8")
) as unknown;

const parsed = EvidencePackSchema.parse(evidencePack);
assertLocalRepoEvidencePackShape(parsed as Record<string, unknown>);

const mermaid = readFileSync(
  resolve(root, ".doctrine/out/adapters/local-repo-graph.mmd"),
  "utf8"
);

for (const fragment of [
  "repository --> github_workflow",
  "repository --> gitlab_ci_pipeline",
  "dockerfile --> container_image",
  "github_workflow --> container_image",
  "gitlab_ci_pipeline --> container_image",
  "syft_sbom --> container_image"
]) {
  if (!mermaid.includes(fragment)) {
    throw new Error("Local repo Mermaid graph missing fragment: " + fragment);
  }
}

console.log("Repo / CI / Docker / SBOM adapters certification passed.");
console.log("nodes: " + RepoAdapterNodeIds.length);
console.log("findings: " + RepoAdapterFindingIds.length);
console.log("evidencePack: .doctrine/out/adapters/evidence-pack.local-repo.json");
console.log("graph: .doctrine/out/adapters/local-repo-graph.mmd");
