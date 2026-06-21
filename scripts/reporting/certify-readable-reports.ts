import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertReadableMarkdown } from "../../packages/dreps-markdown-renderer/src/index.js";
import { assertReadableMermaid } from "../../packages/dreps-mermaid-exporter/src/index.js";
import { assertReadableMarp } from "../../packages/dreps-marp-exporter/src/index.js";

const root = process.cwd();

const artifacts = {
  markdown: ".doctrine/out/reports/audit-report.md",
  mermaid: ".doctrine/out/diagrams/supplychain.mmd",
  marp: ".doctrine/out/decks/executive-summary.marp.md"
};

for (const [kind, relativePath] of Object.entries(artifacts)) {
  const fullPath = resolve(root, relativePath);

  if (!existsSync(fullPath)) {
    throw new Error(kind + " artifact is missing: " + relativePath);
  }
}

const markdown = readFileSync(resolve(root, artifacts.markdown), "utf8");
const mermaid = readFileSync(resolve(root, artifacts.mermaid), "utf8");
const marp = readFileSync(resolve(root, artifacts.marp), "utf8");

assertReadableMarkdown(markdown);
assertReadableMermaid(mermaid);
assertReadableMarp(marp);

console.log("Readable reporting certification passed.");
console.log("- " + artifacts.markdown);
console.log("- " + artifacts.mermaid);
console.log("- " + artifacts.marp);
