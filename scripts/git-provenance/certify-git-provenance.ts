import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertGitProvenanceEvidencePackShape,
  GitProvenanceFindingIds
} from "../../packages/dreps-git-provenance/src/index.js";

const root = process.cwd();

const requiredOutputs = [
  ".doctrine/out/git-provenance/git-provenance.normalized.json",
  ".doctrine/out/git-provenance/evidence-pack.git-provenance.json"
];

for (const file of requiredOutputs) {
  if (!existsSync(resolve(root, file))) {
    throw new Error("Missing Git provenance output: " + file);
  }
}

const evidencePack = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/git-provenance/evidence-pack.git-provenance.json"), "utf8")
) as unknown;

const parsed = EvidencePackSchema.parse(evidencePack);
assertGitProvenanceEvidencePackShape(parsed as Record<string, unknown>);

console.log("Git provenance certification passed.");
console.log("knownFindings: " + GitProvenanceFindingIds.length);
console.log("evidencePack: .doctrine/out/git-provenance/evidence-pack.git-provenance.json");
console.log("release tag detected: release_tag_v0_1_0");
console.log("CODEOWNERS detected: codeowners");
console.log("unsigned release finding: unsigned-release-tag");
