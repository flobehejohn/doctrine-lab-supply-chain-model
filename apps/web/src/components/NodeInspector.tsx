import type { ReactElement } from "react";
import type { SupplyChainNode } from "@supply-chain-mode-lab/dreps-supplychain-schema";

interface NodeInspectorProps {
  node: SupplyChainNode | undefined;
}

export function NodeInspector({ node }: NodeInspectorProps): ReactElement {
  if (!node) {
    return (
      <section className="panel">
        <h2>Node Inspector</h2>
        <p>Aucun nœud sélectionné.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <p className="panel-kicker">Node Inspector</p>
      <h2>{node.name}</h2>

      <dl className="definition-list">
        <div>
          <dt>ID</dt>
          <dd>{node.id}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{node.type}</dd>
        </div>
        <div>
          <dt>Criticality</dt>
          <dd>{node.criticality}</dd>
        </div>
      </dl>

      <h3>Metadata</h3>
      <pre className="json-block">{JSON.stringify(node.metadata, null, 2)}</pre>
    </section>
  );
}


