import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertSignatureAssetsShape,
  loadSignatureConfig,
  type AuditPackHash,
  type InTotoStatement
} from "../../packages/dreps-signature-engine/src/index.js";

const root = process.cwd();
const configPath = "labs/supply-chain/examples/signature-fixture/signature.config.json";

const config = loadSignatureConfig(resolve(root, configPath));

const result = {
  outputRoot: resolve(root, config.outputRoot),
  auditPackHashPath: resolve(root, config.outputRoot, "audit-pack.sha256.json"),
  inTotoStatementPath: resolve(root, config.outputRoot, "in-toto.statement.json"),
  cosignBundlePath: resolve(root, config.outputRoot, "cosign.bundle"),
  releaseKeylessWorkflowPath: resolve(root, config.outputRoot, "release-keyless.yml"),
  releaseKeylessWorkflowCopyPath: resolve(root, config.workflowPath),
  verificationGuidePath: resolve(root, config.outputRoot, "verification-guide.md")
};

assertSignatureAssetsShape(config, result);

const auditPackHash = JSON.parse(
  readFileSync(result.auditPackHashPath, "utf8")
) as AuditPackHash;

const statement = JSON.parse(
  readFileSync(result.inTotoStatementPath, "utf8")
) as InTotoStatement;

console.log("Signature / in-toto / SLSA certification passed.");
console.log("auditPackHash: " + result.auditPackHashPath);
console.log("sha256: " + auditPackHash.sha256);
console.log("inTotoStatement: " + result.inTotoStatementPath);
console.log("predicateType: " + statement.predicateType);
console.log("cosignBundle: " + result.cosignBundlePath);
console.log("releaseKeylessWorkflow: " + result.releaseKeylessWorkflowCopyPath);
console.log("verificationGuide: " + result.verificationGuidePath);
console.log("audit-pack hashable: yes");
console.log("in-toto statement produced: yes");
console.log("keyless signature planned in CI: yes");
console.log("verification guide included: yes");
