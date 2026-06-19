import { z } from "zod";

export const ComplianceFrameworkSchema = z.enum([
  "SLSA",
  "DORA",
  "NIS2",
  "ISO27001",
  "CIS_KUBERNETES",
  "OWASP_ASVS",
  "OWASP_SAMM"
]);

export const ComplianceImpactSchema = z.object({
  id: z.string().min(1),
  framework: ComplianceFrameworkSchema,
  control: z.string().min(1),
  impact: z.enum(["none", "low", "medium", "high", "critical"]),
  findingRefs: z.array(z.string().min(1)).default([]),
  affectedNodes: z.array(z.string().min(1)).default([]),
  rationale: z.string().min(1)
});

export type ComplianceImpact = z.infer<typeof ComplianceImpactSchema>;

