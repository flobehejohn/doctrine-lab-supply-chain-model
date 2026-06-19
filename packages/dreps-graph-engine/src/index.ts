import type {
  ComplianceImpact,
  Evidence,
  EvidencePack,
  Finding,
  Remediation,
  SupplyChainEdge,
  SupplyChainNode
} from "../../dreps-supplychain-schema/src/index.js";

export type GraphIntegrityIssueKind =
  | "duplicate_node_id"
  | "duplicate_edge_id"
  | "duplicate_evidence_id"
  | "duplicate_finding_id"
  | "missing_edge_source"
  | "missing_edge_target"
  | "missing_finding_node"
  | "missing_finding_evidence"
  | "missing_remediation_finding"
  | "missing_remediation_node";

export interface GraphIntegrityIssue {
  kind: GraphIntegrityIssueKind;
  refId: string;
  message: string;
}

export interface GraphIntegrityResult {
  valid: boolean;
  issues: GraphIntegrityIssue[];
}

export interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  evidenceCount: number;
  findingCount: number;
  remediationCount: number;
  complianceImpactCount: number;
  criticalNodeCount: number;
  openFindingCount: number;
  severityCounts: Record<string, number>;
}

export interface SupplyChainGraph {
  packId: string;
  nodes: SupplyChainNode[];
  edges: SupplyChainEdge[];
  evidence: Evidence[];
  findings: Finding[];
  remediations: Remediation[];
  complianceImpacts: ComplianceImpact[];
  nodeById: Map<string, SupplyChainNode>;
  edgeById: Map<string, SupplyChainEdge>;
  evidenceById: Map<string, Evidence>;
  findingById: Map<string, Finding>;
  remediationById: Map<string, Remediation>;
  incomingEdgesByNodeId: Map<string, SupplyChainEdge[]>;
  outgoingEdgesByNodeId: Map<string, SupplyChainEdge[]>;
  findingsByNodeId: Map<string, Finding[]>;
  remediationsByFindingId: Map<string, Remediation[]>;
}

function pushToMapList<TKey, TValue>(
  map: Map<TKey, TValue[]>,
  key: TKey,
  value: TValue
): void {
  const existing = map.get(key);

  if (existing) {
    existing.push(value);
    return;
  }

  map.set(key, [value]);
}

export function buildGraph(pack: EvidencePack): SupplyChainGraph {
  const nodeById = new Map<string, SupplyChainNode>();
  const edgeById = new Map<string, SupplyChainEdge>();
  const evidenceById = new Map<string, Evidence>();
  const findingById = new Map<string, Finding>();
  const remediationById = new Map<string, Remediation>();
  const incomingEdgesByNodeId = new Map<string, SupplyChainEdge[]>();
  const outgoingEdgesByNodeId = new Map<string, SupplyChainEdge[]>();
  const findingsByNodeId = new Map<string, Finding[]>();
  const remediationsByFindingId = new Map<string, Remediation[]>();

  for (const node of pack.nodes) {
    nodeById.set(node.id, node);
  }

  for (const edge of pack.edges) {
    edgeById.set(edge.id, edge);
    pushToMapList(outgoingEdgesByNodeId, edge.source, edge);
    pushToMapList(incomingEdgesByNodeId, edge.target, edge);
  }

  for (const evidence of pack.evidence) {
    evidenceById.set(evidence.id, evidence);
  }

  for (const finding of pack.findings) {
    findingById.set(finding.id, finding);

    for (const affectedNode of finding.affectedNodes) {
      pushToMapList(findingsByNodeId, affectedNode, finding);
    }
  }

  for (const remediation of pack.remediations) {
    remediationById.set(remediation.id, remediation);
    pushToMapList(remediationsByFindingId, remediation.findingId, remediation);
  }

  return {
    packId: pack.packId,
    nodes: pack.nodes,
    edges: pack.edges,
    evidence: pack.evidence,
    findings: pack.findings,
    remediations: pack.remediations,
    complianceImpacts: pack.complianceImpacts,
    nodeById,
    edgeById,
    evidenceById,
    findingById,
    remediationById,
    incomingEdgesByNodeId,
    outgoingEdgesByNodeId,
    findingsByNodeId,
    remediationsByFindingId
  };
}

export function buildGraphMetrics(graph: SupplyChainGraph): GraphMetrics {
  const severityCounts: Record<string, number> = {};

  for (const finding of graph.findings) {
    severityCounts[finding.severity] = (severityCounts[finding.severity] ?? 0) + 1;
  }

  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    evidenceCount: graph.evidence.length,
    findingCount: graph.findings.length,
    remediationCount: graph.remediations.length,
    complianceImpactCount: graph.complianceImpacts.length,
    criticalNodeCount: graph.nodes.filter((node) => node.criticality === "critical").length,
    openFindingCount: graph.findings.filter((finding) => finding.status === "open").length,
    severityCounts
  };
}

function findDuplicateIds<T extends { id: string }>(items: T[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const item of items) {
    if (seen.has(item.id)) {
      duplicates.add(item.id);
    }

    seen.add(item.id);
  }

  return [...duplicates];
}

export function validateGraphIntegrity(graph: SupplyChainGraph): GraphIntegrityResult {
  const issues: GraphIntegrityIssue[] = [];

  for (const duplicateNodeId of findDuplicateIds(graph.nodes)) {
    issues.push({
      kind: "duplicate_node_id",
      refId: duplicateNodeId,
      message: "Duplicate node id: " + duplicateNodeId
    });
  }

  for (const duplicateEdgeId of findDuplicateIds(graph.edges)) {
    issues.push({
      kind: "duplicate_edge_id",
      refId: duplicateEdgeId,
      message: "Duplicate edge id: " + duplicateEdgeId
    });
  }

  for (const duplicateEvidenceId of findDuplicateIds(graph.evidence)) {
    issues.push({
      kind: "duplicate_evidence_id",
      refId: duplicateEvidenceId,
      message: "Duplicate evidence id: " + duplicateEvidenceId
    });
  }

  for (const duplicateFindingId of findDuplicateIds(graph.findings)) {
    issues.push({
      kind: "duplicate_finding_id",
      refId: duplicateFindingId,
      message: "Duplicate finding id: " + duplicateFindingId
    });
  }

  for (const edge of graph.edges) {
    if (!graph.nodeById.has(edge.source)) {
      issues.push({
        kind: "missing_edge_source",
        refId: edge.id,
        message: "Edge references a missing source node: " + edge.source
      });
    }

    if (!graph.nodeById.has(edge.target)) {
      issues.push({
        kind: "missing_edge_target",
        refId: edge.id,
        message: "Edge references a missing target node: " + edge.target
      });
    }
  }

  for (const finding of graph.findings) {
    for (const affectedNode of finding.affectedNodes) {
      if (!graph.nodeById.has(affectedNode)) {
        issues.push({
          kind: "missing_finding_node",
          refId: finding.id,
          message: "Finding references a missing node: " + affectedNode
        });
      }
    }

    for (const evidenceRef of finding.evidenceRefs) {
      if (!graph.evidenceById.has(evidenceRef)) {
        issues.push({
          kind: "missing_finding_evidence",
          refId: finding.id,
          message: "Finding references a missing evidence: " + evidenceRef
        });
      }
    }
  }

  for (const remediation of graph.remediations) {
    if (!graph.findingById.has(remediation.findingId)) {
      issues.push({
        kind: "missing_remediation_finding",
        refId: remediation.id,
        message: "Remediation references a missing finding: " + remediation.findingId
      });
    }

    for (const affectedNode of remediation.affectedNodes) {
      if (!graph.nodeById.has(affectedNode)) {
        issues.push({
          kind: "missing_remediation_node",
          refId: remediation.id,
          message: "Remediation references a missing node: " + affectedNode
        });
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

export function findNodeById(
  graph: SupplyChainGraph,
  nodeId: string
): SupplyChainNode | undefined {
  return graph.nodeById.get(nodeId);
}

export function findIncomingEdges(
  graph: SupplyChainGraph,
  nodeId: string
): SupplyChainEdge[] {
  return [...(graph.incomingEdgesByNodeId.get(nodeId) ?? [])];
}

export function findOutgoingEdges(
  graph: SupplyChainGraph,
  nodeId: string
): SupplyChainEdge[] {
  return [...(graph.outgoingEdgesByNodeId.get(nodeId) ?? [])];
}

export function findFindingsForNode(
  graph: SupplyChainGraph,
  nodeId: string
): Finding[] {
  return [...(graph.findingsByNodeId.get(nodeId) ?? [])];
}

export function findRemediationsForFinding(
  graph: SupplyChainGraph,
  findingId: string
): Remediation[] {
  return [...(graph.remediationsByFindingId.get(findingId) ?? [])];
}

