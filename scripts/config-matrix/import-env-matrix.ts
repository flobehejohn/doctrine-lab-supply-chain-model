import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  loadEnvMatrix,
  renderMarkdownMatrix,
  toJtablePayload
} from "../../packages/dreps-config-matrix/src/index.js";

const inputPath = process.argv[2] ?? "labs/supply-chain/examples/config-matrix-fixture/env-matrix.json";
const normalizedPath = ".doctrine/out/config-matrix/env-matrix.normalized.json";
const jtablePath = ".doctrine/out/config-matrix/env-matrix.jtable.json";
const markdownPath = ".doctrine/out/config-matrix/env-matrix.md";

const matrix = loadEnvMatrix(resolve(process.cwd(), inputPath));
const jtable = toJtablePayload(matrix);
const markdown = renderMarkdownMatrix(jtable);

for (const outputPath of [normalizedPath, jtablePath, markdownPath]) {
  mkdirSync(dirname(resolve(process.cwd(), outputPath)), { recursive: true });
}

writeFileSync(resolve(process.cwd(), normalizedPath), JSON.stringify(matrix, null, 2) + "\n", "utf8");
writeFileSync(resolve(process.cwd(), jtablePath), JSON.stringify(jtable, null, 2) + "\n", "utf8");
writeFileSync(resolve(process.cwd(), markdownPath), markdown, "utf8");

console.log("Environment matrix imported.");
console.log("matrix: " + normalizedPath);
console.log("jtable: " + jtablePath);
console.log("markdown: " + markdownPath);
console.log("environments: " + matrix.environments.map((env) => env.name).join(", "));
