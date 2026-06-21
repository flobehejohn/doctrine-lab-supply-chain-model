export interface JsonRecord {
  [key: string]: unknown;
}

export interface EvidencePackForMarp {
  packId?: string;
  nodes?: JsonRecord[];
  edges?: JsonRecord[];
  findings?: JsonRecord[];
  remediations?: JsonRecord[];
  complianceImpacts?: JsonRecord[];
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

export function renderExecutiveMarp(pack: EvidencePackForMarp): string {
  const nodes = asArray(pack.nodes);
  const edges = asArray(pack.edges);
  const findings = asArray(pack.findings);
  const remediations = asArray(pack.remediations);
  const complianceImpacts = asArray(pack.complianceImpacts);

  const criticalFindings = findings.filter(
    (finding) => asText(prop(finding, "severity")) === "critical"
  );

  const criticalList =
    criticalFindings.length === 0
      ? "- No critical finding."
      : criticalFindings
          .map(
            (finding) =>
              "- `" +
              asText(prop(finding, "id")) +
              "` — " +
              asText(prop(finding, "title"))
          )
          .join("\n");

  const nextActions =
    remediations.length === 0
      ? "- No remediation available."
      : remediations
          .map(
            (remediation) =>
              "- `" +
              asText(prop(remediation, "id")) +
              "` — " +
              asText(prop(remediation, "strategy"))
          )
          .join("\n");

  return [
    "---",
    "marp: true",
    "title: Supply Chain Executive Summary",
    "---",
    "",
    "# Supply Chain Executive Summary",
    "",
    "Pack: `" + asText(pack.packId ?? "unknown-pack") + "`",
    "",
    "---",
    "",
    "# Scope",
    "",
    "- Nodes: " + nodes.length,
    "- Edges: " + edges.length,
    "- Findings: " + findings.length,
    "- Compliance impacts: " + complianceImpacts.length,
    "- Remediations: " + remediations.length,
    "",
    "---",
    "",
    "# Critical findings",
    "",
    criticalList,
    "",
    "---",
    "",
    "# Recommended next actions",
    "",
    nextActions,
    ""
  ].join("\n");
}

export function assertReadableMarp(content: string): void {
  const requiredFragments = [
    "marp: true",
    "# Supply Chain Executive Summary",
    "# Critical findings",
    "# Recommended next actions"
  ];

  for (const fragment of requiredFragments) {
    if (!content.includes(fragment)) {
      throw new Error("Marp deck is missing required fragment: " + fragment);
    }
  }
}
