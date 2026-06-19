import { z } from "zod";

export const EvidenceTypeSchema = z.enum([
  "source_file",
  "ci_workflow",
  "scan_result",
  "sbom",
  "runtime_observation",
  "configuration",
  "certificate",
  "manual_attestation",
  "audit_log"
]);

export const EvidenceSchema = z.object({
  id: z.string().min(1),
  type: EvidenceTypeSchema,
  source: z.string().min(1),
  createdAt: z.string().datetime(),
  uri: z.string().min(1).optional(),
  hash: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export type Evidence = z.infer<typeof EvidenceSchema>;

