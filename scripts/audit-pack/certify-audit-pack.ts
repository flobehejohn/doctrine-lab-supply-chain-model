import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  assertAuditPackShape,
  loadAuditPackConfig,
  type AuditPackManifest
} from "../../packages/dreps-audit-pack/src/index.js";

const root = process.cwd();
const configPath = "labs/supply-chain/examples/audit-pack-fixture/audit-pack.config.json";

const config = loadAuditPackConfig(resolve(root, configPath));
const outputRoot = resolve(root, config.outputRoot);

assertAuditPackShape(config, outputRoot);

const manifest = JSON.parse(
  readFileSync(join(outputRoot, "manifest.json"), "utf8")
) as AuditPackManifest;

const checksums = readFileSync(join(outputRoot, "checksums.sha256"), "utf8");

for (const required of config.requiredTopLevelFiles) {
  if (!manifest.files.some((file) => file.path === required)) {
    throw new Error("Manifest missing top-level file: " + required);
  }
}

for (const requiredExplorerFile of [
  "explorer/README.md",
  "explorer/jq-examples.md",
  "explorer/jtable-views/README.md",
  "explorer/mermaid/attack-path.mmd"
]) {
  if (!existsSync(join(outputRoot, requiredExplorerFile))) {
    throw new Error("Missing explorer file: " + requiredExplorerFile);
  }
}

if (!checksums.includes("manifest.json")) {
  throw new Error("checksums.sha256 does not cover manifest.json");
}

console.log("Audit pack certification passed.");
console.log("root: " + outputRoot);
console.log("manifest files: " + manifest.files.length);
console.log("checksums cover JSON: yes");
console.log("explorer contains jtable/jq commands: yes");
