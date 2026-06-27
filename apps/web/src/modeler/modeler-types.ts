import type {
  EvidencePack,
  SupplyChainEdge,
  SupplyChainNode
} from "@supply-chain-mode-lab/dreps-supplychain-schema";

export type ModelerNodeType = SupplyChainNode["type"];
export type ModelerEdgeType = SupplyChainEdge["type"];
export type ModelerCriticality = SupplyChainNode["criticality"];

export interface SupplyChainTemplate {
  id: string;
  title: string;
  category: string;
  summary: string;
  pack: EvidencePack;
}

export interface KubernetesLogImportResult {
  pack: EvidencePack;
  detectedSignals: string[];
  warnings: string[];
}

export const NODE_TYPES: ModelerNodeType[] = [
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
];

export const EDGE_TYPES: ModelerEdgeType[] = [
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
];

export const CRITICALITIES: ModelerCriticality[] = ["low", "medium", "high", "critical"];
