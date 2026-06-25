import { readFileSync } from "node:fs";

export type JsonRecord = Record<string, unknown>;

export type QueryEngineName = "doctrine-dsl" | "jmespath-lite" | "rego-policy";

export interface QueryNode extends JsonRecord {
  id: string;
  type: string;
  name?: string;
  status?: string;
  exposed?: boolean;
  critical?: boolean;
}

export interface QueryEdge extends JsonRecord {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
}

export interface QueryGraph {
  schemaVersion?: string;
  source?: string;
  nodes: QueryNode[];
  edges: QueryEdge[];
}

export interface QueryResult {
  engine: QueryEngineName;
  query: string;
  matchedNodes: QueryNode[];
  generatedAt: string;
}

export interface PolicyEvaluation {
  policyPath: string;
  query: string;
  findingId: string;
  findingTitle: string;
  findingSeverity: "low" | "medium" | "high" | "critical";
  result: QueryResult;
  finding: {
    id: string;
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    affectedNodes: string[];
    evidenceRefs: string[];
  } | null;
}

export interface JtablePayload {
  schemaVersion: "jtable.compat.v1";
  title: string;
  columns: Array<{
    key: string;
    label: string;
  }>;
  rows: Array<Record<string, string | number | boolean>>;
}

type ConditionOperator = "eq" | "neq" | "truthy";

interface Condition {
  field: string;
  operator: ConditionOperator;
  value?: string | number | boolean;
}

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

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return Boolean(value);
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
  name: string,
  extra: JsonRecord = {}
): JsonRecord {
  const node = templateAt(templates, index);

  setFirstPresentOrDefault(node, ["id"], id, "id");
  setFirstPresentOrDefault(node, ["type", "kind"], type, "type");
  setFirstPresentOrDefault(node, ["name", "label", "title"], name, "name");

  return {
    ...node,
    ...extra,
    id,
    type,
    kind: type,
    name,
    label: name,
    title: name
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
  path: string,
  extra: JsonRecord = {}
): JsonRecord {
  const evidence = templateAt(templates, index);

  setFirstPresentOrDefault(evidence, ["id"], id, "id");
  setFirstPresentOrDefault(evidence, ["type", "kind"], type, "type");
  setFirstPresentOrDefault(evidence, ["title", "label", "name"], title, "title");
  setFirstPresentOrDefault(evidence, ["path", "artifact", "uri"], path, "path");

  return {
    ...evidence,
    ...extra,
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

function parseScalar(raw: string): string | number | boolean {
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  const numeric = Number(trimmed);

  if (!Number.isNaN(numeric) && trimmed !== "") {
    return numeric;
  }

  return trimmed;
}

function scalarEquals(left: unknown, right: string | number | boolean): boolean {
  if (typeof right === "boolean") {
    return asBoolean(left) === right;
  }

  if (typeof right === "number") {
    return Number(left) === right;
  }

  return String(left) === right;
}

function parseCondition(input: string): Condition {
  const trimmed = input.trim();
  const binary = trimmed.match(/^([A-Za-z0-9_.-]+)\s*(==|=|!=)\s*(.+)$/);

  if (binary) {
    const field = binary[1]!;
    const operator = binary[2] === "!=" ? "neq" : "eq";
    const value = parseScalar(binary[3]!);

    return {
      field,
      operator,
      value
    };
  }

  return {
    field: trimmed,
    operator: "truthy"
  };
}

function fieldValue(node: QueryNode, field: string): unknown {
  return node[field];
}

function matchesCondition(node: QueryNode, condition: Condition): boolean {
  const actual = fieldValue(node, condition.field);

  if (condition.operator === "truthy") {
    return asBoolean(actual);
  }

  if (condition.operator === "eq") {
    return scalarEquals(actual, condition.value ?? "");
  }

  return !scalarEquals(actual, condition.value ?? "");
}

function entityToType(entity: string): string {
  const normalized = entity.toLowerCase();

  const map: Record<string, string> = {
    nodes: "*",
    all: "*",
    pods: "k8s_pod",
    pod: "k8s_pod",
    services: "k8s_service",
    service: "k8s_service",
    ingress: "ingress",
    ingresses: "ingress",
    databases: "database",
    database: "database",
    images: "container_image",
    image: "container_image"
  };

  return map[normalized] ?? normalized;
}

function nodeMatchesEntity(node: QueryNode, entityType: string): boolean {
  return entityType === "*" || node.type === entityType;
}

export function loadQueryGraph(path: string): QueryGraph {
  const graph = JSON.parse(readFileSync(path, "utf8")) as QueryGraph;

  if (!Array.isArray(graph.nodes)) {
    throw new Error("Query graph requires nodes");
  }

  return {
    ...graph,
    edges: Array.isArray(graph.edges) ? graph.edges : []
  };
}

export function runDoctrineDslQuery(
  graph: QueryGraph,
  query: string,
  generatedAt = "2026-06-25T00:00:00.000Z"
): QueryResult {
  const match = query.match(/^FIND\s+([A-Za-z0-9_-]+)(?:\s+WHERE\s+(.+))?$/i);

  if (!match) {
    throw new Error("Invalid Doctrine DSL query: " + query);
  }

  const entity = match[1]!;
  const where = match[2];
  const entityType = entityToType(entity);
  const conditions = where
    ? where.split(/\s+AND\s+/i).map((part) => parseCondition(part))
    : [];

  const matchedNodes = graph.nodes.filter((node) =>
    nodeMatchesEntity(node, entityType) && conditions.every((condition) => matchesCondition(node, condition))
  );

  return {
    engine: "doctrine-dsl",
    query,
    matchedNodes,
    generatedAt
  };
}

export function runJmesPathLiteQuery(
  graph: QueryGraph,
  query: string,
  generatedAt = "2026-06-25T00:00:00.000Z"
): QueryResult {
  const match = query.match(/^nodes\[\?(.+)\]$/);

  if (!match) {
    throw new Error("Unsupported JMESPath-lite query: " + query);
  }

  const body = match[1]!;
  const conditions = body
    .split(/\s+&&\s+/)
    .map((part) => part.trim())
    .map((part) => {
      const eq = part.match(/^([A-Za-z0-9_.-]+)\s*==\s*'([^']*)'$/);

      if (eq) {
        return {
          field: eq[1]!,
          operator: "eq" as const,
          value: parseScalar(eq[2]!)
        };
      }

      const neq = part.match(/^([A-Za-z0-9_.-]+)\s*!=\s*'([^']*)'$/);

      if (neq) {
        return {
          field: neq[1]!,
          operator: "neq" as const,
          value: parseScalar(neq[2]!)
        };
      }

      throw new Error("Unsupported JMESPath-lite condition: " + part);
    });

  const matchedNodes = graph.nodes.filter((node) =>
    conditions.every((condition) => matchesCondition(node, condition))
  );

  return {
    engine: "jmespath-lite",
    query,
    matchedNodes,
    generatedAt
  };
}

function extractRegoMetadata(content: string, key: string, fallback: string): string {
  const regex = new RegExp("^#\\s*doctrine-" + key + "\\s*:\\s*(.+)$", "im");
  const match = content.match(regex);

  return match?.[1]?.trim() ?? fallback;
}

export function evaluateRegoPolicy(
  graph: QueryGraph,
  policyPath: string,
  generatedAt = "2026-06-25T00:00:00.000Z"
): PolicyEvaluation {
  const content = readFileSync(policyPath, "utf8");
  const query = extractRegoMetadata(content, "query", "FIND pods WHERE exposed = true AND critical");
  const findingId = extractRegoMetadata(content, "finding-id", "policy-query-finding");
  const findingTitle = extractRegoMetadata(content, "finding-title", "Query policy matched nodes");
  const severityRaw = extractRegoMetadata(content, "finding-severity", "high").toLowerCase();
  const findingSeverity = ["low", "medium", "high", "critical"].includes(severityRaw)
    ? (severityRaw as "low" | "medium" | "high" | "critical")
    : "high";

  const result = runDoctrineDslQuery(graph, query, generatedAt);

  return {
    policyPath,
    query,
    findingId,
    findingTitle,
    findingSeverity,
    result,
    finding:
      result.matchedNodes.length > 0
        ? {
            id: findingId,
            severity: findingSeverity,
            title: findingTitle,
            affectedNodes: result.matchedNodes.map((node) => node.id),
            evidenceRefs: ["evidence_query_result", "evidence_query_policy_rego"]
          }
        : null
  };
}

export function toJtablePayload(result: QueryResult): JtablePayload {
  return {
    schemaVersion: "jtable.compat.v1",
    title: "Query Results",
    columns: [
      { key: "id", label: "Node" },
      { key: "type", label: "Type" },
      { key: "namespace", label: "Namespace" },
      { key: "status", label: "Status" },
      { key: "exposed", label: "Exposed" },
      { key: "critical", label: "Critical" }
    ],
    rows: result.matchedNodes.map((node) => ({
      id: node.id,
      type: node.type,
      namespace: asText(node.namespace),
      status: asText(node.status),
      exposed: asBoolean(node.exposed),
      critical: asBoolean(node.critical)
    }))
  };
}

export function buildQueryEvidencePack(
  baseEvidencePack: JsonRecord,
  graph: QueryGraph,
  result: QueryResult,
  policy: PolicyEvaluation,
  paths: {
    graphPath: string;
    queryResultPath: string;
    policyPath: string;
    jtablePath: string;
  }
): JsonRecord {
  const base = cloneRecord(baseEvidencePack);
  const nodeTemplates = asRecords(base.nodes);
  const edgeTemplates = asRecords(base.edges);
  const evidenceTemplates = asRecords(base.evidence);
  const findingTemplates = asRecords(base.findings);
  const remediationTemplates = asRecords(base.remediations);
  const complianceTemplates = asRecords(base.complianceImpacts);

  const graphNodes = graph.nodes.map((node, index) =>
    makeNode(
      nodeTemplates,
      index,
      node.id,
      node.type,
      node.name ?? node.id,
      {
        status: node.status,
        exposed: node.exposed,
        critical: node.critical,
        namespace: node.namespace
      }
    )
  );

  const graphEdges = graph.edges.map((edge, index) =>
    makeEdge(
      edgeTemplates,
      index,
      edge.id,
      edge.source,
      edge.target,
      edge.type as DrepsEdgeType,
      edge.label ?? edge.type
    )
  );

  const nodes = [
    ...graphNodes,
    makeNode(nodeTemplates, 100, "query_result", "artifact", "Query result", {
      engine: result.engine,
      query: result.query,
      matchedNodes: result.matchedNodes.map((node) => node.id)
    }),
    makeNode(nodeTemplates, 101, "query_policy", "security_control", "Query policy", {
      policyPath: policy.policyPath,
      findingId: policy.findingId
    })
  ];

  const resultEdges = result.matchedNodes.map((node, index) =>
    makeEdge(
      edgeTemplates,
      100 + index,
      "edge_query_result_" + node.id,
      "query_result",
      node.id,
      "documents",
      "query result contains matched node"
    )
  );

  const edges = [
    ...graphEdges,
    makeEdge(edgeTemplates, 200, "edge_policy_query_result", "query_policy", "query_result", "verifies", "policy evaluates query result"),
    ...resultEdges
  ];

  const evidence = [
    makeEvidence(evidenceTemplates, 0, "evidence_query_graph", "configuration", "Query graph input", paths.graphPath, {
      nodeCount: graph.nodes.length
    }),
    makeEvidence(evidenceTemplates, 1, "evidence_query_result", "scan_result", "Query result output", paths.queryResultPath, {
      engine: result.engine,
      matchedNodeCount: result.matchedNodes.length
    }),
    makeEvidence(evidenceTemplates, 2, "evidence_query_policy_rego", "source_file", "OPA/Rego policy source", paths.policyPath, {
      policyEngine: "rego-policy"
    }),
    makeEvidence(evidenceTemplates, 3, "evidence_query_jtable_view", "configuration", "jtable query result view", paths.jtablePath, {
      renderer: "jtable.compat.v1"
    })
  ];

  const findings = policy.finding
    ? [
        makeFinding(
          findingTemplates,
          0,
          policy.finding.id,
          policy.finding.severity,
          policy.finding.title,
          policy.finding.affectedNodes,
          policy.finding.evidenceRefs,
          "open"
        )
      ]
    : [];

  const remediations = policy.finding
    ? [
        makeRemediation(
          remediationTemplates,
          0,
          "remediate-" + policy.finding.id,
          policy.finding.id,
          "Review matched graph nodes and remove exposure or downgrade criticality where appropriate.",
          policy.finding.affectedNodes,
          policy.finding.evidenceRefs
        )
      ]
    : [];

  const complianceImpacts = policy.finding
    ? [
        makeComplianceImpact(
          complianceTemplates,
          0,
          "query-engine-impact-slsa",
          "SLSA",
          "POLICY_AS_CODE_QUERY_GATE",
          "high",
          [policy.finding.id]
        ),
        makeComplianceImpact(
          complianceTemplates,
          1,
          "query-engine-impact-iso27001",
          "ISO27001",
          "CONTINUOUS_CONTROL_MONITORING",
          "high",
          [policy.finding.id]
        )
      ]
    : [];

  return {
    ...base,
    packId: "query-engine-dreps-evidence-pack",
    nodes,
    edges,
    evidence,
    findings,
    remediations,
    complianceImpacts,
    metadata: {
      ...asRecord(base.metadata),
      adapter: "dreps-query-engine",
      source: graph.source ?? "query-engine-fixture",
      query: result.query,
      engine: result.engine,
      generatedAt: result.generatedAt
    }
  };
}

export function assertQueryEvidencePackShape(evidencePack: JsonRecord): void {
  const nodes = asRecords(evidencePack.nodes);
  const evidence = asRecords(evidencePack.evidence);
  const findings = asRecords(evidencePack.findings);

  const nodeIds = new Set(nodes.map((node) => asText(node.id)));
  const evidenceIds = new Set(evidence.map((item) => asText(item.id)));
  const findingIds = new Set(findings.map((item) => asText(item.id)));

  for (const requiredNode of ["pod_checkout", "query_result", "query_policy"]) {
    if (!nodeIds.has(requiredNode)) {
      throw new Error("Missing query engine node: " + requiredNode);
    }
  }

  for (const requiredEvidence of [
    "evidence_query_graph",
    "evidence_query_result",
    "evidence_query_policy_rego",
    "evidence_query_jtable_view"
  ]) {
    if (!evidenceIds.has(requiredEvidence)) {
      throw new Error("Missing query engine evidence: " + requiredEvidence);
    }
  }

  if (!findingIds.has("policy-critical-exposed-pod")) {
    throw new Error("Missing policy-generated query finding");
  }

  const finding = findings.find((item) => asText(item.id) === "policy-critical-exposed-pod");
  const affectedNodes = Array.isArray(finding?.affectedNodes)
    ? finding.affectedNodes.map((item) => asText(item))
    : [];

  if (!affectedNodes.includes("pod_checkout")) {
    throw new Error("Policy finding is not linked to pod_checkout");
  }
}
