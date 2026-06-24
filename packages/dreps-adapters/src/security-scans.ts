import { readFileSync } from "node:fs";

export type JsonRecord = Record<string, unknown>;

export interface SecurityFinding {
  id: string;
  tool: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  targetNode: string;
  evidenceId: string;
  sourcePath: string;
}

export interface SecurityScanImportResult {
  tool: string;
  sourcePath: string;
  findings: SecurityFinding[];
  components?: string[];
}

export const SecurityScanFindingIds = [
  "trivy-image-vulnerability",
  "checkov-k8s-image-digest",
  "checkov-terraform-database-encryption",
  "kubescape-pod-control-failure",
  "kubescape-namespace-network-policy",
  "sonarqube-source-issue",
  "dependency-track-vulnerability"
] as const;

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

function severity(value: unknown): "low" | "medium" | "high" | "critical" {
  const normalized = asText(value, "LOW").toLowerCase();

  if (normalized.includes("critical")) return "critical";
  if (normalized.includes("high")) return "high";
  if (normalized.includes("medium") || normalized.includes("major")) return "medium";

  return "low";
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

function makeEvidence(
  templates: JsonRecord[],
  index: number,
  id: string,
  type: DrepsEvidenceType,
  title: string,
  path: string
): JsonRecord {
  const evidence = templateAt(templates, index);

  setFirstPresentOrDefault(evidence, ["id"], id, "id");
  setFirstPresentOrDefault(evidence, ["type", "kind"], type, "type");
  setFirstPresentOrDefault(evidence, ["title", "label", "name"], title, "title");
  setFirstPresentOrDefault(evidence, ["path", "artifact", "uri"], path, "path");

  return {
    ...evidence,
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
  severityValue: string,
  title: string,
  affectedNodes: string[],
  evidenceRefs: string[],
  status: DrepsFindingStatus
): JsonRecord {
  const finding = templateAt(templates, index);

  setFirstPresentOrDefault(finding, ["id"], id, "id");
  setFirstPresentOrDefault(finding, ["severity", "risk"], severityValue, "severity");
  setFirstPresentOrDefault(finding, ["title", "label", "name"], title, "title");
  setFirstPresentOrDefault(finding, ["status"], status, "status");
  setFirstPresentOrDefault(finding, ["affectedNodes", "affectedNodeIds"], affectedNodes, "affectedNodes");
  setFirstPresentOrDefault(finding, ["evidenceRefs", "evidenceIds"], evidenceRefs, "evidenceRefs");

  return {
    ...finding,
    id,
    severity: severityValue,
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

export function importTrivy(path: string): SecurityScanImportResult {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as {
    Results?: Array<{
      Vulnerabilities?: Array<{
        VulnerabilityID?: string;
        Severity?: string;
        Title?: string;
        PkgName?: string;
      }>;
    }>;
  };

  const vulnerabilities = parsed.Results?.flatMap((result) => result.Vulnerabilities ?? []) ?? [];

  return {
    tool: "trivy",
    sourcePath: path,
    findings: vulnerabilities.map((item, index) => ({
      id: index === 0 ? "trivy-image-vulnerability" : "trivy-image-vulnerability-" + index,
      tool: "trivy",
      severity: severity(item.Severity),
      title: item.VulnerabilityID + " " + (item.Title ?? item.PkgName ?? "container image vulnerability"),
      targetNode: "container_image",
      evidenceId: "evidence_trivy",
      sourcePath: path
    }))
  };
}

export function importSyft(path: string): SecurityScanImportResult {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as {
    artifacts?: Array<{
      name?: string;
      version?: string;
    }>;
  };

  const components = (parsed.artifacts ?? [])
    .map((artifact) => artifact.name ?? "")
    .filter(Boolean);

  return {
    tool: "syft",
    sourcePath: path,
    components,
    findings: []
  };
}

export function importCheckov(path: string): SecurityScanImportResult {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as {
    results?: {
      failed_checks?: Array<{
        check_id?: string;
        check_name?: string;
        file_path?: string;
        resource?: string;
        severity?: string;
      }>;
    };
  };

  const failed = parsed.results?.failed_checks ?? [];

  return {
    tool: "checkov",
    sourcePath: path,
    findings: failed.map((item) => {
      const filePath = item.file_path ?? "";
      const resource = item.resource ?? "";
      const isTerraform = filePath.includes("terraform") || resource.includes("aws_");
      const isDatabase = resource.includes("db") || resource.includes("aws_db_instance");

      return {
        id: item.check_id === "CKV_AWS_17"
          ? "checkov-terraform-database-encryption"
          : "checkov-k8s-image-digest",
        tool: "checkov",
        severity: severity(item.severity),
        title: item.check_id + " " + (item.check_name ?? "Checkov finding"),
        targetNode: isTerraform && isDatabase ? "database" : "k8s_workload",
        evidenceId: "evidence_checkov",
        sourcePath: path
      };
    })
  };
}

export function importKubescape(path: string): SecurityScanImportResult {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as {
    controls?: Array<{
      controlID?: string;
      name?: string;
      status?: string;
      resources?: Array<{
        kind?: string;
        name?: string;
        namespace?: string;
      }>;
    }>;
  };

  const failed = (parsed.controls ?? []).filter((control) => control.status === "failed");

  return {
    tool: "kubescape",
    sourcePath: path,
    findings: failed.map((control) => {
      const firstResource = control.resources?.[0];
      const isNamespace = firstResource?.kind === "Namespace";

      return {
        id: isNamespace ? "kubescape-namespace-network-policy" : "kubescape-pod-control-failure",
        tool: "kubescape",
        severity: "medium",
        title: control.controlID + " " + (control.name ?? "Kubescape control failure"),
        targetNode: isNamespace ? "k8s_namespace" : "k8s_pod",
        evidenceId: "evidence_kubescape",
        sourcePath: path
      };
    })
  };
}

export function importSonarQube(path: string): SecurityScanImportResult {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as {
    issues?: Array<{
      key?: string;
      rule?: string;
      severity?: string;
      message?: string;
    }>;
  };

  const issues = parsed.issues ?? [];

  return {
    tool: "sonarqube",
    sourcePath: path,
    findings: issues.map((issue, index) => ({
      id: index === 0 ? "sonarqube-source-issue" : "sonarqube-source-issue-" + index,
      tool: "sonarqube",
      severity: severity(issue.severity),
      title: issue.rule + " " + (issue.message ?? "SonarQube issue"),
      targetNode: "repository",
      evidenceId: "evidence_sonarqube",
      sourcePath: path
    }))
  };
}

export function importDependencyTrack(path: string): SecurityScanImportResult {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as {
    vulnerabilities?: Array<{
      vulnId?: string;
      severity?: string;
      component?: {
        name?: string;
        version?: string;
      };
    }>;
  };

  const vulnerabilities = parsed.vulnerabilities ?? [];

  return {
    tool: "dependency-track",
    sourcePath: path,
    findings: vulnerabilities.map((item, index) => ({
      id: index === 0 ? "dependency-track-vulnerability" : "dependency-track-vulnerability-" + index,
      tool: "dependency-track",
      severity: severity(item.severity),
      title: item.vulnId + " " + (item.component?.name ?? "dependency vulnerability"),
      targetNode: "repository",
      evidenceId: "evidence_dependency_track",
      sourcePath: path
    }))
  };
}

export function importAllSecurityScans(paths: {
  trivy: string;
  syft: string;
  checkov: string;
  kubescape: string;
  sonarqube: string;
  dependencyTrack: string;
}): SecurityScanImportResult[] {
  return [
    importTrivy(paths.trivy),
    importSyft(paths.syft),
    importCheckov(paths.checkov),
    importKubescape(paths.kubescape),
    importSonarQube(paths.sonarqube),
    importDependencyTrack(paths.dependencyTrack)
  ];
}

export function attachSecurityScansToEvidencePack(
  runtimeEvidencePack: JsonRecord,
  scans: SecurityScanImportResult[]
): JsonRecord {
  const base = cloneRecord(runtimeEvidencePack);
  const evidenceTemplates = asRecords(base.evidence);
  const findingTemplates = asRecords(base.findings);
  const remediationTemplates = asRecords(base.remediations);
  const complianceTemplates = asRecords(base.complianceImpacts);

  const scanEvidence = [
    makeEvidence(evidenceTemplates, 0, "evidence_trivy", "scan_result", "Trivy scan result", scans.find((scan) => scan.tool === "trivy")?.sourcePath ?? ""),
    makeEvidence(evidenceTemplates, 1, "evidence_syft", "sbom", "Syft SBOM result", scans.find((scan) => scan.tool === "syft")?.sourcePath ?? ""),
    makeEvidence(evidenceTemplates, 2, "evidence_checkov", "scan_result", "Checkov scan result", scans.find((scan) => scan.tool === "checkov")?.sourcePath ?? ""),
    makeEvidence(evidenceTemplates, 3, "evidence_kubescape", "scan_result", "Kubescape scan result", scans.find((scan) => scan.tool === "kubescape")?.sourcePath ?? ""),
    makeEvidence(evidenceTemplates, 4, "evidence_sonarqube", "scan_result", "SonarQube scan result", scans.find((scan) => scan.tool === "sonarqube")?.sourcePath ?? ""),
    makeEvidence(evidenceTemplates, 5, "evidence_dependency_track", "scan_result", "Dependency-Track scan result", scans.find((scan) => scan.tool === "dependency-track")?.sourcePath ?? "")
  ];

  const importedFindings = scans.flatMap((scan) => scan.findings);

  const findings = importedFindings.map((finding, index) =>
    makeFinding(
      findingTemplates,
      index,
      finding.id,
      finding.severity,
      finding.title,
      [finding.targetNode],
      [finding.evidenceId],
      "open"
    )
  );

  const remediations = [
    makeRemediation(
      remediationTemplates,
      0,
      "remediate-trivy-image-vulnerability",
      "trivy-image-vulnerability",
      "Patch vulnerable image packages and rebuild the container image.",
      ["container_image"],
      ["evidence_trivy", "evidence_syft"]
    ),
    makeRemediation(
      remediationTemplates,
      1,
      "remediate-kubescape-pod-control-failure",
      "kubescape-pod-control-failure",
      "Harden pod security context and document accepted runtime exceptions.",
      ["k8s_pod"],
      ["evidence_kubescape"]
    ),
    makeRemediation(
      remediationTemplates,
      2,
      "remediate-checkov-terraform-database-encryption",
      "checkov-terraform-database-encryption",
      "Enable database storage encryption in Terraform and regenerate plan evidence.",
      ["database"],
      ["evidence_checkov"]
    )
  ];

  const complianceImpacts = [
    makeComplianceImpact(
      complianceTemplates,
      0,
      "security-scan-impact-slsa-image",
      "SLSA",
      "IMAGE_VULNERABILITY_MANAGEMENT",
      "high",
      ["trivy-image-vulnerability"]
    ),
    makeComplianceImpact(
      complianceTemplates,
      1,
      "security-scan-impact-cis-kubernetes",
      "CIS_KUBERNETES",
      "POD_AND_NAMESPACE_SECURITY",
      "high",
      ["kubescape-pod-control-failure", "kubescape-namespace-network-policy"]
    ),
    makeComplianceImpact(
      complianceTemplates,
      2,
      "security-scan-impact-iac",
      "ISO27001",
      "INFRASTRUCTURE_AS_CODE_SECURITY",
      "high",
      ["checkov-k8s-image-digest", "checkov-terraform-database-encryption"]
    )
  ];

  return {
    ...base,
    packId: "security-scans-dreps-evidence-pack",
    evidence: [
      ...asRecords(base.evidence),
      ...scanEvidence
    ],
    findings: [
      ...findings
    ],
    remediations,
    complianceImpacts,
    metadata: {
      ...asRecord(base.metadata),
      adapter: "dreps-security-scan-adapters",
      source: "security-scans-fixture",
      tools: scans.map((scan) => scan.tool)
    }
  };
}

export function assertSecurityScanEvidencePackShape(evidencePack: JsonRecord): void {
  const nodes = asRecords(evidencePack.nodes);
  const evidence = asRecords(evidencePack.evidence);
  const findings = asRecords(evidencePack.findings);

  const nodeIds = new Set(nodes.map((node) => asText(node.id)));
  const evidenceIds = new Set(evidence.map((item) => asText(item.id)));
  const findingIds = new Set(findings.map((item) => asText(item.id)));

  for (const requiredNode of ["container_image", "k8s_namespace", "k8s_pod", "database", "k8s_workload", "repository"]) {
    if (!nodeIds.has(requiredNode)) {
      throw new Error("Missing node required by security scan adapter: " + requiredNode);
    }
  }

  for (const requiredEvidence of [
    "evidence_trivy",
    "evidence_syft",
    "evidence_checkov",
    "evidence_kubescape",
    "evidence_sonarqube",
    "evidence_dependency_track"
  ]) {
    if (!evidenceIds.has(requiredEvidence)) {
      throw new Error("Missing security scan evidence: " + requiredEvidence);
    }
  }

  for (const requiredFinding of SecurityScanFindingIds) {
    if (!findingIds.has(requiredFinding)) {
      throw new Error("Missing security scan finding: " + requiredFinding);
    }
  }

  const checks = [
    ["trivy-image-vulnerability", "container_image"],
    ["kubescape-pod-control-failure", "k8s_pod"],
    ["kubescape-namespace-network-policy", "k8s_namespace"],
    ["checkov-k8s-image-digest", "k8s_workload"],
    ["checkov-terraform-database-encryption", "database"]
  ];

  for (const [findingId, nodeId] of checks) {
    const finding = findings.find((item) => asText(item.id) === findingId);
    const affectedNodes = Array.isArray(finding?.affectedNodes)
      ? finding.affectedNodes.map((item) => asText(item))
      : [];

    if (!affectedNodes.includes(nodeId)) {
      throw new Error("Finding " + findingId + " is not linked to node " + nodeId);
    }
  }
}
