import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  buildGraph,
  buildGraphMetrics,
  findFindingsForNode,
  findNodeById,
  findRemediationsForFinding,
  validateGraphIntegrity
} from "@supply-chain-mode-lab/dreps-graph-engine";
import {
  EvidencePackSchema,
  type ComplianceImpact,
  type Evidence,
  type EvidencePack,
  type Finding,
  type Remediation,
  type SupplyChainNode
} from "@supply-chain-mode-lab/dreps-supplychain-schema";
import { CompliancePanel } from "./components/CompliancePanel.js";
import { EvidencePanel } from "./components/EvidencePanel.js";
import { FindingPanel } from "./components/FindingPanel.js";
import { NodeInspector } from "./components/NodeInspector.js";
import { RemediationPanel } from "./components/RemediationPanel.js";
import { SupplyChainCanvas } from "./components/SupplyChainCanvas.js";
import { SupplyChainModeler } from "./modeler/SupplyChainModeler.js";

interface SelectedNodeContext {
  node: SupplyChainNode | undefined;
  evidenceRefs: string[];
  evidence: Evidence[];
  findings: Finding[];
  remediations: Remediation[];
  complianceImpacts: ComplianceImpact[];
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function buildSelectedNodeContext(pack: EvidencePack, selectedNodeId: string): SelectedNodeContext {
  const graph = buildGraph(pack);
  const node = findNodeById(graph, selectedNodeId);

  if (!node) {
    return { node: undefined, evidenceRefs: [], evidence: [], findings: [], remediations: [], complianceImpacts: [] };
  }

  const findings = findFindingsForNode(graph, node.id);
  const findingIds = new Set(findings.map((finding) => finding.id));
  const evidenceRefs = unique(findings.flatMap((finding) => finding.evidenceRefs));

  const evidence = evidenceRefs
    .map((evidenceRef) => graph.evidenceById.get(evidenceRef))
    .filter((item): item is Evidence => item !== undefined);

  const remediations = findings.flatMap((finding) => findRemediationsForFinding(graph, finding.id));

  const complianceImpacts = graph.complianceImpacts.filter((impact) => {
    const touchesNode = impact.affectedNodes.includes(node.id);
    const touchesFinding = impact.findingRefs.some((findingRef) => findingIds.has(findingRef));
    return touchesNode || touchesFinding;
  });

  return { node, evidenceRefs, evidence, findings, remediations, complianceImpacts };
}

export function App(): ReactElement {
  const [pack, setPack] = useState<EvidencePack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState("pod-auth-api");

  useEffect(() => {
    let cancelled = false;

    async function loadPack(): Promise<void> {
      try {
        const response = await fetch("/evidence-pack.json");

        if (!response.ok) {
          throw new Error("Unable to load demo evidence-pack.json");
        }

        const json = (await response.json()) as unknown;
        const parsed = EvidencePackSchema.parse(json);

        if (!cancelled) {
          setPack(parsed);
          setSelectedNodeId(parsed.nodes.find((node) => node.id === "pod-auth-api")?.id ?? parsed.nodes[0]?.id ?? "");
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : String(loadError);

        if (!cancelled) {
          setError(message);
        }
      }
    }

    void loadPack();

    return () => {
      cancelled = true;
    };
  }, []);

  const graph = useMemo(() => (pack ? buildGraph(pack) : null), [pack]);
  const metrics = useMemo(() => (graph ? buildGraphMetrics(graph) : null), [graph]);
  const integrity = useMemo(() => (graph ? validateGraphIntegrity(graph) : null), [graph]);

  const selectedContext = useMemo(() => {
    if (!pack) {
      return { node: undefined, evidenceRefs: [], evidence: [], findings: [], remediations: [], complianceImpacts: [] };
    }

    return buildSelectedNodeContext(pack, selectedNodeId);
  }, [pack, selectedNodeId]);

  function handleChangePack(nextPack: EvidencePack, preferredNodeId?: string): void {
    const parsed = EvidencePackSchema.parse(nextPack);
    setPack(parsed);
    setSelectedNodeId(preferredNodeId ?? parsed.nodes[0]?.id ?? "");
  }

  if (error) {
    return (
      <main className="app-shell">
        <section className="error-card">
          <h1>Doctrine Supply Chain Mode Lab</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  if (!pack || !graph || !metrics || !integrity) {
    return (
      <main className="app-shell">
        <section className="loading-card">
          <h1>Doctrine Supply Chain Mode Lab</h1>
          <p>Chargement du graphe DREPS...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Phase 37A — Supply Chain Modeler & Kubernetes Log Import</p>
          <h1>Doctrine Supply Chain Mode Lab</h1>
          <p className="hero-text">
            Modélise une supply chain applicative, importe des templates ou des logs Kubernetes,
            puis inspecte preuves, findings, remédiations et impacts conformité dans React Flow.
          </p>
        </div>

        <div className="metrics-grid" aria-label="Graph metrics">
          <div><strong>{metrics.nodeCount}</strong><span>nodes</span></div>
          <div><strong>{metrics.edgeCount}</strong><span>edges</span></div>
          <div><strong>{metrics.findingCount}</strong><span>findings</span></div>
          <div><strong>{metrics.remediationCount}</strong><span>remediations</span></div>
        </div>
      </header>

      <section className="status-bar">
        <span className={integrity.valid ? "status-ok" : "status-ko"}>
          {integrity.valid ? "Graph integrity passed" : "Graph integrity failed"}
        </span>
        <span>Pack : {pack.packId}</span>
        <span>Nœud sélectionné : {selectedContext.node?.id ?? "aucun"}</span>
      </section>

      <SupplyChainModeler pack={pack} onChangePack={handleChangePack} />

      <section className="workspace">
        <SupplyChainCanvas nodes={pack.nodes} edges={pack.edges} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />

        <aside className="inspector-grid">
          <NodeInspector node={selectedContext.node} />
          <EvidencePanel evidenceRefs={selectedContext.evidenceRefs} evidence={selectedContext.evidence} />
          <FindingPanel findings={selectedContext.findings} />
          <CompliancePanel impacts={selectedContext.complianceImpacts} />
          <RemediationPanel remediations={selectedContext.remediations} />
        </aside>
      </section>
    </main>
  );
}
