import { z } from "zod";

export const CommandRiskLevelSchema = z.enum([
  "read_only",
  "local_write",
  "remote_write",
  "destructive",
  "credential_sensitive",
  "production_risk"
]);

const dangerousRiskLevels = new Set([
  "remote_write",
  "destructive",
  "credential_sensitive",
  "production_risk"
]);

export const CommandRefSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  command: z.string().min(1),
  riskLevel: CommandRiskLevelSchema,
  approvalRequired: z.boolean().default(false),
  rollbackRef: z.string().min(1).optional()
}).superRefine((commandRef, ctx) => {
  if (dangerousRiskLevels.has(commandRef.riskLevel) && commandRef.approvalRequired !== true) {
    ctx.addIssue({
      code: "custom",
      path: ["approvalRequired"],
      message: "Dangerous commands require approvalRequired=true."
    });
  }
});

export type CommandRef = z.infer<typeof CommandRefSchema>;

