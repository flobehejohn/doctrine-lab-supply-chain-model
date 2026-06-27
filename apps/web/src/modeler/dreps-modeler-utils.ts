import type {
  EvidencePack,
  SupplyChainEdge,
  SupplyChainNode
} from "@supply-chain-mode-lab/dreps-supplychain-schema";

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createEmptyEvidencePack(name = "custom-supply-chain-model"): EvidencePack {
  return {
    schemaVersion: "dreps.supplychain.v1",
    packId: slugify(name) || "custom-supply-chain-model",
    createdAt: nowIso(),
    mode: "simulated",
    nodes: [],
    edges: [],
    evidence: [],
    findings: [],
    remediations: [],
    complianceImpacts: [],
    documentation: [],
    simulations: [],
    commandRefs: [],
    runbooks: [],
    workflows: [],
    graphMetrics: {},
    toolchain: { modeler: "phase-37a" },
    provenance: { source: "manual-modeler", generatedBy: "SupplyChainModeler" }
  };
}

export function mergeEvidencePacks(base: EvidencePack, incoming: EvidencePack): EvidencePack {
  const nodeIds = new Set(base.nodes.map((node) => node.id));
  const edgeIds = new Set(base.edges.map((edge) => edge.id));
  const evidenceIds = new Set(base.evidence.map((evidence) => evidence.id));
  const findingIds = new Set(base.findings.map((finding) => finding.id));
  const remediationIds = new Set(base.remediations.map((remediation) => remediation.id));
  const impactIds = new Set(base.complianceImpacts.map((impact) => impact.id));

  return {
    ...base,
    createdAt: nowIso(),
    nodes: [...base.nodes, ...incoming.nodes.filter((node) => !nodeIds.has(node.id))],
    edges: [...base.edges, ...incoming.edges.filter((edge) => !edgeIds.has(edge.id))],
    evidence: [...base.evidence, ...incoming.evidence.filter((evidence) => !evidenceIds.has(evidence.id))],
    findings: [...base.findings, ...incoming.findings.filter((finding) => !findingIds.has(finding.id))],
    remediations: [...base.remediations, ...incoming.remediations.filter((remediation) => !remediationIds.has(remediation.id))],
    complianceImpacts: [...base.complianceImpacts, ...incoming.complianceImpacts.filter((impact) => !impactIds.has(impact.id))],
    documentation: [...base.documentation, ...incoming.documentation],
    simulations: [...base.simulations, ...incoming.simulations],
    commandRefs: [...base.commandRefs, ...incoming.commandRefs],
    runbooks: [...base.runbooks, ...incoming.runbooks],
    workflows: [...base.workflows, ...incoming.workflows],
    provenance: { ...base.provenance, lastMergePackId: incoming.packId, lastMergeAt: nowIso() }
  };
}

export function upsertNode(pack: EvidencePack, node: SupplyChainNode): EvidencePack {
  const exists = pack.nodes.some((current) => current.id === node.id);

  return {
    ...pack,
    createdAt: nowIso(),
    nodes: exists
      ? pack.nodes.map((current) => (current.id === node.id ? node : current))
      : [...pack.nodes, node]
  };
}

export function upsertEdge(pack: EvidencePack, edge: SupplyChainEdge): EvidencePack {
  const nodeIds = new Set(pack.nodes.map((node) => node.id));

  if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
    throw new Error(`Impossible de créer l’arête : ${edge.source} -> ${edge.target}.`);
  }

  const exists = pack.edges.some((current) => current.id === edge.id);

  return {
    ...pack,
    createdAt: nowIso(),
    edges: exists
      ? pack.edges.map((current) => (current.id === edge.id ? edge : current))
      : [...pack.edges, edge]
  };
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function copyJsonToClipboard(data: unknown): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
}
