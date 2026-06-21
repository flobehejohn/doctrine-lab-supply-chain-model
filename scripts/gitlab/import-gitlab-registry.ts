import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  normalizeGitLabRegistry,
  type GitLabAdapterFixture
} from "../../packages/dreps-gitlab-adapter/src/index.js";

const root = process.cwd();
const fixturePath = "labs/supply-chain/environments/gitlab-local/fixtures/gitlab-export.fixture.json";
const outputPath = ".doctrine/out/gitlab-adapter/gitlab-registry.normalized.json";

const fixture = JSON.parse(
  readFileSync(resolve(root, fixturePath), "utf8")
) as GitLabAdapterFixture;

const output = resolve(root, outputPath);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(normalizeGitLabRegistry(fixture), null, 2) + "\n", "utf8");

console.log("GitLab registry export imported.");
console.log(outputPath);
