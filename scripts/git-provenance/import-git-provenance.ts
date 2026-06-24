import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertGitProvenanceEvidencePackShape,
  buildGitProvenanceEvidencePack,
  checkGitProvenance,
  gitProvenanceFindings,
  type JsonRecord
} from "../../packages/dreps-git-provenance/src/index.js";

const root = process.cwd();

const releaseTagsFixturePath = "labs/supply-chain/examples/git-provenance-fixture/release-tags.json";
const branchProtectionFixturePath = "labs/supply-chain/examples/git-provenance-fixture/branch-protection.json";
const secretHistoryFixturePath = "labs/supply-chain/examples/git-provenance-fixture/secret-history-scan.json";
const normalizedPath = ".doctrine/out/git-provenance/git-provenance.normalized.json";
const outputPath = ".doctrine/out/git-provenance/evidence-pack.git-provenance.json";
const baseEvidencePath = "labs/supply-chain/examples/ecommerce/evidence-pack.json";

const baseEvidencePack = JSON.parse(
  readFileSync(resolve(root, baseEvidencePath), "utf8")
) as JsonRecord;

const check = checkGitProvenance(root, {
  releaseTagsFixturePath: resolve(root, releaseTagsFixturePath),
  branchProtectionFixturePath: resolve(root, branchProtectionFixturePath),
  secretHistoryFixturePath: resolve(root, secretHistoryFixturePath)
});

const normalized = {
  ...check,
  findings: gitProvenanceFindings(check)
};

const evidencePack = buildGitProvenanceEvidencePack(baseEvidencePack, check, {
  normalizedPath,
  releaseTagsPath: releaseTagsFixturePath,
  branchProtectionPath: branchProtectionFixturePath,
  secretHistoryPath: secretHistoryFixturePath
});

const parsed = EvidencePackSchema.parse(evidencePack);
assertGitProvenanceEvidencePackShape(parsed as Record<string, unknown>);

const normalizedOutput = resolve(root, normalizedPath);
const evidenceOutput = resolve(root, outputPath);

mkdirSync(dirname(normalizedOutput), { recursive: true });
writeFileSync(normalizedOutput, JSON.stringify(normalized, null, 2) + "\n", "utf8");
writeFileSync(evidenceOutput, JSON.stringify(parsed, null, 2) + "\n", "utf8");

console.log("Git provenance imported into DREPS evidence-pack.");
console.log("evidencePack: " + outputPath);
console.log("releaseTags: " + check.releases.tags.length);
console.log("codeowners: " + check.codeowners.exists);
console.log("findings: " + parsed.findings.length);
