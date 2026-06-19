import { z } from "zod";

export const SupplyChainNodeTypeSchema = z.enum([
  "repository",
  "gitlab_instance",
  "gitlab_project",
  "gitlab_runner",
  "ci_pipeline",
  "build_job",
  "artifact",
  "sbom",
  "registry",
  "container_image",
  "k8s_cluster",
  "k8s_namespace",
  "k8s_workload",
  "k8s_pod",
  "k8s_service",
  "ingress",
  "database",
  "secret",
  "external_api",
  "observability",
  "documentation",
  "human_process",
  "security_control",
  "artifact_vault"
]);

export const NodeCriticalitySchema = z.enum(["low", "medium", "high", "critical"]);

export const NodeSchema = z.object({
  id: z.string().min(1),
  type: SupplyChainNodeTypeSchema,
  name: z.string().min(1),
  criticality: NodeCriticalitySchema.default("medium"),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export type SupplyChainNode = z.infer<typeof NodeSchema>;

