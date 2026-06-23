import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { adaptPackageLock } from "../../packages/dreps-adapters/src/index.js";

const repoRoot = process.argv[2] ?? "labs/supply-chain/examples/local-repo-fixture";
const outputPath = ".doctrine/out/adapters/package-lock.normalized.json";
const output = resolve(process.cwd(), outputPath);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(adaptPackageLock(resolve(process.cwd(), repoRoot)), null, 2) + "\n", "utf8");

console.log("package-lock adapter imported dependencies.");
console.log(outputPath);
