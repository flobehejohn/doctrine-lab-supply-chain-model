export type JsonRecord = Record<string, unknown>;

export interface GitLabAdapterFixture {
  packId: string;
  instance: JsonRecord;
  project: JsonRecord;
  repository: JsonRecord;
  pipeline: JsonRecord;
  jobs: JsonRecord[];
  runner: JsonRecord;
  registry: JsonRecord;
  image: JsonRecord;
  tokenPolicy: JsonRecord;
  certificatePolicy: JsonRecord;
}

export const GitLabNodeKinds = [
  "gitlab_instance",
  "gitlab_project",
  "repository",
  "ci_pipeline",
  "build_job",
  "gitlab_runner",
  "registry",
  "container_image"
] as const;

export const GitLabFindingIds = [
  "gitlab-runner-privileged",
  "gitlab-runner-docker-sock-mounted",
  "gitlab-runner-latest-image",
  "gitlab-token-too-broad",
  "gitlab-registry-self-signed-cert",
  "gitlab-ci-builds-unsigned-image"
] as const;

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

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
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
  kind: string,
  label: string,
  extra: JsonRecord = {}
): JsonRecord {
  const node = templateAt(templates, index);

  setFirstPresentOrDefault(node, ["id"], id, "id");
  setFirstPresentOrDefault(node, ["kind", "type"], kind, "kind");
  setFirstPresentOrDefault(node, ["label", "name", "title"], label, "label");

  return {
    ...node,
    ...extra,
    id,
    kind,
    label
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
  strategy: string
): JsonRecord {
  const remediation = templateAt(templates, index);

  setFirstPresentOrDefault(remediation, ["id"], id, "id");
  setFirstPresentOrDefault(remediation, ["findingId", "findingRef"], findingId, "findingId");
  setFirstPresentOrDefault(remediation, ["strategy", "title", "description"], strategy, "strategy");

  return {
    ...remediation,
    id,
    findingId,
    strategy
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

export function normalizeGitLabCi(fixture: GitLabAdapterFixture): JsonRecord {
  return {
    project: fixture.project,
    repository: fixture.repository,
    pipeline: fixture.pipeline,
    jobs: fixture.jobs
  };
}

export function normalizeGitLabRunner(fixture: GitLabAdapterFixture): JsonRecord {
  return {
    runner: fixture.runner,
    dockerSockMounted: asBool(fixture.runner.dockerSockMounted),
    privileged: asBool(fixture.runner.privileged),
    image: asText(fixture.runner.image)
  };
}

export function normalizeGitLabRegistry(fixture: GitLabAdapterFixture): JsonRecord {
  return {
    registry: fixture.registry,
    image: fixture.image,
    certificatePolicy: fixture.certificatePolicy
  };
}

export function importGitLabToDrepsEvidencePack(
  fixture: GitLabAdapterFixture,
  baseEvidencePack: JsonRecord
): JsonRecord {
  const base = cloneRecord(baseEvidencePack);
  const nodeTemplates = asRecords(base.nodes);
  const edgeTemplates = asRecords(base.edges);
  const evidenceTemplates = asRecords(base.evidence);
  const findingTemplates = asRecords(base.findings);
  const remediationTemplates = asRecords(base.remediations);
  const complianceTemplates = asRecords(base.complianceImpacts);

  const projectPath = asText(fixture.project.path, "sample-project");
  const pipelineRef = asText(fixture.pipeline.ref, "main");
  const runnerImage = asText(fixture.runner.image, "gitlab/gitlab-runner:v17.11.0");
  const imageName = asText(fixture.image.name, "localhost:5050/root/sample-project");
  const imageTag = asText(fixture.image.tag, "$CI_COMMIT_SHORT_SHA");

  const runnerPrivileged = asBool(fixture.runner.privileged);
  const runnerDockerSockMounted = asBool(fixture.runner.dockerSockMounted);
  const runnerUsesLatest = runnerImage.endsWith(":latest");
  const tokenTooBroad = asText(fixture.tokenPolicy.scope, "").includes("api");
  const registrySelfSigned = asText(fixture.certificatePolicy.mode, "").includes("self-signed");
  const imageSigned = asBool(fixture.image.signed);

  const nodes = [
    makeNode(nodeTemplates, 0, "gitlab_instance", "gitlab_instance", "GitLab local instance", {
      url: fixture.instance.url
    }),
    makeNode(nodeTemplates, 1, "gitlab_project", "gitlab_project", "GitLab project " + projectPath, {
      path: projectPath
    }),
    makeNode(nodeTemplates, 2, "repository", "repository", "Repository " + projectPath, {
      defaultBranch: fixture.repository.defaultBranch
    }),
    makeNode(nodeTemplates, 3, "ci_pipeline", "ci_pipeline", "GitLab CI pipeline " + pipelineRef, {
      ref: pipelineRef
    }),
    makeNode(nodeTemplates, 4, "build_job", "build_job", "Build and publish image job", {
      stage: "publish"
    }),
    makeNode(nodeTemplates, 5, "gitlab_runner", "gitlab_runner", "GitLab Docker runner", {
      image: runnerImage,
      privileged: runnerPrivileged,
      dockerSockMounted: runnerDockerSockMounted
    }),
    makeNode(nodeTemplates, 6, "container_image", "container_image", imageName + ":" + imageTag, {
      image: imageName,
      tag: imageTag,
      signed: imageSigned
    }),
    makeNode(nodeTemplates, 7, "registry", "registry", "GitLab local registry", {
      url: fixture.registry.url,
      certificateMode: fixture.certificatePolicy.mode
    })
  ];

  const edges = [
    makeEdge(edgeTemplates, 0, "edge_instance_project", "gitlab_instance", "gitlab_project", "contains", "contains project"),
    makeEdge(edgeTemplates, 1, "edge_project_repository", "gitlab_project", "repository", "contains", "contains repository"),
    makeEdge(edgeTemplates, 2, "edge_project_pipeline", "gitlab_project", "ci_pipeline", "triggers", "triggers pipeline"),
    makeEdge(edgeTemplates, 3, "edge_pipeline_runner", "ci_pipeline", "gitlab_runner", "runs_on", "runs on runner"),
    makeEdge(edgeTemplates, 4, "edge_pipeline_job", "ci_pipeline", "build_job", "contains", "contains build job"),
    makeEdge(edgeTemplates, 5, "edge_runner_image", "gitlab_runner", "container_image", "builds", "builds image"),
    makeEdge(edgeTemplates, 6, "edge_job_image", "build_job", "container_image", "publishes", "publishes image"),
    makeEdge(edgeTemplates, 7, "edge_image_registry", "container_image", "registry", "stores", "stored in registry")
  ];

  const evidence = [
    makeEvidence(
      evidenceTemplates,
      0,
      "evidence_gitlab_fixture",
      "audit_log",
      "GitLab fixture export",
      "labs/supply-chain/environments/gitlab-local/fixtures/gitlab-export.fixture.json"
    ),
    makeEvidence(
      evidenceTemplates,
      1,
      "evidence_gitlab_ci",
      "ci_workflow",
      "GitLab CI pipeline file",
      "labs/supply-chain/environments/gitlab-local/sample-project/.gitlab-ci.yml"
    ),
    makeEvidence(
      evidenceTemplates,
      2,
      "evidence_runner_config",
      "configuration",
      "GitLab runner compose configuration",
      "labs/supply-chain/environments/gitlab-local/docker-compose.template.yml"
    ),
    makeEvidence(
      evidenceTemplates,
      3,
      "evidence_registry_config",
      "configuration",
      "GitLab local registry configuration",
      "labs/supply-chain/environments/gitlab-local/docker-compose.template.yml"
    ),
    makeEvidence(
      evidenceTemplates,
      4,
      "evidence_sample_dockerfile",
      "source_file",
      "Sample project Dockerfile",
      "labs/supply-chain/environments/gitlab-local/sample-project/Dockerfile"
    ),
    makeEvidence(
      evidenceTemplates,
      5,
      "evidence_security_model",
      "manual_attestation",
      "GitLab local security model",
      "labs/supply-chain/environments/gitlab-local/SECURITY_MODEL.md"
    )
  ];

  const findings = [
    makeFinding(
      findingTemplates,
      0,
      "gitlab-runner-privileged",
      "medium",
      "GitLab runner privileged mode must remain disabled unless explicitly justified",
      ["gitlab_runner"],
      ["evidence_runner_config"],
      runnerPrivileged ? "open" : "mitigated"
    ),
    makeFinding(
      findingTemplates,
      1,
      "gitlab-runner-docker-sock-mounted",
      "high",
      "GitLab runner mounts the Docker socket in the local lab",
      ["gitlab_runner"],
      ["evidence_runner_config"],
      runnerDockerSockMounted ? "open" : "mitigated"
    ),
    makeFinding(
      findingTemplates,
      2,
      "gitlab-runner-latest-image",
      "medium",
      "GitLab runner image must not use latest",
      ["gitlab_runner"],
      ["evidence_runner_config"],
      runnerUsesLatest ? "open" : "mitigated"
    ),
    makeFinding(
      findingTemplates,
      3,
      "gitlab-token-too-broad",
      "medium",
      "GitLab token scope must be minimized",
      ["gitlab_project", "ci_pipeline"],
      ["evidence_gitlab_fixture"],
      tokenTooBroad ? "open" : "mitigated"
    ),
    makeFinding(
      findingTemplates,
      4,
      "gitlab-registry-self-signed-cert",
      "medium",
      "GitLab registry certificate mode requires explicit local trust documentation",
      ["registry"],
      ["evidence_registry_config", "evidence_security_model"],
      registrySelfSigned ? "open" : "accepted"
    ),
    makeFinding(
      findingTemplates,
      5,
      "gitlab-ci-builds-unsigned-image",
      "high",
      "GitLab CI builds an unsigned container image",
      ["ci_pipeline", "build_job", "container_image"],
      ["evidence_gitlab_ci", "evidence_sample_dockerfile"],
      imageSigned ? "mitigated" : "open"
    )
  ];

  const remediations = [
    makeRemediation(
      remediationTemplates,
      0,
      "remediate-gitlab-runner-docker-sock-mounted",
      "gitlab-runner-docker-sock-mounted",
      "Replace Docker socket mount with an isolated build strategy or explicitly document the local lab exception."
    ),
    makeRemediation(
      remediationTemplates,
      1,
      "remediate-gitlab-token-too-broad",
      "gitlab-token-too-broad",
      "Reduce token scopes and prefer masked CI variables."
    ),
    makeRemediation(
      remediationTemplates,
      2,
      "remediate-gitlab-ci-builds-unsigned-image",
      "gitlab-ci-builds-unsigned-image",
      "Add image signing and signature evidence to the publication workflow."
    )
  ];

  const complianceImpacts = [
    makeComplianceImpact(
      complianceTemplates,
      0,
      "gitlab-impact-ci-hardening",
      "SLSA",
      "CI_HARDENING",
      "high",
      ["gitlab-runner-docker-sock-mounted", "gitlab-ci-builds-unsigned-image"]
    ),
    makeComplianceImpact(
      complianceTemplates,
      1,
      "gitlab-impact-secret-governance",
      "ISO27001",
      "SECRET_GOVERNANCE",
      "medium",
      ["gitlab-token-too-broad"]
    )
  ];

  return {
    ...base,
    packId: fixture.packId,
    nodes,
    edges,
    evidence,
    findings,
    remediations,
    complianceImpacts,
    metadata: {
      ...asRecord(base.metadata),
      adapter: "dreps-gitlab-adapter",
      source: "gitlab-local-fixture",
      graph: "gitlab_project -> ci_pipeline -> gitlab_runner -> container_image -> registry"
    }
  };
}

export function renderGitLabGraphMermaid(evidencePack: JsonRecord): string {
  const edges = asRecords(evidencePack.edges);
  const nodes = asRecords(evidencePack.nodes);
  const lines = ["flowchart LR"];

  for (const node of nodes) {
    const id = asText(node.id).replace(/[^A-Za-z0-9_]/g, "_");
    const label = asText(node.label, asText(node.id)).replace(/"/g, "'");
    lines.push("  " + id + '["' + label + '"]');
  }

  for (const edge of edges) {
    const source = asText(edge.source ?? edge.from ?? edge.sourceNodeId ?? edge.sourceId).replace(/[^A-Za-z0-9_]/g, "_");
    const target = asText(edge.target ?? edge.to ?? edge.targetNodeId ?? edge.targetId).replace(/[^A-Za-z0-9_]/g, "_");

    if (source && target) {
      lines.push("  " + source + " --> " + target);
    }
  }

  lines.push("");

  return lines.join("\n");
}

export function assertGitLabEvidencePackShape(evidencePack: JsonRecord): void {
  const nodes = asRecords(evidencePack.nodes);
  const edges = asRecords(evidencePack.edges);
  const findings = asRecords(evidencePack.findings);

  const nodeIds = new Set(nodes.map((node) => asText(node.id)));
  const findingIds = new Set(findings.map((finding) => asText(finding.id)));

  for (const kind of GitLabNodeKinds) {
    if (!nodeIds.has(kind)) {
      throw new Error("Missing GitLab node: " + kind);
    }
  }

  for (const findingId of GitLabFindingIds) {
    if (!findingIds.has(findingId)) {
      throw new Error("Missing GitLab finding: " + findingId);
    }
  }

  const requiredEdges = [
    ["gitlab_project", "ci_pipeline"],
    ["ci_pipeline", "gitlab_runner"],
    ["gitlab_runner", "container_image"],
    ["container_image", "registry"]
  ];

  for (const [source, target] of requiredEdges) {
    const found = edges.some((edge) => {
      const edgeSource = asText(edge.source ?? edge.from ?? edge.sourceNodeId ?? edge.sourceId);
      const edgeTarget = asText(edge.target ?? edge.to ?? edge.targetNodeId ?? edge.targetId);

      return edgeSource === source && edgeTarget === target;
    });

    if (!found) {
      throw new Error("Missing GitLab graph edge: " + source + " -> " + target);
    }
  }
}
