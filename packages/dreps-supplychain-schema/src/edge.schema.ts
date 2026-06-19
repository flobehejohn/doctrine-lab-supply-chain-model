import { z } from "zod";

export const SupplyChainEdgeTypeSchema = z.enum([
  "contains",
  "triggers",
  "runs",
  "runs_on",
  "builds",
  "publishes",
  "deploys",
  "routes_to",
  "exposes",
  "connects_to",
  "reads_from",
  "writes_to",
  "depends_on",
  "documents",
  "affects",
  "mitigates",
  "owned_by",
  "stores",
  "verifies",
  "signs"
]);

export const EdgeSchema = z.object({
  id: z.string().min(1),
  type: SupplyChainEdgeTypeSchema,
  source: z.string().min(1),
  target: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export type SupplyChainEdge = z.infer<typeof EdgeSchema>;

