import { z } from "zod";

export const SimulationSchema = z.object({
  id: z.string().min(1),
  scenario: z.string().min(1),
  startNode: z.string().min(1),
  maxDepth: z.number().int().positive().default(5),
  expectedImpact: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export type Simulation = z.infer<typeof SimulationSchema>;

