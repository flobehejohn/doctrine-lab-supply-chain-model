import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EvidencePack } from "../../packages/dreps-supplychain-schema/src/index.js";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  buildGraph,
  buildGraphMetrics,
  findFindingsForNode,
  findIncomingEdges,
  findNodeById,
  findOutgoingEdges,
  findRemediationsForFinding,
  validateGraphIntegrity
} from "../../packages/dreps-graph-engine/src/index.js";
import { describe, expect, it } from "vitest";

function loadEcommercePack(): EvidencePack {
  const raw = readFileSync(
    resolve(process.cwd(), "labs/supply-chain/examples/ecommerce/evidence-pack.json"),
    "utf8"
  );

  return EvidencePackSchema.parse(JSON.parse(raw));
}

function clonePack(pack: EvidencePack): EvidencePack {
  return JSON.parse(JSON.stringify(pack)) as EvidencePack;
}

describe("phase 3 graph engine", () => {
  it("builds graph indexes and counts nodes, edges and findings", () => {
    const pack = loadEcommercePack();
    const graph = buildGraph(pack);
    const metrics = buildGraphMetrics(graph);

    expect(metrics.nodeCount).toBe(5);
    expect(metrics.edgeCount).toBe(4);
    expect(metrics.findingCount).toBe(2);
    expect(metrics.remediationCount).toBe(1);
    expect(metrics.criticalNodeCount).toBe(3);
    expect(validateGraphIntegrity(graph).valid).toBe(true);
  });

  it("finds nodes and traverses incoming and outgoing edges", () => {
    const graph = buildGraph(loadEcommercePack());

    expect(findNodeById(graph, "pod-auth-api")?.name).toBe("auth-api pod");
    expect(findIncomingEdges(graph, "pod-auth-api").map((edge) => edge.id)).toContain("edge-image-deploys-pod");
    expect(findOutgoingEdges(graph, "pod-auth-api").map((edge) => edge.id)).toContain("edge-pod-connects-db");
  });

  it("detects an edge targeting a missing node", () => {
    const brokenPack = clonePack(loadEcommercePack());

    brokenPack.edges.push({
      id: "edge-broken-missing-target",
      type: "connects_to",
      source: "pod-auth-api",
      target: "missing-node",
      metadata: {}
    });

    const integrity = validateGraphIntegrity(buildGraph(brokenPack));

    expect(integrity.valid).toBe(false);
    expect(integrity.issues.some((issue) => issue.kind === "missing_edge_target")).toBe(true);
  });

  it("detects a finding targeting a missing node", () => {
    const brokenPack = clonePack(loadEcommercePack());

    brokenPack.findings.push({
      id: "finding-missing-node",
      title: "Finding with missing node",
      severity: "critical",
      status: "open",
      affectedNodes: ["missing-pod"],
      evidenceRefs: ["evidence-k8s-auth-api"],
      metadata: {}
    });

    const integrity = validateGraphIntegrity(buildGraph(brokenPack));

    expect(integrity.valid).toBe(false);
    expect(integrity.issues.some((issue) => issue.kind === "missing_finding_node")).toBe(true);
  });

  it("returns findings and remediations for a vulnerable pod", () => {
    const graph = buildGraph(loadEcommercePack());

    const podFindings = findFindingsForNode(graph, "pod-auth-api");
    const findingIds = podFindings.map((finding) => finding.id);

    expect(findingIds).toContain("finding-critical-pod-no-network-policy");

    const remediations = findRemediationsForFinding(
      graph,
      "finding-critical-pod-no-network-policy"
    );

    expect(remediations.map((remediation) => remediation.id)).toContain("remediate-network-policy");
  });
});


