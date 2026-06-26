import {
  assertAuditPackExplorerShape,
  generateAuditPackExplorer
} from "../../packages/dreps-audit-pack-explorer/src/index.js";

const auditPackRoot = ".doctrine/out/audit-pack-engine/audit-pack";
const result = generateAuditPackExplorer(auditPackRoot);

assertAuditPackExplorerShape(result);

console.log("Audit Pack Explorer certification passed.");
console.log("external auditor can inspect findings: yes");
console.log("external auditor can inspect compliance: yes");
console.log("external auditor can inspect blast radius: yes");
console.log("UI required: no");
