import { resolve } from "node:path";
import {
  assertAuditPackShape,
  generateAuditPack,
  loadAuditPackConfig
} from "../../packages/dreps-audit-pack/src/index.js";

const root = process.cwd();
const configPath = "labs/supply-chain/examples/audit-pack-fixture/audit-pack.config.json";

const config = loadAuditPackConfig(resolve(root, configPath));
const result = generateAuditPack(config);

assertAuditPackShape(config, result.outputRoot);

console.log("Audit pack generated.");
console.log("outputRoot: " + result.outputRoot);
console.log("manifest: " + result.manifestPath);
console.log("checksums: " + result.checksumsPath);
console.log("jsonFilesCoveredByChecksums: " + result.jsonFilesCoveredByChecksums.length);
console.log("fileCount: " + result.fileCount);
