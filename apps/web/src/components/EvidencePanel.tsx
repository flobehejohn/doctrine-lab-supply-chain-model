import type { ReactElement } from "react";
import type { Evidence } from "@supply-chain-mode-lab/dreps-supplychain-schema";

interface EvidencePanelProps {
  evidenceRefs: string[];
  evidence: Evidence[];
}

export function EvidencePanel({
  evidenceRefs,
  evidence
}: EvidencePanelProps): ReactElement {
  return (
    <section className="panel">
      <p className="panel-kicker">Evidence</p>
      <h2>Evidence refs</h2>

      {evidenceRefs.length === 0 ? (
        <p>Aucune preuve liée au nœud sélectionné.</p>
      ) : (
        <ul className="tag-list">
          {evidenceRefs.map((ref) => (
            <li key={ref}>{ref}</li>
          ))}
        </ul>
      )}

      <div className="card-list">
        {evidence.map((item) => (
          <article key={item.id} className="mini-card">
            <strong>{item.id}</strong>
            <span>{item.type}</span>
            <small>{item.source}</small>
          </article>
        ))}
      </div>
    </section>
  );
}


