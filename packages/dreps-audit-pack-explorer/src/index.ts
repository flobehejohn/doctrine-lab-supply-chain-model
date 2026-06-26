import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";

export type JsonRecord = Record<string, unknown>;

export interface ExplorerBuildResult {
  auditPackRoot: string;
  readmePath: string;
  findingsCriticalPath: string;
  complianceFailedPath: string;
  jqExamplesPath: string;
  supplychainMermaidPath: string;
}

function readJsonFile<T>(path: string, fallback: T): T {
  if (!existsSync(path)) {
    return fallback;
  }

  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeText(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, "utf8");
}

function yamlScalar(value: unknown): string {
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === null || value === undefined) {
    return "null";
  }

  return JSON.stringify(String(value));
}

function yamlBlock(value: unknown, indent = 0): string {
  const pad = " ".repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    return value
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          const nested = yamlBlock(item, indent + 2);
          return pad + "- " + nested.trimStart();
        }

        return pad + "- " + yamlScalar(item);
      })
      .join("\n");
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as JsonRecord);

    if (entries.length === 0) {
      return "{}";
    }

    return entries
      .map(([key, item]) => {
        if (Array.isArray(item) || (typeof item === "object" && item !== null)) {
          return pad + key + ":\n" + yamlBlock(item, indent + 2);
        }

        return pad + key + ": " + yamlScalar(item);
      })
      .join("\n");
  }

  return yamlScalar(value);
}

function severityOf(finding: JsonRecord): string {
  const candidates = [
    finding.severity,
    finding.risk,
    finding.level,
    finding.impact
  ];

  const value = candidates.find((item) => typeof item === "string");

  return typeof value === "string" ? value.toLowerCase() : "unknown";
}

function findingIdOf(finding: JsonRecord, index: number): string {
  const candidates = [
    finding.id,
    finding.findingId,
    finding.ruleId,
    finding.policyId,
    finding.title
  ];

  const value = candidates.find((item) => typeof item === "string");

  return typeof value === "string" ? value : "finding-" + String(index + 1);
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function extractFindings(auditPackRoot: string): JsonRecord[] {
  const findingsPack = readJsonFile<JsonRecord>(
    join(auditPackRoot, "findings.json"),
    {
      findings: []
    }
  );

  return toArray(findingsPack.findings)
    .filter((item): item is JsonRecord => typeof item === "object" && item !== null);
}

function extractComplianceImpacts(auditPackRoot: string): JsonRecord[] {
  const compliance = readJsonFile<JsonRecord>(
    join(auditPackRoot, "compliance-report.json"),
    {
      impacts: []
    }
  );

  return toArray(compliance.impacts)
    .filter((item): item is JsonRecord => typeof item === "object" && item !== null);
}

function criticalFindingsYaml(auditPackRoot: string): string {
  const findings = extractFindings(auditPackRoot);
  const critical = findings
    .map((finding, index) => ({
      id: findingIdOf(finding, index),
      severity: severityOf(finding),
      title: typeof finding.title === "string" ? finding.title : findingIdOf(finding, index),
      affectedNodes: toArray(finding.affectedNodes).map(String),
      evidenceRefs: toArray(finding.evidenceRefs).map(String),
      source: typeof finding.source === "string" ? finding.source : "audit-pack/findings.json"
    }))
    .filter((finding) => finding.severity === "critical" || finding.severity === "high");

  const rows = critical.length > 0
    ? critical
    : [
        {
          id: "no-critical-finding-found",
          severity: "none",
          title: "No critical finding found in current pack",
          affectedNodes: [],
          evidenceRefs: [],
          source: "audit-pack/findings.json"
        }
      ];

  return yamlBlock({
    schemaVersion: "jtable.compat.yml.v1",
    title: "Critical findings",
    description: "External auditor view of critical/high findings without UI",
    columns: ["id", "severity", "title", "affectedNodes", "evidenceRefs", "source"],
    rows
  }) + "\n";
}

function complianceFailedYaml(auditPackRoot: string): string {
  const impacts = extractComplianceImpacts(auditPackRoot);
  const failed = impacts
    .map((impact, index) => ({
      id: typeof impact.id === "string" ? impact.id : "compliance-impact-" + String(index + 1),
      framework: typeof impact.framework === "string" ? impact.framework : "unknown",
      control: typeof impact.control === "string" ? impact.control : "unknown",
      findingId: typeof impact.findingId === "string" ? impact.findingId : "unknown",
      impact: typeof impact.impact === "string" ? impact.impact : "unknown",
      status: typeof impact.status === "string" ? impact.status : "failed"
    }))
    .filter((impact) =>
      ["critical", "high", "failed", "non_compliant", "non-compliant"].includes(
        String(impact.impact).toLowerCase()
      ) ||
      ["failed", "non_compliant", "non-compliant"].includes(String(impact.status).toLowerCase())
    );

  const rows = failed.length > 0
    ? failed
    : [
        {
          id: "no-failed-compliance-impact-found",
          framework: "none",
          control: "none",
          findingId: "none",
          impact: "none",
          status: "no failed compliance impact found"
        }
      ];

  return yamlBlock({
    schemaVersion: "jtable.compat.yml.v1",
    title: "Failed compliance impacts",
    description: "External auditor view of failed/high compliance impacts without UI",
    columns: ["id", "framework", "control", "findingId", "impact", "status"],
    rows
  }) + "\n";
}

function explorerReadme(): string {
  return [
    "# Audit Pack Explorer",
    "",
    "This explorer is designed for an external auditor who wants to inspect the audit pack without launching the UI.",
    "",
    "## What to inspect first",
    "",
    "1. `manifest.json` — complete file inventory.",
    "2. `checksums.sha256` — JSON integrity coverage.",
    "3. `findings.json` — normalized findings.",
    "4. `compliance-report.json` — compliance impacts.",
    "5. `blast-radius-report.json` — propagation and sensitive-data exposure.",
    "6. `simulation-results.json` — attack path before/after remediation.",
    "",
    "## jtable views",
    "",
    "- `explorer/jtable-views/findings-critical.yml`",
    "- `explorer/jtable-views/compliance-failed.yml`",
    "",
    "## jq examples",
    "",
    "See:",
    "",
    "```text",
    "explorer/jq-examples.md",
    "```",
    "",
    "## Mermaid graph",
    "",
    "Open:",
    "",
    "```text",
    "explorer/mermaid/supplychain.mmd",
    "```",
    "",
    "## No UI required",
    "",
    "The pack can be audited with a text editor, PowerShell, jq, and a Mermaid renderer.",
    ""
  ].join("\n");
}

function jqExamples(): string {
  return [
    "# jq examples for external auditors",
    "",
    "Run these commands from the root of the extracted `audit-pack/` directory.",
    "",
    "## List manifest files",
    "",
    "```bash",
    "jq -r '.files[].path' manifest.json",
    "```",
    "",
    "## List critical findings",
    "",
    "```bash",
    "jq -r '.findings[] | select((.severity == \"critical\") or (.risk == \"critical\") or (.severity == \"high\") or (.risk == \"high\")) | [.id, .severity, .risk, .title] | @tsv' findings.json",
    "```",
    "",
    "## List failed or high compliance impacts",
    "",
    "```bash",
    "jq -r '.impacts[] | select((.impact == \"critical\") or (.impact == \"high\") or (.status == \"failed\")) | [.framework, .control, .findingId, .impact, .status] | @tsv' compliance-report.json",
    "```",
    "",
    "## Inspect blast radius score",
    "",
    "```bash",
    "jq '{scenario, startNode, blastRadiusScore, criticalNodes, sensitiveDataNodes, controlsThatWouldBlock}' blast-radius-report.json",
    "```",
    "",
    "## Inspect simulation before/after remediation",
    "",
    "```bash",
    "jq '.beforeAfterScore' simulation-results.json",
    "```",
    "",
    "## Verify JSON checksums are listed",
    "",
    "```bash",
    "jq -r '.files[] | select(.kind == \"json\") | .path' manifest.json",
    "cat checksums.sha256",
    "```",
    ""
  ].join("\n");
}

function supplychainMermaid(auditPackRoot: string): string {
  const preferred = join(auditPackRoot, "explorer", "mermaid", "supplychain.mmd");

  if (existsSync(preferred)) {
    return readFileSync(preferred, "utf8");
  }

  return [
    "flowchart TD",
    "  repo[\"repository\"] --> ci[\"ci_pipeline\"]",
    "  ci --> runner[\"gitlab_runner\"]",
    "  runner --> registry[\"registry\"]",
    "  registry --> image[\"container_image\"]",
    "  image --> pod[\"k8s_pod\"]",
    "  pod --> db[\"database\"]",
    "  findings[\"findings.json\"] --> compliance[\"compliance-report.json\"]",
    "  pod --> blast[\"blast-radius-report.json\"]",
    ""
  ].join("\n");
}

export function generateAuditPackExplorer(auditPackRoot: string): ExplorerBuildResult {
  if (!existsSync(auditPackRoot)) {
    throw new Error("Audit pack root does not exist: " + auditPackRoot);
  }

  const explorerRoot = join(auditPackRoot, "explorer");
  const jtableRoot = join(explorerRoot, "jtable-views");
  const mermaidRoot = join(explorerRoot, "mermaid");

  mkdirSync(jtableRoot, { recursive: true });
  mkdirSync(mermaidRoot, { recursive: true });

  const readmePath = join(explorerRoot, "README.md");
  const findingsCriticalPath = join(jtableRoot, "findings-critical.yml");
  const complianceFailedPath = join(jtableRoot, "compliance-failed.yml");
  const jqExamplesPath = join(explorerRoot, "jq-examples.md");
  const supplychainMermaidPath = join(mermaidRoot, "supplychain.mmd");

  writeText(readmePath, explorerReadme());
  writeText(findingsCriticalPath, criticalFindingsYaml(auditPackRoot));
  writeText(complianceFailedPath, complianceFailedYaml(auditPackRoot));
  writeText(jqExamplesPath, jqExamples());
  writeText(supplychainMermaidPath, supplychainMermaid(auditPackRoot));

  return {
    auditPackRoot,
    readmePath,
    findingsCriticalPath,
    complianceFailedPath,
    jqExamplesPath,
    supplychainMermaidPath
  };
}

export function assertAuditPackExplorerShape(result: ExplorerBuildResult): void {
  for (const file of [
    result.readmePath,
    result.findingsCriticalPath,
    result.complianceFailedPath,
    result.jqExamplesPath,
    result.supplychainMermaidPath
  ]) {
    if (!existsSync(file)) {
      throw new Error("Missing explorer file: " + file);
    }

    if (statSync(file).size === 0) {
      throw new Error("Explorer file is empty: " + file);
    }
  }

  const readme = readFileSync(result.readmePath, "utf8");
  const findings = readFileSync(result.findingsCriticalPath, "utf8");
  const compliance = readFileSync(result.complianceFailedPath, "utf8");
  const jq = readFileSync(result.jqExamplesPath, "utf8");
  const mermaid = readFileSync(result.supplychainMermaidPath, "utf8");

  if (!readme.includes("without launching the UI") && !readme.includes("No UI required")) {
    throw new Error("Explorer README does not explain no-UI inspection");
  }

  if (!findings.includes("Critical findings") || !findings.includes("rows:")) {
    throw new Error("findings-critical.yml is not a readable jtable YAML view");
  }

  if (!compliance.includes("Failed compliance impacts") || !compliance.includes("rows:")) {
    throw new Error("compliance-failed.yml is not a readable jtable YAML view");
  }

  if (!jq.includes("blast-radius-report.json") || !jq.includes("compliance-report.json") || !jq.includes("findings.json")) {
    throw new Error("jq examples do not cover findings, compliance and blast radius");
  }

  if (!mermaid.includes("flowchart")) {
    throw new Error("supplychain.mmd is not a Mermaid graph");
  }
}
