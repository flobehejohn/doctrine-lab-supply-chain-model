import { z } from "zod";
import { CommandRefSchema } from "./command-ref.schema.js";

export const RemediationRiskSchema = z.enum(["low", "medium", "high", "critical"]);

export const VerificationSchema = z.object({
  commands: z.array(CommandRefSchema).min(1),
  expectedOutcome: z.string().min(1)
});

export const RollbackSchema = z.object({
  description: z.string().min(1),
  commands: z.array(CommandRefSchema).min(1)
});

export const RemediationSchema = z.object({
  id: z.string().min(1),
  findingId: z.string().min(1),
  affectedNodes: z.array(z.string().min(1)).min(1),
  strategy: z.string().min(1),
  risk: RemediationRiskSchema,
  commands: z.array(CommandRefSchema).default([]),
  verification: VerificationSchema,
  rollback: RollbackSchema,
  approvalRequired: z.boolean().default(false),
  maintenanceWindow: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export type Remediation = z.infer<typeof RemediationSchema>;

