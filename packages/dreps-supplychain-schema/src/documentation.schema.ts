import { z } from "zod";

export const DocumentationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: z.enum(["runbook", "architecture", "policy", "report", "training"]),
  path: z.string().min(1),
  relatedNodes: z.array(z.string().min(1)).default([]),
  relatedFindings: z.array(z.string().min(1)).default([])
});

export type DocumentationRef = z.infer<typeof DocumentationSchema>;

