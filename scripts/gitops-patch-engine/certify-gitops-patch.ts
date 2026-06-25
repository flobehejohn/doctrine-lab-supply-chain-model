import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const requiredOutputs = [
  ".doctrine/out/gitops-patch/patch.diff",
  ".doctrine/out/gitops-patch/remediation-plan.json",
  ".doctrine/out/gitops-patch/pull-request-body.md",
  ".doctrine/out/gitops-patch/verification.ps1",
  ".doctrine/out/gitops-patch/rollback.md",
  ".doctrine/out/gitops-patch/pull-request-tables.jtable.json"
];

for (const file of requiredOutputs) {
  if (!existsSync(resolve(root, file))) {
    throw new Error("Missing GitOps patch output: " + file);
  }
}

const patch = readFileSync(resolve(root, ".doctrine/out/gitops-patch/patch.diff"), "utf8");
const prBody = readFileSync(resolve(root, ".doctrine/out/gitops-patch/pull-request-body.md"), "utf8");
const verification = readFileSync(resolve(root, ".doctrine/out/gitops-patch/verification.ps1"), "utf8");
const rollback = readFileSync(resolve(root, ".doctrine/out/gitops-patch/rollback.md"), "utf8");

const plan = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/gitops-patch/remediation-plan.json"), "utf8")
) as {
  schemaVersion?: string;
  findingId?: string;
  affectedNodes?: string[];
};

const jtable = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/gitops-patch/pull-request-tables.jtable.json"), "utf8")
) as {
  schemaVersion?: string;
  tables?: Array<{ id?: string; rows?: unknown[] }>;
};

if (!patch.includes("kind: NetworkPolicy") || !patch.includes("checkout-deny-by-default")) {
  throw new Error("Generated patch does not contain expected NetworkPolicy");
}

if (plan.schemaVersion !== "dreps-gitops-remediation-plan.v1") {
  throw new Error("Invalid remediation-plan.json schema");
}

if (plan.findingId !== "no-public-critical-vulnerable-pod") {
  throw new Error("Unexpected remediation findingId");
}

if (!Array.isArray(plan.affectedNodes) || !plan.affectedNodes.includes("pod_checkout")) {
  throw new Error("Remediation plan does not reference pod_checkout");
}

for (const section of ["## Findings", "## Affected nodes", "## Compliance impacts", "## Verification commands", "## Rollback", "## Risk"]) {
  if (!prBody.includes(section)) {
    throw new Error("Pull request body missing section: " + section);
  }
}

if (!verification.includes("git apply --check .doctrine/out/gitops-patch/patch.diff")) {
  throw new Error("verification.ps1 does not check git apply");
}

if (!rollback.includes("git apply -R .doctrine/out/gitops-patch/patch.diff")) {
  throw new Error("rollback.md does not explain reverse git apply");
}

if (jtable.schemaVersion !== "jtable.compat.v1") {
  throw new Error("Invalid jtable schema");
}

const tableIds = new Set((jtable.tables ?? []).map((table) => table.id));

for (const tableId of ["findings", "affected-nodes", "compliance-impacts", "verification-commands"]) {
  if (!tableIds.has(tableId)) {
    throw new Error("Missing PR body jtable: " + tableId);
  }
}

console.log("GitOps patch engine certification passed.");
console.log("patch: .doctrine/out/gitops-patch/patch.diff");
console.log("remediationPlan: .doctrine/out/gitops-patch/remediation-plan.json");
console.log("prBody: .doctrine/out/gitops-patch/pull-request-body.md");
console.log("verification: .doctrine/out/gitops-patch/verification.ps1");
console.log("rollback: .doctrine/out/gitops-patch/rollback.md");
console.log("networkPolicy patch: yes");
console.log("PR body has findings/nodes/compliance/verification tables: yes");
