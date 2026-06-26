import {
  assertAuditPackExplorerShape,
  generateAuditPackExplorer
} from "../../packages/dreps-audit-pack-explorer/src/index.js";

const auditPackRoot = ".doctrine/out/audit-pack-engine/audit-pack";

const result = generateAuditPackExplorer(auditPackRoot);

assertAuditPackExplorerShape(result);

console.log("Audit Pack Explorer generated.");
console.log("readme: " + result.readmePath);
console.log("findingsCritical: " + result.findingsCriticalPath);
console.log("complianceFailed: " + result.complianceFailedPath);
console.log("jqExamples: " + result.jqExamplesPath);
console.log("supplychainMermaid: " + result.supplychainMermaidPath);
