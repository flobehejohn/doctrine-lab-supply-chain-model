import type { ReactElement } from "react";
import type { Remediation } from "@supply-chain-mode-lab/dreps-supplychain-schema";

interface RemediationPanelProps {
  remediations: Remediation[];
}

export function RemediationPanel({
  remediations
}: RemediationPanelProps): ReactElement {
  return (
    <section className="panel panel-wide">
      <p className="panel-kicker">Remediation</p>
      <h2>Remédiations</h2>

      {remediations.length === 0 ? (
        <p>Aucune remédiation liée au nœud sélectionné.</p>
      ) : (
        <div className="card-list">
          {remediations.map((remediation) => (
            <article key={remediation.id} className="mini-card">
              <strong>{remediation.strategy}</strong>
              <span>
                Risk: {remediation.risk} · Approval required:{" "}
                {remediation.approvalRequired ? "yes" : "no"}
              </span>
              <small>{remediation.id}</small>

              <h3>Commands</h3>
              <ul className="command-list">
                {remediation.commands.map((command) => (
                  <li key={command.id}>
                    <code>{command.command}</code>
                    <span>{command.riskLevel}</span>
                  </li>
                ))}
              </ul>

              <h3>Verification</h3>
              <p>{remediation.verification.expectedOutcome}</p>

              <h3>Rollback</h3>
              <p>{remediation.rollback.description}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}


