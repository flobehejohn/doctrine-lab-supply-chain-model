import { readFileSync } from "node:fs";

export type JsonRecord = Record<string, unknown>;

export const PolicyIds = [
  "no-public-critical-vulnerable-pod",
  "no-unsigned-container-image",
  "no-runner-privileged",
  "no-docker-sock-runner",
  "no-untrusted-registry",
  "no-critical-node-without-runbook"
] as const;

export type PolicySeverity = "low" | "medium" | "high" | "critical";
export type PolicyOperator = "equals" | "notEquals" | "truthy" | "falsy" | "exists";

export interface PolicyNode extends JsonRecord {
  id: string;
  type: string;
  name?: string;
}

export interface PolicyEdge extends JsonRecord {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
}

export interface PolicyEvidence {
  id: string;
  type: string;
  title: string;
  path: string;
}

export interface PolicyContext {
  schemaVersion?: string;
  source?: string;
  nodes: PolicyNode[];
  edges: PolicyEdge[];
  evidence: PolicyEvidence[];
}

export interface PolicyCondition {
  field: string;
  operator: PolicyOperator;
  value?: string | number | boolean;
}

export interface PolicyRule {
  id: string;
  title: string;
  severity: PolicySeverity;
  targetType: string;
  conditions: PolicyCondition[];
  evidenceRefs: string[];
}

export interface PolicyRuleset {
  schemaVersion?: string;
  policies: PolicyRule[];
}

export interface PolicyFinding {
  id: string;
  severity: PolicySeverity;
  title: string;
  affectedNodes: string[];
  evidenceRefs: string[];
  policyId: string;
}

export interface PolicyEvaluationReport {
  schemaVersion: "dreps-policy-engine.report.v1";
  generatedAt: string;
  source: string;
  policiesEvaluated: number;
  findings: PolicyFinding[];
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

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return Boolean(value);
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

export function loadPolicyContext(path: string): PolicyContext {
  const context = JSON.parse(readFileSync(path, "utf8")) as PolicyContext;

  if (!Array.isArray(context.nodes)) {
    throw new Error("Policy context requires nodes");
  }

  if (!Array.isArray(context.evidence)) {
    throw new Error("Policy context requires evidence");
  }

  return {
    ...context,
    edges: Array.isArray(context.edges) ? context.edges : []
  };
}

export function loadPolicyRuleset(path: string): PolicyRuleset {
  const ruleset = JSON.parse(readFileSync(path, "utf8")) as PolicyRuleset;

  if (!Array.isArray(ruleset.policies)) {
    throw new Error("Policy ruleset requires policies");
  }

  return ruleset;
}

function matchesValue(actual: unknown, expected: unknown): boolean {
  if (typeof expected === "boolean") {
    return asBoolean(actual) === expected;
  }

  if (typeof expected === "number") {
    return Number(actual) === expected;
  }

  return String(actual) === String(expected);
}

function matchesCondition(node: PolicyNode, condition: PolicyCondition): boolean {
  const actual = node[condition.field];

  if (condition.operator === "exists") {
    return actual !== undefined && actual !== null;
  }

  if (condition.operator === "truthy") {
    return asBoolean(actual);
  }

  if (condition.operator === "falsy") {
    return !asBoolean(actual);
  }

  if (condition.operator === "equals") {
    return matchesValue(actual, condition.value);
  }

  if (condition.operator === "notEquals") {
    return !matchesValue(actual, condition.value);
  }

  return false;
}

function matchesTargetType(node: PolicyNode, targetType: string): boolean {
  return targetType === "*" || node.type === targetType;
}

export function evaluatePolicy(context: PolicyContext, policy: PolicyRule): PolicyFinding | null {
  const affectedNodes = context.nodes
    .filter((node) => matchesTargetType(node, policy.targetType))
    .filter((node) => policy.conditions.every((condition) => matchesCondition(node, condition)))
    .map((node) => node.id);

  if (affectedNodes.length === 0) {
    return null;
  }

  return {
    id: policy.id,
    severity: policy.severity,
    title: policy.title,
    affectedNodes,
    evidenceRefs: policy.evidenceRefs,
    policyId: policy.id
  };
}

export function evaluatePolicies(
  context: PolicyContext,
  ruleset: PolicyRuleset,
  generatedAt = "2026-06-25T00:00:00.000Z"
): PolicyEvaluationReport {
  const findings = ruleset.policies
    .map((policy) => evaluatePolicy(context, policy))
    .filter((finding): finding is PolicyFinding => finding !== null);

  return {
    schemaVersion: "dreps-policy-engine.report.v1",
    generatedAt,
    source: context.source ?? "policy-engine-fixture",
    policiesEvaluated: ruleset.policies.length,
    findings
  };
}

export function buildPolicyEvidencePack(
  baseEvidencePack: JsonRecord,
  context: PolicyContext,
  report: PolicyEvaluationReport,
  paths: {
    contextPath: string;
    policiesPath: string;
    reportPath: string;
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
    ...context.nodes.map((node, index) =>
      makeNode(
        nodeTemplates,
        index,
        node.id,
        node.type,
        node.name ?? node.id,
        node
      )
    ),
    makeNode(nodeTemplates, 100, "policy_ruleset", "security_control", "Policy ruleset", {
      policiesEvaluated: report.policiesEvaluated
    }),
    makeNode(nodeTemplates, 101, "policy_evaluation_report", "artifact", "Policy evaluation report", {
      findingCount: report.findings.length
    })
  ];

  const edges = [
    ...context.edges.map((edge, index) =>
      makeEdge(
        edgeTemplates,
        index,
        edge.id,
        edge.source,
        edge.target,
        edge.type as DrepsEdgeType,
        edge.label ?? edge.type
      )
    ),
    makeEdge(edgeTemplates, 100, "edge_policy_ruleset_report", "policy_ruleset", "policy_evaluation_report", "verifies", "ruleset evaluates policy context"),
    ...report.findings.flatMap((finding, findingIndex) =>
      finding.affectedNodes.map((nodeId, nodeIndex) =>
        makeEdge(
          edgeTemplates,
          200 + findingIndex * 10 + nodeIndex,
          "edge_policy_" + finding.id + "_" + nodeId,
          "policy_evaluation_report",
          nodeId,
          "affects",
          "policy finding affects node"
        )
      )
    )
  ];

  const contextEvidence = context.evidence.map((item, index) =>
    makeEvidence(
      evidenceTemplates,
      index,
      item.id,
      item.type as DrepsEvidenceType,
      item.title,
      item.path
    )
  );

  const evidence = [
    ...contextEvidence,
    makeEvidence(evidenceTemplates, 100, "evidence_policy_ruleset", "configuration", "Policy ruleset", paths.policiesPath, {
      policiesEvaluated: report.policiesEvaluated
    }),
    makeEvidence(evidenceTemplates, 101, "evidence_policy_evaluation_report", "scan_result", "Policy evaluation report", paths.reportPath, {
      findingCount: report.findings.length
    }),
    makeEvidence(evidenceTemplates, 102, "evidence_policy_context", "configuration", "Policy context", paths.contextPath, {
      nodeCount: context.nodes.length
    })
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

  const remediations = report.findings.map((finding, index) =>
    makeRemediation(
      remediationTemplates,
      index,
      "remediate-" + finding.id,
      finding.id,
      remediationStrategy(finding.id),
      finding.affectedNodes,
      finding.evidenceRefs
    )
  );

  const complianceImpacts = [
    makeComplianceImpact(
      complianceTemplates,
      0,
      "policy-engine-impact-slsa",
      "SLSA",
      "POLICY_AS_CODE_ENFORCEMENT",
      "high",
      report.findings.map((finding) => finding.id)
    ),
    makeComplianceImpact(
      complianceTemplates,
      1,
      "policy-engine-impact-iso27001",
      "ISO27001",
      "CONTINUOUS_POLICY_CONTROL_MONITORING",
      "high",
      report.findings.map((finding) => finding.id)
    )
  ];

  return {
    ...base,
    packId: "policy-engine-dreps-evidence-pack",
    nodes,
    edges,
    evidence,
    findings,
    remediations,
    complianceImpacts,
    metadata: {
      ...asRecord(base.metadata),
      adapter: "dreps-policy-engine",
      source: report.source,
      generatedAt: report.generatedAt
    }
  };
}

function remediationStrategy(findingId: string): string {
  const strategies: Record<string, string> = {
    "no-public-critical-vulnerable-pod": "Remove public exposure, patch the vulnerability, or downgrade criticality after risk acceptance.",
    "no-unsigned-container-image": "Sign the container image and enforce signature verification in CI/CD.",
    "no-runner-privileged": "Disable privileged runner mode and use least-privilege build isolation.",
    "no-docker-sock-runner": "Remove Docker socket mounting from CI runners.",
    "no-untrusted-registry": "Use a trusted registry certificate chain and enforce registry trust verification.",
    "no-critical-node-without-runbook": "Attach an operator runbook to every critical node."
  };

  return strategies[findingId] ?? "Review and remediate the policy violation.";
}

export function assertPolicyEvidencePackShape(evidencePack: JsonRecord): void {
  const nodes = asRecords(evidencePack.nodes);
  const evidence = asRecords(evidencePack.evidence);
  const findings = asRecords(evidencePack.findings);

  const nodeIds = new Set(nodes.map((node) => asText(node.id)));
  const evidenceIds = new Set(evidence.map((item) => asText(item.id)));
  const findingIds = new Set(findings.map((item) => asText(item.id)));

  for (const requiredNode of [
    "pod_checkout",
    "image_checkout_latest",
    "runner_privileged",
    "registry_local_untrusted",
    "database_orders",
    "policy_ruleset",
    "policy_evaluation_report"
  ]) {
    if (!nodeIds.has(requiredNode)) {
      throw new Error("Missing policy engine node: " + requiredNode);
    }
  }

  for (const requiredEvidence of [
    "evidence_policy_ruleset",
    "evidence_policy_evaluation_report",
    "evidence_policy_context",
    "evidence_runtime_policy_context",
    "evidence_security_scan_policy_context",
    "evidence_registry_policy_context",
    "evidence_gitlab_runner_policy_context",
    "evidence_operator_runbooks_policy_context"
  ]) {
    if (!evidenceIds.has(requiredEvidence)) {
      throw new Error("Missing policy engine evidence: " + requiredEvidence);
    }
  }

  for (const requiredFinding of PolicyIds) {
    if (!findingIds.has(requiredFinding)) {
      throw new Error("Missing policy finding: " + requiredFinding);
    }
  }

  for (const finding of findings) {
    const affectedNodes = Array.isArray(finding.affectedNodes)
      ? finding.affectedNodes.map((item) => asText(item))
      : [];

    const evidenceRefs = Array.isArray(finding.evidenceRefs)
      ? finding.evidenceRefs.map((item) => asText(item))
      : [];

    if (affectedNodes.length === 0) {
      throw new Error("Finding has no affectedNodes: " + asText(finding.id));
    }

    if (evidenceRefs.length === 0) {
      throw new Error("Finding has no evidenceRefs: " + asText(finding.id));
    }

    for (const nodeId of affectedNodes) {
      if (!nodeIds.has(nodeId)) {
        throw new Error("Finding references missing affected node: " + nodeId);
      }
    }

    for (const evidenceId of evidenceRefs) {
      if (!evidenceIds.has(evidenceId)) {
        throw new Error("Finding references missing evidence: " + evidenceId);
      }
    }
  }
}
