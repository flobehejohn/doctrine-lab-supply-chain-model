import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  normalizeGitLabCi,
  type GitLabAdapterFixture
} from "../../packages/dreps-gitlab-adapter/src/index.js";

const root = process.cwd();
const fixturePath = "labs/supply-chain/environments/gitlab-local/fixtures/gitlab-export.fixture.json";
const outputPath = ".doctrine/out/gitlab-adapter/gitlab-ci.normalized.json";

const fixture = JSON.parse(
  readFileSync(resolve(root, fixturePath), "utf8")
) as GitLabAdapterFixture;

const output = resolve(root, outputPath);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(normalizeGitLabCi(fixture), null, 2) + "\n", "utf8");

console.log("GitLab CI export imported.");
console.log(outputPath);
