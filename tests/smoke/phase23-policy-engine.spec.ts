import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertPolicyEvidencePackShape,
  buildPolicyEvidencePack,
  evaluatePolicies,
  loadPolicyContext,
  loadPolicyRuleset,
  PolicyIds,
  type JsonRecord
} from "../../packages/dreps-policy-engine/src/index.js";

const contextPath = resolve("labs/supply-chain/examples/policy-engine-fixture/policy-context.json");
const policiesPath = resolve("labs/supply-chain/examples/policy-engine-fixture/policies/policies.json");

const baseEvidencePack = JSON.parse(
  readFileSync("labs/supply-chain/examples/ecommerce/evidence-pack.json", "utf8")
) as JsonRecord;

describe("phase 23 policy engine", () => {
  it("loads policy context and ruleset", () => {
    const context = loadPolicyContext(contextPath);
    const ruleset = loadPolicyRuleset(policiesPath);

    expect(context.nodes.length).toBeGreaterThanOrEqual(6);
    expect(ruleset.policies.map((policy) => policy.id)).toEqual(PolicyIds);
  });

  it("transforms policies into normalized findings", () => {
    const context = loadPolicyContext(contextPath);
    const ruleset = loadPolicyRuleset(policiesPath);
    const report = evaluatePolicies(context, ruleset);
    const findingIds = new Set(report.findings.map((finding) => finding.id));

    for (const policyId of PolicyIds) {
      expect(findingIds.has(policyId)).toBe(true);
    }

    expect(report.findings.length).toBe(PolicyIds.length);
  });

  it("findings point to affectedNodes and evidenceRefs", () => {
    const context = loadPolicyContext(contextPath);
    const ruleset = loadPolicyRuleset(policiesPath);
    const report = evaluatePolicies(context, ruleset);

    for (const finding of report.findings) {
      expect(finding.affectedNodes.length).toBeGreaterThan(0);
      expect(finding.evidenceRefs.length).toBeGreaterThan(0);
    }

    const podFinding = report.findings.find((finding) => finding.id === "no-public-critical-vulnerable-pod");

    expect(podFinding?.affectedNodes).toContain("pod_checkout");
    expect(podFinding?.evidenceRefs).toContain("evidence_security_scan_policy_context");
  });

  it("builds a valid DREPS evidence-pack", () => {
    const context = loadPolicyContext(contextPath);
    const ruleset = loadPolicyRuleset(policiesPath);
    const report = evaluatePolicies(context, ruleset);

    const evidencePack = buildPolicyEvidencePack(baseEvidencePack, context, report, {
      contextPath: "labs/supply-chain/examples/policy-engine-fixture/policy-context.json",
      policiesPath: "labs/supply-chain/examples/policy-engine-fixture/policies/policies.json",
      reportPath: ".doctrine/out/policy-engine/policy-evaluation-report.json"
    });

    const parsed = EvidencePackSchema.parse(evidencePack);

    expect(parsed.packId).toBe("policy-engine-dreps-evidence-pack");
    assertPolicyEvidencePackShape(parsed as Record<string, unknown>);
  });

  it("declares policy engine scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["policy:engine:evaluate"]).toContain("evaluate-policies.ts");
    expect(pkg.scripts["policy:engine:import"]).toContain("import-policy-findings.ts");
    expect(pkg.scripts["policy:engine:certify"]).toContain("certify-policy-engine.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("policy:engine:certify");
  });
});
