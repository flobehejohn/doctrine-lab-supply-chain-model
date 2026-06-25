import { readFileSync } from "node:fs";

export type JsonRecord = Record<string, unknown>;

export const SimulationScenarioIds = [
  "compromised-github-token",
  "compromised-gitlab-runner",
  "malicious-dependency",
  "unsigned-image-deployed",
  "public-database-exposure",
  "k8s-secret-exfiltration",
  "ci-permission-escalation",
  "compromised-registry",
  "no-network-policy-lateral-movement"
] as const;

export type SimulationScenarioId = typeof SimulationScenarioIds[number];

export interface SimulationNode extends JsonRecord {
  id: string;
  type: string;
  name: string;
  critical?: boolean;
  sensitiveData?: boolean;
  riskWeight?: number;
  dataClassification?: string;
}

export interface SimulationEdge extends JsonRecord {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
  likelihood?: number;
}

export interface SimulationScenario {
  id: SimulationScenarioId;
  title: string;
  startNode: string;
  targetNodes: string[];
  maxDepth: number;
}

export interface SimulationRemediation {
  id: string;
  title: string;
  description: string;
  blocksEdges: string[];
  blocksNodeTypes: string[];
  scoreReduction: number;
}

export interface SimulationContext {
  schemaVersion?: string;
  source?: string;
  activeScenario: SimulationScenarioId;
  nodes: SimulationNode[];
  edges: SimulationEdge[];
  scenarios: SimulationScenario[];
  remediations: SimulationRemediation[];
}

export interface PropagationPath {
  id: string;
  nodeIds: string[];
  edgeIds: string[];
  depth: number;
  riskScore: number;
  reachesTarget: boolean;
  reachedTargets: string[];
}

export interface BlockedPropagation {
  edgeId: string;
  source: string;
  target: string;
  blockedBy: string;
  reason: string;
}

export interface SimulationRun {
  scenarioId: SimulationScenarioId;
  title: string;
  startNode: string;
  appliedRemediations: string[];
  attackPath: PropagationPath;
  reachedTargets: string[];
  blockedPropagations: BlockedPropagation[];
  blastRadiusScore: number;
  pathBroken: boolean;
  timeline: Array<{
    step: number;
    nodeId: string;
    description: string;
  }>;
}

export interface BeforeAfterScore {
  scenarioId: SimulationScenarioId;
  beforeScore: number;
  afterScore: number;
  scoreDelta: number;
  pathBroken: boolean;
  beforeReachedTargets: string[];
  afterReachedTargets: string[];
  controlsThatBrokePath: string[];
}

export interface SimulationResults {
  schemaVersion: "dreps-simulation-results.v1";
  generatedAt: string;
  source: string;
  scenarioResults: SimulationRun[];
  focusedScenario: SimulationRun;
  remediatedScenario: SimulationRun;
  beforeAfterScore: BeforeAfterScore;
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
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

function mermaidId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, "_");
}

function pathId(nodeIds: string[]): string {
  return "path:" + nodeIds.join(">");
}

function outgoingEdges(edges: SimulationEdge[], source: string): SimulationEdge[] {
  return edges.filter((edge) => edge.source === source);
}

function remediationBlocksEdge(remediation: SimulationRemediation, edge: SimulationEdge): boolean {
  return remediation.blocksEdges.includes(edge.id);
}

function remediationBlocksTargetType(
  remediation: SimulationRemediation,
  edge: SimulationEdge,
  nodesById: Map<string, SimulationNode>
): boolean {
  const target = nodesById.get(edge.target);
  return Boolean(target && remediation.blocksNodeTypes.includes(target.type));
}

function pathRiskScore(
  context: SimulationContext,
  nodeIds: string[],
  edgeIds: string[]
): number {
  const nodesById = byId(context.nodes);
  const edgesById = byId(context.edges);

  const nodeScore = nodeIds.reduce((score, nodeId) => {
    const node = nodesById.get(nodeId);
    const criticalBoost = asBoolean(node?.critical) ? 4 : 0;
    const sensitiveBoost = asBoolean(node?.sensitiveData) ? 8 : 0;
    return score + asNumber(node?.riskWeight, 1) + criticalBoost + sensitiveBoost;
  }, 0);

  const edgeScore = edgeIds.reduce((score, edgeId) => {
    const edge = edgesById.get(edgeId);
    return score + Math.round(asNumber(edge?.likelihood, 0.5) * 10);
  }, 0);

  return Math.min(100, Math.round(nodeScore + edgeScore));
}

function buildTimeline(
  context: SimulationContext,
  run: {
    nodeIds: string[];
  }
): Array<{ step: number; nodeId: string; description: string }> {
  const nodesById = byId(context.nodes);

  return run.nodeIds.map((nodeId, index) => {
    const node = nodesById.get(nodeId);
    const name = node?.name ?? nodeId;
    const type = node?.type ?? "unknown";

    return {
      step: index + 1,
      nodeId,
      description: "Step " + String(index + 1) + ": reached " + name + " (" + type + ")"
    };
  });
}

export function loadSimulationContext(path: string): SimulationContext {
  const context = readJsonFile<SimulationContext>(path);

  if (!Array.isArray(context.nodes)) {
    throw new Error("Simulation context requires nodes");
  }

  if (!Array.isArray(context.edges)) {
    throw new Error("Simulation context requires edges");
  }

  if (!Array.isArray(context.scenarios)) {
    throw new Error("Simulation context requires scenarios");
  }

  if (!Array.isArray(context.remediations)) {
    throw new Error("Simulation context requires remediations");
  }

  return context;
}

export function simulateScenario(
  context: SimulationContext,
  scenarioId: SimulationScenarioId,
  appliedRemediationIds: string[] = []
): SimulationRun {
  const scenario = context.scenarios.find((item) => item.id === scenarioId);

  if (!scenario) {
    throw new Error("Unknown simulation scenario: " + scenarioId);
  }

  const nodesById = byId(context.nodes);

  if (!nodesById.has(scenario.startNode)) {
    throw new Error("Unknown simulation startNode: " + scenario.startNode);
  }

  const appliedRemediations = context.remediations.filter((remediation) =>
    appliedRemediationIds.includes(remediation.id)
  );

  const blockedPropagations: BlockedPropagation[] = [];
  const paths: PropagationPath[] = [];

  type QueueItem = {
    nodeIds: string[];
    edgeIds: string[];
    depth: number;
  };

  const queue: QueueItem[] = [
    {
      nodeIds: [scenario.startNode],
      edgeIds: [],
      depth: 0
    }
  ];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      break;
    }

    const reachedTargets = scenario.targetNodes.filter((target) =>
      current.nodeIds.includes(target)
    );

    paths.push({
      id: pathId(current.nodeIds),
      nodeIds: current.nodeIds,
      edgeIds: current.edgeIds,
      depth: current.depth,
      riskScore: pathRiskScore(context, current.nodeIds, current.edgeIds),
      reachesTarget: reachedTargets.length > 0,
      reachedTargets
    });

    if (current.depth >= scenario.maxDepth) {
      continue;
    }

    const currentNode = current.nodeIds[current.nodeIds.length - 1];

    if (!currentNode) {
      continue;
    }

    for (const edge of outgoingEdges(context.edges, currentNode)) {
      if (current.nodeIds.includes(edge.target)) {
        continue;
      }

      const blocking = appliedRemediations.find((remediation) =>
        remediationBlocksEdge(remediation, edge) ||
        remediationBlocksTargetType(remediation, edge, nodesById)
      );

      if (blocking) {
        blockedPropagations.push({
          edgeId: edge.id,
          source: edge.source,
          target: edge.target,
          blockedBy: blocking.id,
          reason: blocking.description
        });
        continue;
      }

      queue.push({
        nodeIds: [...current.nodeIds, edge.target],
        edgeIds: [...current.edgeIds, edge.id],
        depth: current.depth + 1
      });
    }
  }

  const sortedTargetPaths = paths
    .filter((path) => path.reachedTargets.length > 0)
    .sort((left, right) => {
      const byTargetCount = right.reachedTargets.length - left.reachedTargets.length;

      if (byTargetCount !== 0) {
        return byTargetCount;
      }

      return right.riskScore - left.riskScore;
    });

  const sortedAnyPaths = [...paths].sort((left, right) => right.riskScore - left.riskScore);
  const selectedPath = sortedTargetPaths.length > 0 ? sortedTargetPaths[0] : sortedAnyPaths[0];

  if (!selectedPath) {
    throw new Error("Simulation produced no path for scenario: " + scenarioId);
  }

  const finalTargets = scenario.targetNodes.filter((target) =>
    selectedPath.nodeIds.includes(target)
  );

  const missingTargets = scenario.targetNodes.filter((target) =>
    !selectedPath.nodeIds.includes(target)
  );

  const baseScore = selectedPath.riskScore;
  const reduction = appliedRemediations.reduce((score, remediation) => score + remediation.scoreReduction, 0);
  const blastRadiusScore = finalTargets.length === 0
    ? Math.max(0, baseScore - reduction - 20)
    : Math.max(0, baseScore - reduction);

  return {
    scenarioId,
    title: scenario.title,
    startNode: scenario.startNode,
    appliedRemediations: appliedRemediationIds,
    attackPath: selectedPath,
    reachedTargets: finalTargets,
    blockedPropagations,
    blastRadiusScore,
    pathBroken: missingTargets.length > 0 && blockedPropagations.length > 0,
    timeline: buildTimeline(context, selectedPath)
  };
}

export function runSimulationSuite(
  context: SimulationContext,
  activeScenario: SimulationScenarioId = context.activeScenario,
  remediationIds: string[] = ["network-policy-db-egress"]
): SimulationResults {
  const scenarioResults = context.scenarios.map((scenario) =>
    simulateScenario(context, scenario.id, [])
  );

  const focusedScenario = simulateScenario(context, activeScenario, []);
  const remediatedScenario = simulateScenario(context, activeScenario, remediationIds);

  const controlsThatBrokePath = Array.from(
    new Set(remediatedScenario.blockedPropagations.map((item) => item.blockedBy))
  );

  return {
    schemaVersion: "dreps-simulation-results.v1",
    generatedAt: "2026-06-25T00:00:00.000Z",
    source: context.source ?? "simulation-context",
    scenarioResults,
    focusedScenario,
    remediatedScenario,
    beforeAfterScore: {
      scenarioId: activeScenario,
      beforeScore: focusedScenario.blastRadiusScore,
      afterScore: remediatedScenario.blastRadiusScore,
      scoreDelta: focusedScenario.blastRadiusScore - remediatedScenario.blastRadiusScore,
      pathBroken: remediatedScenario.pathBroken,
      beforeReachedTargets: focusedScenario.reachedTargets,
      afterReachedTargets: remediatedScenario.reachedTargets,
      controlsThatBrokePath
    }
  };
}

export function renderAttackPathMermaid(run: SimulationRun, context: SimulationContext): string {
  const edgesById = byId(context.edges);
  const lines = [
    "flowchart TD"
  ];

  for (const nodeId of run.attackPath.nodeIds) {
    lines.push("  " + mermaidId(nodeId) + "[\"" + nodeId + "\"]");
  }

  for (const edgeId of run.attackPath.edgeIds) {
    const edge = edgesById.get(edgeId);

    if (!edge) {
      continue;
    }

    lines.push(
      "  " +
        mermaidId(edge.source) +
        " -->|\"" +
        edge.type +
        "\"| " +
        mermaidId(edge.target)
    );
  }

  if (run.blockedPropagations.length > 0) {
    for (const blocked of run.blockedPropagations) {
      lines.push("  " + mermaidId(blocked.source) + "-. blocked by " + blocked.blockedBy + " .->" + mermaidId(blocked.target));
    }
  }

  lines.push("");
  return lines.join("\n");
}

export function renderTimelineMarkdown(before: SimulationRun, after: SimulationRun): string {
  const lines = [
    "# Simulation Timeline",
    "",
    "## Scenario",
    "",
    "- Scenario: `" + before.scenarioId + "`",
    "- Start node: `" + before.startNode + "`",
    "",
    "## Before remediation",
    "",
    "- Score: `" + before.blastRadiusScore + "`",
    "- Reached targets: `" + before.reachedTargets.join(", ") + "`",
    ""
  ];

  for (const step of before.timeline) {
    lines.push("- " + step.description);
  }

  lines.push("");
  lines.push("## After remediation");
  lines.push("");
  lines.push("- Score: `" + after.blastRadiusScore + "`");
  lines.push("- Reached targets: `" + after.reachedTargets.join(", ") + "`");
  lines.push("- Path broken: `" + String(after.pathBroken) + "`");
  lines.push("");

  for (const blocked of after.blockedPropagations) {
    lines.push(
      "- Blocked `" +
        blocked.source +
        " -> " +
        blocked.target +
        "` by `" +
        blocked.blockedBy +
        "`"
    );
  }

  lines.push("");
  return lines.join("\n");
}

export function assertSimulationResultsShape(results: SimulationResults): void {
  if (results.schemaVersion !== "dreps-simulation-results.v1") {
    throw new Error("Invalid simulation results schemaVersion");
  }

  const scenarioIds = new Set(results.scenarioResults.map((item) => item.scenarioId));

  for (const scenarioId of SimulationScenarioIds) {
    if (!scenarioIds.has(scenarioId)) {
      throw new Error("Missing simulation scenario: " + scenarioId);
    }
  }

  const requiredPathNodes = [
    "runner_privileged",
    "registry-prod",
    "image-auth-service",
    "pod-auth-api",
    "db-auth-users"
  ];

  for (const nodeId of requiredPathNodes) {
    if (!results.focusedScenario.attackPath.nodeIds.includes(nodeId)) {
      throw new Error("Focused GitLab runner simulation does not reach: " + nodeId);
    }
  }

  if (!results.focusedScenario.reachedTargets.includes("db-auth-users")) {
    throw new Error("Before remediation scenario does not reach DB");
  }

  if (results.remediatedScenario.reachedTargets.includes("db-auth-users")) {
    throw new Error("After remediation still reaches DB");
  }

  if (!results.beforeAfterScore.pathBroken) {
    throw new Error("Remediation did not break the attack path");
  }

  if (results.beforeAfterScore.afterScore >= results.beforeAfterScore.beforeScore) {
    throw new Error("After score is not lower than before score");
  }

  if (!results.beforeAfterScore.controlsThatBrokePath.includes("network-policy-db-egress")) {
    throw new Error("NetworkPolicy remediation did not break the path");
  }
}
