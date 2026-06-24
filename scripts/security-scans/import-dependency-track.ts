import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { importDependencyTrack } from "../../packages/dreps-adapters/src/security-scans.js";

const inputPath = process.argv[2] ?? "labs/supply-chain/examples/security-scans-fixture/dependency-track.json";
const outputPath = ".doctrine/out/security-scans/dependency-track.normalized.json";

const result = importDependencyTrack(resolve(process.cwd(), inputPath));
const output = resolve(process.cwd(), outputPath);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2) + "\n", "utf8");

console.log("Dependency-Track adapter imported dependency findings.");
console.log(outputPath);
