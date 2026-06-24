import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { importCheckov } from "../../packages/dreps-adapters/src/security-scans.js";

const inputPath = process.argv[2] ?? "labs/supply-chain/examples/security-scans-fixture/checkov.json";
const outputPath = ".doctrine/out/security-scans/checkov.normalized.json";

const result = importCheckov(resolve(process.cwd(), inputPath));
const output = resolve(process.cwd(), outputPath);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2) + "\n", "utf8");

console.log("Checkov adapter imported IaC findings.");
console.log(outputPath);
