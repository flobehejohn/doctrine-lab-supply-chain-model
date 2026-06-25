import { readFileSync } from "node:fs";

export type JsonRecord = Record<string, unknown>;

export const DriftTypes = [
  "node_added",
  "node_removed",
  "node_changed",
  "edge_added",
  "edge_removed",
  "edge_changed",
  "finding_added",
  "finding_resolved",
  "documentation_missing",
  "compliance_regression",
  "env_config_drift"
] as const;

export type DriftType = typeof DriftTypes[number];
export type DriftSeverity = "low" | "medium" | "high" | "critical";

export interface DriftNode extends JsonRecord {
  id: string;
  type: string;
  name?: string;
  critical?: boolean;
  hasRunbook?: boolean;
}

export interface DriftEdge extends JsonRecord {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
}

export interface DriftFinding extends JsonRecord {
  id: string;
  severity: DriftSeverity;
  status: "open" | "accepted" | "mitigated" | "resolved";
  title: string;
  affectedNodes: string[];
  evidenceRefs: string[];
}

export interface DriftDocumentation extends JsonRecord {
  nodeId: string;
  kind: string;
  path: string;
}

export interface DriftCompliance extends JsonRecord {
  id: string;
  framework: string;
  control: string;
  status: "pass" | "fail" | "warning";
  score: number;
}

export interface DriftArtifact {
  schemaVersion?: string;
  packId: string;
  generatedAt?: string;
  nodes: DriftNode[];
  edges: DriftEdge[];
  findings: DriftFinding[];
  documentation: DriftDocumentation[];
  compliance: DriftCompliance[];
  envConfig: JsonRecord;
}

export interface DriftItem {
  id: string;
  type: DriftType;
  severity: DriftSeverity;
  title: string;
  description: string;
  affectedNodes: string[];
  evidenceRefs: string[];
  baseline?: unknown;
  current?: unknown;
}

export interface DriftReport {
  schemaVersion: "dreps-drift-report.v1";
  generatedAt: string;
  baselinePackId: string;
  currentPackId: string;
  driftCount: number;
  drifts: DriftItem[];
  summary: Record<DriftType, number>;
}

function asRecord(value: unknown): JsonRecord {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  return {};
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

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function stable(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map((item) => stable(item)).join(",") + "]";
  }

  if (typeof value === "object" && value !== null) {
    const record = value as JsonRecord;
    const keys = Object.keys(record).sort();
    return "{" + keys.map((key) => JSON.stringify(key) + ":" + stable(record[key])).join(",") + "}";
  }

  return JSON.stringify(value);
}

function hasChanged(left: unknown, right: unknown): boolean {
  return stable(left) !== stable(right);
}

function driftId(type: DriftType, id: string): string {
  return type + ":" + id.replace(/[^a-zA-Z0-9_.:-]/g, "_");
}

function severityForType(type: DriftType): DriftSeverity {
  const map: Record<DriftType, DriftSeverity> = {
    node_added: "medium",
    node_removed: "high",
    node_changed: "medium",
    edge_added: "medium",
    edge_removed: "high",
    edge_changed: "medium",
    finding_added: "high",
    finding_resolved: "low",
    documentation_missing: "medium",
    compliance_regression: "critical",
    env_config_drift: "high"
  };

  return map[type];
}

function makeDrift(
  type: DriftType,
  id: string,
  title: string,
  description: string,
  affectedNodes: string[],
  evidenceRefs: string[],
  baseline?: unknown,
  current?: unknown
): DriftItem {
  return {
    id: driftId(type, id),
    type,
    severity: severityForType(type),
    title,
    description,
    affectedNodes,
    evidenceRefs,
    baseline,
    current
  };
}

export function loadDriftArtifact(path: string): DriftArtifact {
  const artifact = readJsonFile<DriftArtifact>(path);

  if (!artifact.packId) {
    throw new Error("Drift artifact requires packId");
  }

  if (!Array.isArray(artifact.nodes)) {
    throw new Error("Drift artifact requires nodes");
  }

  return {
    ...artifact,
    edges: Array.isArray(artifact.edges) ? artifact.edges : [],
    findings: Array.isArray(artifact.findings) ? artifact.findings : [],
    documentation: Array.isArray(artifact.documentation) ? artifact.documentation : [],
    compliance: Array.isArray(artifact.compliance) ? artifact.compliance : [],
    envConfig: asRecord(artifact.envConfig)
  };
}

export function compareDrift(
  baseline: DriftArtifact,
  current: DriftArtifact,
  generatedAt = "2026-06-25T00:00:00.000Z"
): DriftReport {
  const drifts: DriftItem[] = [];

  const baselineNodes = byId(baseline.nodes);
  const currentNodes = byId(current.nodes);

  for (const [id, node] of currentNodes) {
    if (!baselineNodes.has(id)) {
      drifts.push(
        makeDrift(
          "node_added",
          id,
          "Node added outside baseline: " + id,
          "A node exists in current but not in baseline.",
          [id],
          ["evidence_current_artifact"],
          undefined,
          node
        )
      );
    }
  }

  for (const [id, node] of baselineNodes) {
    if (!currentNodes.has(id)) {
      drifts.push(
        makeDrift(
          "node_removed",
          id,
          "Node removed from current: " + id,
          "A baseline node is missing from current.",
          [id],
          ["evidence_baseline_artifact"],
          node,
          undefined
        )
      );
    }
  }

  for (const [id, baselineNode] of baselineNodes) {
    const currentNode = currentNodes.get(id);

    if (currentNode && hasChanged(baselineNode, currentNode)) {
      drifts.push(
        makeDrift(
          "node_changed",
          id,
          "Node changed: " + id,
          "A node exists in baseline and current but its attributes changed.",
          [id],
          ["evidence_baseline_artifact", "evidence_current_artifact"],
          baselineNode,
          currentNode
        )
      );
    }
  }

  const baselineEdges = byId(baseline.edges);
  const currentEdges = byId(current.edges);

  for (const [id, edge] of currentEdges) {
    if (!baselineEdges.has(id)) {
      drifts.push(
        makeDrift(
          "edge_added",
          id,
          "Edge added: " + id,
          "An edge exists in current but not in baseline.",
          [edge.source, edge.target],
          ["evidence_current_artifact"],
          undefined,
          edge
        )
      );
    }
  }

  for (const [id, edge] of baselineEdges) {
    if (!currentEdges.has(id)) {
      drifts.push(
        makeDrift(
          "edge_removed",
          id,
          "Edge removed: " + id,
          "A baseline edge is missing from current.",
          [edge.source, edge.target],
          ["evidence_baseline_artifact"],
          edge,
          undefined
        )
      );
    }
  }

  for (const [id, baselineEdge] of baselineEdges) {
    const currentEdge = currentEdges.get(id);

    if (currentEdge && hasChanged(baselineEdge, currentEdge)) {
      drifts.push(
        makeDrift(
          "edge_changed",
          id,
          "Edge changed: " + id,
          "An edge exists in baseline and current but its attributes changed.",
          [currentEdge.source, currentEdge.target],
          ["evidence_baseline_artifact", "evidence_current_artifact"],
          baselineEdge,
          currentEdge
        )
      );
    }
  }

  const baselineFindings = byId(baseline.findings);
  const currentFindings = byId(current.findings);

  for (const [id, finding] of currentFindings) {
    if (!baselineFindings.has(id) && finding.status !== "resolved") {
      drifts.push(
        makeDrift(
          "finding_added",
          id,
          "Finding added: " + id,
          "A new open finding exists in current.",
          finding.affectedNodes,
          finding.evidenceRefs,
          undefined,
          finding
        )
      );
    }
  }

  for (const [id, baselineFinding] of baselineFindings) {
    const currentFinding = currentFindings.get(id);
    const resolved =
      !currentFinding ||
      currentFinding.status === "resolved" ||
      currentFinding.status === "mitigated";

    if (baselineFinding.status === "open" && resolved) {
      drifts.push(
        makeDrift(
          "finding_resolved",
          id,
          "Finding resolved: " + id,
          "A baseline open finding is resolved or no longer present in current.",
          baselineFinding.affectedNodes,
          baselineFinding.evidenceRefs,
          baselineFinding,
          currentFinding
        )
      );
    }
  }

  const documentedNodeIds = new Set(current.documentation.map((item) => item.nodeId));

  for (const node of current.nodes) {
    const critical = asBoolean(node.critical);
    const hasRunbook = asBoolean(node.hasRunbook);

    if (critical && !hasRunbook && !documentedNodeIds.has(node.id)) {
      drifts.push(
        makeDrift(
          "documentation_missing",
          node.id,
          "Documentation missing for critical node: " + node.id,
          "A critical current node has no runbook or documentation entry.",
          [node.id],
          ["evidence_current_artifact"],
          undefined,
          node
        )
      );
    }
  }

  const baselineCompliance = byId(baseline.compliance);
  const currentCompliance = byId(current.compliance);

  for (const [id, baselineControl] of baselineCompliance) {
    const currentControl = currentCompliance.get(id);

    if (!currentControl) {
      continue;
    }

    const regressed =
      (baselineControl.status === "pass" && currentControl.status !== "pass") ||
      currentControl.score < baselineControl.score;

    if (regressed) {
      drifts.push(
        makeDrift(
          "compliance_regression",
          id,
          "Compliance regression: " + id,
          "A compliance control regressed between baseline and current.",
          [],
          ["evidence_baseline_artifact", "evidence_current_artifact"],
          baselineControl,
          currentControl
        )
      );
    }
  }

  if (hasChanged(baseline.envConfig, current.envConfig)) {
    drifts.push(
      makeDrift(
        "env_config_drift",
        "envConfig",
        "Environment configuration drift",
        "Environment configuration changed between baseline and current.",
        ["env_prod"],
        ["evidence_baseline_artifact", "evidence_current_artifact"],
        baseline.envConfig,
        current.envConfig
      )
    );
  }

  return {
    schemaVersion: "dreps-drift-report.v1",
    generatedAt,
    baselinePackId: baseline.packId,
    currentPackId: current.packId,
    driftCount: drifts.length,
    drifts,
    summary: summarizeDrifts(drifts)
  };
}

export function summarizeDrifts(drifts: DriftItem[]): Record<DriftType, number> {
  const summary = Object.fromEntries(DriftTypes.map((type) => [type, 0])) as Record<DriftType, number>;

  for (const drift of drifts) {
    summary[drift.type] += 1;
  }

  return summary;
}

export function renderDriftSummary(report: DriftReport): string {
  const lines = [
    "# Drift Summary",
    "",
    "- Baseline: `" + report.baselinePackId + "`",
    "- Current: `" + report.currentPackId + "`",
    "- Drift count: `" + report.driftCount + "`",
    "",
    "## Drift counts",
    "",
    "| Type | Count |",
    "| --- | ---: |"
  ];

  for (const type of DriftTypes) {
    lines.push("| " + type + " | " + report.summary[type] + " |");
  }

  lines.push("");
  lines.push("## Critical / high drifts");
  lines.push("");

  const important = report.drifts.filter((drift) => drift.severity === "critical" || drift.severity === "high");

  if (important.length === 0) {
    lines.push("No critical or high drift.");
  } else {
    for (const drift of important) {
      lines.push("- `" + drift.type + "` — " + drift.title);
    }
  }

  lines.push("");
  return lines.join("\n");
}

function mermaidId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function renderDriftMermaid(report: DriftReport): string {
  const lines = [
    "flowchart TD",
    "  baseline[\"Baseline: " + report.baselinePackId + "\"]",
    "  current[\"Current: " + report.currentPackId + "\"]",
    "  baseline --> current"
  ];

  for (const drift of report.drifts) {
    const id = "drift_" + mermaidId(drift.id);
    lines.push("  " + id + "[\"" + drift.type + ": " + drift.title.replace(/"/g, "'") + "\"]");
    lines.push("  current --> " + id);
  }

  lines.push("");
  return lines.join("\n");
}

export function assertDriftReportShape(report: DriftReport): void {
  if (report.schemaVersion !== "dreps-drift-report.v1") {
    throw new Error("Invalid drift report schemaVersion");
  }

  const types = new Set(report.drifts.map((drift) => drift.type));

  for (const required of ["node_added", "finding_resolved", "compliance_regression"] as DriftType[]) {
    if (!types.has(required)) {
      throw new Error("Missing required drift type: " + required);
    }
  }

  const podAdded = report.drifts.find((drift) => drift.type === "node_added" && drift.affectedNodes.includes("pod_shadow"));
  if (!podAdded) {
    throw new Error("Added pod outside baseline was not detected");
  }

  const resolved = report.drifts.find((drift) => drift.type === "finding_resolved" && drift.id.includes("no-unsigned-container-image"));
  if (!resolved) {
    throw new Error("Resolved finding was not detected");
  }

  const regression = report.drifts.find((drift) => drift.type === "compliance_regression" && drift.id.includes("iso27001-change-control"));
  if (!regression) {
    throw new Error("Compliance regression was not detected");
  }
}
