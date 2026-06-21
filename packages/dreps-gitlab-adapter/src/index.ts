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
  kind: string,
  label: string
): JsonRecord {
  const edge = templateAt(templates, index);

  setFirstPresentOrDefault(edge, ["id"], id, "id");
  setFirstPresentOrDefault(edge, ["source", "from", "sourceNodeId", "sourceId"], source, "source");
  setFirstPresentOrDefault(edge, ["target", "to", "targetNodeId", "targetId"], target, "target");
  setFirstPresentOrDefault(edge, ["kind", "type"], kind, "kind");
  setFirstPresentOrDefault(edge, ["label", "title"], label, "label");

  return {
    ...edge,
    id,
    source,
    target,
    kind,
    label
  };
}

function makeEvidence(
  templates: JsonRecord[],
  index: number,
  id: string,
  kind: string,
  title: string,
  path: string
): JsonRecord {
  const evidence = templateAt(templates, index);

  setFirstPresentOrDefault(evidence, ["id"], id, "id");
  setFirstPresentOrDefault(evidence, ["kind", "type"], kind, "kind");
  setFirstPresentOrDefault(evidence, ["title", "label", "name"], title, "title");
  setFirstPresentOrDefault(evidence, ["path", "artifact", "uri"], path, "path");

  return {
    ...evidence,
    id,
    kind,
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
  status = "open"
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
  framework: string,
  control: string,
  impact: string,
  findingRefs: string[]
): JsonRecord {
  const compliance = templateAt(templates, index);

  setFirstPresentOrDefault(compliance, ["id"], id, "id");
  setFirstPresentOrDefault(compliance, ["framework"], framework, "framework");
  setFirstPresentOrDefault(compliance, ["control"], control, "control");
  setFirstPresentOrDefault(compliance, ["impact", "title", "description"], impact, "impact");
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
      privileged: asBool(fixture.runner.privileged),
      dockerSockMounted: asBool(fixture.runner.dockerSockMounted)
    }),
    makeNode(nodeTemplates, 6, "container_image", "container_image", imageName + ":" + imageTag, {
      image: imageName,
      tag: imageTag,
      signed: asBool(fixture.image.signed)
    }),
    makeNode(nodeTemplates, 7, "registry", "registry", "GitLab local registry", {
      url: fixture.registry.url,
      certificateMode: fixture.certificatePolicy.mode
    })
  ];

  const edges = [
    makeEdge(edgeTemplates, 0, "edge_instance_project", "gitlab_instance", "gitlab_project", "hosts", "hosts project"),
    makeEdge(edgeTemplates, 1, "edge_project_repository", "gitlab_project", "repository", "contains", "contains repository"),
    makeEdge(edgeTemplates, 2, "edge_project_pipeline", "gitlab_project", "ci_pipeline", "triggers", "triggers pipeline"),
    makeEdge(edgeTemplates, 3, "edge_pipeline_runner", "ci_pipeline", "gitlab_runner", "runs_on", "runs on runner"),
    makeEdge(edgeTemplates, 4, "edge_pipeline_job", "ci_pipeline", "build_job", "contains", "contains build job"),
    makeEdge(edgeTemplates, 5, "edge_runner_image", "gitlab_runner", "container_image", "builds", "builds image"),
    makeEdge(edgeTemplates, 6, "edge_job_image", "build_job", "container_image", "publishes", "publishes image"),
    makeEdge(edgeTemplates, 7, "edge_image_registry", "container_image", "registry", "pushed_to", "pushed to registry")
  ];

  const evidence = [
    makeEvidence(evidenceTemplates, 0, "evidence_gitlab_fixture", "gitlab_export", "GitLab fixture export", "labs/supply-chain/environments/gitlab-local/fixtures/gitlab-export.fixture.json"),
    makeEvidence(evidenceTemplates, 1, "evidence_gitlab_ci", "gitlab_ci", "GitLab CI pipeline file", "labs/supply-chain/environments/gitlab-local/sample-project/.gitlab-ci.yml"),
    makeEvidence(evidenceTemplates, 2, "evidence_runner_config", "runner_config", "GitLab runner compose configuration", "labs/supply-chain/environments/gitlab-local/docker-compose.template.yml"),
    makeEvidence(evidenceTemplates, 3, "evidence_registry_config", "registry_config", "GitLab local registry configuration", "labs/supply-chain/environments/gitlab-local/docker-compose.template.yml"),
    makeEvidence(evidenceTemplates, 4, "evidence_sample_dockerfile", "dockerfile", "Sample project Dockerfile", "labs/supply-chain/environments/gitlab-local/sample-project/Dockerfile"),
    makeEvidence(evidenceTemplates, 5, "evidence_security_model", "security_model", "GitLab local security model", "labs/supply-chain/environments/gitlab-local/SECURITY_MODEL.md")
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
      asBool(fixture.runner.privileged) ? "open" : "not_observed"
    ),
    makeFinding(
      findingTemplates,
      1,
      "gitlab-runner-docker-sock-mounted",
      "high",
      "GitLab runner mounts the Docker socket in the local lab",
      ["gitlab_runner"],
      ["evidence_runner_config"],
      asBool(fixture.runner.dockerSockMounted) ? "open" : "not_observed"
    ),
    makeFinding(
      findingTemplates,
      2,
      "gitlab-runner-latest-image",
      "medium",
      "GitLab runner image must not use latest",
      ["gitlab_runner"],
      ["evidence_runner_config"],
      runnerImage.endsWith(":latest") ? "open" : "not_observed"
    ),
    makeFinding(
      findingTemplates,
      3,
      "gitlab-token-too-broad",
      "medium",
      "GitLab token scope must be minimized",
      ["gitlab_project", "ci_pipeline"],
      ["evidence_gitlab_fixture"],
      asText(fixture.tokenPolicy.scope, "").includes("api") ? "open" : "not_observed"
    ),
    makeFinding(
      findingTemplates,
      4,
      "gitlab-registry-self-signed-cert",
      "medium",
      "GitLab registry certificate mode requires explicit local trust documentation",
      ["registry"],
      ["evidence_registry_config", "evidence_security_model"],
      asText(fixture.certificatePolicy.mode, "").includes("self-signed") ? "open" : "documented_local_lab"
    ),
    makeFinding(
      findingTemplates,
      5,
      "gitlab-ci-builds-unsigned-image",
      "high",
      "GitLab CI builds an unsigned container image",
      ["ci_pipeline", "build_job", "container_image"],
      ["evidence_gitlab_ci", "evidence_sample_dockerfile"],
      asBool(fixture.image.signed) ? "not_observed" : "open"
    )
  ];

  const remediations = [
    makeRemediation(remediationTemplates, 0, "remediate-gitlab-runner-docker-sock-mounted", "gitlab-runner-docker-sock-mounted", "Replace Docker socket mount with an isolated build strategy or explicitly document the local lab exception."),
    makeRemediation(remediationTemplates, 1, "remediate-gitlab-token-too-broad", "gitlab-token-too-broad", "Reduce token scopes and prefer masked CI variables."),
    makeRemediation(remediationTemplates, 2, "remediate-gitlab-ci-builds-unsigned-image", "gitlab-ci-builds-unsigned-image", "Add image signing and signature evidence to the publication workflow.")
  ];

  const complianceImpacts = [
    makeComplianceImpact(complianceTemplates, 0, "gitlab-impact-ci-hardening", "DREPS", "CI_HARDENING", "GitLab CI pipeline and runner posture affect supply-chain integrity.", [
      "gitlab-runner-docker-sock-mounted",
      "gitlab-ci-builds-unsigned-image"
    ]),
    makeComplianceImpact(complianceTemplates, 1, "gitlab-impact-secret-governance", "DREPS", "SECRET_GOVERNANCE", "GitLab token scope and secret handling affect auditability.", [
      "gitlab-token-too-broad"
    ])
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
      ...(asRecord(base.metadata)),
      adapter: "dreps-gitlab-adapter",
      source: "gitlab-local-fixture",
      graph: "gitlab_project -> ci_pipeline -> gitlab_runner -> container_image -> registry"
    }
  };
}

export function renderGitLabGraphMermaid(evidencePack: JsonRecord): string {
  const edges = asRecords(evidencePack.edges);
  const nodes = asRecords(evidencePack.nodes);
  const labels = new Map<string, string>();

  for (const node of nodes) {
    labels.set(asText(node.id), asText(node.label, asText(node.id)));
  }

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
