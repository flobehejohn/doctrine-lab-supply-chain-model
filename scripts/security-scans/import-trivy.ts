import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { importTrivy } from "../../packages/dreps-adapters/src/security-scans.js";

const inputPath = process.argv[2] ?? "labs/supply-chain/examples/security-scans-fixture/trivy.json";
const outputPath = ".doctrine/out/security-scans/trivy.normalized.json";

const result = importTrivy(resolve(process.cwd(), inputPath));
const output = resolve(process.cwd(), outputPath);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2) + "\n", "utf8");

console.log("Trivy adapter imported findings.");
console.log(outputPath);
