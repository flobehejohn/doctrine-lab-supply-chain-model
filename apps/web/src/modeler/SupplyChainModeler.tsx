import type { ChangeEvent, ReactElement } from "react";
import { useMemo, useState } from "react";
import {
  EvidencePackSchema,
  type EvidencePack,
  type SupplyChainEdge,
  type SupplyChainNode
} from "@supply-chain-mode-lab/dreps-supplychain-schema";
import {
  copyJsonToClipboard,
  createEmptyEvidencePack,
  downloadJson,
  mergeEvidencePacks,
  slugify,
  upsertEdge,
  upsertNode
} from "./dreps-modeler-utils.js";
import { CRITICALITIES, EDGE_TYPES, NODE_TYPES } from "./modeler-types.js";
import type { ModelerCriticality, ModelerEdgeType, ModelerNodeType } from "./modeler-types.js";
import { importKubernetesLog } from "./kubernetes-log-importer.js";
import { SUPPLY_CHAIN_TEMPLATES } from "./templates.js";

interface SupplyChainModelerProps {
  pack: EvidencePack;
  onChangePack: (pack: EvidencePack, preferredNodeId?: string) => void;
}

const sampleKubernetesLog = `Name:           auth-api-7d8f7c9d6b-42k9q
Namespace:      ecommerce
Image:          registry.local/ecommerce/auth-api:1.4.2
State:          Waiting
Reason:         CrashLoopBackOff
Events:
  Warning  BackOff    2m   kubelet   Back-off restarting failed container auth-api
  Warning  Unhealthy  90s  kubelet   Readiness probe failed: HTTP probe failed with statuscode: 500`;

export function SupplyChainModeler({ pack, onChangePack }: SupplyChainModelerProps): ReactElement {
  const [nodeType, setNodeType] = useState<ModelerNodeType>("k8s_pod");
  const [nodeName, setNodeName] = useState("new pod");
  const [nodeCriticality, setNodeCriticality] = useState<ModelerCriticality>("high");
  const [sourceNode, setSourceNode] = useState("");
  const [targetNode, setTargetNode] = useState("");
  const [edgeType, setEdgeType] = useState<ModelerEdgeType>("connects_to");
  const [kubernetesLog, setKubernetesLog] = useState(sampleKubernetesLog);
  const [message, setMessage] = useState("Modeler prêt.");
  const [importPreview, setImportPreview] = useState<string[]>([]);

  const nodeOptions = useMemo(() => pack.nodes.map((node) => node.id), [pack.nodes]);

  function applyTemplate(templateId: string): void {
    const template = SUPPLY_CHAIN_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;

    onChangePack(template.pack, template.pack.nodes[0]?.id);
    setMessage(`Template chargé : ${template.title}`);
    setImportPreview([
      `${template.pack.nodes.length} nodes`,
      `${template.pack.edges.length} edges`,
      `${template.pack.findings.length} findings`
    ]);
  }

  function createEmptyModel(): void {
    const empty = createEmptyEvidencePack("custom-supply-chain-model");
    onChangePack(empty);
    setMessage("Modèle vide créé.");
    setImportPreview([]);
  }

  function addNode(): void {
    const id = slugify(`${nodeType}-${nodeName}`);

    if (!id) {
      setMessage("Nom de nœud invalide.");
      return;
    }

    const node: SupplyChainNode = {
      id,
      type: nodeType,
      name: nodeName,
      criticality: nodeCriticality,
      metadata: { createdBy: "modeler" }
    };

    onChangePack(upsertNode(pack, node), node.id);
    setMessage(`Nœud ajouté : ${node.id}`);
  }

  function addEdge(): void {
    try {
      if (!sourceNode || !targetNode) {
        setMessage("Sélectionne une source et une cible.");
        return;
      }

      const edge: SupplyChainEdge = {
        id: `edge-${sourceNode}-${edgeType}-${targetNode}`,
        type: edgeType,
        source: sourceNode,
        target: targetNode,
        metadata: { createdBy: "modeler" }
      };

      onChangePack(upsertEdge(pack, edge), targetNode);
      setMessage(`Edge ajoutée : ${sourceNode} -> ${targetNode}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  function importLog(): void {
    try {
      const result = importKubernetesLog(kubernetesLog);
      const merged = mergeEvidencePacks(pack, result.pack);
      const preferredNode = result.pack.nodes.find((node) => node.type === "k8s_pod")?.id;

      onChangePack(merged, preferredNode);
      setImportPreview([
        `Signals: ${result.detectedSignals.join(", ") || "none"}`,
        `Nodes: ${result.pack.nodes.length}`,
        `Edges: ${result.pack.edges.length}`,
        `Findings: ${result.pack.findings.length}`,
        ...result.warnings
      ]);
      setMessage("Log Kubernetes importé et converti en DREPS.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function importEvidencePackFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = EvidencePackSchema.parse(JSON.parse(text) as unknown);
      onChangePack(parsed, parsed.nodes[0]?.id);
      setMessage(`Evidence-pack importé : ${parsed.packId}`);
      setImportPreview([
        `Nodes: ${parsed.nodes.length}`,
        `Edges: ${parsed.edges.length}`,
        `Findings: ${parsed.findings.length}`
      ]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      event.target.value = "";
    }
  }

  async function copyPack(): Promise<void> {
    try {
      await copyJsonToClipboard(pack);
      setMessage("Evidence-pack copié dans le presse-papiers.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  function exportPack(): void {
    downloadJson(`${pack.packId}.evidence-pack.json`, pack);
    setMessage("Evidence-pack exporté.");
  }

  function exportDashboardData(): void {
    const importantFindings = pack.findings.filter((finding) =>
      finding.severity === "critical" || finding.severity === "high"
    );

    const dashboard = {
      schemaVersion: "doctrine.executive-dashboard.from-modeler.v1",
      generatedAt: new Date().toISOString(),
      sourcePackId: pack.packId,
      title: `Executive Dashboard — ${pack.packId}`,
      status: {
        overall: importantFindings.length > 0 ? "attention-required" : "acceptable",
        evidence: pack.evidence.length > 0 ? "available" : "missing"
      },
      scores: {
        riskScore: Math.min(100, 30 + importantFindings.length * 15 + pack.nodes.length),
        blastRadiusScore: Math.min(100, pack.edges.length * 10),
        complianceScore: Math.max(0, 100 - pack.complianceImpacts.length * 12),
        remediationReadiness: pack.remediations.length > 0 ? 78 : 35,
        auditPackReadiness: pack.evidence.length > 0 ? 82 : 45
      },
      topFindings: importantFindings.slice(0, 5),
      complianceStatus: pack.complianceImpacts,
      remediationReadiness: pack.remediations,
      auditPackStatus: {
        status: "generated-from-modeler",
        evidencePack: `${pack.packId}.evidence-pack.json`
      }
    };

    downloadJson(`${pack.packId}.executive-dashboard.json`, dashboard);
    setMessage("Données dashboard exécutif exportées.");
  }

  return (
    <section className="modeler-shell" aria-label="Supply Chain Modeler">
      <div className="modeler-header">
        <div>
          <p className="eyebrow">Phase 37A — Supply Chain Modeler</p>
          <h2>Modéliser, importer, scanner, exporter</h2>
          <p>
            Construis une supply chain applicative, applique des templates, colle un log
            Kubernetes, importe un evidence-pack ou exporte vers DREPS / dashboard.
          </p>
        </div>

        <div className="modeler-actions">
          <button type="button" onClick={createEmptyModel}>Modèle vide</button>
          <button type="button" onClick={exportPack}>Exporter DREPS</button>
          <button type="button" onClick={() => void copyPack()}>Copier JSON</button>
          <button type="button" onClick={exportDashboardData}>Exporter dashboard</button>
        </div>
      </div>

      <div className="modeler-grid">
        <article className="modeler-panel">
          <h3>TemplateLibrary</h3>
          <p className="modeler-help">Charge un cas standard de supply chain.</p>
          <div className="template-list">
            {SUPPLY_CHAIN_TEMPLATES.map((template) => (
              <button type="button" key={template.id} onClick={() => applyTemplate(template.id)}>
                <strong>{template.title}</strong>
                <span>{template.category}</span>
                <small>{template.summary}</small>
              </button>
            ))}
          </div>
        </article>

        <article className="modeler-panel">
          <h3>NodePalette</h3>
          <label>
            Type
            <select value={nodeType} onChange={(event) => setNodeType(event.target.value as ModelerNodeType)}>
              {NODE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label>
            Nom
            <input value={nodeName} onChange={(event) => setNodeName(event.target.value)} />
          </label>
          <label>
            Criticality
            <select value={nodeCriticality} onChange={(event) => setNodeCriticality(event.target.value as ModelerCriticality)}>
              {CRITICALITIES.map((criticality) => <option key={criticality} value={criticality}>{criticality}</option>)}
            </select>
          </label>
          <button type="button" onClick={addNode}>Ajouter / mettre à jour le nœud</button>
        </article>

        <article className="modeler-panel">
          <h3>EdgeEditor</h3>
          <label>
            Source
            <select value={sourceNode} onChange={(event) => setSourceNode(event.target.value)}>
              <option value="">Choisir</option>
              {nodeOptions.map((id) => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>
          <label>
            Relation
            <select value={edgeType} onChange={(event) => setEdgeType(event.target.value as ModelerEdgeType)}>
              {EDGE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label>
            Cible
            <select value={targetNode} onChange={(event) => setTargetNode(event.target.value)}>
              <option value="">Choisir</option>
              {nodeOptions.map((id) => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>
          <button type="button" onClick={addEdge}>Relier les éléments</button>
        </article>

        <article className="modeler-panel modeler-panel-wide">
          <h3>KubernetesLogPastePanel</h3>
          <textarea value={kubernetesLog} onChange={(event) => setKubernetesLog(event.target.value)} spellCheck={false} />
          <button type="button" onClick={importLog}>Importer le log Kubernetes</button>
        </article>

        <article className="modeler-panel">
          <h3>ImportPreviewPanel</h3>
          <ul className="tag-list">
            {importPreview.length > 0 ? importPreview.map((item) => <li key={item}>{item}</li>) : <li>Aucun import récent.</li>}
          </ul>
          <p className="modeler-status">{message}</p>
        </article>

        <article className="modeler-panel">
          <h3>DrepsExportPanel</h3>
          <p>Pack courant : <strong>{pack.packId}</strong></p>
          <p>{pack.nodes.length} nodes · {pack.edges.length} edges · {pack.findings.length} findings · {pack.remediations.length} remediations</p>
          <label>
            Importer un evidence-pack JSON
            <input type="file" accept="application/json,.json" onChange={(event) => void importEvidencePackFile(event)} />
          </label>
        </article>

        <article className="modeler-panel">
          <h3>DashboardSyncPanel</h3>
          <p>Exporte un JSON de synthèse dashboard depuis le modèle courant.</p>
          <button type="button" onClick={exportDashboardData}>Générer données dashboard</button>
        </article>
      </div>
    </section>
  );
}
