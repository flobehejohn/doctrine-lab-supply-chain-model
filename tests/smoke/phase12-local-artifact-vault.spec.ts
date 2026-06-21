import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  publishAuditPack,
  readVaultIndex,
  renderVaultIndexJson,
  sha256File,
  verifyVaultArtifact
} from "../../apps/artifact-vault/src/index.js";

describe("phase 12 local artifact vault", () => {
  it("publishes an audit-pack into the local vault index", () => {
    const root = process.cwd();
    const base = ".doctrine/tmp/phase12";
    const sourceDir = resolve(root, base, "source");
    const vaultRoot = base + "/vault";

    rmSync(resolve(root, base), { recursive: true, force: true });
    mkdirSync(sourceDir, { recursive: true });

    const zipPath = resolve(sourceDir, "audit-pack.zip");
    const checksumPath = resolve(sourceDir, "audit-pack.sha256.json");

    writeFileSync(zipPath, "PK fake zip content\n", "utf8");
    writeFileSync(
      checksumPath,
      JSON.stringify(
        {
          algorithm: "sha256",
          files: [
            {
              path: "audit-pack.zip",
              sha256: sha256File(zipPath)
            }
          ]
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    const result = publishAuditPack({
      artifactId: "audit-pack-test",
      packId: "test-pack",
      sourceZipPath: base + "/source/audit-pack.zip",
      sourceChecksumPath: base + "/source/audit-pack.sha256.json",
      vaultRoot,
      root,
      metadata: {
        test: true
      }
    });

    expect(result.checksumVerified).toBe(true);
    expect(existsSync(resolve(root, vaultRoot, "index.json"))).toBe(true);

    const index = readVaultIndex(vaultRoot, root);

    expect(index.artifacts).toHaveLength(1);
    expect(index.artifacts[0]?.artifactId).toBe("audit-pack-test");
    expect(index.artifacts[0]?.sha256).toBe(sha256File(resolve(root, index.artifacts[0]!.artifactPath)));
    expect(verifyVaultArtifact(vaultRoot, "audit-pack-test", root)).toBe(true);
  });

  it("renders the vault index as JSON", () => {
    const root = process.cwd();
    const vaultRoot = ".doctrine/tmp/phase12/vault";
    const indexJson = renderVaultIndexJson(vaultRoot, root);

    expect(indexJson).toContain("artifact-vault.index.v1");
    expect(indexJson).toContain("audit-pack-test");
  });

  it("detects checksum drift", () => {
    const root = process.cwd();
    const vaultRoot = ".doctrine/tmp/phase12/vault";
    const index = readVaultIndex(vaultRoot, root);
    const artifact = index.artifacts.find((item) => item.artifactId === "audit-pack-test");

    expect(artifact).toBeTruthy();

    writeFileSync(resolve(root, artifact!.artifactPath), "tampered\n", "utf8");

    expect(verifyVaultArtifact(vaultRoot, "audit-pack-test", root)).toBe(false);
  });

  it("declares vault scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["vault:publish"]).toContain("publish-audit-pack.ts");
    expect(pkg.scripts["vault:certify"]).toContain("certify-artifact-vault.ts");
  });
});
