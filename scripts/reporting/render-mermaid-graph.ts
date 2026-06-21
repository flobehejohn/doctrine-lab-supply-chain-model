import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertReadableMermaid,
  renderSupplyChainMermaid
} from "../../packages/dreps-mermaid-exporter/src/index.js";

const root = process.cwd();
const inputPath = "labs/supply-chain/examples/ecommerce/evidence-pack.json";
const outputPath = ".doctrine/out/diagrams/supplychain.mmd";

const pack = EvidencePackSchema.parse(
  JSON.parse(readFileSync(resolve(root, inputPath), "utf8")) as unknown
);

const content = renderSupplyChainMermaid(pack);

assertReadableMermaid(content);

const fullOutputPath = resolve(root, outputPath);
mkdirSync(dirname(fullOutputPath), { recursive: true });
writeFileSync(fullOutputPath, content, "utf8");

console.log("Mermaid supply chain graph generated.");
console.log(outputPath);
