import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative, resolve, sep } from "node:path";

export type JsonRecord = Record<string, unknown>;

export interface LocalRepoScan {
  repoRoot: string;
  repoName: string;
  files: string[];
  dockerfile: DockerfileAdapterResult;
  githubWorkflow: WorkflowAdapterResult;
  gitlabCi: WorkflowAdapterResult;
  packageLock: LockfileAdapterResult;
  pnpmLock: LockfileAdapterResult;
  syftSbom: SbomAdapterResult;
  githubSbom: SbomAdapterResult;
}

export interface DockerfileAdapterResult {
  path: string;
  exists: boolean;
  baseImages: string[];
  usesLatest: boolean;
  inferredImageName: string;
  inferredTag: string;
}

export interface WorkflowAdapterResult {
  path: string;
  exists: boolean;
  kind: "github_workflow" | "gitlab_ci";
  jobs: string[];
  usesUnpinnedActions: boolean;
  dockerBuildObserved: boolean;
}

export interface LockfileAdapterResult {
  path: string;
  exists: boolean;
  kind: "package-lock" | "pnpm-lock";
  dependencyCount: number;
  dependencies: string[];
}

export interface SbomAdapterResult {
  path: string;
  exists: boolean;
  kind: "syft-sbom" | "github-sbom";
  componentCount: number;
  components: string[];
}

export const RepoAdapterNodeIds = [
  "repository",
  "github_workflow",
  "gitlab_ci_pipeline",
  "dockerfile",
  "container_image",
  "package_lock",
  "pnpm_lock",
  "syft_sbom",
  "github_sbom"
] as const;

export const RepoAdapterFindingIds = [
  "repo-github-workflow-unpinned-action",
  "repo-dockerfile-latest-image",
  "repo-container-image-unsigned",
  "repo-package-lock-present",
  "repo-pnpm-lock-present",
  "repo-sbom-present"
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

function normalizePath(path: string): string {
  return path.split(sep).join("/");
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

function readIfExists(path: string): string {
  if (!existsSync(path)) {
    return "";
  }

  return readFileSync(path, "utf8");
}

function listFiles(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }

  const output: string[] = [];

  function walk(current: string): void {
    for (const entry of readdirSync(current)) {
      if (entry === "node_modules" || entry === ".git" || entry === "dist") {
        continue;
      }

      const full = join(current, entry);
      const stats = statSync(full);

      if (stats.isDirectory()) {
        walk(full);
      } else if (stats.isFile()) {
        output.push(normalizePath(relative(root, full)));
      }
    }
  }

  walk(root);
  return output.sort();
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

export function adaptDockerfile(repoRoot: string): DockerfileAdapterResult {
  const path = "Dockerfile";
  const fullPath = resolve(repoRoot, path);
  const content = readIfExists(fullPath);
  const baseImages = content
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.toUpperCase().startsWith("FROM "))
    .map((line) => line.split(/\s+/)[1] ?? "")
    .filter(Boolean);

  return {
    path,
    exists: existsSync(fullPath),
    baseImages,
    usesLatest: baseImages.some((image) => image.endsWith(":latest") || !image.includes(":")),
    inferredImageName: basename(repoRoot).toLowerCase().replace(/[^a-z0-9_.-]/g, "-"),
    inferredTag: "local-fixture"
  };
}

export function adaptGithubWorkflow(repoRoot: string): WorkflowAdapterResult {
  const path = ".github/workflows/ci.yml";
  const content = readIfExists(resolve(repoRoot, path));
  const jobs = [...content.matchAll(/^\s{2}([A-Za-z0-9_-]+):\s*$/gm)]
    .map((match) => match[1] ?? "")
    .filter((job) => job.length > 0 && job !== "pull_request" && job !== "push");

  const usesLines = content
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("uses:"));

  const usesUnpinnedActions = usesLines.some((line) => {
    const ref = line.split("@")[1] ?? "";
    return !/^[a-f0-9]{40}$/i.test(ref);
  });

  return {
    path,
    exists: existsSync(resolve(repoRoot, path)),
    kind: "github_workflow",
    jobs,
    usesUnpinnedActions,
    dockerBuildObserved: /docker\s+build|docker\/build-push-action/i.test(content)
  };
}

export function adaptGitlabCi(repoRoot: string): WorkflowAdapterResult {
  const path = ".gitlab-ci.yml";
  const content = readIfExists(resolve(repoRoot, path));
  const jobs = [...content.matchAll(/^([A-Za-z0-9_.:-]+):\s*$/gm)]
    .map((match) => match[1] ?? "")
    .filter((job) => !["stages", "variables", "default", "workflow"].includes(job));

  return {
    path,
    exists: existsSync(resolve(repoRoot, path)),
    kind: "gitlab_ci",
    jobs,
    usesUnpinnedActions: false,
    dockerBuildObserved: /docker\s+build/i.test(content)
  };
}

export function adaptPackageLock(repoRoot: string): LockfileAdapterResult {
  const path = "package-lock.json";
  const fullPath = resolve(repoRoot, path);
  const content = readIfExists(fullPath);
  let dependencies: string[] = [];

  if (content) {
    const parsed = JSON.parse(content) as {
      packages?: Record<string, unknown>;
      dependencies?: Record<string, unknown>;
    };

    if (parsed.packages) {
      dependencies = Object.keys(parsed.packages)
        .filter((key) => key.startsWith("node_modules/"))
        .map((key) => key.replace("node_modules/", ""));
    } else if (parsed.dependencies) {
      dependencies = Object.keys(parsed.dependencies);
    }
  }

  return {
    path,
    exists: existsSync(fullPath),
    kind: "package-lock",
    dependencyCount: dependencies.length,
    dependencies
  };
}

export function adaptPnpmLock(repoRoot: string): LockfileAdapterResult {
  const path = "pnpm-lock.yaml";
  const content = readIfExists(resolve(repoRoot, path));
  const dependencies = [...content.matchAll(/^\s{2}\/([^/@\s][^@\s]*|@[^/]+\/[^@\s]+)@/gm)]
    .map((match) => match[1] ?? "")
    .filter((item) => item.length > 0);

  return {
    path,
    exists: existsSync(resolve(repoRoot, path)),
    kind: "pnpm-lock",
    dependencyCount: dependencies.length,
    dependencies
  };
}

export function adaptSyftSbom(repoRoot: string): SbomAdapterResult {
  const path = "sbom/syft-sbom.json";
  const content = readIfExists(resolve(repoRoot, path));
  let components: string[] = [];

  if (content) {
    const parsed = JSON.parse(content) as {
      artifacts?: Array<{ name?: string; version?: string }>;
    };

    components = Array.isArray(parsed.artifacts)
      ? parsed.artifacts.map((artifact) => artifact.name ?? "").filter(Boolean)
      : [];
  }

  return {
    path,
    exists: existsSync(resolve(repoRoot, path)),
    kind: "syft-sbom",
    componentCount: components.length,
    components
  };
}

export function adaptGithubSbom(repoRoot: string): SbomAdapterResult {
  const path = "sbom/github-dependency-snapshot.json";
  const content = readIfExists(resolve(repoRoot, path));
  let components: string[] = [];

  if (content) {
    const parsed = JSON.parse(content) as {
      manifests?: Record<string, { resolved?: Record<string, unknown> }>;
    };

    components = Object.values(parsed.manifests ?? {})
      .flatMap((manifest) => Object.keys(manifest.resolved ?? {}))
      .sort();
  }

  return {
    path,
    exists: existsSync(resolve(repoRoot, path)),
    kind: "github-sbom",
    componentCount: components.length,
    components
  };
}

export function scanLocalRepo(repoRoot: string): LocalRepoScan {
  return {
    repoRoot,
    repoName: basename(repoRoot),
    files: listFiles(repoRoot),
    dockerfile: adaptDockerfile(repoRoot),
    githubWorkflow: adaptGithubWorkflow(repoRoot),
    gitlabCi: adaptGitlabCi(repoRoot),
    packageLock: adaptPackageLock(repoRoot),
    pnpmLock: adaptPnpmLock(repoRoot),
    syftSbom: adaptSyftSbom(repoRoot),
    githubSbom: adaptGithubSbom(repoRoot)
  };
}

export function buildLocalRepoEvidencePack(
  scan: LocalRepoScan,
  baseEvidencePack: JsonRecord
): JsonRecord {
  const base = cloneRecord(baseEvidencePack);
  const nodeTemplates = asRecords(base.nodes);
  const edgeTemplates = asRecords(base.edges);
  const evidenceTemplates = asRecords(base.evidence);
  const findingTemplates = asRecords(base.findings);
  const remediationTemplates = asRecords(base.remediations);
  const complianceTemplates = asRecords(base.complianceImpacts);

  const nodes = [
    makeNode(nodeTemplates, 0, "repository", "repository", "Local repository " + scan.repoName, {
      path: scan.repoRoot,
      fileCount: scan.files.length
    }),
    makeNode(nodeTemplates, 1, "github_workflow", "ci_pipeline", "GitHub Actions workflow", {
      path: scan.githubWorkflow.path,
      jobs: scan.githubWorkflow.jobs
    }),
    makeNode(nodeTemplates, 2, "gitlab_ci_pipeline", "ci_pipeline", "GitLab CI pipeline", {
      path: scan.gitlabCi.path,
      jobs: scan.gitlabCi.jobs
    }),
    makeNode(nodeTemplates, 3, "dockerfile", "source_file", "Dockerfile", {
      path: scan.dockerfile.path,
      baseImages: scan.dockerfile.baseImages
    }),
    makeNode(nodeTemplates, 4, "container_image", "container_image", scan.dockerfile.inferredImageName + ":" + scan.dockerfile.inferredTag, {
      image: scan.dockerfile.inferredImageName,
      tag: scan.dockerfile.inferredTag,
      inferred: true,
      signed: false
    }),
    makeNode(nodeTemplates, 5, "package_lock", "dependency_lockfile", "package-lock.json", {
      dependencyCount: scan.packageLock.dependencyCount
    }),
    makeNode(nodeTemplates, 6, "pnpm_lock", "dependency_lockfile", "pnpm-lock.yaml", {
      dependencyCount: scan.pnpmLock.dependencyCount
    }),
    makeNode(nodeTemplates, 7, "syft_sbom", "sbom", "Syft SBOM", {
      componentCount: scan.syftSbom.componentCount
    }),
    makeNode(nodeTemplates, 8, "github_sbom", "sbom", "GitHub dependency snapshot", {
      componentCount: scan.githubSbom.componentCount
    })
  ];

  const edges = [
    makeEdge(edgeTemplates, 0, "edge_repo_github_workflow", "repository", "github_workflow", "contains", "contains GitHub workflow"),
    makeEdge(edgeTemplates, 1, "edge_repo_gitlab_ci", "repository", "gitlab_ci_pipeline", "contains", "contains GitLab CI"),
    makeEdge(edgeTemplates, 2, "edge_github_workflow_image", "github_workflow", "container_image", "builds", "builds image"),
    makeEdge(edgeTemplates, 3, "edge_gitlab_ci_image", "gitlab_ci_pipeline", "container_image", "builds", "builds image"),
    makeEdge(edgeTemplates, 4, "edge_repo_dockerfile", "repository", "dockerfile", "contains", "contains Dockerfile"),
    makeEdge(edgeTemplates, 5, "edge_dockerfile_image", "dockerfile", "container_image", "builds", "infers image"),
    makeEdge(edgeTemplates, 6, "edge_repo_package_lock", "repository", "package_lock", "contains", "contains package-lock"),
    makeEdge(edgeTemplates, 7, "edge_repo_pnpm_lock", "repository", "pnpm_lock", "contains", "contains pnpm lock"),
    makeEdge(edgeTemplates, 8, "edge_package_lock_syft", "package_lock", "syft_sbom", "documents", "documented by SBOM"),
    makeEdge(edgeTemplates, 9, "edge_pnpm_lock_github_sbom", "pnpm_lock", "github_sbom", "documents", "documented by GitHub SBOM"),
    makeEdge(edgeTemplates, 10, "edge_syft_image", "syft_sbom", "container_image", "verifies", "verifies image components"),
    makeEdge(edgeTemplates, 11, "edge_github_sbom_repo", "github_sbom", "repository", "verifies", "verifies repository dependencies")
  ];

  const evidence = [
    makeEvidence(evidenceTemplates, 0, "evidence_repo_readme", "source_file", "Repository README", scan.repoRoot + "/README.md"),
    makeEvidence(evidenceTemplates, 1, "evidence_github_workflow", "ci_workflow", "GitHub Actions workflow", scan.repoRoot + "/" + scan.githubWorkflow.path),
    makeEvidence(evidenceTemplates, 2, "evidence_gitlab_ci", "ci_workflow", "GitLab CI workflow", scan.repoRoot + "/" + scan.gitlabCi.path),
    makeEvidence(evidenceTemplates, 3, "evidence_dockerfile", "source_file", "Dockerfile source", scan.repoRoot + "/" + scan.dockerfile.path),
    makeEvidence(evidenceTemplates, 4, "evidence_package_lock", "source_file", "package-lock dependency lock", scan.repoRoot + "/" + scan.packageLock.path),
    makeEvidence(evidenceTemplates, 5, "evidence_pnpm_lock", "source_file", "pnpm dependency lock", scan.repoRoot + "/" + scan.pnpmLock.path),
    makeEvidence(evidenceTemplates, 6, "evidence_syft_sbom", "sbom", "Syft SBOM", scan.repoRoot + "/" + scan.syftSbom.path),
    makeEvidence(evidenceTemplates, 7, "evidence_github_sbom", "sbom", "GitHub dependency snapshot", scan.repoRoot + "/" + scan.githubSbom.path)
  ];

  const findings = [
    makeFinding(
      findingTemplates,
      0,
      "repo-github-workflow-unpinned-action",
      "medium",
      "GitHub workflow uses an action reference that is not pinned to a full commit SHA",
      ["github_workflow"],
      ["evidence_github_workflow"],
      scan.githubWorkflow.usesUnpinnedActions ? "open" : "mitigated"
    ),
    makeFinding(
      findingTemplates,
      1,
      "repo-dockerfile-latest-image",
      "high",
      "Dockerfile base image must not use latest or an implicit tag",
      ["dockerfile", "container_image"],
      ["evidence_dockerfile"],
      scan.dockerfile.usesLatest ? "open" : "mitigated"
    ),
    makeFinding(
      findingTemplates,
      2,
      "repo-container-image-unsigned",
      "high",
      "Container image is inferred from Dockerfile but has no signing evidence yet",
      ["container_image"],
      ["evidence_dockerfile"],
      "open"
    ),
    makeFinding(
      findingTemplates,
      3,
      "repo-package-lock-present",
      "low",
      "package-lock is present and can be used as dependency evidence",
      ["package_lock"],
      ["evidence_package_lock"],
      scan.packageLock.exists ? "mitigated" : "open"
    ),
    makeFinding(
      findingTemplates,
      4,
      "repo-pnpm-lock-present",
      "low",
      "pnpm-lock is present and can be used as dependency evidence",
      ["pnpm_lock"],
      ["evidence_pnpm_lock"],
      scan.pnpmLock.exists ? "mitigated" : "open"
    ),
    makeFinding(
      findingTemplates,
      5,
      "repo-sbom-present",
      "low",
      "SBOM evidence is present for repository dependencies",
      ["syft_sbom", "github_sbom"],
      ["evidence_syft_sbom", "evidence_github_sbom"],
      scan.syftSbom.exists && scan.githubSbom.exists ? "mitigated" : "open"
    )
  ];

  const remediations = [
    makeRemediation(
      remediationTemplates,
      0,
      "remediate-repo-github-workflow-unpinned-action",
      "repo-github-workflow-unpinned-action",
      "Pin GitHub Actions to full commit SHAs.",
      ["github_workflow"],
      ["evidence_github_workflow"]
    ),
    makeRemediation(
      remediationTemplates,
      1,
      "remediate-repo-container-image-unsigned",
      "repo-container-image-unsigned",
      "Add image signing and attach signature evidence.",
      ["container_image"],
      ["evidence_dockerfile"]
    ),
    makeRemediation(
      remediationTemplates,
      2,
      "remediate-repo-sbom-present",
      "repo-sbom-present",
      "Generate and publish SBOM artifacts for each release.",
      ["syft_sbom", "github_sbom"],
      ["evidence_syft_sbom", "evidence_github_sbom"]
    )
  ];

  const complianceImpacts = [
    makeComplianceImpact(
      complianceTemplates,
      0,
      "repo-impact-slsa-build-integrity",
      "SLSA",
      "BUILD_INTEGRITY",
      "high",
      ["repo-github-workflow-unpinned-action", "repo-container-image-unsigned"]
    ),
    makeComplianceImpact(
      complianceTemplates,
      1,
      "repo-impact-iso-dependency-evidence",
      "ISO27001",
      "DEPENDENCY_EVIDENCE",
      "medium",
      ["repo-sbom-present"]
    )
  ];

  return {
    ...base,
    packId: "local-repo-dreps-evidence-pack",
    nodes,
    edges,
    evidence,
    findings,
    remediations,
    complianceImpacts,
    metadata: {
      ...asRecord(base.metadata),
      adapter: "dreps-adapters",
      source: "local-repo-fixture",
      graph: "repository -> ci_pipeline -> container_image ; Dockerfile -> container_image ; SBOM -> evidence"
    }
  };
}

export function renderLocalRepoGraphMermaid(evidencePack: JsonRecord): string {
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

export function assertLocalRepoEvidencePackShape(evidencePack: JsonRecord): void {
  const nodes = asRecords(evidencePack.nodes);
  const edges = asRecords(evidencePack.edges);
  const evidence = asRecords(evidencePack.evidence);

  const nodeIds = new Set(nodes.map((node) => asText(node.id)));
  const evidenceIds = new Set(evidence.map((item) => asText(item.id)));

  for (const nodeId of RepoAdapterNodeIds) {
    if (!nodeIds.has(nodeId)) {
      throw new Error("Missing repo adapter node: " + nodeId);
    }
  }

  for (const evidenceId of [
    "evidence_dockerfile",
    "evidence_github_workflow",
    "evidence_gitlab_ci",
    "evidence_syft_sbom",
    "evidence_github_sbom"
  ]) {
    if (!evidenceIds.has(evidenceId)) {
      throw new Error("Missing repo adapter evidence: " + evidenceId);
    }
  }

  const requiredEdges = [
    ["repository", "github_workflow"],
    ["repository", "gitlab_ci_pipeline"],
    ["dockerfile", "container_image"],
    ["github_workflow", "container_image"],
    ["gitlab_ci_pipeline", "container_image"],
    ["syft_sbom", "container_image"]
  ];

  for (const [source, target] of requiredEdges) {
    const found = edges.some((edge) => {
      const edgeSource = asText(edge.source ?? edge.from ?? edge.sourceNodeId ?? edge.sourceId);
      const edgeTarget = asText(edge.target ?? edge.to ?? edge.targetNodeId ?? edge.targetId);

      return edgeSource === source && edgeTarget === target;
    });

    if (!found) {
      throw new Error("Missing repo adapter graph edge: " + source + " -> " + target);
    }
  }
}

export function repoPath(root: string, ...parts: string[]): string {
  return normalizePath(relative(process.cwd(), resolve(root, ...parts)));
}
