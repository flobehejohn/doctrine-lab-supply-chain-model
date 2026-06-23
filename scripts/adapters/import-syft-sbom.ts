import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { adaptSyftSbom } from "../../packages/dreps-adapters/src/index.js";

const repoRoot = process.argv[2] ?? "labs/supply-chain/examples/local-repo-fixture";
const outputPath = ".doctrine/out/adapters/syft-sbom.normalized.json";
const output = resolve(process.cwd(), outputPath);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(adaptSyftSbom(resolve(process.cwd(), repoRoot)), null, 2) + "\n", "utf8");

console.log("Syft SBOM adapter imported SBOM.");
console.log(outputPath);
