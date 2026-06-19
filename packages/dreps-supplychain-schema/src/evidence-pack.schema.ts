import { z } from "zod";
import { NodeSchema } from "./node.schema.js";
import { EdgeSchema } from "./edge.schema.js";
import { EvidenceSchema } from "./evidence.schema.js";
import { FindingSchema } from "./finding.schema.js";
import { RemediationSchema } from "./remediation.schema.js";
import { ComplianceImpactSchema } from "./compliance.schema.js";
import { DocumentationSchema } from "./documentation.schema.js";
import { SimulationSchema } from "./simulation.schema.js";
import { CommandRefSchema } from "./command-ref.schema.js";
import { RunbookSchema } from "./runbook.schema.js";
import { WorkflowSchema } from "./workflow.schema.js";

export const EvidencePackSchema = z.object({
  schemaVersion: z.literal("dreps.supplychain.v1"),
  packId: z.string().min(1),
  createdAt: z.string().datetime(),
  mode: z.enum(["observed", "simulated", "imported"]),
  nodes: z.array(NodeSchema).default([]),
  edges: z.array(EdgeSchema).default([]),
  evidence: z.array(EvidenceSchema).default([]),
  findings: z.array(FindingSchema).default([]),
  remediations: z.array(RemediationSchema).default([]),
  complianceImpacts: z.array(ComplianceImpactSchema).default([]),
  documentation: z.array(DocumentationSchema).default([]),
  simulations: z.array(SimulationSchema).default([]),
  commandRefs: z.array(CommandRefSchema).default([]),
  runbooks: z.array(RunbookSchema).default([]),
  workflows: z.array(WorkflowSchema).default([]),
  graphMetrics: z.record(z.string(), z.unknown()).default({}),
  toolchain: z.record(z.string(), z.unknown()).default({}),
  provenance: z.record(z.string(), z.unknown()).default({})
}).superRefine((pack, ctx) => {
  const nodeIds = new Set(pack.nodes.map((node) => node.id));
  const evidenceIds = new Set(pack.evidence.map((evidence) => evidence.id));
  const findingIds = new Set(pack.findings.map((finding) => finding.id));

  for (const [index, edge] of pack.edges.entries()) {
    if (!nodeIds.has(edge.source)) {
      ctx.addIssue({
        code: "custom",
        path: ["edges", index, "source"],
        message: `Edge source does not reference an existing node: ${edge.source}`
      });
    }

    if (!nodeIds.has(edge.target)) {
      ctx.addIssue({
        code: "custom",
        path: ["edges", index, "target"],
        message: `Edge target does not reference an existing node: ${edge.target}`
      });
    }
  }

  for (const [index, finding] of pack.findings.entries()) {
    for (const affectedNode of finding.affectedNodes) {
      if (!nodeIds.has(affectedNode)) {
        ctx.addIssue({
          code: "custom",
          path: ["findings", index, "affectedNodes"],
          message: `Finding references a missing node: ${affectedNode}`
        });
      }
    }

    for (const evidenceRef of finding.evidenceRefs) {
      if (!evidenceIds.has(evidenceRef)) {
        ctx.addIssue({
          code: "custom",
          path: ["findings", index, "evidenceRefs"],
          message: `Finding references a missing evidence: ${evidenceRef}`
        });
      }
    }
  }

  for (const [index, remediation] of pack.remediations.entries()) {
    if (!findingIds.has(remediation.findingId)) {
      ctx.addIssue({
        code: "custom",
        path: ["remediations", index, "findingId"],
        message: `Remediation references a missing finding: ${remediation.findingId}`
      });
    }

    for (const affectedNode of remediation.affectedNodes) {
      if (!nodeIds.has(affectedNode)) {
        ctx.addIssue({
          code: "custom",
          path: ["remediations", index, "affectedNodes"],
          message: `Remediation references a missing node: ${affectedNode}`
        });
      }
    }
  }
});

export type EvidencePack = z.infer<typeof EvidencePackSchema>;

