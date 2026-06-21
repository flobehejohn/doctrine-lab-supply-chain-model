import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertGitLabEvidencePackShape,
  importGitLabToDrepsEvidencePack,
  renderGitLabGraphMermaid,
  type GitLabAdapterFixture,
  type JsonRecord
} from "../../packages/dreps-gitlab-adapter/src/index.js";

const root = process.cwd();
const fixturePath = "labs/supply-chain/environments/gitlab-local/fixtures/gitlab-export.fixture.json";
const baseEvidencePath = "labs/supply-chain/examples/ecommerce/evidence-pack.json";
const outputPath = ".doctrine/out/gitlab-adapter/evidence-pack.gitlab-local.json";
const mermaidPath = ".doctrine/out/gitlab-adapter/gitlab-dreps-graph.mmd";

const fixture = JSON.parse(
  readFileSync(resolve(root, fixturePath), "utf8")
) as GitLabAdapterFixture;

const baseEvidencePack = JSON.parse(
  readFileSync(resolve(root, baseEvidencePath), "utf8")
) as JsonRecord;

const evidencePack = importGitLabToDrepsEvidencePack(fixture, baseEvidencePack);

EvidencePackSchema.parse(evidencePack);
assertGitLabEvidencePackShape(evidencePack);

const output = resolve(root, outputPath);
const mermaidOutput = resolve(root, mermaidPath);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(evidencePack, null, 2) + "\n", "utf8");
writeFileSync(mermaidOutput, renderGitLabGraphMermaid(evidencePack), "utf8");

console.log("GitLab export imported into DREPS evidence-pack.");
console.log("evidencePack: " + outputPath);
console.log("mermaid: " + mermaidPath);
console.log("graph: gitlab_project -> ci_pipeline -> gitlab_runner -> container_image -> registry");
