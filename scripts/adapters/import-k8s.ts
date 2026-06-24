import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { importK8sFullYaml } from "../../packages/dreps-adapters/src/k8s-terraform.js";

const inputPath = process.argv[2] ?? "labs/supply-chain/examples/runtime-fixture/k8s-full.yaml";
const outputPath = ".doctrine/out/runtime/k8s.normalized.json";

const result = importK8sFullYaml(resolve(process.cwd(), inputPath));
const output = resolve(process.cwd(), outputPath);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2) + "\n", "utf8");

console.log("Kubernetes adapter imported runtime manifest.");
console.log(outputPath);
