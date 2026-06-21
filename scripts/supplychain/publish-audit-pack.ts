import {
  publishAuditPack,
  renderVaultIndexJson,
  verifyVaultArtifact,
  type PublishAuditPackOptions
} from "../../apps/artifact-vault/src/index.js";

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const sourceZipPath = getArg("--input") ?? ".doctrine/out/audit-pack.zip";
const sourceChecksumPath =
  getArg("--checksum") ?? ".doctrine/out/audit-pack.sha256.json";
const vaultRoot = getArg("--vault") ?? ".doctrine/out/local-artifact-vault";
const artifactId = getArg("--artifact-id");
const packId = getArg("--pack-id");

const publishOptions: PublishAuditPackOptions = {
  sourceZipPath,
  sourceChecksumPath,
  vaultRoot,
  metadata: {
    producer: "doctrine-lab-supply-chain-model",
    phase: "12-local-artifact-vault"
  }
};

if (artifactId) {
  publishOptions.artifactId = artifactId;
}

if (packId) {
  publishOptions.packId = packId;
}

const result = publishAuditPack(publishOptions);

if (!result.checksumVerified) {
  throw new Error("Published audit-pack checksum verification failed.");
}

if (!verifyVaultArtifact(vaultRoot, result.artifact.artifactId)) {
  throw new Error("Vault verification failed after publish.");
}

console.log("Audit-pack published to local artifact vault.");
console.log("artifactId: " + result.artifact.artifactId);
console.log("packId: " + result.artifact.packId);
console.log("sha256: " + result.artifact.sha256);
console.log("bytes: " + result.artifact.bytes);
console.log("artifact: " + result.artifact.artifactPath);
console.log("checksum: " + result.artifact.checksumPath);
console.log("manifest: " + result.manifestPath);
console.log("index: " + result.indexPath);
console.log("checksumVerified: " + result.checksumVerified);
console.log("");
console.log(renderVaultIndexJson(vaultRoot));
