import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateAuditPack,
  loadAuditPackConfig
} from "../../packages/dreps-audit-pack/src/index.js";
import {
  assertSignatureAssetsShape,
  generateSignatureAssets,
  loadSignatureConfig,
  type AuditPackHash,
  type InTotoStatement
} from "../../packages/dreps-signature-engine/src/index.js";

const auditPackConfigPath = resolve("labs/supply-chain/examples/audit-pack-fixture/audit-pack.config.json");
const signatureConfigPath = resolve("labs/supply-chain/examples/signature-fixture/signature.config.json");

function buildForTest() {
  mkdirSync(resolve(".doctrine/out"), { recursive: true });

  const tempRoot = mkdtempSync(resolve(".doctrine/out/test-phase32-signature-"));

  const baseAuditConfig = loadAuditPackConfig(auditPackConfigPath);
  const auditConfig = {
    ...baseAuditConfig,
    outputRoot: join(tempRoot, "audit-pack")
  };

  generateAuditPack(auditConfig);

  const baseSignatureConfig = loadSignatureConfig(signatureConfigPath);
  const signatureConfig = {
    ...baseSignatureConfig,
    auditPackRoot: auditConfig.outputRoot,
    outputRoot: join(tempRoot, "signature"),
    workflowPath: join(tempRoot, "release-keyless.yml")
  };

  const result = generateSignatureAssets(signatureConfig);

  return {
    signatureConfig,
    result
  };
}

describe("phase 32 signature in-toto slsa", () => {
  it("hashes the audit pack", () => {
    const { result } = buildForTest();

    const auditPackHash = JSON.parse(
      readFileSync(result.auditPackHashPath, "utf8")
    ) as AuditPackHash;

    expect(auditPackHash.schemaVersion).toBe("dreps-audit-pack-hash.v1");
    expect(auditPackHash.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(auditPackHash.filesHashed).toBeGreaterThan(0);
  });

  it("produces an in-toto SLSA statement", () => {
    const { signatureConfig, result } = buildForTest();

    const auditPackHash = JSON.parse(
      readFileSync(result.auditPackHashPath, "utf8")
    ) as AuditPackHash;

    const statement = JSON.parse(
      readFileSync(result.inTotoStatementPath, "utf8")
    ) as InTotoStatement;

    expect(statement._type).toBe("https://in-toto.io/Statement/v1");
    expect(statement.predicateType).toBe(signatureConfig.predicateType);
    expect(statement.subject[0]?.digest.sha256).toBe(auditPackHash.sha256);
  });

  it("generates cosign bundle plan and release keyless workflow", () => {
    const { result } = buildForTest();

    const workflow = readFileSync(result.releaseKeylessWorkflowCopyPath, "utf8");
    const bundle = readFileSync(result.cosignBundlePath, "utf8");

    expect(bundle).toContain("keyless-oidc-ci-planned");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("cosign sign-blob");
    expect(workflow).toContain("cosign verify-blob");
  });

  it("includes a verification guide", () => {
    const { result } = buildForTest();

    const guide = readFileSync(result.verificationGuidePath, "utf8");

    expect(guide).toContain("Verification guide");
    expect(guide).toContain("cosign verify-blob");
    expect(guide).toContain("in-toto.statement.json");
    expect(guide).toContain("audit-pack.sha256.json");
  });

  it("asserts signature asset shape", () => {
    const { signatureConfig, result } = buildForTest();

    expect(existsSync(result.auditPackHashPath)).toBe(true);
    expect(existsSync(result.inTotoStatementPath)).toBe(true);
    expect(existsSync(result.cosignBundlePath)).toBe(true);
    expect(existsSync(result.releaseKeylessWorkflowCopyPath)).toBe(true);
    expect(existsSync(result.verificationGuidePath)).toBe(true);

    assertSignatureAssetsShape(signatureConfig, result);
  });

  it("declares signature scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["signature:generate"]).toContain("generate-signature-assets.ts");
    expect(pkg.scripts["signature:certify"]).toContain("certify-signature-assets.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("signature:certify");
  });
});
