import {
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

export type JsonRecord = Record<string, unknown>;

export interface SignatureConfig {
  schemaVersion?: string;
  artifactName: string;
  auditPackRoot: string;
  outputRoot: string;
  repository: string;
  workflowPath: string;
  oidcIssuer: string;
  certificateIdentityRegex: string;
  predicateType: string;
}

export interface AuditPackHash {
  schemaVersion: "dreps-audit-pack-hash.v1";
  artifactName: string;
  auditPackRoot: string;
  algorithm: "sha256";
  sha256: string;
  filesHashed: number;
  generatedAt: string;
}

export interface InTotoSubject {
  name: string;
  digest: {
    sha256: string;
  };
}

export interface InTotoStatement {
  _type: "https://in-toto.io/Statement/v1";
  subject: InTotoSubject[];
  predicateType: string;
  predicate: JsonRecord;
}

export interface CosignBundlePlan {
  mediaType: "application/vnd.dev.sigstore.bundle+json";
  schemaVersion: "dreps-cosign-bundle-plan.v1";
  signingMode: "keyless-oidc-ci-planned";
  status: "planned-in-ci";
  generatedAt: string;
  subject: InTotoSubject[];
  statementPath: string;
  signedArtifactPath: string;
  verificationMaterial: {
    oidcIssuer: string;
    certificateIdentityRegex: string;
    transparencyLog: "rekor";
    certificateAuthority: "fulcio";
  };
  dsseEnvelope: {
    payloadType: "application/vnd.in-toto+json";
    payloadSha256: string;
  };
}

export interface SignatureBuildResult {
  outputRoot: string;
  auditPackHashPath: string;
  inTotoStatementPath: string;
  cosignBundlePath: string;
  releaseKeylessWorkflowPath: string;
  releaseKeylessWorkflowCopyPath: string;
  verificationGuidePath: string;
}

const GENERATED_AT = "2026-06-26T00:00:00.000Z";

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

function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
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

  walk(root);

  return results.sort((left, right) => left.localeCompare(right));
}

function buildAuditPackHash(config: SignatureConfig): AuditPackHash {
  const auditPackRoot = resolve(config.auditPackRoot);

  if (!existsSync(auditPackRoot)) {
    throw new Error("Audit pack root does not exist: " + config.auditPackRoot);
  }

  const files = listFilesRecursive(auditPackRoot)
    .map((absolute) => relative(auditPackRoot, absolute).replace(/\\/g, "/"))
    .sort((left, right) => left.localeCompare(right));

  if (files.length === 0) {
    throw new Error("Audit pack root contains no files");
  }

  const canonical = files
    .map((path) => sha256File(join(auditPackRoot, path)) + "  " + path)
    .join("\n") + "\n";

  return {
    schemaVersion: "dreps-audit-pack-hash.v1",
    artifactName: config.artifactName,
    auditPackRoot: config.auditPackRoot,
    algorithm: "sha256",
    sha256: sha256Text(canonical),
    filesHashed: files.length,
    generatedAt: GENERATED_AT
  };
}

function buildInTotoStatement(config: SignatureConfig, auditPackHash: AuditPackHash): InTotoStatement {
  const subject: InTotoSubject[] = [
    {
      name: config.artifactName,
      digest: {
        sha256: auditPackHash.sha256
      }
    }
  ];

  return {
    _type: "https://in-toto.io/Statement/v1",
    subject,
    predicateType: config.predicateType,
    predicate: {
      buildDefinition: {
        buildType: "https://github.com/" + config.repository + "/.github/workflows/release-keyless.yml",
        externalParameters: {
          repository: config.repository,
          workflowPath: config.workflowPath,
          artifactName: config.artifactName
        },
        internalParameters: {
          auditPackRoot: config.auditPackRoot,
          signatureOutputRoot: config.outputRoot
        },
        resolvedDependencies: [
          {
            uri: "git+https://github.com/" + config.repository,
            digest: {
              gitCommit: process.env.GITHUB_SHA ?? "local-dev"
            }
          }
        ]
      },
      runDetails: {
        builder: {
          id: "https://github.com/actions/runner"
        },
        metadata: {
          invocationId: process.env.GITHUB_RUN_ID ?? "local-dev",
          startedOn: GENERATED_AT,
          finishedOn: GENERATED_AT
        },
        byproducts: [
          {
            name: "audit-pack.sha256.json",
            digest: {
              sha256: sha256Text(JSON.stringify(auditPackHash))
            }
          }
        ]
      }
    }
  };
}

function buildCosignBundlePlan(
  config: SignatureConfig,
  statement: InTotoStatement
): CosignBundlePlan {
  const payload = JSON.stringify(statement);

  return {
    mediaType: "application/vnd.dev.sigstore.bundle+json",
    schemaVersion: "dreps-cosign-bundle-plan.v1",
    signingMode: "keyless-oidc-ci-planned",
    status: "planned-in-ci",
    generatedAt: GENERATED_AT,
    subject: statement.subject,
    statementPath: ".doctrine/out/signature/in-toto.statement.json",
    signedArtifactPath: ".doctrine/out/signature/audit-pack.sha256.json",
    verificationMaterial: {
      oidcIssuer: config.oidcIssuer,
      certificateIdentityRegex: config.certificateIdentityRegex,
      transparencyLog: "rekor",
      certificateAuthority: "fulcio"
    },
    dsseEnvelope: {
      payloadType: "application/vnd.in-toto+json",
      payloadSha256: sha256Text(payload)
    }
  };
}

function renderReleaseKeylessWorkflow(config: SignatureConfig): string {
  return [
    "name: Release Keyless Audit Pack",
    "",
    "on:",
    "  workflow_dispatch:",
    "  push:",
    "    tags:",
    "      - \"audit-pack-*\"",
    "",
    "permissions:",
    "  contents: read",
    "  id-token: write",
    "",
    "jobs:",
    "  sign-audit-pack:",
    "    name: Sign audit pack keylessly",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - name: Checkout",
    "        uses: actions/checkout@v4",
    "",
    "      - name: Setup Node.js",
    "        uses: actions/setup-node@v4",
    "        with:",
    "          node-version: 24",
    "",
    "      - name: Enable Corepack",
    "        run: corepack enable",
    "",
    "      - name: Install dependencies",
    "        run: pnpm install --frozen-lockfile",
    "",
    "      - name: Build and certify audit pack",
    "        run: pnpm supplychain:certify",
    "",
    "      - name: Install Cosign",
    "        uses: sigstore/cosign-installer@v3",
    "",
    "      - name: Keyless sign audit-pack hash",
    "        env:",
    "          COSIGN_YES: \"true\"",
    "        run: |",
    "          cosign sign-blob --yes --bundle .doctrine/out/signature/cosign.bundle .doctrine/out/signature/audit-pack.sha256.json",
    "          cosign verify-blob \\",
    "            --bundle .doctrine/out/signature/cosign.bundle \\",
    "            --certificate-identity-regexp '" + config.certificateIdentityRegex + "' \\",
    "            --certificate-oidc-issuer '" + config.oidcIssuer + "' \\",
    "            .doctrine/out/signature/audit-pack.sha256.json",
    "",
    "      - name: Upload signature assets",
    "        uses: actions/upload-artifact@v4",
    "        with:",
    "          name: audit-pack-signature-assets",
    "          path: |",
    "            .doctrine/out/signature/audit-pack.sha256.json",
    "            .doctrine/out/signature/in-toto.statement.json",
    "            .doctrine/out/signature/cosign.bundle",
    "            .doctrine/out/signature/verification-guide.md",
    ""
  ].join("\n");
}

function renderVerificationGuide(config: SignatureConfig, auditPackHash: AuditPackHash): string {
  return [
    "# Verification guide - Audit Pack Signature",
    "",
    "## Files",
    "",
    "- `.doctrine/out/signature/audit-pack.sha256.json`",
    "- `.doctrine/out/signature/in-toto.statement.json`",
    "- `.doctrine/out/signature/cosign.bundle`",
    "- `.github/workflows/release-keyless.yml`",
    "",
    "## 1. Verify the audit-pack hash",
    "",
    "Expected audit-pack directory digest:",
    "",
    "```text",
    auditPackHash.sha256,
    "```",
    "",
    "PowerShell:",
    "",
    "```powershell",
    "Get-Content .doctrine/out/signature/audit-pack.sha256.json | ConvertFrom-Json",
    "```",
    "",
    "## 2. Inspect the in-toto / SLSA statement",
    "",
    "```powershell",
    "$Statement = Get-Content .doctrine/out/signature/in-toto.statement.json | ConvertFrom-Json",
    "$Statement._type",
    "$Statement.predicateType",
    "$Statement.subject[0].digest.sha256",
    "```",
    "",
    "Expected:",
    "",
    "```text",
    "https://in-toto.io/Statement/v1",
    config.predicateType,
    auditPackHash.sha256,
    "```",
    "",
    "## 3. Verify the keyless cosign bundle in CI",
    "",
    "The real `cosign.bundle` is produced by GitHub Actions with OIDC keyless signing.",
    "",
    "```bash",
    "cosign verify-blob \\",
    "  --bundle .doctrine/out/signature/cosign.bundle \\",
    "  --certificate-identity-regexp '" + config.certificateIdentityRegex + "' \\",
    "  --certificate-oidc-issuer '" + config.oidcIssuer + "' \\",
    "  .doctrine/out/signature/audit-pack.sha256.json",
    "```",
    "",
    "## 4. Verify workflow intent",
    "",
    "The release workflow must include:",
    "",
    "```yaml",
    "permissions:",
    "  id-token: write",
    "```",
    "",
    "This enables keyless signing through GitHub Actions OIDC.",
    ""
  ].join("\n");
}

export function loadSignatureConfig(path: string): SignatureConfig {
  return readJsonFile<SignatureConfig>(path);
}

export function generateSignatureAssets(config: SignatureConfig): SignatureBuildResult {
  const outputRoot = resolve(config.outputRoot);

  rmSync(outputRoot, { recursive: true, force: true });
  mkdirSync(outputRoot, { recursive: true });

  const auditPackHash = buildAuditPackHash(config);
  const statement = buildInTotoStatement(config, auditPackHash);
  const bundle = buildCosignBundlePlan(config, statement);
  const workflow = renderReleaseKeylessWorkflow(config);
  const guide = renderVerificationGuide(config, auditPackHash);

  const auditPackHashPath = join(outputRoot, "audit-pack.sha256.json");
  const inTotoStatementPath = join(outputRoot, "in-toto.statement.json");
  const cosignBundlePath = join(outputRoot, "cosign.bundle");
  const releaseKeylessWorkflowPath = join(outputRoot, "release-keyless.yml");
  const releaseKeylessWorkflowCopyPath = resolve(config.workflowPath);
  const verificationGuidePath = join(outputRoot, "verification-guide.md");

  writeJson(auditPackHashPath, auditPackHash);
  writeJson(inTotoStatementPath, statement);
  writeJson(cosignBundlePath, bundle);
  writeText(releaseKeylessWorkflowPath, workflow);
  writeText(releaseKeylessWorkflowCopyPath, workflow);
  writeText(verificationGuidePath, guide);

  return {
    outputRoot,
    auditPackHashPath,
    inTotoStatementPath,
    cosignBundlePath,
    releaseKeylessWorkflowPath,
    releaseKeylessWorkflowCopyPath,
    verificationGuidePath
  };
}

export function assertSignatureAssetsShape(config: SignatureConfig, result: SignatureBuildResult): void {
  for (const file of [
    result.auditPackHashPath,
    result.inTotoStatementPath,
    result.cosignBundlePath,
    result.releaseKeylessWorkflowPath,
    result.releaseKeylessWorkflowCopyPath,
    result.verificationGuidePath
  ]) {
    if (!existsSync(file)) {
      throw new Error("Missing signature asset: " + file);
    }
  }

  const auditPackHash = readJsonFile<AuditPackHash>(result.auditPackHashPath);
  const statement = readJsonFile<InTotoStatement>(result.inTotoStatementPath);
  const bundle = readJsonFile<CosignBundlePlan>(result.cosignBundlePath);
  const workflow = readFileSync(result.releaseKeylessWorkflowPath, "utf8");
  const workflowCopy = readFileSync(result.releaseKeylessWorkflowCopyPath, "utf8");
  const guide = readFileSync(result.verificationGuidePath, "utf8");

  if (auditPackHash.schemaVersion !== "dreps-audit-pack-hash.v1") {
    throw new Error("Invalid audit-pack hash schema");
  }

  if (!/^[a-f0-9]{64}$/.test(auditPackHash.sha256)) {
    throw new Error("Invalid audit-pack sha256");
  }

  if (auditPackHash.filesHashed < 1) {
    throw new Error("No audit-pack files hashed");
  }

  if (statement._type !== "https://in-toto.io/Statement/v1") {
    throw new Error("Invalid in-toto statement type");
  }

  if (statement.predicateType !== config.predicateType) {
    throw new Error("Invalid SLSA predicate type");
  }

  const subjectDigest = statement.subject[0]?.digest.sha256;

  if (!subjectDigest || subjectDigest !== auditPackHash.sha256) {
    throw new Error("in-toto subject digest does not match audit-pack hash");
  }

  const bundleDigest = bundle.subject[0]?.digest.sha256;

  if (!bundleDigest || bundleDigest !== auditPackHash.sha256) {
    throw new Error("cosign bundle subject digest does not match audit-pack hash");
  }

  if (bundle.signingMode !== "keyless-oidc-ci-planned") {
    throw new Error("cosign bundle is not marked as keyless CI planned");
  }

  if (!workflow.includes("id-token: write")) {
    throw new Error("release-keyless workflow does not grant id-token: write");
  }

  if (!workflow.includes("cosign sign-blob") || !workflow.includes("cosign verify-blob")) {
    throw new Error("release-keyless workflow does not sign and verify with cosign");
  }

  if (workflow !== workflowCopy) {
    throw new Error("release-keyless workflow copy is not identical");
  }

  if (!guide.includes("cosign verify-blob")) {
    throw new Error("verification guide does not include cosign verify command");
  }

  if (!guide.includes("in-toto.statement.json")) {
    throw new Error("verification guide does not include in-toto statement");
  }

  if (!guide.includes(auditPackHash.sha256)) {
    throw new Error("verification guide does not include audit-pack hash");
  }
}
