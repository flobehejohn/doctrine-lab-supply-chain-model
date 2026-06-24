import { readFileSync } from "node:fs";

export type JsonRecord = Record<string, unknown>;

export const RegistryTrustFindingIds = [
  "registry-cert-expired",
  "registry-cert-expiring-soon",
  "registry-self-signed-cert",
  "registry-untrusted-chain",
  "registry-tls-not-verified-by-ci"
] as const;

export interface RegistryCertificateFixture {
  schemaVersion?: string;
  registry: string;
  host: string;
  port: number;
  subject: string;
  issuer: string;
  notBefore: string;
  notAfter: string;
  fingerprintSha256: string;
  selfSigned: boolean;
  chainTrusted: boolean;
  source?: string;
  pem?: string;
}

export interface RegistryCiTlsPolicyFixture {
  schemaVersion?: string;
  registry: string;
  ciTlsVerified: boolean;
  verificationMode: string;
  sourceFiles?: string[];
  notes?: string[];
}

export interface RegistryTrustCheck {
  registry: string;
  host: string;
  port: number;
  subject: string;
  issuer: string;
  fingerprintSha256: string;
  notBefore: string;
  notAfter: string;
  daysUntilExpiry: number;
  expired: boolean;
  expiringSoon: boolean;
  selfSigned: boolean;
  chainTrusted: boolean;
  ciTlsVerified: boolean;
  checkedAt: string;
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

function parseJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function dateDiffDays(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((b.getTime() - a.getTime()) / msPerDay);
}

export function loadRegistryCertificate(path: string): RegistryCertificateFixture {
  const cert = parseJsonFile<RegistryCertificateFixture>(path);

  if (!cert.registry || !cert.subject || !cert.issuer || !cert.notAfter) {
    throw new Error("Invalid registry certificate fixture: missing registry, subject, issuer or notAfter");
  }

  return cert;
}

export function loadRegistryCiTlsPolicy(path: string): RegistryCiTlsPolicyFixture {
  const policy = parseJsonFile<RegistryCiTlsPolicyFixture>(path);

  if (!policy.registry || typeof policy.ciTlsVerified !== "boolean") {
    throw new Error("Invalid registry CI TLS policy fixture");
  }

  return policy;
}

export function checkRegistryCertificate(
  cert: RegistryCertificateFixture,
  policy: RegistryCiTlsPolicyFixture,
  checkedAt = "2026-06-25T00:00:00.000Z",
  expiringSoonThresholdDays = 30
): RegistryTrustCheck {
  const now = new Date(checkedAt);
  const notAfter = new Date(cert.notAfter);
  const daysUntilExpiry = dateDiffDays(now, notAfter);
  const expired = daysUntilExpiry < 0;
  const expiringSoon = !expired && daysUntilExpiry <= expiringSoonThresholdDays;

  return {
    registry: cert.registry,
    host: cert.host,
    port: cert.port,
    subject: cert.subject,
    issuer: cert.issuer,
    fingerprintSha256: cert.fingerprintSha256,
    notBefore: cert.notBefore,
    notAfter: cert.notAfter,
    daysUntilExpiry,
    expired,
    expiringSoon,
    selfSigned: cert.selfSigned || cert.subject === cert.issuer,
    chainTrusted: cert.chainTrusted,
    ciTlsVerified: policy.ciTlsVerified,
    checkedAt
  };
}

export function registryTrustFindings(check: RegistryTrustCheck): Array<{
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
}> {
  const findings: Array<{
    id: string;
    severity: "low" | "medium" | "high" | "critical";
    title: string;
  }> = [];

  if (check.expired) {
    findings.push({
      id: "registry-cert-expired",
      severity: "critical",
      title: "Registry certificate is expired"
    });
  }

  if (check.expiringSoon) {
    findings.push({
      id: "registry-cert-expiring-soon",
      severity: "medium",
      title: "Registry certificate is expiring soon"
    });
  }

  if (check.selfSigned) {
    findings.push({
      id: "registry-self-signed-cert",
      severity: "high",
      title: "Registry certificate is self-signed"
    });
  }

  if (!check.chainTrusted) {
    findings.push({
      id: "registry-untrusted-chain",
      severity: "high",
      title: "Registry certificate chain is not trusted"
    });
  }

  if (!check.ciTlsVerified) {
    findings.push({
      id: "registry-tls-not-verified-by-ci",
      severity: "high",
      title: "Registry TLS is not verified by CI"
    });
  }

  return findings;
}

export function buildRegistryTrustEvidencePack(
  baseEvidencePack: JsonRecord,
  check: RegistryTrustCheck,
  certPath: string,
  policyPath: string
): JsonRecord {
  const base = cloneRecord(baseEvidencePack);
  const nodeTemplates = asRecords(base.nodes);
  const edgeTemplates = asRecords(base.edges);
  const evidenceTemplates = asRecords(base.evidence);
  const findingTemplates = asRecords(base.findings);
  const remediationTemplates = asRecords(base.remediations);
  const complianceTemplates = asRecords(base.complianceImpacts);

  const existingNodes = asRecords(base.nodes);
  const hasContainerImage = existingNodes.some((node) => asText(node.id) === "container_image");

  const nodes = [
    ...existingNodes.filter((node) => asText(node.id) !== "registry"),
    makeNode(nodeTemplates, 0, "registry", "registry", check.registry, {
      host: check.host,
      port: check.port
    }),
    makeNode(nodeTemplates, 1, "registry_certificate", "artifact", "Registry TLS certificate", {
      subject: check.subject,
      issuer: check.issuer,
      fingerprintSha256: check.fingerprintSha256,
      notAfter: check.notAfter
    }),
    ...(hasContainerImage
      ? []
      : [
          makeNode(nodeTemplates, 2, "container_image", "container_image", "localhost:5050/root/sample-project:local-fixture", {
            image: "localhost:5050/root/sample-project:local-fixture"
          })
        ])
  ];

  const edges = [
    ...asRecords(base.edges),
    makeEdge(edgeTemplates, 0, "edge_registry_certificate", "registry", "registry_certificate", "documents", "registry exposes certificate"),
    makeEdge(edgeTemplates, 1, "edge_registry_image", "registry", "container_image", "stores", "registry stores image")
  ];

  const evidence = [
    ...asRecords(base.evidence),
    makeEvidence(evidenceTemplates, 0, "evidence_registry_certificate", "certificate", "Registry TLS certificate", certPath, {
      registry: check.registry,
      subject: check.subject,
      issuer: check.issuer,
      fingerprintSha256: check.fingerprintSha256,
      notAfter: check.notAfter,
      selfSigned: check.selfSigned
    }),
    makeEvidence(evidenceTemplates, 1, "evidence_registry_ci_tls_policy", "configuration", "Registry TLS verification policy in CI", policyPath, {
      registry: check.registry,
      ciTlsVerified: check.ciTlsVerified
    }),
    makeEvidence(evidenceTemplates, 2, "evidence_registry_trust_check", "scan_result", "Registry trust check result", ".doctrine/out/registry-trust/registry-trust.normalized.json", {
      registry: check.registry,
      checkedAt: check.checkedAt
    })
  ];

  const generatedFindings = registryTrustFindings(check);
  const findings = generatedFindings.map((finding, index) =>
    makeFinding(
      findingTemplates,
      index,
      finding.id,
      finding.severity,
      finding.title,
      ["registry", "registry_certificate"],
      ["evidence_registry_certificate", "evidence_registry_trust_check"],
      "open"
    )
  );

  const remediations = [
    makeRemediation(
      remediationTemplates,
      0,
      "remediate-registry-self-signed-cert",
      "registry-self-signed-cert",
      "Replace the self-signed certificate with a certificate issued by a trusted internal or public CA.",
      ["registry", "registry_certificate"],
      ["evidence_registry_certificate"]
    ),
    makeRemediation(
      remediationTemplates,
      1,
      "remediate-registry-tls-not-verified-by-ci",
      "registry-tls-not-verified-by-ci",
      "Enable TLS verification in CI and import the trusted CA bundle into the runner trust store.",
      ["registry"],
      ["evidence_registry_ci_tls_policy"]
    )
  ];

  const complianceImpacts = [
    makeComplianceImpact(
      complianceTemplates,
      0,
      "registry-trust-impact-slsa",
      "SLSA",
      "REGISTRY_TRUST",
      "high",
      generatedFindings.map((finding) => finding.id)
    ),
    makeComplianceImpact(
      complianceTemplates,
      1,
      "registry-trust-impact-iso27001",
      "ISO27001",
      "CERTIFICATE_AND_TRUST_CHAIN_MANAGEMENT",
      "high",
      generatedFindings.map((finding) => finding.id)
    )
  ];

  return {
    ...base,
    packId: "registry-trust-dreps-evidence-pack",
    nodes,
    edges,
    evidence,
    findings,
    remediations,
    complianceImpacts,
    metadata: {
      ...asRecord(base.metadata),
      adapter: "dreps-registry-trust",
      source: "registry-trust-fixture",
      registry: check.registry
    }
  };
}

export function assertRegistryTrustEvidencePackShape(evidencePack: JsonRecord): void {
  const nodes = asRecords(evidencePack.nodes);
  const evidence = asRecords(evidencePack.evidence);
  const findings = asRecords(evidencePack.findings);

  const nodeIds = new Set(nodes.map((node) => asText(node.id)));
  const evidenceIds = new Set(evidence.map((item) => asText(item.id)));
  const findingIds = new Set(findings.map((item) => asText(item.id)));

  for (const requiredNode of ["registry", "registry_certificate", "container_image"]) {
    if (!nodeIds.has(requiredNode)) {
      throw new Error("Missing registry trust node: " + requiredNode);
    }
  }

  for (const requiredEvidence of [
    "evidence_registry_certificate",
    "evidence_registry_ci_tls_policy",
    "evidence_registry_trust_check"
  ]) {
    if (!evidenceIds.has(requiredEvidence)) {
      throw new Error("Missing registry trust evidence: " + requiredEvidence);
    }
  }

  for (const requiredFinding of [
    "registry-cert-expiring-soon",
    "registry-self-signed-cert",
    "registry-untrusted-chain",
    "registry-tls-not-verified-by-ci"
  ]) {
    if (!findingIds.has(requiredFinding)) {
      throw new Error("Missing registry trust finding: " + requiredFinding);
    }
  }

  const selfSignedFinding = findings.find((finding) => asText(finding.id) === "registry-self-signed-cert");
  const affectedNodes = Array.isArray(selfSignedFinding?.affectedNodes)
    ? selfSignedFinding.affectedNodes.map((item) => asText(item))
    : [];

  if (!affectedNodes.includes("registry_certificate")) {
    throw new Error("registry-self-signed-cert is not linked to registry_certificate");
  }
}
