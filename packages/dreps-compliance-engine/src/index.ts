import { readFileSync } from "node:fs";

export type JsonRecord = Record<string, unknown>;

export const SupportedFrameworks = [
  "SLSA",
  "DORA",
  "NIS2",
  "ISO27001",
  "CIS_KUBERNETES",
  "OWASP_ASVS",
  "OWASP_SAMM"
] as const;

export type ComplianceFramework = typeof SupportedFrameworks[number];
export type ComplianceImpactLevel = "none" | "low" | "medium" | "high" | "critical";

export interface TechnicalNode extends JsonRecord {
  id: string;
  type: string;
  name?: string;
}

export interface TechnicalEvidence {
  id: string;
  type: string;
  title: string;
  path: string;
}

export interface TechnicalFinding {
  id: string;
  severity: string;
  title: string;
  affectedNodes: string[];
  evidenceRefs: string[];
}

export interface TechnicalContext {
  schemaVersion?: string;
  source?: string;
  nodes: TechnicalNode[];
  evidence: TechnicalEvidence[];
  findings: TechnicalFinding[];
}

export interface ComplianceMappingRule {
  findingId: string;
  control: string;
  title: string;
  impact: ComplianceImpactLevel;
  supplyChainImpact: boolean;
  rationale: string;
  evidenceRefs: string[];
}

export interface ComplianceMapFile {
  schemaVersion?: string;
  framework: ComplianceFramework;
  mappings: ComplianceMappingRule[];
}

export interface ComplianceImpact {
  id: string;
  framework: ComplianceFramework;
  control: string;
  findingId: string;
  title: string;
  impact: ComplianceImpactLevel;
  supplyChainImpact: boolean;
  rationale: string;
  affectedNodes: string[];
  affectedNodeTypes: string[];
  evidenceRefs: string[];
}

export interface ComplianceReport {
  schemaVersion: "dreps-compliance-impact-report.v1";
  generatedAt: string;
  source: string;
  frameworks: ComplianceFramework[];
  findingsEvaluated: number;
  impacts: ComplianceImpact[];
  summary: Record<ComplianceFramework, number>;
}

export interface JtablePayload {
  schemaVersion: "jtable.compat.v1";
  title: string;
  columns: Array<{
    key: string;
    label: string;
  }>;
  rows: Array<Record<string, string | number | boolean>>;
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function impactId(framework: string, control: string, findingId: string): string {
  return (
    framework.toLowerCase() +
    ":" +
    control.toLowerCase().replace(/[^a-z0-9_.:-]/g, "-") +
    ":" +
    findingId
  );
}

function emptySummary(): Record<ComplianceFramework, number> {
  return Object.fromEntries(SupportedFrameworks.map((framework) => [framework, 0])) as Record<ComplianceFramework, number>;
}

export function loadTechnicalContext(path: string): TechnicalContext {
  const context = readJsonFile<TechnicalContext>(path);

  if (!Array.isArray(context.nodes)) {
    throw new Error("Technical context requires nodes");
  }

  if (!Array.isArray(context.findings)) {
    throw new Error("Technical context requires findings");
  }

  return {
    ...context,
    evidence: Array.isArray(context.evidence) ? context.evidence : []
  };
}

export function loadComplianceMap(path: string): ComplianceMapFile {
  const map = readJsonFile<ComplianceMapFile>(path);

  if (!SupportedFrameworks.includes(map.framework)) {
    throw new Error("Unsupported compliance framework: " + map.framework);
  }

  if (!Array.isArray(map.mappings)) {
    throw new Error("Compliance map requires mappings: " + path);
  }

  return map;
}

export function mapComplianceImpacts(
  context: TechnicalContext,
  maps: ComplianceMapFile[],
  generatedAt = "2026-06-25T00:00:00.000Z"
): ComplianceReport {
  const nodesById = byId(context.nodes);
  const impacts: ComplianceImpact[] = [];

  for (const finding of context.findings) {
    for (const map of maps) {
      for (const rule of map.mappings.filter((item) => item.findingId === finding.id)) {
        const affectedNodeTypes = unique(
          finding.affectedNodes
            .map((nodeId) => nodesById.get(nodeId)?.type)
            .filter((type): type is string => Boolean(type))
        );

        impacts.push({
          id: impactId(map.framework, rule.control, finding.id),
          framework: map.framework,
          control: rule.control,
          findingId: finding.id,
          title: rule.title,
          impact: rule.impact,
          supplyChainImpact: rule.supplyChainImpact,
          rationale: rule.rationale,
          affectedNodes: finding.affectedNodes,
          affectedNodeTypes,
          evidenceRefs: unique([...finding.evidenceRefs, ...rule.evidenceRefs])
        });
      }
    }
  }

  const summary = emptySummary();

  for (const impact of impacts) {
    summary[impact.framework] += 1;
  }

  return {
    schemaVersion: "dreps-compliance-impact-report.v1",
    generatedAt,
    source: context.source ?? "technical-context",
    frameworks: SupportedFrameworks.filter((framework) => summary[framework] > 0),
    findingsEvaluated: context.findings.length,
    impacts,
    summary
  };
}

export function renderComplianceSummary(report: ComplianceReport): string {
  const lines = [
    "# Compliance Impact Summary",
    "",
    "- Findings evaluated: `" + report.findingsEvaluated + "`",
    "- Impacts generated: `" + report.impacts.length + "`",
    "",
    "## Framework coverage",
    "",
    "| Framework | Impacts |",
    "| --- | ---: |"
  ];

  for (const framework of SupportedFrameworks) {
    lines.push("| " + framework + " | " + report.summary[framework] + " |");
  }

  lines.push("");
  lines.push("## Impacts");
  lines.push("");

  for (const impact of report.impacts) {
    lines.push(
      "- `" +
        impact.framework +
        "` / `" +
        impact.control +
        "` — `" +
        impact.findingId +
        "` — impact `" +
        impact.impact +
        "`"
    );
  }

  lines.push("");
  return lines.join("\n");
}

export function toJtablePayload(report: ComplianceReport): JtablePayload {
  return {
    schemaVersion: "jtable.compat.v1",
    title: "Compliance Impact Mapping",
    columns: [
      { key: "framework", label: "Framework" },
      { key: "control", label: "Control" },
      { key: "findingId", label: "Finding" },
      { key: "impact", label: "Impact" },
      { key: "supplyChainImpact", label: "Supply chain" },
      { key: "affectedNodes", label: "Affected nodes" }
    ],
    rows: report.impacts.map((impact) => ({
      framework: impact.framework,
      control: impact.control,
      findingId: impact.findingId,
      impact: impact.impact,
      supplyChainImpact: impact.supplyChainImpact,
      affectedNodes: impact.affectedNodes.join(", ")
    }))
  };
}

export function assertComplianceReportShape(report: ComplianceReport): void {
  if (report.schemaVersion !== "dreps-compliance-impact-report.v1") {
    throw new Error("Invalid compliance report schemaVersion");
  }

  const impacts = report.impacts;

  const unsignedSlsa = impacts.find(
    (impact) => impact.findingId === "no-unsigned-container-image" && impact.framework === "SLSA"
  );

  if (!unsignedSlsa) {
    throw new Error("Unsigned image does not produce SLSA impact");
  }

  if (!unsignedSlsa.affectedNodes.includes("image_checkout_latest")) {
    throw new Error("Unsigned image SLSA impact does not reference image_checkout_latest");
  }

  const podDora = impacts.find(
    (impact) => impact.findingId === "no-public-critical-vulnerable-pod" && impact.framework === "DORA"
  );

  if (!podDora) {
    throw new Error("Exposed vulnerable pod does not produce DORA impact");
  }

  const podNis2 = impacts.find(
    (impact) => impact.findingId === "no-public-critical-vulnerable-pod" && impact.framework === "NIS2"
  );

  if (!podNis2) {
    throw new Error("Exposed vulnerable pod does not produce NIS2 impact");
  }

  const runnerSupplyChain = impacts.find(
    (impact) =>
      impact.findingId === "no-runner-privileged" &&
      impact.supplyChainImpact === true &&
      impact.affectedNodes.includes("runner_privileged")
  );

  if (!runnerSupplyChain) {
    throw new Error("Privileged runner does not produce supply-chain impact");
  }

  for (const impact of impacts) {
    if (impact.affectedNodes.length === 0) {
      throw new Error("Compliance impact has no affectedNodes: " + impact.id);
    }

    if (impact.evidenceRefs.length === 0) {
      throw new Error("Compliance impact has no evidenceRefs: " + impact.id);
    }
  }
}
