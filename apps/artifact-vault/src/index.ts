import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

export interface VaultArtifactEntry {
  artifactId: string;
  packId: string;
  publishedAt: string;
  fileName: string;
  bytes: number;
  sha256: string;
  artifactPath: string;
  checksumPath: string;
  sourceZipPath: string;
  sourceChecksumPath: string;
  manifestPath: string;
  metadata: Record<string, unknown>;
}

export interface VaultIndex {
  schemaVersion: "artifact-vault.index.v1";
  vaultId: string;
  generatedAt: string;
  artifacts: VaultArtifactEntry[];
}

export interface VaultManifest {
  schemaVersion: "artifact-vault.manifest.v1";
  artifact: VaultArtifactEntry;
}

export interface PublishAuditPackOptions {
  artifactId?: string;
  packId?: string;
  sourceZipPath: string;
  sourceChecksumPath: string;
  vaultRoot: string;
  root?: string;
  metadata?: Record<string, unknown>;
}

export interface PublishAuditPackResult {
  artifact: VaultArtifactEntry;
  index: VaultIndex;
  indexPath: string;
  manifestPath: string;
  checksumVerified: boolean;
}

function normalizePath(path: string): string {
  return path.split(sep).join("/");
}

function ensureParent(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
}

function writeJson(path: string, value: unknown): void {
  ensureParent(path);
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

export function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function inferPackId(root: string): string {
  const evidencePackPath = resolve(root, ".doctrine/out/audit-pack/evidence-pack.json");

  if (!existsSync(evidencePackPath)) {
    return "unknown-pack";
  }

  const parsed = readJson(evidencePackPath);

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    !Array.isArray(parsed) &&
    typeof (parsed as { packId?: unknown }).packId === "string"
  ) {
    return (parsed as { packId: string }).packId;
  }

  return "unknown-pack";
}

export function readVaultIndex(
  vaultRoot: string,
  root: string = process.cwd()
): VaultIndex {
  const indexPath = resolve(root, vaultRoot, "index.json");

  if (!existsSync(indexPath)) {
    return {
      schemaVersion: "artifact-vault.index.v1",
      vaultId: "local-artifact-vault",
      generatedAt: new Date().toISOString(),
      artifacts: []
    };
  }

  const parsed = readJson(indexPath) as VaultIndex;

  if (parsed.schemaVersion !== "artifact-vault.index.v1") {
    throw new Error("Invalid vault index schemaVersion.");
  }

  if (!Array.isArray(parsed.artifacts)) {
    throw new Error("Invalid vault index artifacts array.");
  }

  return parsed;
}

export function writeVaultIndex(
  vaultRoot: string,
  index: VaultIndex,
  root: string = process.cwd()
): string {
  const indexPath = resolve(root, vaultRoot, "index.json");
  writeJson(indexPath, index);
  return indexPath;
}

export function publishAuditPack(
  options: PublishAuditPackOptions
): PublishAuditPackResult {
  const root = resolve(options.root ?? process.cwd());
  const sourceZipPath = resolve(root, options.sourceZipPath);
  const sourceChecksumPath = resolve(root, options.sourceChecksumPath);

  if (!existsSync(sourceZipPath)) {
    throw new Error("Source audit-pack ZIP not found: " + options.sourceZipPath);
  }

  if (!existsSync(sourceChecksumPath)) {
    throw new Error("Source checksum manifest not found: " + options.sourceChecksumPath);
  }

  const packId = options.packId ?? inferPackId(root);
  const artifactId =
    options.artifactId ?? "audit-pack-" + packId.replace(/[^A-Za-z0-9_.-]/g, "-");

  const vaultRoot = resolve(root, options.vaultRoot);
  const artifactDir = resolve(vaultRoot, "audit-packs", artifactId);

  mkdirSync(artifactDir, { recursive: true });

  const targetZipPath = resolve(artifactDir, "audit-pack.zip");
  const targetChecksumPath = resolve(artifactDir, "audit-pack.sha256.json");
  const targetZipShaPath = resolve(artifactDir, "audit-pack.zip.sha256");
  const targetManifestPath = resolve(artifactDir, "manifest.json");

  copyFileSync(sourceZipPath, targetZipPath);
  copyFileSync(sourceChecksumPath, targetChecksumPath);

  const sha256 = sha256File(targetZipPath);
  writeFileSync(targetZipShaPath, sha256 + "  audit-pack.zip\n", "utf8");

  const stats = statSync(targetZipPath);

  const artifact: VaultArtifactEntry = {
    artifactId,
    packId,
    publishedAt: new Date().toISOString(),
    fileName: "audit-pack.zip",
    bytes: stats.size,
    sha256,
    artifactPath: normalizePath(relative(root, targetZipPath)),
    checksumPath: normalizePath(relative(root, targetZipShaPath)),
    sourceZipPath: normalizePath(options.sourceZipPath),
    sourceChecksumPath: normalizePath(options.sourceChecksumPath),
    manifestPath: normalizePath(relative(root, targetManifestPath)),
    metadata: options.metadata ?? {}
  };

  const manifest: VaultManifest = {
    schemaVersion: "artifact-vault.manifest.v1",
    artifact
  };

  writeJson(targetManifestPath, manifest);

  const index = readVaultIndex(options.vaultRoot, root);
  const nextIndex: VaultIndex = {
    ...index,
    generatedAt: new Date().toISOString(),
    artifacts: [
      ...index.artifacts.filter((item) => item.artifactId !== artifactId),
      artifact
    ].sort((left, right) => left.artifactId.localeCompare(right.artifactId))
  };

  const indexPath = writeVaultIndex(options.vaultRoot, nextIndex, root);

  return {
    artifact,
    index: nextIndex,
    indexPath: normalizePath(relative(root, indexPath)),
    manifestPath: artifact.manifestPath,
    checksumVerified: verifyVaultArtifact(options.vaultRoot, artifactId, root)
  };
}

export function verifyVaultArtifact(
  vaultRoot: string,
  artifactId: string,
  root: string = process.cwd()
): boolean {
  const index = readVaultIndex(vaultRoot, root);
  const artifact = index.artifacts.find((item) => item.artifactId === artifactId);

  if (!artifact) {
    return false;
  }

  const artifactPath = resolve(root, artifact.artifactPath);

  if (!existsSync(artifactPath)) {
    return false;
  }

  return sha256File(artifactPath) === artifact.sha256;
}

export function renderVaultIndexJson(
  vaultRoot: string,
  root: string = process.cwd()
): string {
  return JSON.stringify(readVaultIndex(vaultRoot, root), null, 2) + "\n";
}

export function listVaultArtifacts(
  vaultRoot: string,
  root: string = process.cwd()
): VaultArtifactEntry[] {
  return readVaultIndex(vaultRoot, root).artifacts;
}
