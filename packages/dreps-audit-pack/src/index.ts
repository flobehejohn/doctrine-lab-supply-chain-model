import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

export type JsonRecord = Record<string, unknown>;

export interface AuditPackConfig {
  schemaVersion?: string;
  packId: string;
  title: string;
  description: string;
  producer: string;
  outputRoot: string;
  requiredTopLevelFiles: string[];
  explorer: {
    readme: string;
    jtableViewsDir: string;
    jqExamples: string;
    mermaidDir: string;
  };
}

export interface AuditPackManifestFile {
  path: string;
  kind: "json" | "markdown" | "mermaid" | "checksum" | "text";
  bytes: number;
  sha256?: string;
}

export interface AuditPackManifest {
  schemaVersion: "dreps-audit-pack.manifest.v1";
  packId: string;
  title: string;
  description: string;
  producer: string;
  generatedAt: string;
  root: string;
  files: AuditPackManifestFile[];
  requiredTopLevelFiles: string[];
  explorer: {
    readme: string;
    jtableViewsDir: string;
    jqExamples: string;
    mermaidDir: string;
  };
}

export interface AuditPackBuildResult {
  outputRoot: string;
  manifestPath: string;
  checksumsPath: string;
  jsonFilesCoveredByChecksums: string[];
  fileCount: number;
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function writeText(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, "utf8");
}

function copyIfExists(source: string, target: string): boolean {
  if (!existsSync(source)) {
    return false;
  }

  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  return true;
}

function jsonOrEmpty(path: string, fallback: JsonRecord): JsonRecord {
  if (!existsSync(path)) {
    return fallback;
  }

  return readJsonFile<JsonRecord>(path);
}

function listFilesRecursive(root: string): string[] {
  const results: string[] = [];

  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const absolute = join(dir, entry);
      const stat = statSync(absolute);

      if (stat.isDirectory()) {
        walk(absolute);
      } else {
        results.push(absolute);
      }
    }
  }

  if (existsSync(root)) {
    walk(root);
  }

  return results.sort((left, right) => left.localeCompare(right));
}

function sha256File(path: string): string {
  const hash = createHash("sha256");
  hash.update(readFileSync(path));
  return hash.digest("hex");
}

function kindForPath(path: string): AuditPackManifestFile["kind"] {
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".mmd")) return "mermaid";
  if (path.endsWith(".sha256")) return "checksum";
  return "text";
}

function commandVersion(command: string, args: string[]): string {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch {
    return "unavailable";
  }
}

function buildFindings(): JsonRecord {
  const sources = [
    ".doctrine/out/policy-engine/evidence-pack.policy-engine.json",
    ".doctrine/out/security-scans/evidence-pack.security-scans.json",
    ".doctrine/out/registry-trust/evidence-pack.registry-trust.json",
    ".doctrine/out/git-provenance/evidence-pack.git-provenance.json",
    ".doctrine/out/config-matrix/evidence-pack.config-matrix.json"
  ];

  const findings: unknown[] = [];

  for (const source of sources) {
    if (!existsSync(source)) {
      continue;
    }

    const pack = readJsonFile<JsonRecord>(source);
    const packFindings = Array.isArray(pack.findings) ? pack.findings : [];

    for (const finding of packFindings) {
      findings.push({
        source,
        ...(typeof finding === "object" && finding !== null ? finding as JsonRecord : { value: finding })
      });
    }
  }

  return {
    schemaVersion: "dreps-audit-pack.findings.v1",
    generatedAt: "2026-06-25T00:00:00.000Z",
    count: findings.length,
    findings
  };
}

function buildGraphSnapshot(): JsonRecord {
  const candidates = [
    ".doctrine/out/runtime/evidence-pack.runtime.json",
    ".doctrine/out/adapters/evidence-pack.local-repo.json",
    "labs/supply-chain/examples/ecommerce/evidence-pack.json"
  ];

  const source = candidates.find((item) => existsSync(item));
  const pack = source ? readJsonFile<JsonRecord>(source) : {};

  return {
    schemaVersion: "dreps-audit-pack.graph-snapshot.v1",
    generatedAt: "2026-06-25T00:00:00.000Z",
    source: source ?? "none",
    nodes: Array.isArray(pack.nodes) ? pack.nodes : [],
    edges: Array.isArray(pack.edges) ? pack.edges : []
  };
}

function buildGraphDiff(): JsonRecord {
  const drift = jsonOrEmpty(".doctrine/out/drift-engine/drift-report.json", {
    schemaVersion: "dreps-drift-report.v1",
    drifts: []
  });

  return {
    schemaVersion: "dreps-audit-pack.graph-diff.v1",
    generatedAt: "2026-06-25T00:00:00.000Z",
    source: ".doctrine/out/drift-engine/drift-report.json",
    driftCount: Array.isArray(drift.drifts) ? drift.drifts.length : 0,
    drifts: Array.isArray(drift.drifts) ? drift.drifts : []
  };
}

function buildDocumentationIndex(): JsonRecord {
  const docs = [
    "README.md",
    "docs/30_POLICY_ENGINE.md",
    "docs/31_DRIFT_ENGINE.md",
    "docs/32_BLAST_RADIUS_ENGINE.md",
    "docs/33_COMPLIANCE_MAPPER.md",
    "docs/34_REMEDIATION_ENGINE.md",
    "docs/35_GITOPS_PATCH_GENERATOR.md",
    "docs/36_MAINTENANCE_PLANNER.md",
    "docs/37_SIMULATION_ENGINE.md",
    "docs/38_AUDIT_PACK_ENGINE.md"
  ].filter((path) => existsSync(path));

  return {
    schemaVersion: "dreps-audit-pack.documentation-index.v1",
    generatedAt: "2026-06-25T00:00:00.000Z",
    documents: docs.map((path) => ({
      path,
      title: path.split("/").pop() ?? path,
      bytes: statSync(path).size
    }))
  };
}

function buildRunbookIndex(): JsonRecord {
  const candidates = [
    "labs/supply-chain/environments/gitlab-local/RUNBOOK.md",
    "docs/34_REMEDIATION_ENGINE.md",
    "docs/36_MAINTENANCE_PLANNER.md"
  ].filter((path) => existsSync(path));

  return {
    schemaVersion: "dreps-audit-pack.runbook-index.v1",
    generatedAt: "2026-06-25T00:00:00.000Z",
    runbooks: candidates.map((path) => ({
      path,
      title: path.split("/").pop() ?? path,
      bytes: statSync(path).size
    }))
  };
}

function buildCommandCatalog(): JsonRecord {
  const commands = [
    "pnpm supplychain:certify",
    "pnpm auditpack:generate",
    "pnpm auditpack:certify",
    "pnpm query:engine:certify",
    "pnpm policy:engine:certify",
    "pnpm drift:engine:certify",
    "pnpm blast:radius:certify",
    "pnpm compliance:certify",
    "pnpm remediation:certify",
    "pnpm gitops:patch:certify",
    "pnpm maintenance:certify",
    "pnpm simulation:certify"
  ];

  return {
    schemaVersion: "dreps-audit-pack.command-catalog.v1",
    generatedAt: "2026-06-25T00:00:00.000Z",
    commands: commands.map((command) => ({
      command,
      shell: "PowerShell",
      purpose: "portable audit-pack validation"
    }))
  };
}

function buildToolVersions(): JsonRecord {
  return {
    schemaVersion: "dreps-audit-pack.tool-versions.v1",
    generatedAt: "2026-06-25T00:00:00.000Z",
    tools: {
      node: commandVersion("node", ["--version"]),
      pnpm: commandVersion("pnpm", ["--version"]),
      git: commandVersion("git", ["--version"]),
      gh: commandVersion("gh", ["--version"]).split("\n")[0] ?? "unavailable"
    }
  };
}

function explorerReadme(): string {
  return [
    "# Audit Pack Explorer",
    "",
    "This folder contains portable exploration material for the audit pack.",
    "",
    "## Quick commands",
    "",
    "```powershell",
    "Get-Content .\\manifest.json | ConvertFrom-Json",
    "Get-Content .\\findings.json | ConvertFrom-Json",
    "Get-Content .\\simulation-results.json | ConvertFrom-Json",
    "Get-Content .\\checksums.sha256",
    "```",
    "",
    "## jtable",
    "",
    "jtable views are available in:",
    "",
    "```text",
    "explorer/jtable-views/",
    "```",
    "",
    "## jq",
    "",
    "jq examples are available in:",
    "",
    "```text",
    "explorer/jq-examples.md",
    "```",
    "",
    "## Mermaid",
    "",
    "Mermaid diagrams are available in:",
    "",
    "```text",
    "explorer/mermaid/",
    "```",
    ""
  ].join("\n");
}

function jqExamples(): string {
  return [
    "# jq examples",
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
    "jq -r '.findings[] | select(.severity == \"critical\") | .id' findings.json",
    "```",
    "",
    "## Show compliance impacts",
    "",
    "```bash",
    "jq -r '.impacts[] | [.framework, .control, .findingId, .impact] | @tsv' compliance-report.json",
    "```",
    "",
    "## Show simulation before/after score",
    "",
    "```bash",
    "jq '.beforeAfterScore' simulation-results.json",
    "```",
    "",
    "## Verify manifest paths",
    "",
    "```bash",
    "jq -r '.files[].path' manifest.json | sort",
    "```",
    ""
  ].join("\n");
}

function jtableViewsReadme(): string {
  return [
    "# jtable views",
    "",
    "Use these JSON files as portable table views for findings, compliance, remediation, maintenance and simulation exploration.",
    "",
    "Recommended checks:",
    "",
    "```powershell",
    "Get-ChildItem .\\explorer\\jtable-views\\*.json",
    "```",
    ""
  ].join("\n");
}

function copyJtableViews(outputRoot: string): void {
  const jtableDir = join(outputRoot, "explorer", "jtable-views");
  mkdirSync(jtableDir, { recursive: true });

  const mappings = [
    [".doctrine/out/query-engine/query-results.jtable.json", "query-results.jtable.json"],
    [".doctrine/out/blast-radius/blast-radius-summary.jtable.json", "blast-radius-summary.jtable.json"],
    [".doctrine/out/compliance/compliance-impact.jtable.json", "compliance-impact.jtable.json"],
    [".doctrine/out/remediation/remediation-plan.jtable.json", "remediation-plan.jtable.json"],
    [".doctrine/out/gitops-patch/pull-request-tables.jtable.json", "gitops-pr-tables.jtable.json"],
    [".doctrine/out/maintenance/remediation-calendar.jtable.json", "remediation-calendar.jtable.json"]
  ];

  for (const [source, target] of mappings) {
    if (existsSync(source)) {
      copyFileSync(source, join(jtableDir, target));
    }
  }

  writeText(join(jtableDir, "README.md"), jtableViewsReadme());
}

function copyMermaid(outputRoot: string): void {
  const mermaidDir = join(outputRoot, "explorer", "mermaid");
  mkdirSync(mermaidDir, { recursive: true });

  const mappings = [
    [".doctrine/out/diagrams/supplychain.mmd", "supplychain.mmd"],
    [".doctrine/out/blast-radius/blast-radius.mmd", "blast-radius.mmd"],
    [".doctrine/out/simulation/attack-path.mmd", "attack-path.mmd"],
    [".doctrine/out/drift-engine/drift.mmd", "drift.mmd"],
    [".doctrine/out/runtime/runtime-graph.mmd", "runtime-graph.mmd"],
    [".doctrine/out/gitlab-adapter/gitlab-dreps-graph.mmd", "gitlab-dreps-graph.mmd"]
  ];

  for (const [source, target] of mappings) {
    if (existsSync(source)) {
      copyFileSync(source, join(mermaidDir, target));
    }
  }
}

function buildChecksums(outputRoot: string): string[] {
  const files = listFilesRecursive(outputRoot)
    .map((absolute) => relative(outputRoot, absolute).replace(/\\/g, "/"))
    .filter((path) => path.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  const lines = files.map((path) => {
    const checksum = sha256File(join(outputRoot, path));
    return checksum + "  " + path;
  });

  writeText(join(outputRoot, "checksums.sha256"), lines.join("\n") + "\n");

  return files;
}

function buildManifest(config: AuditPackConfig, outputRoot: string): AuditPackManifest {
  const allFiles = listFilesRecursive(outputRoot)
    .map((absolute) => {
      const rel = relative(outputRoot, absolute).replace(/\\/g, "/");
      const kind = kindForPath(rel);
      const bytes = statSync(absolute).size;
      const sha256 = kind === "json" || kind === "checksum" ? sha256File(absolute) : undefined;

      return {
        path: rel,
        kind,
        bytes,
        ...(sha256 ? { sha256 } : {})
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));

  return {
    schemaVersion: "dreps-audit-pack.manifest.v1",
    packId: config.packId,
    title: config.title,
    description: config.description,
    producer: config.producer,
    generatedAt: "2026-06-25T00:00:00.000Z",
    root: outputRoot.replace(/\\/g, "/"),
    files: allFiles,
    requiredTopLevelFiles: config.requiredTopLevelFiles,
    explorer: config.explorer
  };
}

export function loadAuditPackConfig(path: string): AuditPackConfig {
  return readJsonFile<AuditPackConfig>(path);
}

export function generateAuditPack(config: AuditPackConfig): AuditPackBuildResult {
  const outputRoot = resolve(config.outputRoot);

  rmSync(outputRoot, { recursive: true, force: true });
  mkdirSync(outputRoot, { recursive: true });

  const supplychainSource = existsSync(".doctrine/out/adapters/evidence-pack.local-repo.json")
    ? ".doctrine/out/adapters/evidence-pack.local-repo.json"
    : "labs/supply-chain/examples/ecommerce/evidence-pack.json";

  copyIfExists(supplychainSource, join(outputRoot, "supplychain.evidence-pack.json"));
  writeJson(join(outputRoot, "graph.snapshot.json"), buildGraphSnapshot());
  writeJson(join(outputRoot, "graph.diff.json"), buildGraphDiff());

  copyIfExists(".doctrine/out/blast-radius/blast-radius-report.json", join(outputRoot, "blast-radius-report.json"));
  writeJson(join(outputRoot, "findings.json"), buildFindings());
  copyIfExists(".doctrine/out/remediation/remediation-plan.json", join(outputRoot, "remediation-plan.json"));
  copyIfExists(".doctrine/out/compliance/compliance-impact-report.json", join(outputRoot, "compliance-report.json"));
  copyIfExists(".doctrine/out/simulation/simulation-results.json", join(outputRoot, "simulation-results.json"));

  writeJson(join(outputRoot, "documentation-index.json"), buildDocumentationIndex());
  writeJson(join(outputRoot, "command-catalog.json"), buildCommandCatalog());
  writeJson(join(outputRoot, "runbook-index.json"), buildRunbookIndex());

  const workflowIndex = jsonOrEmpty(".doctrine/out/workflows/index.json", {
    schemaVersion: "workflow-index.unavailable.v1",
    workflows: []
  });
  writeJson(join(outputRoot, "workflow-index.json"), workflowIndex);

  writeJson(join(outputRoot, "tool-versions.json"), buildToolVersions());

  writeText(join(outputRoot, "explorer", "README.md"), explorerReadme());
  writeText(join(outputRoot, "explorer", "jq-examples.md"), jqExamples());
  copyJtableViews(outputRoot);
  copyMermaid(outputRoot);

  const manifestBeforeChecksums = buildManifest(config, outputRoot);
  writeJson(join(outputRoot, "manifest.json"), manifestBeforeChecksums);

  const jsonFilesCoveredByChecksums = buildChecksums(outputRoot);

  const manifestAfterChecksums = buildManifest(config, outputRoot);
  writeJson(join(outputRoot, "manifest.json"), manifestAfterChecksums);

  const finalJsonFilesCoveredByChecksums = buildChecksums(outputRoot);

  return {
    outputRoot,
    manifestPath: join(outputRoot, "manifest.json"),
    checksumsPath: join(outputRoot, "checksums.sha256"),
    jsonFilesCoveredByChecksums: finalJsonFilesCoveredByChecksums,
    fileCount: listFilesRecursive(outputRoot).length
  };
}

export function assertAuditPackShape(config: AuditPackConfig, outputRoot: string): void {
  const manifestPath = join(outputRoot, "manifest.json");
  const checksumsPath = join(outputRoot, "checksums.sha256");

  if (!existsSync(manifestPath)) {
    throw new Error("Missing manifest.json");
  }

  if (!existsSync(checksumsPath)) {
    throw new Error("Missing checksums.sha256");
  }

  const manifest = readJsonFile<AuditPackManifest>(manifestPath);
  const manifestPaths = new Set(manifest.files.map((file) => file.path));

  for (const required of config.requiredTopLevelFiles) {
    if (!existsSync(join(outputRoot, required))) {
      throw new Error("Missing required audit-pack file: " + required);
    }

    if (!manifestPaths.has(required)) {
      throw new Error("Manifest does not list required file: " + required);
    }
  }

  for (const required of [
    "explorer/README.md",
    "explorer/jq-examples.md",
    "explorer/jtable-views/README.md",
    "explorer/mermaid/attack-path.mmd"
  ]) {
    if (!existsSync(join(outputRoot, required))) {
      throw new Error("Missing explorer file: " + required);
    }

    if (!manifestPaths.has(required)) {
      throw new Error("Manifest does not list explorer file: " + required);
    }
  }

  const checksumLines = readFileSync(checksumsPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const checksumPaths = new Set(
    checksumLines.map((line) => line.split(/\s+/).slice(1).join(" "))
  );

  const jsonFiles = listFilesRecursive(outputRoot)
    .map((absolute) => relative(outputRoot, absolute).replace(/\\/g, "/"))
    .filter((path) => path.endsWith(".json"));

  for (const jsonFile of jsonFiles) {
    if (!checksumPaths.has(jsonFile)) {
      throw new Error("checksums.sha256 does not cover JSON file: " + jsonFile);
    }

    const actual = sha256File(join(outputRoot, jsonFile));
    const line = checksumLines.find((item) => item.endsWith("  " + jsonFile));

    if (!line || !line.startsWith(actual + "  ")) {
      throw new Error("Invalid checksum for JSON file: " + jsonFile);
    }
  }

  const explorerReadmePath = join(outputRoot, "explorer", "README.md");
  const jqExamplesPath = join(outputRoot, "explorer", "jq-examples.md");
  const jtableDir = join(outputRoot, "explorer", "jtable-views");

  const explorer = readFileSync(explorerReadmePath, "utf8");
  const jq = readFileSync(jqExamplesPath, "utf8");
  const jtableFiles = listFilesRecursive(jtableDir).filter((path) => path.endsWith(".json"));

  if (!explorer.includes("jtable") || !explorer.includes("jq")) {
    throw new Error("Explorer README does not mention jtable and jq");
  }

  if (!jq.includes("jq -r") || !jq.includes("simulation-results.json")) {
    throw new Error("jq examples are incomplete");
  }

  if (jtableFiles.length === 0) {
    throw new Error("Explorer contains no jtable JSON views");
  }
}
