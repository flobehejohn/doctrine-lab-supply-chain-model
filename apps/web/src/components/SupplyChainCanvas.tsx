import type { ReactElement } from "react";
import { Background, Controls, MiniMap, ReactFlow } from "@xyflow/react";
import type { Edge as FlowEdge, Node as FlowNode } from "@xyflow/react";
import type { MouseEvent } from "react";
import type {
  SupplyChainEdge,
  SupplyChainNode
} from "@supply-chain-mode-lab/dreps-supplychain-schema";

interface SupplyChainCanvasProps {
  nodes: SupplyChainNode[];
  edges: SupplyChainEdge[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
}

interface SupplyChainFlowNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  criticality: string;
}

function nodeClassName(node: SupplyChainNode, selectedNodeId: string): string {
  const classes = ["graph-node", "criticality-" + node.criticality];

  if (node.id === selectedNodeId) {
    classes.push("selected");
  }

  return classes.join(" ");
}

function toFlowNode(
  node: SupplyChainNode,
  index: number,
  selectedNodeId: string
): FlowNode<SupplyChainFlowNodeData> {
  const columns = 3;

  return {
    id: node.id,
    position: {
      x: (index % columns) * 280,
      y: Math.floor(index / columns) * 160
    },
    className: nodeClassName(node, selectedNodeId),
    data: {
      label: node.name,
      type: node.type,
      criticality: node.criticality
    }
  };
}

function toFlowEdge(edge: SupplyChainEdge): FlowEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.type,
    animated: edge.type === "deploys" || edge.type === "connects_to"
  };
}

export function SupplyChainCanvas({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode
}: SupplyChainCanvasProps): ReactElement {
  const flowNodes = nodes.map((node, index) => toFlowNode(node, index, selectedNodeId));
  const flowEdges = edges.map(toFlowEdge);

  function handleNodeClick(
    _event: MouseEvent,
    node: FlowNode<SupplyChainFlowNodeData>
  ): void {
    onSelectNode(node.id);
  }

  return (
    <section className="canvas-card" aria-label="Supply chain graph">
      <div className="canvas-header">
        <div>
          <h2>Supply Chain Graph</h2>
          <p>Clique sur un nœud pour inspecter les preuves et remédiations.</p>
        </div>
      </div>

      <div className="canvas">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodeClick={handleNodeClick}
          fitView
        >
          <MiniMap zoomable pannable />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </section>
  );
}


