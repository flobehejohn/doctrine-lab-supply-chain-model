import type { ReactElement } from "react";
import type { ComplianceImpact } from "@supply-chain-mode-lab/dreps-supplychain-schema";

interface CompliancePanelProps {
  impacts: ComplianceImpact[];
}

export function CompliancePanel({ impacts }: CompliancePanelProps): ReactElement {
  return (
    <section className="panel">
      <p className="panel-kicker">Compliance</p>
      <h2>Impacts conformité</h2>

      {impacts.length === 0 ? (
        <p>Aucun impact conformité lié au nœud sélectionné.</p>
      ) : (
        <div className="card-list">
          {impacts.map((impact) => (
            <article key={impact.id} className={"mini-card impact-" + impact.impact}>
              <strong>{impact.framework} · {impact.control}</strong>
              <span>Impact : {impact.impact}</span>
              <small>{impact.id}</small>
              <p>{impact.rationale}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}


