import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertGitOpsPatchBundleShape,
  buildGitOpsPatchBundle,
  loadGitOpsPatchContext
} from "../../packages/dreps-gitops-patch-engine/src/index.js";

const contextPath = resolve("labs/supply-chain/examples/gitops-patch-fixture/gitops-context.json");

function bundleForTest() {
  const context = loadGitOpsPatchContext(contextPath);
  return buildGitOpsPatchBundle(context);
}

describe("phase 28 gitops patch engine", () => {
  it("generates a NetworkPolicy git patch", () => {
    const bundle = bundleForTest();

    expect(bundle.patchDiff).toContain("diff --git");
    expect(bundle.patchDiff).toContain("new file mode 100644");
    expect(bundle.patchDiff).toContain("kind: NetworkPolicy");
    expect(bundle.patchDiff).toContain("checkout-deny-by-default");
  });

  it("generates remediation plan and PR body", () => {
    const bundle = bundleForTest();

    expect(bundle.remediationPlan.schemaVersion).toBe("dreps-gitops-remediation-plan.v1");
    expect(bundle.remediationPlan.findingId).toBe("no-public-critical-vulnerable-pod");
    expect(bundle.pullRequestBody).toContain("## Why");
    expect(bundle.pullRequestBody).toContain("## Risk");
    expect(bundle.pullRequestBody).toContain("## Verification commands");
    expect(bundle.pullRequestBody).toContain("## Rollback");
  });

  it("PR body contains required tables", () => {
    const bundle = bundleForTest();

    expect(bundle.pullRequestBody).toContain("## Findings");
    expect(bundle.pullRequestBody).toContain("## Affected nodes");
    expect(bundle.pullRequestBody).toContain("## Compliance impacts");
    expect(bundle.pullRequestBody).toContain("## Verification commands");
    expect(bundle.pullRequestBody).toContain("| Finding | Severity | Title | Risk |");
    expect(bundle.pullRequestBody).toContain("| Node | Type | Namespace | Critical | Public | Vulnerable |");
  });

  it("exports verification and rollback assets", () => {
    const bundle = bundleForTest();

    expect(bundle.verificationPs1).toContain("git apply --check .doctrine/out/gitops-patch/patch.diff");
    expect(bundle.rollbackMd).toContain("git apply -R .doctrine/out/gitops-patch/patch.diff");
  });

  it("exports jtable PR tables", () => {
    const bundle = bundleForTest();
    const tableIds = new Set(bundle.jtable.tables.map((table) => table.id));

    expect(bundle.jtable.schemaVersion).toBe("jtable.compat.v1");
    expect(tableIds.has("findings")).toBe(true);
    expect(tableIds.has("affected-nodes")).toBe(true);
    expect(tableIds.has("compliance-impacts")).toBe(true);
    expect(tableIds.has("verification-commands")).toBe(true);
  });

  it("asserts GitOps patch bundle shape", () => {
    const bundle = bundleForTest();

    assertGitOpsPatchBundleShape(bundle);
  });

  it("declares GitOps patch scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["gitops:patch:generate"]).toContain("generate-gitops-patch.ts");
    expect(pkg.scripts["gitops:patch:certify"]).toContain("certify-gitops-patch.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("gitops:patch:certify");
  });
});
