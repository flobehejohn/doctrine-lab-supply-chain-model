import { readFileSync } from "node:fs";

export type JsonRecord = Record<string, unknown>;

export const ConfigMatrixFindingIds = [
  "prod-uses-latest-image",
  "prod-config-drift",
  "missing-prod-network-policy",
  "undocumented-env-difference"
] as const;

export interface EnvConfig {
  name: "dev" | "staging" | "prod" | string;
  image: string;
  replicas: number;
  logLevel: string;
  networkPolicy: boolean;
  database: string;
  secretsProvider: string;
  allowedExternalEgress: string;
  configVersion: string;
}

export interface DocumentedDifference {
  key: string;
  environments: string[];
  reason: string;
}

export interface EnvMatrixFixture {
  schemaVersion?: string;
  source?: string;
  environments: EnvConfig[];
  documentedDifferences: DocumentedDifference[];
}

export interface DriftItem {
  key: string;
  dev: string | number | boolean;
  staging: string | number | boolean;
  prod: string | number | boolean;
  prodDiffersFromStaging: boolean;
  documented: boolean;
  severity: "low" | "medium" | "high" | "critical";
}

export interface EnvMatrixReport {
  source: string;
  generatedAt: string;
  baseline: "staging";
  target: "prod";
  environments: EnvConfig[];
  drift: DriftItem[];
  findings: Array<{
    id: string;
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    affectedNodes: string[];
    evidenceRefs: string[];
  }>;
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

type DrepsEdgeType =
  | "contains"
  | "triggers"
  | "runs"
  | "runs_on"
  | "builds"
  | "publishes"
  | "deploys"
  | "routes_to"
  | "exposes"
  | "connects_to"
  | "reads_from"
  | "writes_to"
  | "depends_on"
  | "documents"
  | "affects"
  | "mitigates"
  | "owned_by"
  | "stores"
  | "verifies"
  | "signs";

type DrepsEvidenceType =
  | "source_file"
  | "ci_workflow"
  | "scan_result"
  | "sbom"
  | "runtime_observation"
  | "configuration"
  | "certificate"
  | "manual_attestation"
  | "audit_log";

type DrepsFindingStatus = "open" | "accepted" | "mitigated" | "resolved";

type DrepsComplianceFramework =
  | "SLSA"
  | "DORA"
  | "NIS2"
  | "ISO27001"
  | "CIS_KUBERNETES"
  | "OWASP_ASVS"
  | "OWASP_SAMM";

type DrepsComplianceImpact = "none" | "low" | "medium" | "high" | "critical";

function cloneRecord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function asRecord(value: unknown): JsonRecord {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  return {};
}

function asRecords(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asRecord(item))
    .filter((item) => Object.keys(item).length > 0);
}

function asText(value: unknown, fallback = ""): string {
  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value);
}

function templateAt(records: JsonRecord[], index: number): JsonRecord {
  if (records.length === 0) {
    return {};
  }

  return cloneRecord(records[index % records.length]!);
}

function setFirstPresentOrDefault(
  record: JsonRecord,
  keys: string[],
  value: unknown,
  defaultKey: string
): void {
  let updated = false;

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      record[key] = value;
      updated = true;
    }
  }

  if (!updated) {
    record[defaultKey] = value;
  }
}

function makeNode(
  templates: JsonRecord[],
  index: number,
  id: string,
  type: string,
  name: string,
  extra: JsonRecord = {}
): JsonRecord {
  const node = templateAt(templates, index);

  setFirstPresentOrDefault(node, ["id"], id, "id");
  setFirstPresentOrDefault(node, ["type", "kind"], type, "type");
  setFirstPresentOrDefault(node, ["name", "label", "title"], name, "name");

  return {
    ...node,
    ...extra,
    id,
    type,
    kind: type,
    name,
    label: name,
    title: name
  };
}

function makeEdge(
  templates: JsonRecord[],
  index: number,
  id: string,
  source: string,
  target: string,
  type: DrepsEdgeType,
  label: string
): JsonRecord {
  const edge = templateAt(templates, index);

  setFirstPresentOrDefault(edge, ["id"], id, "id");
  setFirstPresentOrDefault(edge, ["source", "from", "sourceNodeId", "sourceId"], source, "source");
  setFirstPresentOrDefault(edge, ["target", "to", "targetNodeId", "targetId"], target, "target");
  setFirstPresentOrDefault(edge, ["type", "kind"], type, "type");
  setFirstPresentOrDefault(edge, ["label", "title"], label, "label");

  return {
    ...edge,
    id,
    source,
    target,
    type,
    kind: type,
    label
  };
}

function makeEvidence(
  templates: JsonRecord[],
  index: number,
  id: string,
  type: DrepsEvidenceType,
  title: string,
  path: string,
  extra: JsonRecord = {}
): JsonRecord {
  const evidence = templateAt(templates, index);

  setFirstPresentOrDefault(evidence, ["id"], id, "id");
  setFirstPresentOrDefault(evidence, ["type", "kind"], type, "type");
  setFirstPresentOrDefault(evidence, ["title", "label", "name"], title, "title");
  setFirstPresentOrDefault(evidence, ["path", "artifact", "uri"], path, "path");

  return {
    ...evidence,
    ...extra,
    id,
    type,
    kind: type,
    title,
    path
  };
}

function makeFinding(
  templates: JsonRecord[],
  index: number,
  id: string,
  severity: string,
  title: string,
  affectedNodes: string[],
  evidenceRefs: string[],
  status: DrepsFindingStatus
): JsonRecord {
  const finding = templateAt(templates, index);

  setFirstPresentOrDefault(finding, ["id"], id, "id");
  setFirstPresentOrDefault(finding, ["severity", "risk"], severity, "severity");
  setFirstPresentOrDefault(finding, ["title", "label", "name"], title, "title");
  setFirstPresentOrDefault(finding, ["status"], status, "status");
  setFirstPresentOrDefault(finding, ["affectedNodes", "affectedNodeIds"], affectedNodes, "affectedNodes");
  setFirstPresentOrDefault(finding, ["evidenceRefs", "evidenceIds"], evidenceRefs, "evidenceRefs");

  return {
    ...finding,
    id,
    severity,
    title,
    status,
    affectedNodes,
    evidenceRefs
  };
}

function makeRemediation(
  templates: JsonRecord[],
  index: number,
  id: string,
  findingId: string,
  strategy: string,
  affectedNodes: string[],
  evidenceRefs: string[]
): JsonRecord {
  const remediation = templateAt(templates, index);

  setFirstPresentOrDefault(remediation, ["id"], id, "id");
  setFirstPresentOrDefault(remediation, ["findingId", "findingRef"], findingId, "findingId");
  setFirstPresentOrDefault(remediation, ["strategy", "title", "description"], strategy, "strategy");
  setFirstPresentOrDefault(remediation, ["affectedNodes", "affectedNodeIds"], affectedNodes, "affectedNodes");
  setFirstPresentOrDefault(remediation, ["evidenceRefs", "evidenceIds"], evidenceRefs, "evidenceRefs");

  return {
    ...remediation,
    id,
    findingId,
    strategy,
    affectedNodes,
    evidenceRefs
  };
}

function makeComplianceImpact(
  templates: JsonRecord[],
  index: number,
  id: string,
  framework: DrepsComplianceFramework,
  control: string,
  impact: DrepsComplianceImpact,
  findingRefs: string[]
): JsonRecord {
  const compliance = templateAt(templates, index);

  setFirstPresentOrDefault(compliance, ["id"], id, "id");
  setFirstPresentOrDefault(compliance, ["framework"], framework, "framework");
  setFirstPresentOrDefault(compliance, ["control"], control, "control");
  setFirstPresentOrDefault(compliance, ["impact"], impact, "impact");
  setFirstPresentOrDefault(compliance, ["findingRefs", "findings"], findingRefs, "findingRefs");

  return {
    ...compliance,
    id,
    framework,
    control,
    impact,
    findingRefs
  };
}

export function loadEnvMatrix(path: string): EnvMatrixFixture {
  const matrix = JSON.parse(readFileSync(path, "utf8")) as EnvMatrixFixture;

  const names = new Set(matrix.environments.map((env) => env.name));

  for (const required of ["dev", "staging", "prod"]) {
    if (!names.has(required)) {
      throw new Error("Missing environment in matrix: " + required);
    }
  }

  return matrix;
}

function valueOf(env: EnvConfig, key: keyof EnvConfig): string | number | boolean {
  return env[key] as string | number | boolean;
}

function isDocumentedDifference(
  documented: DocumentedDifference[],
  key: string,
  left: string,
  right: string
): boolean {
  return documented.some((item) => {
    const envs = new Set(item.environments);
    return item.key === key && envs.has(left) && envs.has(right);
  });
}

export function compareEnvMatrix(
  matrix: EnvMatrixFixture,
  generatedAt = "2026-06-25T00:00:00.000Z"
): EnvMatrixReport {
  const dev = matrix.environments.find((env) => env.name === "dev");
  const staging = matrix.environments.find((env) => env.name === "staging");
  const prod = matrix.environments.find((env) => env.name === "prod");

  if (!dev || !staging || !prod) {
    throw new Error("Matrix requires dev, staging and prod");
  }

  const keys: Array<keyof EnvConfig> = [
    "image",
    "replicas",
    "logLevel",
    "networkPolicy",
    "database",
    "secretsProvider",
    "allowedExternalEgress",
    "configVersion"
  ];

  const drift = keys.map((key) => {
    const prodDiffersFromStaging = valueOf(prod, key) !== valueOf(staging, key);
    const documented = isDocumentedDifference(matrix.documentedDifferences, key, "staging", "prod");

    return {
      key,
      dev: valueOf(dev, key),
      staging: valueOf(staging, key),
      prod: valueOf(prod, key),
      prodDiffersFromStaging,
      documented,
      severity: prodDiffersFromStaging && !documented ? "high" : "low"
    } satisfies DriftItem;
  });

  const findings = configMatrixFindings(matrix, drift);

  return {
    source: matrix.source ?? "env-matrix",
    generatedAt,
    baseline: "staging",
    target: "prod",
    environments: matrix.environments,
    drift,
    findings
  };
}

export function configMatrixFindings(
  matrix: EnvMatrixFixture,
  drift: DriftItem[]
): EnvMatrixReport["findings"] {
  const prod = matrix.environments.find((env) => env.name === "prod");

  if (!prod) {
    throw new Error("Missing prod environment");
  }

  const findings: EnvMatrixReport["findings"] = [];

  if (prod.image.endsWith(":latest")) {
    findings.push({
      id: "prod-uses-latest-image",
      severity: "high",
      title: "Production uses a latest container image tag",
      affectedNodes: ["env_prod", "config_matrix"],
      evidenceRefs: ["evidence_env_matrix", "evidence_config_drift_report"]
    });
  }

  const prodDrift = drift.filter((item) => item.prodDiffersFromStaging);

  if (prodDrift.length > 0) {
    findings.push({
      id: "prod-config-drift",
      severity: "high",
      title: "Production configuration drifts from staging baseline",
      affectedNodes: ["env_prod", "env_staging", "config_matrix"],
      evidenceRefs: ["evidence_config_drift_report"]
    });
  }

  if (!prod.networkPolicy) {
    findings.push({
      id: "missing-prod-network-policy",
      severity: "critical",
      title: "Production environment has no network policy enabled",
      affectedNodes: ["env_prod", "config_matrix"],
      evidenceRefs: ["evidence_env_matrix", "evidence_config_drift_report"]
    });
  }

  const undocumented = drift.filter((item) => item.prodDiffersFromStaging && !item.documented);

  if (undocumented.length > 0) {
    findings.push({
      id: "undocumented-env-difference",
      severity: "medium",
      title: "Environment differences are not documented",
      affectedNodes: ["env_prod", "env_staging", "config_matrix"],
      evidenceRefs: ["evidence_config_drift_report", "evidence_env_matrix"]
    });
  }

  return findings;
}

export function toJtablePayload(matrix: EnvMatrixFixture): JtablePayload {
  return {
    schemaVersion: "jtable.compat.v1",
    title: "Environment Matrix",
    columns: [
      { key: "key", label: "Key" },
      { key: "dev", label: "Dev" },
      { key: "staging", label: "Staging" },
      { key: "prod", label: "Prod" }
    ],
    rows: [
      "image",
      "replicas",
      "logLevel",
      "networkPolicy",
      "database",
      "secretsProvider",
      "allowedExternalEgress",
      "configVersion"
    ].map((key) => {
      const dev = matrix.environments.find((env) => env.name === "dev")!;
      const staging = matrix.environments.find((env) => env.name === "staging")!;
      const prod = matrix.environments.find((env) => env.name === "prod")!;

      return {
        key,
        dev: valueOf(dev, key as keyof EnvConfig),
        staging: valueOf(staging, key as keyof EnvConfig),
        prod: valueOf(prod, key as keyof EnvConfig)
      };
    })
  };
}

export function renderMarkdownMatrix(table: JtablePayload): string {
  const lines = [
    "| Key | Dev | Staging | Prod |",
    "| --- | --- | --- | --- |"
  ];

  for (const row of table.rows) {
    lines.push(
      "| " +
        String(row.key) +
        " | " +
        String(row.dev) +
        " | " +
        String(row.staging) +
        " | " +
        String(row.prod) +
        " |"
    );
  }

  lines.push("");
  return lines.join("\n");
}

export function buildConfigMatrixEvidencePack(
  baseEvidencePack: JsonRecord,
  report: EnvMatrixReport,
  paths: {
    matrixPath: string;
    driftReportPath: string;
    jtablePath: string;
    markdownTablePath: string;
  }
): JsonRecord {
  const base = cloneRecord(baseEvidencePack);
  const nodeTemplates = asRecords(base.nodes);
  const edgeTemplates = asRecords(base.edges);
  const evidenceTemplates = asRecords(base.evidence);
  const findingTemplates = asRecords(base.findings);
  const remediationTemplates = asRecords(base.remediations);
  const complianceTemplates = asRecords(base.complianceImpacts);

  const nodes = [
    makeNode(nodeTemplates, 0, "config_matrix", "artifact", "Environment configuration matrix", {
      baseline: report.baseline,
      target: report.target
    }),
    makeNode(nodeTemplates, 1, "env_dev", "artifact", "Environment dev", {
      environment: "dev"
    }),
    makeNode(nodeTemplates, 2, "env_staging", "artifact", "Environment staging", {
      environment: "staging"
    }),
    makeNode(nodeTemplates, 3, "env_prod", "artifact", "Environment prod", {
      environment: "prod"
    }),
    makeNode(nodeTemplates, 4, "config_drift_report", "artifact", "Configuration drift report", {
      driftCount: report.drift.filter((item) => item.prodDiffersFromStaging).length
    })
  ];

  const edges = [
    makeEdge(edgeTemplates, 0, "edge_matrix_dev", "config_matrix", "env_dev", "contains", "matrix contains dev"),
    makeEdge(edgeTemplates, 1, "edge_matrix_staging", "config_matrix", "env_staging", "contains", "matrix contains staging"),
    makeEdge(edgeTemplates, 2, "edge_matrix_prod", "config_matrix", "env_prod", "contains", "matrix contains prod"),
    makeEdge(edgeTemplates, 3, "edge_matrix_drift", "config_matrix", "config_drift_report", "documents", "matrix documents drift"),
    makeEdge(edgeTemplates, 4, "edge_staging_prod_compare", "env_staging", "env_prod", "affects", "staging baseline is compared to prod")
  ];

  const evidence = [
    makeEvidence(evidenceTemplates, 0, "evidence_env_matrix", "configuration", "Environment matrix source", paths.matrixPath, {
      environments: report.environments.map((env) => env.name)
    }),
    makeEvidence(evidenceTemplates, 1, "evidence_config_drift_report", "scan_result", "Environment drift report", paths.driftReportPath, {
      driftCount: report.drift.filter((item) => item.prodDiffersFromStaging).length
    }),
    makeEvidence(evidenceTemplates, 2, "evidence_env_matrix_jtable", "configuration", "jtable-compatible environment matrix", paths.jtablePath, {
      renderer: "jtable.compat.v1"
    }),
    makeEvidence(evidenceTemplates, 3, "evidence_env_matrix_markdown", "source_file", "Markdown environment matrix", paths.markdownTablePath)
  ];

  const findings = report.findings.map((finding, index) =>
    makeFinding(
      findingTemplates,
      index,
      finding.id,
      finding.severity,
      finding.title,
      finding.affectedNodes,
      finding.evidenceRefs,
      "open"
    )
  );

  const remediations = [
    makeRemediation(
      remediationTemplates,
      0,
      "remediate-prod-latest-image",
      "prod-uses-latest-image",
      "Pin production images to immutable digests or versioned tags.",
      ["env_prod", "config_matrix"],
      ["evidence_env_matrix"]
    ),
    makeRemediation(
      remediationTemplates,
      1,
      "remediate-prod-config-drift",
      "prod-config-drift",
      "Promote staging configuration to production through a reviewed config change.",
      ["env_prod", "env_staging"],
      ["evidence_config_drift_report"]
    ),
    makeRemediation(
      remediationTemplates,
      2,
      "remediate-prod-network-policy",
      "missing-prod-network-policy",
      "Enable and document production Kubernetes NetworkPolicy.",
      ["env_prod"],
      ["evidence_env_matrix"]
    ),
    makeRemediation(
      remediationTemplates,
      3,
      "remediate-undocumented-env-difference",
      "undocumented-env-difference",
      "Document every intentional staging/prod difference with owner and expiry.",
      ["env_prod", "env_staging"],
      ["evidence_config_drift_report"]
    )
  ];

  const complianceImpacts = [
    makeComplianceImpact(
      complianceTemplates,
      0,
      "config-matrix-impact-slsa",
      "SLSA",
      "DEPLOYMENT_CONFIGURATION_INTEGRITY",
      "high",
      report.findings.map((finding) => finding.id)
    ),
    makeComplianceImpact(
      complianceTemplates,
      1,
      "config-matrix-impact-iso27001",
      "ISO27001",
      "CONFIGURATION_AND_CHANGE_CONTROL",
      "high",
      report.findings.map((finding) => finding.id)
    )
  ];

  return {
    ...base,
    packId: "config-matrix-dreps-evidence-pack",
    nodes,
    edges,
    evidence,
    findings,
    remediations,
    complianceImpacts,
    metadata: {
      ...asRecord(base.metadata),
      adapter: "dreps-config-matrix",
      source: report.source,
      generatedAt: report.generatedAt
    }
  };
}

export function assertConfigMatrixEvidencePackShape(evidencePack: JsonRecord): void {
  const nodes = asRecords(evidencePack.nodes);
  const evidence = asRecords(evidencePack.evidence);
  const findings = asRecords(evidencePack.findings);

  const nodeIds = new Set(nodes.map((node) => asText(node.id)));
  const evidenceIds = new Set(evidence.map((item) => asText(item.id)));
  const findingIds = new Set(findings.map((item) => asText(item.id)));

  for (const requiredNode of ["config_matrix", "env_dev", "env_staging", "env_prod", "config_drift_report"]) {
    if (!nodeIds.has(requiredNode)) {
      throw new Error("Missing config matrix node: " + requiredNode);
    }
  }

  for (const requiredEvidence of [
    "evidence_env_matrix",
    "evidence_config_drift_report",
    "evidence_env_matrix_jtable",
    "evidence_env_matrix_markdown"
  ]) {
    if (!evidenceIds.has(requiredEvidence)) {
      throw new Error("Missing config matrix evidence: " + requiredEvidence);
    }
  }

  for (const requiredFinding of ConfigMatrixFindingIds) {
    if (!findingIds.has(requiredFinding)) {
      throw new Error("Missing config matrix finding: " + requiredFinding);
    }
  }

  const latestFinding = findings.find((finding) => asText(finding.id) === "prod-uses-latest-image");
  const affectedNodes = Array.isArray(latestFinding?.affectedNodes)
    ? latestFinding.affectedNodes.map((item) => asText(item))
    : [];

  if (!affectedNodes.includes("env_prod")) {
    throw new Error("prod-uses-latest-image is not linked to env_prod");
  }
}
