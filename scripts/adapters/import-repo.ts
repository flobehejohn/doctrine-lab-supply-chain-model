import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { scanLocalRepo } from "../../packages/dreps-adapters/src/index.js";

const repoRoot = process.argv[2] ?? "labs/supply-chain/examples/local-repo-fixture";
const outputPath = ".doctrine/out/adapters/repo.normalized.json";

const scan = scanLocalRepo(resolve(process.cwd(), repoRoot));
const output = resolve(process.cwd(), outputPath);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({
  repoName: scan.repoName,
  repoRoot,
  files: scan.files
}, null, 2) + "\n", "utf8");

console.log("Repo adapter imported local repository.");
console.log(outputPath);
