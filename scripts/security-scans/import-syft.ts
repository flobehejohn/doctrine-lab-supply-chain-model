import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { importSyft } from "../../packages/dreps-adapters/src/security-scans.js";

const inputPath = process.argv[2] ?? "labs/supply-chain/examples/security-scans-fixture/syft.json";
const outputPath = ".doctrine/out/security-scans/syft.normalized.json";

const result = importSyft(resolve(process.cwd(), inputPath));
const output = resolve(process.cwd(), outputPath);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2) + "\n", "utf8");

console.log("Syft security adapter imported SBOM components.");
console.log(outputPath);
