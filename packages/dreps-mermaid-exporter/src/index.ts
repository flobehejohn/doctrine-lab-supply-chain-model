export interface JsonRecord {
  [key: string]: unknown;
}

export interface EvidencePackForMermaid {
  packId?: string;
  nodes?: JsonRecord[];
  edges?: JsonRecord[];
}

function asArray(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is JsonRecord =>
      typeof item === "object" && item !== null && !Array.isArray(item)
  );
}

function asText(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map((item) => asText(item)).join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function prop(record: JsonRecord, key: string): unknown {
  return record[key];
}

function mermaidId(id: string): string {
  const normalized = id.replace(/[^A-Za-z0-9_]/g, "_");
  return normalized.length > 0 ? normalized : "node";
}

function mermaidLabel(label: string): string {
  return label.replace(/"/g, "'").replace(/\r?\n/g, " ");
}

function edgeSource(edge: JsonRecord): string {
  return asText(
    prop(edge, "source") ??
      prop(edge, "from") ??
      prop(edge, "sourceNodeId") ??
      prop(edge, "sourceId")
  );
}

function edgeTarget(edge: JsonRecord): string {
  return asText(
    prop(edge, "target") ??
      prop(edge, "to") ??
      prop(edge, "targetNodeId") ??
      prop(edge, "targetId")
  );
}

export function renderSupplyChainMermaid(pack: EvidencePackForMermaid): string {
  const nodes = asArray(pack.nodes);
  const edges = asArray(pack.edges);

  const nodeLines = nodes.map((node) => {
    const id = asText(prop(node, "id"));
    const label =
      asText(prop(node, "label")) ||
      asText(prop(node, "title")) ||
      asText(prop(node, "kind")) ||
      id;

    return "  " + mermaidId(id) + '["' + mermaidLabel(label) + '"]';
  });

  const edgeLines = edges
    .map((edge) => {
      const source = edgeSource(edge);
      const target = edgeTarget(edge);
      const label = asText(prop(edge, "kind") ?? prop(edge, "type"));

      if (!source || !target) {
        return "";
      }

      if (label) {
        return (
          "  " +
          mermaidId(source) +
          ' -- "' +
          mermaidLabel(label) +
          '" --> ' +
          mermaidId(target)
        );
      }

      return "  " + mermaidId(source) + " --> " + mermaidId(target);
    })
    .filter((line) => line.length > 0);

  return ["flowchart LR", ...nodeLines, ...edgeLines, ""].join("\n");
}

export function assertReadableMermaid(content: string): void {
  if (!content.includes("flowchart LR")) {
    throw new Error("Mermaid graph must start with flowchart LR.");
  }

  if (!content.includes("-->")) {
    throw new Error("Mermaid graph must contain at least one edge.");
  }
}
