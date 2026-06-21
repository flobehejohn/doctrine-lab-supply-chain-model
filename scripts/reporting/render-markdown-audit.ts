import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertReadableMarkdown,
  renderAuditMarkdown
} from "../../packages/dreps-markdown-renderer/src/index.js";

const root = process.cwd();
const inputPath = "labs/supply-chain/examples/ecommerce/evidence-pack.json";
const outputPath = ".doctrine/out/reports/audit-report.md";

const pack = EvidencePackSchema.parse(
  JSON.parse(readFileSync(resolve(root, inputPath), "utf8")) as unknown
);

const content = renderAuditMarkdown(pack);

assertReadableMarkdown(content);

const fullOutputPath = resolve(root, outputPath);
mkdirSync(dirname(fullOutputPath), { recursive: true });
writeFileSync(fullOutputPath, content, "utf8");

console.log("Markdown audit report generated.");
console.log(outputPath);
