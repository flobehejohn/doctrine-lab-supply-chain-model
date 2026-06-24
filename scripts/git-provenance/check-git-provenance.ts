import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  checkGitProvenance,
  gitProvenanceFindings
} from "../../packages/dreps-git-provenance/src/index.js";

const root = process.cwd();

const releaseTagsFixturePath = "labs/supply-chain/examples/git-provenance-fixture/release-tags.json";
const branchProtectionFixturePath = "labs/supply-chain/examples/git-provenance-fixture/branch-protection.json";
const secretHistoryFixturePath = "labs/supply-chain/examples/git-provenance-fixture/secret-history-scan.json";
const outputPath = ".doctrine/out/git-provenance/git-provenance.normalized.json";

const check = checkGitProvenance(root, {
  releaseTagsFixturePath: resolve(root, releaseTagsFixturePath),
  branchProtectionFixturePath: resolve(root, branchProtectionFixturePath),
  secretHistoryFixturePath: resolve(root, secretHistoryFixturePath)
});

const output = {
  ...check,
  findings: gitProvenanceFindings(check)
};

const resolvedOutput = resolve(root, outputPath);

mkdirSync(dirname(resolvedOutput), { recursive: true });
writeFileSync(resolvedOutput, JSON.stringify(output, null, 2) + "\n", "utf8");

console.log("Git provenance check completed.");
console.log(outputPath);
console.log("branch: " + check.branch);
console.log("headSha: " + check.headSha);
console.log("codeowners: " + check.codeowners.exists);
console.log("releaseTags: " + check.releases.tags.length);
console.log("findings: " + output.findings.length);
