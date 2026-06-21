import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  normalizeGitLabRunner,
  type GitLabAdapterFixture
} from "../../packages/dreps-gitlab-adapter/src/index.js";

const root = process.cwd();
const fixturePath = "labs/supply-chain/environments/gitlab-local/fixtures/gitlab-export.fixture.json";
const outputPath = ".doctrine/out/gitlab-adapter/gitlab-runner.normalized.json";

const fixture = JSON.parse(
  readFileSync(resolve(root, fixturePath), "utf8")
) as GitLabAdapterFixture;

const output = resolve(root, outputPath);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(normalizeGitLabRunner(fixture), null, 2) + "\n", "utf8");

console.log("GitLab runner export imported.");
console.log(outputPath);
