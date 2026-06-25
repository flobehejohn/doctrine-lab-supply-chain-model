import { resolve } from "node:path";
import {
  assertSignatureAssetsShape,
  generateSignatureAssets,
  loadSignatureConfig
} from "../../packages/dreps-signature-engine/src/index.js";

const root = process.cwd();
const configPath = "labs/supply-chain/examples/signature-fixture/signature.config.json";

const config = loadSignatureConfig(resolve(root, configPath));
const result = generateSignatureAssets(config);

assertSignatureAssetsShape(config, result);

console.log("Signature assets generated.");
console.log("auditPackHash: " + result.auditPackHashPath);
console.log("inTotoStatement: " + result.inTotoStatementPath);
console.log("cosignBundle: " + result.cosignBundlePath);
console.log("releaseKeylessWorkflow: " + result.releaseKeylessWorkflowPath);
console.log("workflowCopy: " + result.releaseKeylessWorkflowCopyPath);
console.log("verificationGuide: " + result.verificationGuidePath);
