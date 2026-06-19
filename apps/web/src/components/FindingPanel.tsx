import type { ReactElement } from "react";
import type { Finding } from "@supply-chain-mode-lab/dreps-supplychain-schema";

interface FindingPanelProps {
  findings: Finding[];
}

export function FindingPanel({ findings }: FindingPanelProps): ReactElement {
  return (
    <section className="panel">
      <p className="panel-kicker">Findings</p>
      <h2>Findings liés</h2>

      {findings.length === 0 ? (
        <p>Aucun finding lié au nœud sélectionné.</p>
      ) : (
        <div className="card-list">
          {findings.map((finding) => (
            <article key={finding.id} className={"mini-card severity-" + finding.severity}>
              <strong>{finding.title}</strong>
              <span>{finding.severity} · {finding.status}</span>
              <small>{finding.id}</small>
              {finding.description ? <p>{finding.description}</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}


