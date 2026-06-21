import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  publishAuditPack,
  readVaultIndex,
  verifyVaultArtifact
} from "../../apps/artifact-vault/src/index.js";

const root = process.cwd();
const vaultRoot = ".doctrine/out/local-artifact-vault";

const result = publishAuditPack({
  sourceZipPath: ".doctrine/out/audit-pack.zip",
  sourceChecksumPath: ".doctrine/out/audit-pack.sha256.json",
  vaultRoot,
  metadata: {
    certification: "phase12"
  }
});

if (!result.checksumVerified) {
  throw new Error("Checksum verification failed.");
}

const index = readVaultIndex(vaultRoot, root);
const artifact = index.artifacts.find(
  (item) => item.artifactId === result.artifact.artifactId
);

if (!artifact) {
  throw new Error("Published artifact is missing from local vault index.");
}

if (!verifyVaultArtifact(vaultRoot, artifact.artifactId, root)) {
  throw new Error("Published artifact checksum cannot be verified.");
}

const indexPath = resolve(root, vaultRoot, "index.json");
const artifactPath = resolve(root, artifact.artifactPath);
const checksumPath = resolve(root, artifact.checksumPath);
const manifestPath = resolve(root, artifact.manifestPath);

for (const path of [indexPath, artifactPath, checksumPath, manifestPath]) {
  if (!existsSync(path)) {
    throw new Error("Expected vault file missing: " + path);
  }
}

const checksumContent = readFileSync(checksumPath, "utf8");

if (!checksumContent.includes(artifact.sha256)) {
  throw new Error("Checksum file does not contain artifact sha256.");
}

console.log("Local artifact vault certification passed.");
console.log("index: " + vaultRoot + "/index.json");
console.log("artifactId: " + artifact.artifactId);
console.log("artifact: " + artifact.artifactPath);
console.log("checksum: " + artifact.checksumPath);
console.log("manifest: " + artifact.manifestPath);
console.log("sha256: " + artifact.sha256);
