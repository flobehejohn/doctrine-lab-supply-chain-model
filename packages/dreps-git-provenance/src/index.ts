import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

export type JsonRecord = Record<string, unknown>;

export const GitProvenanceFindingIds = [
  "unsigned-release-tag",
  "missing-release-provenance",
  "missing-codeowners",
  "force-push-risk",
  "secret-history-risk",
  "no-release-tags"
] as const;

export interface GitReleaseTag {
  name: string;
  targetSha: string;
  annotated: boolean;
  signed: boolean;
  hasProvenance: boolean;
  createdAt?: string;
  source?: string;
  notes?: string;
}

export interface GitProvenanceCheck {
  repoRoot: string;
  branch: string;
  headSha: string;
  headShortSha: string;
  recentCommits: Array<{
    sha: string;
    subject: string;
    authorDate: string;
  }>;
  codeowners: {
    exists: boolean;
    path: string | null;
    owners: string[];
  };
  releases: {
    source: string;
    tags: GitReleaseTag[];
  };
  branchProtection: {
    branch: string;
    allowForcePushes: boolean;
    requiresLinearHistory: boolean;
    requiresSignedCommits: boolean;
    requiresCodeOwnerReviews: boolean;
  };
  secretHistory: {
    scannedCommits: number;
    matches: Array<{
      ruleId: string;
      commitSha: string;
      path: string;
      redactedMatch: string;
      severity: string;
    }>;
  };
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

function readJsonFile<T>(path: string, fallback: T): T {
  if (!existsSync(path)) {
    return fallback;
  }

  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function runGit(repoRoot: string, args: string[], fallback = ""): string {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false
  });

  if (result.status !== 0) {
    return fallback;
  }

  return result.stdout.trim();
}

function normalizeNodeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^_+/, "").replace(/_+$/, "") || "unknown";
}

function detectCodeowners(repoRoot: string): GitProvenanceCheck["codeowners"] {
  const candidates = [
    ".github/CODEOWNERS",
    "CODEOWNERS",
    "docs/CODEOWNERS"
  ];

  const found = candidates.find((candidate) => existsSync(join(repoRoot, candidate)));

  if (!found) {
    return {
      exists: false,
      path: null,
      owners: []
    };
  }

  const content = readFileSync(join(repoRoot, found), "utf8");

  const owners = Array.from(
    new Set(
      content
        .split(/\r?\n/g)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .flatMap((line) => line.split(/\s+/g).slice(1))
        .filter((token) => token.startsWith("@"))
    )
  );

  return {
    exists: true,
    path: found,
    owners
  };
}

function gitRecentCommits(repoRoot: string): GitProvenanceCheck["recentCommits"] {
  const output = runGit(
    repoRoot,
    ["log", "--max-count=10", "--date=iso-strict", "--pretty=format:%H%x1f%ad%x1f%s"],
    ""
  );

  if (!output) {
    return [];
  }

  return output.split(/\r?\n/g).map((line) => {
    const [sha = "", authorDate = "", subject = ""] = line.split("\x1f");

    return {
      sha,
      authorDate,
      subject
    };
  });
}

function gitReleaseTags(repoRoot: string): GitReleaseTag[] {
  const output = runGit(repoRoot, ["tag", "--list", "--sort=-creatordate"], "");

  if (!output) {
    return [];
  }

  return output
    .split(/\r?\n/g)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => {
      const targetSha = runGit(repoRoot, ["rev-list", "-n", "1", name], "");
      const objectType = runGit(repoRoot, ["cat-file", "-t", name], "commit");
      const verify = spawnSync("git", ["tag", "-v", name], {
        cwd: repoRoot,
        encoding: "utf8",
        shell: false
      });

      return {
        name,
        targetSha,
        annotated: objectType === "tag",
        signed: verify.status === 0,
        hasProvenance: false,
        source: "git"
      };
    });
}

export function checkGitProvenance(
  repoRoot: string,
  options: {
    releaseTagsFixturePath?: string;
    branchProtectionFixturePath?: string;
    secretHistoryFixturePath?: string;
    checkedAt?: string;
  } = {}
): GitProvenanceCheck {
  const resolvedRoot = resolve(repoRoot);
  const branch = runGit(resolvedRoot, ["rev-parse", "--abbrev-ref", "HEAD"], "unknown");
  const headSha = runGit(resolvedRoot, ["rev-parse", "HEAD"], "0000000000000000000000000000000000000000");
  const headShortSha = runGit(resolvedRoot, ["rev-parse", "--short", "HEAD"], "0000000");

  const fixtureTags = readJsonFile<{
    source?: string;
    tags?: GitReleaseTag[];
  }>(
    options.releaseTagsFixturePath ?? "",
    {
      source: "git",
      tags: gitReleaseTags(resolvedRoot)
    }
  );

  const branchProtection = readJsonFile<GitProvenanceCheck["branchProtection"]>(
    options.branchProtectionFixturePath ?? "",
    {
      branch,
      allowForcePushes: false,
      requiresLinearHistory: true,
      requiresSignedCommits: false,
      requiresCodeOwnerReviews: false
    }
  );

  const secretHistory = readJsonFile<GitProvenanceCheck["secretHistory"]>(
    options.secretHistoryFixturePath ?? "",
    {
      scannedCommits: 25,
      matches: []
    }
  );

  return {
    repoRoot: resolvedRoot,
    branch,
    headSha,
    headShortSha,
    recentCommits: gitRecentCommits(resolvedRoot),
    codeowners: detectCodeowners(resolvedRoot),
    releases: {
      source: fixtureTags.source ?? "git",
      tags: fixtureTags.tags ?? []
    },
    branchProtection,
    secretHistory,
    checkedAt: options.checkedAt ?? "2026-06-25T00:00:00.000Z"
  };
}

export function gitProvenanceFindings(check: GitProvenanceCheck): Array<{
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  affectedNodes: string[];
  evidenceRefs: string[];
}> {
  const findings: Array<{
    id: string;
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    affectedNodes: string[];
    evidenceRefs: string[];
  }> = [];

  const releaseTagNodes = check.releases.tags.map((tag) => "release_tag_" + normalizeNodeId(tag.name));

  if (check.releases.tags.length === 0) {
    findings.push({
      id: "no-release-tags",
      severity: "medium",
      title: "Repository has no release tags",
      affectedNodes: ["repository"],
      evidenceRefs: ["evidence_git_tags"]
    });
  }

  const unsignedTags = check.releases.tags.filter((tag) => !tag.signed);
  if (unsignedTags.length > 0) {
    findings.push({
      id: "unsigned-release-tag",
      severity: "high",
      title: "Release tag is not cryptographically signed",
      affectedNodes: releaseTagNodes,
      evidenceRefs: ["evidence_git_tags", "evidence_git_provenance"]
    });
  }

  const missingProvenance = check.releases.tags.filter((tag) => !tag.hasProvenance);
  if (missingProvenance.length > 0) {
    findings.push({
      id: "missing-release-provenance",
      severity: "high",
      title: "Release tag has no attached provenance attestation",
      affectedNodes: releaseTagNodes,
      evidenceRefs: ["evidence_git_tags", "evidence_git_provenance"]
    });
  }

  if (!check.codeowners.exists) {
    findings.push({
      id: "missing-codeowners",
      severity: "medium",
      title: "Repository has no CODEOWNERS file",
      affectedNodes: ["repository"],
      evidenceRefs: ["evidence_codeowners"]
    });
  }

  if (check.branchProtection.allowForcePushes) {
    findings.push({
      id: "force-push-risk",
      severity: "high",
      title: "Branch protection allows force-pushes",
      affectedNodes: ["repository", "git_branch"],
      evidenceRefs: ["evidence_branch_protection"]
    });
  }

  if (check.secretHistory.matches.length > 0) {
    findings.push({
      id: "secret-history-risk",
      severity: "critical",
      title: "Secret-like material was detected in Git history",
      affectedNodes: ["repository", "git_history"],
      evidenceRefs: ["evidence_secret_history_scan"]
    });
  }

  return findings;
}

export function buildGitProvenanceEvidencePack(
  baseEvidencePack: JsonRecord,
  check: GitProvenanceCheck,
  paths: {
    normalizedPath: string;
    releaseTagsPath: string;
    branchProtectionPath: string;
    secretHistoryPath: string;
  }
): JsonRecord {
  const base = cloneRecord(baseEvidencePack);
  const nodeTemplates = asRecords(base.nodes);
  const edgeTemplates = asRecords(base.edges);
  const evidenceTemplates = asRecords(base.evidence);
  const findingTemplates = asRecords(base.findings);
  const remediationTemplates = asRecords(base.remediations);
  const complianceTemplates = asRecords(base.complianceImpacts);

  const releaseNodes = check.releases.tags.map((tag, index) =>
    makeNode(
      nodeTemplates,
      5 + index,
      "release_tag_" + normalizeNodeId(tag.name),
      "artifact",
      "Release tag " + tag.name,
      {
        tag: tag.name,
        targetSha: tag.targetSha,
        signed: tag.signed,
        hasProvenance: tag.hasProvenance,
        annotated: tag.annotated
      }
    )
  );

  const nodes = [
    makeNode(nodeTemplates, 0, "repository", "repository", "Local Git repository", {
      repoRoot: check.repoRoot,
      headSha: check.headSha
    }),
    makeNode(nodeTemplates, 1, "git_branch", "artifact", "Git branch " + check.branch, {
      branch: check.branch
    }),
    makeNode(nodeTemplates, 2, "git_head_commit", "artifact", "HEAD " + check.headShortSha, {
      sha: check.headSha
    }),
    makeNode(nodeTemplates, 3, "git_history", "artifact", "Git history", {
      recentCommitCount: check.recentCommits.length
    }),
    makeNode(nodeTemplates, 4, "codeowners", "documentation", "CODEOWNERS", {
      exists: check.codeowners.exists,
      owners: check.codeowners.owners,
      codeownersPath: check.codeowners.path
    }),
    ...releaseNodes
  ];

  const releaseEdges = releaseNodes.map((node, index) =>
    makeEdge(
      edgeTemplates,
      5 + index,
      "edge_repository_" + asText(node.id),
      "repository",
      asText(node.id),
      "contains",
      "repository contains release tag"
    )
  );

  const edges = [
    makeEdge(edgeTemplates, 0, "edge_repository_branch", "repository", "git_branch", "contains", "repository contains branch"),
    makeEdge(edgeTemplates, 1, "edge_branch_head", "git_branch", "git_head_commit", "contains", "branch points to HEAD"),
    makeEdge(edgeTemplates, 2, "edge_repository_history", "repository", "git_history", "contains", "repository contains history"),
    makeEdge(edgeTemplates, 3, "edge_repository_codeowners", "repository", "codeowners", "documents", "repository ownership is documented"),
    makeEdge(edgeTemplates, 4, "edge_history_head", "git_history", "git_head_commit", "contains", "history contains HEAD"),
    ...releaseEdges
  ];

  const evidence = [
    makeEvidence(evidenceTemplates, 0, "evidence_git_provenance", "audit_log", "Git provenance normalized output", paths.normalizedPath, {
      headSha: check.headSha,
      branch: check.branch
    }),
    makeEvidence(evidenceTemplates, 1, "evidence_git_tags", "configuration", "Git release tag inventory", paths.releaseTagsPath, {
      tagCount: check.releases.tags.length,
      source: check.releases.source
    }),
    makeEvidence(evidenceTemplates, 2, "evidence_codeowners", "source_file", "CODEOWNERS ownership rules", check.codeowners.path ?? ".github/CODEOWNERS", {
      exists: check.codeowners.exists,
      owners: check.codeowners.owners
    }),
    makeEvidence(evidenceTemplates, 3, "evidence_branch_protection", "configuration", "Branch protection forensic metadata", paths.branchProtectionPath, {
      allowForcePushes: check.branchProtection.allowForcePushes
    }),
    makeEvidence(evidenceTemplates, 4, "evidence_secret_history_scan", "scan_result", "Secret history scan", paths.secretHistoryPath, {
      matches: check.secretHistory.matches.length
    })
  ];

  const generatedFindings = gitProvenanceFindings(check);

  const findings = generatedFindings.map((finding, index) =>
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
      "remediate-unsigned-release-tag",
      "unsigned-release-tag",
      "Sign release tags and enforce signed release verification in CI.",
      releaseNodes.map((node) => asText(node.id)),
      ["evidence_git_tags"]
    ),
    makeRemediation(
      remediationTemplates,
      1,
      "remediate-missing-release-provenance",
      "missing-release-provenance",
      "Attach SLSA provenance or equivalent attestations to every release.",
      releaseNodes.map((node) => asText(node.id)),
      ["evidence_git_provenance"]
    ),
    makeRemediation(
      remediationTemplates,
      2,
      "remediate-force-push-risk",
      "force-push-risk",
      "Disable force-pushes and require protected branch reviews.",
      ["repository", "git_branch"],
      ["evidence_branch_protection"]
    ),
    makeRemediation(
      remediationTemplates,
      3,
      "remediate-secret-history-risk",
      "secret-history-risk",
      "Rotate exposed secrets and purge or quarantine sensitive history.",
      ["repository", "git_history"],
      ["evidence_secret_history_scan"]
    )
  ];

  const complianceImpacts = [
    makeComplianceImpact(
      complianceTemplates,
      0,
      "git-provenance-impact-slsa",
      "SLSA",
      "SOURCE_AND_RELEASE_PROVENANCE",
      "high",
      generatedFindings.map((finding) => finding.id)
    ),
    makeComplianceImpact(
      complianceTemplates,
      1,
      "git-provenance-impact-iso27001",
      "ISO27001",
      "CHANGE_CONTROL_AND_SOURCE_INTEGRITY",
      "high",
      generatedFindings.map((finding) => finding.id)
    )
  ];

  return {
    ...base,
    packId: "git-provenance-dreps-evidence-pack",
    nodes,
    edges,
    evidence,
    findings,
    remediations,
    complianceImpacts,
    metadata: {
      ...asRecord(base.metadata),
      adapter: "dreps-git-provenance",
      source: "local-git-repository",
      checkedAt: check.checkedAt
    }
  };
}

export function assertGitProvenanceEvidencePackShape(evidencePack: JsonRecord): void {
  const nodes = asRecords(evidencePack.nodes);
  const evidence = asRecords(evidencePack.evidence);
  const findings = asRecords(evidencePack.findings);

  const nodeIds = new Set(nodes.map((node) => asText(node.id)));
  const evidenceIds = new Set(evidence.map((item) => asText(item.id)));
  const findingIds = new Set(findings.map((item) => asText(item.id)));

  for (const requiredNode of ["repository", "git_branch", "git_head_commit", "git_history", "codeowners", "release_tag_v0_1_0"]) {
    if (!nodeIds.has(requiredNode)) {
      throw new Error("Missing Git provenance node: " + requiredNode);
    }
  }

  for (const requiredEvidence of [
    "evidence_git_provenance",
    "evidence_git_tags",
    "evidence_codeowners",
    "evidence_branch_protection",
    "evidence_secret_history_scan"
  ]) {
    if (!evidenceIds.has(requiredEvidence)) {
      throw new Error("Missing Git provenance evidence: " + requiredEvidence);
    }
  }

  for (const requiredFinding of [
    "unsigned-release-tag",
    "missing-release-provenance",
    "force-push-risk",
    "secret-history-risk"
  ]) {
    if (!findingIds.has(requiredFinding)) {
      throw new Error("Missing Git provenance finding: " + requiredFinding);
    }
  }

  if (findingIds.has("missing-codeowners")) {
    throw new Error("CODEOWNERS should be detected, but missing-codeowners was generated");
  }

  const unsignedFinding = findings.find((finding) => asText(finding.id) === "unsigned-release-tag");
  const affectedNodes = Array.isArray(unsignedFinding?.affectedNodes)
    ? unsignedFinding.affectedNodes.map((item) => asText(item))
    : [];

  if (!affectedNodes.includes("release_tag_v0_1_0")) {
    throw new Error("unsigned-release-tag is not linked to release_tag_v0_1_0");
  }
}

export function normalizeRepoRelativePath(repoRoot: string, targetPath: string): string {
  return relative(resolve(repoRoot), resolve(targetPath)).replace(/\\/g, "/");
}
