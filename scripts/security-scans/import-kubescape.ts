import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { importKubescape } from "../../packages/dreps-adapters/src/security-scans.js";

const inputPath = process.argv[2] ?? "labs/supply-chain/examples/security-scans-fixture/kubescape.json";
const outputPath = ".doctrine/out/security-scans/kubescape.normalized.json";

const result = importKubescape(resolve(process.cwd(), inputPath));
const output = resolve(process.cwd(), outputPath);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2) + "\n", "utf8");

console.log("Kubescape adapter imported Kubernetes findings.");
console.log(outputPath);
