import { z } from "zod";

export const WorkflowJobSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  dependsOn: z.array(z.string().min(1)).default([])
});

export const WorkflowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  jobs: z.array(WorkflowJobSchema).default([]),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export type Workflow = z.infer<typeof WorkflowSchema>;

