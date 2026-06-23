import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { adaptGithubWorkflow } from "../../packages/dreps-adapters/src/index.js";

const repoRoot = process.argv[2] ?? "labs/supply-chain/examples/local-repo-fixture";
const outputPath = ".doctrine/out/adapters/github-workflow.normalized.json";
const output = resolve(process.cwd(), outputPath);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(adaptGithubWorkflow(resolve(process.cwd(), repoRoot)), null, 2) + "\n", "utf8");

console.log("GitHub workflow adapter imported workflow.");
console.log(outputPath);
