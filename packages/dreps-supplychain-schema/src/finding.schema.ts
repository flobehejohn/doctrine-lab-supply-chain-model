import { z } from "zod";

export const FindingSeveritySchema = z.enum(["info", "low", "medium", "high", "critical"]);
export const FindingStatusSchema = z.enum(["open", "accepted", "mitigated", "resolved"]);

export const FindingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  severity: FindingSeveritySchema,
  status: FindingStatusSchema.default("open"),
  affectedNodes: z.array(z.string().min(1)).min(1),
  evidenceRefs: z.array(z.string().min(1)).min(1),
  description: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export type Finding = z.infer<typeof FindingSchema>;

