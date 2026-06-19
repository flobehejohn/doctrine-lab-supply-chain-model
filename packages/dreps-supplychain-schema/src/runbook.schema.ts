import { z } from "zod";

export const RunbookSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  path: z.string().min(1),
  findingRefs: z.array(z.string().min(1)).default([]),
  commandRefs: z.array(z.string().min(1)).default([])
});

export type Runbook = z.infer<typeof RunbookSchema>;

