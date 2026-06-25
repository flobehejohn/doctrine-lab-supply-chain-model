import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  assertGitOpsPatchBundleShape,
  buildGitOpsPatchBundle,
  loadGitOpsPatchContext
} from "../../packages/dreps-gitops-patch-engine/src/index.js";

const root = process.cwd();
const contextPath = "labs/supply-chain/examples/gitops-patch-fixture/gitops-context.json";

const patchPath = ".doctrine/out/gitops-patch/patch.diff";
const planPath = ".doctrine/out/gitops-patch/remediation-plan.json";
const prBodyPath = ".doctrine/out/gitops-patch/pull-request-body.md";
const verificationPath = ".doctrine/out/gitops-patch/verification.ps1";
const rollbackPath = ".doctrine/out/gitops-patch/rollback.md";
const jtablePath = ".doctrine/out/gitops-patch/pull-request-tables.jtable.json";

const context = loadGitOpsPatchContext(resolve(root, contextPath));
const bundle = buildGitOpsPatchBundle(context);

assertGitOpsPatchBundleShape(bundle);

for (const outputPath of [patchPath, planPath, prBodyPath, verificationPath, rollbackPath, jtablePath]) {
  mkdirSync(dirname(resolve(root, outputPath)), { recursive: true });
}

writeFileSync(resolve(root, patchPath), bundle.patchDiff, "utf8");
writeFileSync(resolve(root, planPath), JSON.stringify(bundle.remediationPlan, null, 2) + "\n", "utf8");
writeFileSync(resolve(root, prBodyPath), bundle.pullRequestBody, "utf8");
writeFileSync(resolve(root, verificationPath), bundle.verificationPs1, "utf8");
writeFileSync(resolve(root, rollbackPath), bundle.rollbackMd, "utf8");
writeFileSync(resolve(root, jtablePath), JSON.stringify(bundle.jtable, null, 2) + "\n", "utf8");

console.log("GitOps patch generated.");
console.log("patch: " + patchPath);
console.log("plan: " + planPath);
console.log("prBody: " + prBodyPath);
console.log("verification: " + verificationPath);
console.log("rollback: " + rollbackPath);
console.log("jtable: " + jtablePath);
