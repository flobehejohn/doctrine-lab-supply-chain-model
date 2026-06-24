import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertGitProvenanceEvidencePackShape,
  buildGitProvenanceEvidencePack,
  checkGitProvenance,
  gitProvenanceFindings,
  type JsonRecord
} from "../../packages/dreps-git-provenance/src/index.js";

const root = process.cwd();
const releaseTagsFixturePath = resolve("labs/supply-chain/examples/git-provenance-fixture/release-tags.json");
const branchProtectionFixturePath = resolve("labs/supply-chain/examples/git-provenance-fixture/branch-protection.json");
const secretHistoryFixturePath = resolve("labs/supply-chain/examples/git-provenance-fixture/secret-history-scan.json");

const baseEvidencePack = JSON.parse(
  readFileSync("labs/supply-chain/examples/ecommerce/evidence-pack.json", "utf8")
) as JsonRecord;

function checkForTest() {
  return checkGitProvenance(root, {
    releaseTagsFixturePath,
    branchProtectionFixturePath,
    secretHistoryFixturePath
  });
}

describe("phase 20 git provenance forensic", () => {
  it("reads local repository provenance", () => {
    const check = checkForTest();

    expect(check.headSha).toMatch(/^[a-f0-9]{40}$/i);
    expect(check.branch.length).toBeGreaterThan(0);
    expect(check.recentCommits.length).toBeGreaterThan(0);
  });

  it("detects CODEOWNERS", () => {
    const check = checkForTest();

    expect(check.codeowners.exists).toBe(true);
    expect(check.codeowners.path).toBe(".github/CODEOWNERS");
    expect(check.codeowners.owners).toContain("@flobehejohn");
  });

  it("detects release tags from deterministic fixture", () => {
    const check = checkForTest();

    expect(check.releases.tags.length).toBe(1);
    expect(check.releases.tags[0]?.name).toBe("v0.1.0");
    expect(check.releases.tags[0]?.signed).toBe(false);
    expect(check.releases.tags[0]?.hasProvenance).toBe(false);
  });

  it("generates forensic findings", () => {
    const check = checkForTest();
    const findings = gitProvenanceFindings(check);
    const ids = new Set(findings.map((finding) => finding.id));

    expect(ids.has("unsigned-release-tag")).toBe(true);
    expect(ids.has("missing-release-provenance")).toBe(true);
    expect(ids.has("force-push-risk")).toBe(true);
    expect(ids.has("secret-history-risk")).toBe(true);
    expect(ids.has("missing-codeowners")).toBe(false);
    expect(ids.has("no-release-tags")).toBe(false);
  });

  it("builds a valid DREPS evidence-pack", () => {
    const check = checkForTest();
    const evidencePack = buildGitProvenanceEvidencePack(baseEvidencePack, check, {
      normalizedPath: ".doctrine/out/git-provenance/git-provenance.normalized.json",
      releaseTagsPath: "labs/supply-chain/examples/git-provenance-fixture/release-tags.json",
      branchProtectionPath: "labs/supply-chain/examples/git-provenance-fixture/branch-protection.json",
      secretHistoryPath: "labs/supply-chain/examples/git-provenance-fixture/secret-history-scan.json"
    });

    const parsed = EvidencePackSchema.parse(evidencePack);

    expect(parsed.packId).toBe("git-provenance-dreps-evidence-pack");
    assertGitProvenanceEvidencePackShape(parsed as Record<string, unknown>);
  });

  it("declares git provenance scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["git:provenance:check"]).toContain("check-git-provenance.ts");
    expect(pkg.scripts["git:provenance:import"]).toContain("import-git-provenance.ts");
    expect(pkg.scripts["git:provenance:certify"]).toContain("certify-git-provenance.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("git:provenance:certify");
  });
});
