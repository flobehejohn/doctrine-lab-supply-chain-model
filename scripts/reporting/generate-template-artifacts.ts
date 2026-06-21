import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  assertRenderedArtifact,
  renderTemplate,
  type TemplateArtifact,
  type TemplateContext
} from "../../packages/dreps-template-engine/src/index.js";

interface JsonRecord {
  [key: string]: unknown;
}

interface EvidencePackLike {
  packId?: string;
  nodes?: JsonRecord[];
  edges?: JsonRecord[];
  evidence?: JsonRecord[];
  findings?: JsonRecord[];
  remediations?: JsonRecord[];
  complianceImpacts?: JsonRecord[];
}

const root = process.cwd();
const inputPath = "labs/supply-chain/examples/ecommerce/evidence-pack.json";
const outDir = ".doctrine/out/templates";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(root, path), "utf8")) as unknown;
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

function markdownEscape(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function markdownTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return "_No rows._";
  }

  const header = "| " + headers.map(markdownEscape).join(" | ") + " |";
  const separator = "| " + headers.map(() => "---").join(" | ") + " |";
  const body = rows
    .map(
      (row) =>
        "| " + row.map((cell) => markdownEscape(cell)).join(" | ") + " |"
    )
    .join("\n");

  return [header, separator, body].join("\n");
}

function mermaidId(id: string): string {
  const normalized = id.replace(/[^A-Za-z0-9_]/g, "_");
  return normalized.length > 0 ? normalized : "node";
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

function writeArtifact(path: string, content: string): TemplateArtifact {
  const outputPath = resolve(root, path);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, content, "utf8");

  return {
    templatePath: "",
    outputPath: path,
    content
  };
}

function renderFromTemplate(
  templatePath: string,
  outputPath: string,
  context: TemplateContext
): TemplateArtifact {
  const template = readFileSync(resolve(root, templatePath), "utf8");
  const content = renderTemplate(template, context);

  const artifact = writeArtifact(outputPath, content);
  artifact.templatePath = templatePath;

  return artifact;
}

const pack = readJson(inputPath) as EvidencePackLike;

const nodes = asArray(pack.nodes);
const edges = asArray(pack.edges);
const evidence = asArray(pack.evidence);
const findings = asArray(pack.findings);
const remediations = asArray(pack.remediations);
const complianceImpacts = asArray(pack.complianceImpacts);

const packId = pack.packId ?? "unknown-pack";

const findingsTable = markdownTable(
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

const complianceTable = markdownTable(
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

const remediationsTable = markdownTable(
  ["ID", "Finding", "Risk", "Approval", "Strategy"],
  remediations.map((remediation) => [
    asText(prop(remediation, "id")),
    asText(prop(remediation, "findingId")),
    asText(prop(remediation, "risk")),
    asText(prop(remediation, "approvalRequired")),
    asText(prop(remediation, "strategy"))
  ])
);

const firstRemediation = remediations[0] ?? {};
const remediationCommandsValue = prop(firstRemediation, "commands");
const remediationCommands = Array.isArray(remediationCommandsValue)
  ? remediationCommandsValue
      .map((command) =>
        typeof command === "object" && command !== null
          ? "- " + asText((command as JsonRecord).command)
          : "- " + asText(command)
      )
      .join("\n")
  : "_No command documented._";

const remediationVerification = asText(prop(firstRemediation, "verification")) || "_No verification documented._";
const rollbackValue = prop(firstRemediation, "rollback");
const remediationRollback =
  typeof rollbackValue === "object" && rollbackValue !== null
    ? asText((rollbackValue as JsonRecord).description)
    : asText(rollbackValue) || "_No rollback documented._";

const mermaidNodes = nodes
  .map((node) => {
    const id = asText(prop(node, "id"));
    const label =
      asText(prop(node, "label")) ||
      asText(prop(node, "title")) ||
      asText(prop(node, "kind")) ||
      id;

    return "  " + mermaidId(id) + '["' + label.replace(/"/g, "'") + '"]';
  })
  .join("\n");

const mermaidEdges = edges
  .map((edge) => {
    const source = edgeSource(edge);
    const target = edgeTarget(edge);
    const label = asText(prop(edge, "kind") ?? prop(edge, "type"));

    if (!source || !target) {
      return "";
    }

    const suffix = label ? ' -- "' + label.replace(/"/g, "'") + '" --> ' : " --> ";

    return "  " + mermaidId(source) + suffix + mermaidId(target);
  })
  .filter((line) => line.length > 0)
  .join("\n");

const criticalFindings = findings.filter(
  (finding) => asText(prop(finding, "severity")) === "critical"
);

const criticalFindingsList =
  criticalFindings.length === 0
    ? "- No critical finding."
    : criticalFindings
        .map((finding) => "- " + asText(prop(finding, "id")) + " — " + asText(prop(finding, "title")))
        .join("\n");

const executiveNextActions =
  remediations.length === 0
    ? "- No remediation available."
    : remediations
        .map((remediation) => "- " + asText(prop(remediation, "id")) + ": " + asText(prop(remediation, "strategy")))
        .join("\n");

const context: TemplateContext = {
  packId,
  generatedAt: new Date().toISOString(),
  nodeCount: nodes.length,
  edgeCount: edges.length,
  evidenceCount: evidence.length,
  findingCount: findings.length,
  criticalFindingCount: criticalFindings.length,
  remediationCount: remediations.length,
  complianceImpactCount: complianceImpacts.length,
  findingsTable,
  complianceTable,
  remediationsTable,
  remediationId: asText(prop(firstRemediation, "id")),
  remediationFindingId: asText(prop(firstRemediation, "findingId")),
  remediationStrategy: asText(prop(firstRemediation, "strategy")),
  remediationRisk: asText(prop(firstRemediation, "risk")),
  remediationApprovalRequired: asText(prop(firstRemediation, "approvalRequired")),
  remediationCommands,
  remediationVerification,
  remediationRollback,
  mermaidNodes,
  mermaidEdges,
  criticalFindingsList,
  executiveNextActions
};

const artifacts = [
  renderFromTemplate(
    "reporting/markdown/templates/audit-report.md.eta",
    outDir + "/audit-report.md",
    context
  ),
  renderFromTemplate(
    "reporting/markdown/templates/pr-remediation.md.eta",
    outDir + "/pr-remediation.md",
    context
  ),
  renderFromTemplate(
    "reporting/mermaid/templates/supplychain.mmd.eta",
    outDir + "/supplychain.mmd",
    context
  ),
  renderFromTemplate(
    "reporting/marp/templates/executive-summary.marp.md.eta",
    outDir + "/executive-summary.marp.md",
    context
  )
];

assertRenderedArtifact(artifacts[0]!, [
  "Supply Chain Audit Report",
  "Findings",
  "Compliance impacts"
]);

assertRenderedArtifact(artifacts[1]!, [
  "Remediation PR",
  "Rollback",
  "Evidence pack"
]);

assertRenderedArtifact(artifacts[2]!, [
  "flowchart LR"
]);

assertRenderedArtifact(artifacts[3]!, [
  "marp: true",
  "Supply Chain Executive Summary"
]);

console.log("Template generation passed.");
console.log("packId: " + packId);

for (const artifact of artifacts) {
  console.log("- " + artifact.outputPath);
}
