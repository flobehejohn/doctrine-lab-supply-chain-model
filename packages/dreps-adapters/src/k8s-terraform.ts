import { readFileSync } from "node:fs";

export type JsonRecord = Record<string, unknown>;

export interface K8sImportResult {
  sourcePath: string;
  clusterName: string;
  namespace: string;
  workloadName: string;
  podName: string;
  serviceName: string;
  ingressName: string;
  image: string;
  secretName: string;
  configMapName: string;
}

export interface TerraformImportResult {
  planPath: string;
  statePath: string;
  databaseName: string;
  databaseEngine: string;
  databaseAddress: string;
  cloudResourceName: string;
  resourceCount: number;
}

export const RuntimeNodeIds = [
  "container_image",
  "k8s_cluster",
  "k8s_namespace",
  "k8s_workload",
  "k8s_pod",
  "k8s_service",
  "ingress",
  "database",
  "secret",
  "configmap",
  "cloud_resource"
] as const;

type DrepsEdgeType =
  | "contains"
  | "triggers"
  | "runs"
  | "runs_on"
  | "builds"
  | "publishes"
  | "deploys"
  | "routes_to"
  | "exposes"
  | "connects_to"
  | "reads_from"
  | "writes_to"
  | "depends_on"
  | "documents"
  | "affects"
  | "mitigates"
  | "owned_by"
  | "stores"
  | "verifies"
  | "signs";

type DrepsEvidenceType =
  | "source_file"
  | "ci_workflow"
  | "scan_result"
  | "sbom"
  | "runtime_observation"
  | "configuration"
  | "certificate"
  | "manual_attestation"
  | "audit_log";

type DrepsFindingStatus = "open" | "accepted" | "mitigated" | "resolved";
type DrepsComplianceFramework =
  | "SLSA"
  | "DORA"
  | "NIS2"
  | "ISO27001"
  | "CIS_KUBERNETES"
  | "OWASP_ASVS"
  | "OWASP_SAMM";
type DrepsComplianceImpact = "none" | "low" | "medium" | "high" | "critical";

function cloneRecord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function asRecord(value: unknown): JsonRecord {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  return {};
}

function asRecords(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asRecord(item))
    .filter((item) => Object.keys(item).length > 0);
}

function asText(value: unknown, fallback = ""): string {
  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value);
}

function templateAt(records: JsonRecord[], index: number): JsonRecord {
  if (records.length === 0) {
    return {};
  }

  return cloneRecord(records[index % records.length]!);
}

function setFirstPresentOrDefault(
  record: JsonRecord,
  keys: string[],
  value: unknown,
  defaultKey: string
): void {
  let updated = false;

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      record[key] = value;
      updated = true;
    }
  }

  if (!updated) {
    record[defaultKey] = value;
  }
}

function makeNode(
  templates: JsonRecord[],
  index: number,
  id: string,
  type: string,
  label: string,
  extra: JsonRecord = {}
): JsonRecord {
  const node = templateAt(templates, index);

  setFirstPresentOrDefault(node, ["id"], id, "id");
  setFirstPresentOrDefault(node, ["type", "kind"], type, "type");
  setFirstPresentOrDefault(node, ["label", "name", "title"], label, "label");

  return {
    ...node,
    ...extra,
    id,
    type,
    kind: type,
    label
  };
}

function makeEdge(
  templates: JsonRecord[],
  index: number,
  id: string,
  source: string,
  target: string,
  type: DrepsEdgeType,
  label: string
): JsonRecord {
  const edge = templateAt(templates, index);

  setFirstPresentOrDefault(edge, ["id"], id, "id");
  setFirstPresentOrDefault(edge, ["source", "from", "sourceNodeId", "sourceId"], source, "source");
  setFirstPresentOrDefault(edge, ["target", "to", "targetNodeId", "targetId"], target, "target");
  setFirstPresentOrDefault(edge, ["type", "kind"], type, "type");
  setFirstPresentOrDefault(edge, ["label", "title"], label, "label");

  return {
    ...edge,
    id,
    source,
    target,
    type,
    kind: type,
    label
  };
}

function makeEvidence(
  templates: JsonRecord[],
  index: number,
  id: string,
  type: DrepsEvidenceType,
  title: string,
  path: string
): JsonRecord {
  const evidence = templateAt(templates, index);

  setFirstPresentOrDefault(evidence, ["id"], id, "id");
  setFirstPresentOrDefault(evidence, ["type", "kind"], type, "type");
  setFirstPresentOrDefault(evidence, ["title", "label", "name"], title, "title");
  setFirstPresentOrDefault(evidence, ["path", "artifact", "uri"], path, "path");

  return {
    ...evidence,
    id,
    type,
    kind: type,
    title,
    path
  };
}

function makeFinding(
  templates: JsonRecord[],
  index: number,
  id: string,
  severity: string,
  title: string,
  affectedNodes: string[],
  evidenceRefs: string[],
  status: DrepsFindingStatus
): JsonRecord {
  const finding = templateAt(templates, index);

  setFirstPresentOrDefault(finding, ["id"], id, "id");
  setFirstPresentOrDefault(finding, ["severity", "risk"], severity, "severity");
  setFirstPresentOrDefault(finding, ["title", "label", "name"], title, "title");
  setFirstPresentOrDefault(finding, ["status"], status, "status");
  setFirstPresentOrDefault(finding, ["affectedNodes", "affectedNodeIds"], affectedNodes, "affectedNodes");
  setFirstPresentOrDefault(finding, ["evidenceRefs", "evidenceIds"], evidenceRefs, "evidenceRefs");

  return {
    ...finding,
    id,
    severity,
    title,
    status,
    affectedNodes,
    evidenceRefs
  };
}

function makeRemediation(
  templates: JsonRecord[],
  index: number,
  id: string,
  findingId: string,
  strategy: string,
  affectedNodes: string[],
  evidenceRefs: string[]
): JsonRecord {
  const remediation = templateAt(templates, index);

  setFirstPresentOrDefault(remediation, ["id"], id, "id");
  setFirstPresentOrDefault(remediation, ["findingId", "findingRef"], findingId, "findingId");
  setFirstPresentOrDefault(remediation, ["strategy", "title", "description"], strategy, "strategy");
  setFirstPresentOrDefault(remediation, ["affectedNodes", "affectedNodeIds"], affectedNodes, "affectedNodes");
  setFirstPresentOrDefault(remediation, ["evidenceRefs", "evidenceIds"], evidenceRefs, "evidenceRefs");

  return {
    ...remediation,
    id,
    findingId,
    strategy,
    affectedNodes,
    evidenceRefs
  };
}

function makeComplianceImpact(
  templates: JsonRecord[],
  index: number,
  id: string,
  framework: DrepsComplianceFramework,
  control: string,
  impact: DrepsComplianceImpact,
  findingRefs: string[]
): JsonRecord {
  const compliance = templateAt(templates, index);

  setFirstPresentOrDefault(compliance, ["id"], id, "id");
  setFirstPresentOrDefault(compliance, ["framework"], framework, "framework");
  setFirstPresentOrDefault(compliance, ["control"], control, "control");
  setFirstPresentOrDefault(compliance, ["impact"], impact, "impact");
  setFirstPresentOrDefault(compliance, ["findingRefs", "findings"], findingRefs, "findingRefs");

  return {
    ...compliance,
    id,
    framework,
    control,
    impact,
    findingRefs
  };
}

function findDocument(yaml: string, kind: string): string {
  const docs = yaml.split(/^---\s*$/gm);
  return docs.find((doc) => new RegExp("kind:\\s*" + kind + "\\b").test(doc)) ?? "";
}

function firstMatch(content: string, pattern: RegExp, fallback: string): string {
  const match = content.match(pattern);
  return match?.[1]?.trim() ?? fallback;
}

export function importK8sFullYaml(path: string): K8sImportResult {
  const yaml = readFileSync(path, "utf8");
  const namespaceDoc = findDocument(yaml, "Namespace");
  const configMapDoc = findDocument(yaml, "ConfigMap");
  const secretDoc = findDocument(yaml, "Secret");
  const deploymentDoc = findDocument(yaml, "Deployment");
  const serviceDoc = findDocument(yaml, "Service");
  const ingressDoc = findDocument(yaml, "Ingress");

  const namespace = firstMatch(namespaceDoc, /metadata:\s*\n\s*name:\s*([^\n]+)/, "default");
  const workloadName = firstMatch(deploymentDoc, /metadata:\s*\n\s*name:\s*([^\n]+)/, "workload");
  const image = firstMatch(deploymentDoc, /image:\s*([^\n]+)/, "unknown:local");
  const serviceName = firstMatch(serviceDoc, /metadata:\s*\n\s*name:\s*([^\n]+)/, workloadName);
  const ingressName = firstMatch(ingressDoc, /metadata:\s*\n\s*name:\s*([^\n]+)/, workloadName);
  const secretName = firstMatch(secretDoc, /metadata:\s*\n\s*name:\s*([^\n]+)/, "secret");
  const configMapName = firstMatch(configMapDoc, /metadata:\s*\n\s*name:\s*([^\n]+)/, "configmap");

  return {
    sourcePath: path,
    clusterName: "local-kind-cluster",
    namespace,
    workloadName,
    podName: workloadName + "-pod-template",
    serviceName,
    ingressName,
    image,
    secretName,
    configMapName
  };
}

export function importTerraformFiles(planPath: string, statePath: string): TerraformImportResult {
  const plan = JSON.parse(readFileSync(planPath, "utf8")) as {
    planned_values?: {
      root_module?: {
        resources?: Array<{
          type?: string;
          name?: string;
          values?: Record<string, unknown>;
        }>;
      };
    };
  };

  const state = JSON.parse(readFileSync(statePath, "utf8")) as {
    resources?: Array<{
      type?: string;
      name?: string;
      instances?: Array<{
        attributes?: Record<string, unknown>;
      }>;
    }>;
  };

  const plannedResources = plan.planned_values?.root_module?.resources ?? [];
  const stateResources = state.resources ?? [];
  const dbPlan = plannedResources.find((resource) => resource.type === "aws_db_instance");
  const dbState = stateResources.find((resource) => resource.type === "aws_db_instance");
  const dbAttributes = dbState?.instances?.[0]?.attributes ?? {};

  return {
    planPath,
    statePath,
    databaseName: asText(dbPlan?.values?.identifier ?? dbAttributes.identifier, "runtime-database"),
    databaseEngine: asText(dbPlan?.values?.engine ?? dbAttributes.engine, "postgres"),
    databaseAddress: asText(dbAttributes.address, "database.local"),
    cloudResourceName: "terraform-managed-runtime",
    resourceCount: plannedResources.length + stateResources.length
  };
}

export function buildRuntimeEvidencePack(
  k8s: K8sImportResult,
  terraform: TerraformImportResult,
  baseEvidencePack: JsonRecord
): JsonRecord {
  const base = cloneRecord(baseEvidencePack);
  const nodeTemplates = asRecords(base.nodes);
  const edgeTemplates = asRecords(base.edges);
  const evidenceTemplates = asRecords(base.evidence);
  const findingTemplates = asRecords(base.findings);
  const remediationTemplates = asRecords(base.remediations);
  const complianceTemplates = asRecords(base.complianceImpacts);

  const nodes = [
    makeNode(nodeTemplates, 0, "container_image", "container_image", k8s.image, {
      image: k8s.image,
      inferredFromRuntime: true,
      signed: false
    }),
    makeNode(nodeTemplates, 1, "k8s_cluster", "k8s_cluster", k8s.clusterName),
    makeNode(nodeTemplates, 2, "k8s_namespace", "k8s_namespace", k8s.namespace),
    makeNode(nodeTemplates, 3, "k8s_workload", "k8s_workload", k8s.workloadName),
    makeNode(nodeTemplates, 4, "k8s_pod", "k8s_pod", k8s.podName),
    makeNode(nodeTemplates, 5, "k8s_service", "k8s_service", k8s.serviceName),
    makeNode(nodeTemplates, 6, "ingress", "ingress", k8s.ingressName),
    makeNode(nodeTemplates, 7, "database", "database", terraform.databaseName, {
      engine: terraform.databaseEngine,
      address: terraform.databaseAddress
    }),
    makeNode(nodeTemplates, 8, "secret", "secret", k8s.secretName),
    makeNode(nodeTemplates, 9, "configmap", "artifact", k8s.configMapName, {
      kubernetesKind: "ConfigMap"
    }),
    makeNode(nodeTemplates, 10, "cloud_resource", "artifact", terraform.cloudResourceName, {
      resourceCount: terraform.resourceCount
    })
  ];

  const edges = [
    makeEdge(edgeTemplates, 0, "edge_image_workload", "container_image", "k8s_workload", "deploys", "image deployed as workload"),
    makeEdge(edgeTemplates, 1, "edge_cluster_namespace", "k8s_cluster", "k8s_namespace", "contains", "cluster contains namespace"),
    makeEdge(edgeTemplates, 2, "edge_namespace_workload", "k8s_namespace", "k8s_workload", "contains", "namespace contains workload"),
    makeEdge(edgeTemplates, 3, "edge_workload_pod", "k8s_workload", "k8s_pod", "runs", "workload creates pod"),
    makeEdge(edgeTemplates, 4, "edge_pod_service", "k8s_pod", "k8s_service", "routes_to", "pod selected by service"),
    makeEdge(edgeTemplates, 5, "edge_service_ingress", "k8s_service", "ingress", "exposes", "service exposed by ingress"),
    makeEdge(edgeTemplates, 6, "edge_ingress_database", "ingress", "database", "connects_to", "runtime path reaches database"),
    makeEdge(edgeTemplates, 7, "edge_workload_secret", "k8s_workload", "secret", "reads_from", "workload reads secret"),
    makeEdge(edgeTemplates, 8, "edge_workload_configmap", "k8s_workload", "configmap", "reads_from", "workload reads configmap"),
    makeEdge(edgeTemplates, 9, "edge_cloud_database", "cloud_resource", "database", "contains", "cloud resource contains database"),
    makeEdge(edgeTemplates, 10, "edge_terraform_cloud", "cloud_resource", "k8s_cluster", "documents", "terraform documents runtime cloud context")
  ];

  const evidence = [
    makeEvidence(evidenceTemplates, 0, "evidence_k8s_full_yaml", "configuration", "Kubernetes full manifest", k8s.sourcePath),
    makeEvidence(evidenceTemplates, 1, "evidence_terraform_plan", "configuration", "Terraform plan", terraform.planPath),
    makeEvidence(evidenceTemplates, 2, "evidence_terraform_state", "configuration", "Terraform state", terraform.statePath),
    makeEvidence(evidenceTemplates, 3, "evidence_runtime_graph", "runtime_observation", "Runtime graph inference", ".doctrine/out/runtime/runtime-graph.mmd")
  ];

  const findings = [
    makeFinding(
      findingTemplates,
      0,
      "runtime-image-unsigned",
      "high",
      "Runtime workload uses an image without signing evidence",
      ["container_image", "k8s_workload"],
      ["evidence_k8s_full_yaml"],
      "open"
    ),
    makeFinding(
      findingTemplates,
      1,
      "runtime-secret-mounted",
      "medium",
      "Workload references a Kubernetes Secret",
      ["k8s_workload", "secret"],
      ["evidence_k8s_full_yaml"],
      "accepted"
    ),
    makeFinding(
      findingTemplates,
      2,
      "runtime-ingress-to-database-path",
      "medium",
      "Runtime graph exposes an ingress path connected to the database dependency",
      ["ingress", "database"],
      ["evidence_k8s_full_yaml", "evidence_terraform_state"],
      "accepted"
    )
  ];

  const remediations = [
    makeRemediation(
      remediationTemplates,
      0,
      "remediate-runtime-image-unsigned",
      "runtime-image-unsigned",
      "Add image signature verification and attach signature evidence.",
      ["container_image", "k8s_workload"],
      ["evidence_k8s_full_yaml"]
    ),
    makeRemediation(
      remediationTemplates,
      1,
      "remediate-runtime-secret-mounted",
      "runtime-secret-mounted",
      "Document secret usage, scope access and rotate sensitive values.",
      ["k8s_workload", "secret"],
      ["evidence_k8s_full_yaml"]
    )
  ];

  const complianceImpacts = [
    makeComplianceImpact(
      complianceTemplates,
      0,
      "runtime-impact-k8s-hardening",
      "CIS_KUBERNETES",
      "RUNTIME_HARDENING",
      "high",
      ["runtime-image-unsigned", "runtime-secret-mounted"]
    ),
    makeComplianceImpact(
      complianceTemplates,
      1,
      "runtime-impact-slsa-provenance",
      "SLSA",
      "IMAGE_TO_RUNTIME_TRACEABILITY",
      "high",
      ["runtime-image-unsigned"]
    )
  ];

  return {
    ...base,
    packId: "runtime-k8s-terraform-dreps-evidence-pack",
    nodes,
    edges,
    evidence,
    findings,
    remediations,
    complianceImpacts,
    metadata: {
      ...asRecord(base.metadata),
      adapter: "dreps-runtime-k8s-terraform-adapters",
      source: "runtime-fixture",
      graph: "image -> workload -> pod -> service -> ingress -> database"
    }
  };
}

export function renderRuntimeGraphMermaid(evidencePack: JsonRecord): string {
  const edges = asRecords(evidencePack.edges);
  const nodes = asRecords(evidencePack.nodes);
  const lines = ["flowchart LR"];

  for (const node of nodes) {
    const id = asText(node.id).replace(/[^A-Za-z0-9_]/g, "_");
    const label = asText(node.label, asText(node.id)).replace(/"/g, "'");
    lines.push("  " + id + '["' + label + '"]');
  }

  for (const edge of edges) {
    const source = asText(edge.source ?? edge.from ?? edge.sourceNodeId ?? edge.sourceId).replace(/[^A-Za-z0-9_]/g, "_");
    const target = asText(edge.target ?? edge.to ?? edge.targetNodeId ?? edge.targetId).replace(/[^A-Za-z0-9_]/g, "_");

    if (source && target) {
      lines.push("  " + source + " --> " + target);
    }
  }

  lines.push("");
  return lines.join("\n");
}

export function assertRuntimeEvidencePackShape(evidencePack: JsonRecord): void {
  const nodes = asRecords(evidencePack.nodes);
  const edges = asRecords(evidencePack.edges);

  const nodeIds = new Set(nodes.map((node) => asText(node.id)));

  for (const nodeId of RuntimeNodeIds) {
    if (!nodeIds.has(nodeId)) {
      throw new Error("Missing runtime node: " + nodeId);
    }
  }

  const requiredEdges = [
    ["container_image", "k8s_workload"],
    ["k8s_workload", "k8s_pod"],
    ["k8s_pod", "k8s_service"],
    ["k8s_service", "ingress"],
    ["ingress", "database"]
  ];

  for (const [source, target] of requiredEdges) {
    const found = edges.some((edge) => {
      const edgeSource = asText(edge.source ?? edge.from ?? edge.sourceNodeId ?? edge.sourceId);
      const edgeTarget = asText(edge.target ?? edge.to ?? edge.targetNodeId ?? edge.targetId);

      return edgeSource === source && edgeTarget === target;
    });

    if (!found) {
      throw new Error("Missing runtime graph edge: " + source + " -> " + target);
    }
  }
}
