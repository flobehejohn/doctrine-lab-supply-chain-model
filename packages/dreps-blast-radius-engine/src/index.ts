import { readFileSync } from "node:fs";

export type JsonRecord = Record<string, unknown>;

export interface BlastNode extends JsonRecord {
  id: string;
  type: string;
  name?: string;
  critical?: boolean;
  sensitiveData?: boolean;
  riskWeight?: number;
  dataClassification?: string;
  tags?: string[];
}

export interface BlastEdge extends JsonRecord {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
  weight?: number;
}

export interface ControlBlock {
  id: string;
  name: string;
  wouldBlockEdgeTypes?: string[];
  wouldBlockNodes?: string[];
}

export interface BlastRadiusInput {
  schemaVersion?: string;
  scenario: string;
  startNode: string;
  maxDepth: number;
  edgeWeights: Record<string, number>;
  controlBlocks: ControlBlock[];
  nodes: BlastNode[];
  edges: BlastEdge[];
}

export interface PropagationPath {
  id: string;
  nodeIds: string[];
  edgeIds: string[];
  depth: number;
  pathScore: number;
  reachesCriticalNode: boolean;
  reachesSensitiveData: boolean;
}

export interface BlastRadiusReport {
  schemaVersion: "dreps-blast-radius-report.v1";
  generatedAt: string;
  scenario: string;
  startNode: string;
  maxDepth: number;
  reachableNodes: BlastNode[];
  reachableEdges: BlastEdge[];
  topPropagationPaths: PropagationPath[];
  criticalNodes: BlastNode[];
  sensitiveDataNodes: BlastNode[];
  blastRadiusScore: number;
  controlsThatWouldBlock: Array<{
    controlId: string;
    controlName: string;
    blockedNodeIds: string[];
    blockedEdgeIds: string[];
  }>;
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

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
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

function asNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function outgoingEdges(edges: BlastEdge[], source: string): BlastEdge[] {
  return edges.filter((edge) => edge.source === source);
}

function edgeWeight(input: BlastRadiusInput, edge: BlastEdge): number {
  if (typeof edge.weight === "number") {
    return edge.weight;
  }

  return input.edgeWeights[edge.type] ?? 0.5;
}

function pathScore(input: BlastRadiusInput, nodesById: Map<string, BlastNode>, edgeIds: string[], nodeIds: string[]): number {
  const edgesById = byId(input.edges);
  const edgeComponent = edgeIds.reduce((score, edgeId) => {
    const edge = edgesById.get(edgeId);
    return edge ? score * edgeWeight(input, edge) : score;
  }, 1);

  const nodeComponent = nodeIds.reduce((score, nodeId) => {
    const node = nodesById.get(nodeId);
    return score + asNumber(node?.riskWeight, 1);
  }, 0);

  return Math.round((edgeComponent * 40 + nodeComponent * 6) * 100) / 100;
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }

  return result;
}

function pathId(nodeIds: string[]): string {
  return "path:" + nodeIds.join(">");
}

export function loadBlastRadiusInput(path: string): BlastRadiusInput {
  const input = readJsonFile<BlastRadiusInput>(path);

  if (!input.startNode) {
    throw new Error("Blast radius input requires startNode");
  }

  if (!Array.isArray(input.nodes)) {
    throw new Error("Blast radius input requires nodes");
  }

  if (!Array.isArray(input.edges)) {
    throw new Error("Blast radius input requires edges");
  }

  return {
    ...input,
    maxDepth: input.maxDepth ?? 5,
    edgeWeights: input.edgeWeights ?? {},
    controlBlocks: Array.isArray(input.controlBlocks) ? input.controlBlocks : []
  };
}

export function calculateBlastRadius(
  input: BlastRadiusInput,
  generatedAt = "2026-06-25T00:00:00.000Z"
): BlastRadiusReport {
  const nodesById = byId(input.nodes);
  const start = nodesById.get(input.startNode);

  if (!start) {
    throw new Error("Unknown startNode: " + input.startNode);
  }

  const paths: PropagationPath[] = [];
  const reachableNodeIds = new Set<string>([input.startNode]);
  const reachableEdgeIds = new Set<string>();

  type QueueItem = {
    nodeId: string;
    nodeIds: string[];
    edgeIds: string[];
    depth: number;
  };

  const queue: QueueItem[] = [
    {
      nodeId: input.startNode,
      nodeIds: [input.startNode],
      edgeIds: [],
      depth: 0
    }
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    const nodeObjects = current.nodeIds
      .map((nodeId) => nodesById.get(nodeId))
      .filter((node): node is BlastNode => Boolean(node));

    paths.push({
      id: pathId(current.nodeIds),
      nodeIds: current.nodeIds,
      edgeIds: current.edgeIds,
      depth: current.depth,
      pathScore: pathScore(input, nodesById, current.edgeIds, current.nodeIds),
      reachesCriticalNode: nodeObjects.some((node) => asBoolean(node.critical)),
      reachesSensitiveData: nodeObjects.some((node) => asBoolean(node.sensitiveData))
    });

    if (current.depth >= input.maxDepth) {
      continue;
    }

    for (const edge of outgoingEdges(input.edges, current.nodeId)) {
      if (current.nodeIds.includes(edge.target)) {
        continue;
      }

      reachableEdgeIds.add(edge.id);
      reachableNodeIds.add(edge.target);

      queue.push({
        nodeId: edge.target,
        nodeIds: [...current.nodeIds, edge.target],
        edgeIds: [...current.edgeIds, edge.id],
        depth: current.depth + 1
      });
    }
  }

  const reachableNodes = input.nodes.filter((node) => reachableNodeIds.has(node.id));
  const reachableEdges = input.edges.filter((edge) => reachableEdgeIds.has(edge.id));

  const topPropagationPaths = paths
    .filter((path) => path.edgeIds.length > 0)
    .sort((left, right) => right.pathScore - left.pathScore)
    .slice(0, 8);

  const criticalNodes = reachableNodes.filter((node) => asBoolean(node.critical));
  const sensitiveDataNodes = reachableNodes.filter((node) => asBoolean(node.sensitiveData));

  const controlsThatWouldBlock = input.controlBlocks
    .map((control) => {
      const blockedNodeIds = reachableNodes
        .filter((node) => control.wouldBlockNodes?.includes(node.id))
        .map((node) => node.id);

      const blockedEdgeIds = reachableEdges
        .filter((edge) => control.wouldBlockEdgeTypes?.includes(edge.type))
        .map((edge) => edge.id);

      return {
        controlId: control.id,
        controlName: control.name,
        blockedNodeIds,
        blockedEdgeIds
      };
    })
    .filter((control) => control.blockedNodeIds.length > 0 || control.blockedEdgeIds.length > 0);

  const blastRadiusScore = Math.min(
    100,
    Math.round(
      reachableNodes.reduce((score, node) => score + asNumber(node.riskWeight, 1), 0) +
      sensitiveDataNodes.length * 12 +
      criticalNodes.length * 4 +
      topPropagationPaths.slice(0, 3).reduce((score, path) => score + path.pathScore / 10, 0)
    )
  );

  return {
    schemaVersion: "dreps-blast-radius-report.v1",
    generatedAt,
    scenario: input.scenario,
    startNode: input.startNode,
    maxDepth: input.maxDepth,
    reachableNodes,
    reachableEdges,
    topPropagationPaths,
    criticalNodes,
    sensitiveDataNodes,
    blastRadiusScore,
    controlsThatWouldBlock
  };
}

function mermaidId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function renderBlastRadiusMermaid(report: BlastRadiusReport): string {
  const lines = [
    "flowchart TD",
    "  start[\"" + report.startNode + "\"]"
  ];

  for (const edge of report.reachableEdges) {
    lines.push(
      "  " +
        mermaidId(edge.source) +
        "[\"" +
        edge.source +
        "\"] -->|" +
        edge.type +
        "| " +
        mermaidId(edge.target) +
        "[\"" +
        edge.target +
        "\"]"
    );
  }

  lines.push("");

  if (report.sensitiveDataNodes.length > 0) {
    lines.push("  classDef sensitive fill:#ffd6d6,stroke:#aa0000,stroke-width:2px;");
    for (const node of report.sensitiveDataNodes) {
      lines.push("  class " + mermaidId(node.id) + " sensitive;");
    }
  }

  lines.push("");
  return lines.join("\n");
}

export function renderBlastRadiusSummary(report: BlastRadiusReport): string {
  const lines = [
    "# Blast Radius Summary",
    "",
    "- Scenario: `" + report.scenario + "`",
    "- Start node: `" + report.startNode + "`",
    "- Max depth: `" + report.maxDepth + "`",
    "- Reachable nodes: `" + report.reachableNodes.length + "`",
    "- Critical nodes: `" + report.criticalNodes.length + "`",
    "- Sensitive data nodes: `" + report.sensitiveDataNodes.length + "`",
    "- Blast radius score: `" + report.blastRadiusScore + "`",
    "",
    "## Top propagation paths",
    ""
  ];

  for (const path of report.topPropagationPaths.slice(0, 5)) {
    lines.push("- `" + path.nodeIds.join(" -> ") + "` — score `" + path.pathScore + "`");
  }

  lines.push("");
  lines.push("## Controls that would block");
  lines.push("");

  for (const control of report.controlsThatWouldBlock) {
    lines.push(
      "- `" +
        control.controlId +
        "` blocks nodes `" +
        control.blockedNodeIds.join(", ") +
        "` and edges `" +
        control.blockedEdgeIds.join(", ") +
        "`"
    );
  }

  lines.push("");
  return lines.join("\n");
}

export function toJtablePayload(report: BlastRadiusReport): JtablePayload {
  return {
    schemaVersion: "jtable.compat.v1",
    title: "Blast Radius Summary",
    columns: [
      { key: "metric", label: "Metric" },
      { key: "value", label: "Value" }
    ],
    rows: [
      { metric: "scenario", value: report.scenario },
      { metric: "startNode", value: report.startNode },
      { metric: "reachableNodes", value: report.reachableNodes.length },
      { metric: "reachableEdges", value: report.reachableEdges.length },
      { metric: "criticalNodes", value: report.criticalNodes.length },
      { metric: "sensitiveDataNodes", value: report.sensitiveDataNodes.length },
      { metric: "blastRadiusScore", value: report.blastRadiusScore },
      { metric: "controlsThatWouldBlock", value: report.controlsThatWouldBlock.length }
    ]
  };
}

export function assertBlastRadiusReportShape(report: BlastRadiusReport): void {
  if (report.schemaVersion !== "dreps-blast-radius-report.v1") {
    throw new Error("Invalid blast radius report schemaVersion");
  }

  const reachableNodeIds = new Set(report.reachableNodes.map((node) => node.id));

  for (const required of [
    "repo-auth-service",
    "pipeline-auth-service",
    "image-auth-service",
    "workload-auth-api",
    "pod-auth-api",
    "db-auth-users"
  ]) {
    if (!reachableNodeIds.has(required)) {
      throw new Error("Missing reachable node: " + required);
    }
  }

  const dbPath = report.topPropagationPaths.find((path) =>
    path.nodeIds.includes("repo-auth-service") &&
    path.nodeIds.includes("pipeline-auth-service") &&
    path.nodeIds.includes("image-auth-service") &&
    path.nodeIds.includes("workload-auth-api") &&
    path.nodeIds.includes("pod-auth-api") &&
    path.nodeIds.includes("db-auth-users")
  );

  if (!dbPath) {
    throw new Error("No exported path reaches DB from repo-auth-service");
  }

  if (!report.sensitiveDataNodes.some((node) => node.id === "db-auth-users")) {
    throw new Error("DB sensitive data node not detected");
  }

  if (report.blastRadiusScore <= 0) {
    throw new Error("Blast radius score must be positive");
  }

  if (report.controlsThatWouldBlock.length === 0) {
    throw new Error("No blocking controls were reported");
  }
}
