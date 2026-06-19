import { describe, expect, it } from "vitest";
import {
  CommandRefSchema,
  EvidencePackSchema,
  FindingSchema,
  RemediationSchema
} from "../../packages/dreps-supplychain-schema/src/index.js";

describe("phase 2 DREPS supply chain schema", () => {
  it("validates a minimal evidence pack", () => {
    const pack = {
      schemaVersion: "dreps.supplychain.v1",
      packId: "test-minimal",
      createdAt: new Date().toISOString(),
      mode: "simulated",
      nodes: [
        {
          id: "repo",
          type: "repository",
          name: "repo"
        }
      ],
      edges: [],
      evidence: [],
      findings: [],
      remediations: []
    };

    expect(EvidencePackSchema.safeParse(pack).success).toBe(true);
  });

  it("rejects a finding without affectedNodes", () => {
    const invalidFinding = {
      id: "finding-without-affected-nodes",
      title: "Invalid finding",
      severity: "high",
      evidenceRefs: ["evidence-1"]
    };

    expect(FindingSchema.safeParse(invalidFinding).success).toBe(false);
  });

  it("rejects a remediation without rollback", () => {
    const invalidRemediation = {
      id: "remediation-without-rollback",
      findingId: "finding-1",
      affectedNodes: ["node-1"],
      strategy: "Patch the system",
      risk: "medium",
      verification: {
        expectedOutcome: "System is patched",
        commands: [
          {
            id: "cmd-verify",
            description: "Verify patch",
            command: "kubectl get pods",
            riskLevel: "read_only",
            approvalRequired: false
          }
        ]
      }
    };

    expect(RemediationSchema.safeParse(invalidRemediation).success).toBe(false);
  });

  it("rejects a dangerous command without approvalRequired", () => {
    const invalidCommand = {
      id: "cmd-dangerous",
      description: "Delete production namespace",
      command: "kubectl delete namespace production",
      riskLevel: "destructive"
    };

    expect(CommandRefSchema.safeParse(invalidCommand).success).toBe(false);
  });
});

