export interface JsonRecord {
  [key: string]: unknown;
}

export interface EvidencePackForMarkdown {
  packId?: string;
  nodes?: JsonRecord[];
  edges?: JsonRecord[];
  evidence?: JsonRecord[];
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

function escapeMarkdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function renderMarkdownTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return "_No rows._";
  }

  const header = "| " + headers.map(escapeMarkdownCell).join(" | ") + " |";
  const separator = "| " + headers.map(() => "---").join(" | ") + " |";
  const body = rows
    .map((row) => "| " + row.map(escapeMarkdownCell).join(" | ") + " |")
    .join("\n");

  return [header, separator, body].join("\n");
}

export function renderAuditMarkdown(pack: EvidencePackForMarkdown): string {
  const nodes = asArray(pack.nodes);
  const edges = asArray(pack.edges);
  const evidence = asArray(pack.evidence);
  const findings = asArray(pack.findings);
  const remediations = asArray(pack.remediations);
  const complianceImpacts = asArray(pack.complianceImpacts);

  const findingsTable = renderMarkdownTable(
    ["ID", "Severity", "Status", "Title", "Affected Nodes", "Evidence Refs"],
    findings.map((finding) => [
      asText(prop(finding, "id")),
      asText(prop(finding, "severity")),
      asText(prop(finding, "status")),
      asText(prop(finding, "title")),
      asText(prop(finding, "affectedNodes")),
      asText(prop(finding, "evidenceRefs"))
    ])
  );

  const complianceTable = renderMarkdownTable(
    ["ID", "Framework", "Control", "Impact", "Finding Refs", "Affected Nodes"],
    complianceImpacts.map((impact) => [
      asText(prop(impact, "id")),
      asText(prop(impact, "framework")),
      asText(prop(impact, "control")),
      asText(prop(impact, "impact")),
      asText(prop(impact, "findingRefs")),
      asText(prop(impact, "affectedNodes"))
    ])
  );

  const remediationTable = renderMarkdownTable(
    ["ID", "Finding", "Risk", "Approval Required", "Strategy"],
    remediations.map((remediation) => [
      asText(prop(remediation, "id")),
      asText(prop(remediation, "findingId")),
      asText(prop(remediation, "risk")),
      asText(prop(remediation, "approvalRequired")),
      asText(prop(remediation, "strategy"))
    ])
  );

  return [
    "# Supply Chain Audit Report",
    "",
    "Pack: `" + asText(pack.packId ?? "unknown-pack") + "`",
    "",
    "## Metrics",
    "",
    renderMarkdownTable(
      ["Metric", "Value"],
      [
        ["Nodes", String(nodes.length)],
        ["Edges", String(edges.length)],
        ["Evidence", String(evidence.length)],
        ["Findings", String(findings.length)],
        ["Remediations", String(remediations.length)],
        ["Compliance impacts", String(complianceImpacts.length)]
      ]
    ),
    "",
    "## Findings",
    "",
    findingsTable,
    "",
    "## Compliance impacts",
    "",
    complianceTable,
    "",
    "## Remediations",
    "",
    remediationTable,
    ""
  ].join("\n");
}

export function assertReadableMarkdown(content: string): void {
  const requiredFragments = [
    "# Supply Chain Audit Report",
    "## Metrics",
    "## Findings",
    "## Compliance impacts",
    "## Remediations"
  ];

  for (const fragment of requiredFragments) {
    if (!content.includes(fragment)) {
      throw new Error("Markdown report is missing required fragment: " + fragment);
    }
  }
}
