import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertLocalRepoEvidencePackShape,
  buildLocalRepoEvidencePack,
  renderLocalRepoGraphMermaid,
  scanLocalRepo,
  type JsonRecord
} from "../../packages/dreps-adapters/src/index.js";

const root = process.cwd();
const repoRoot = process.argv[2] ?? "labs/supply-chain/examples/local-repo-fixture";
const baseEvidencePath = "labs/supply-chain/examples/ecommerce/evidence-pack.json";
const outputPath = ".doctrine/out/adapters/evidence-pack.local-repo.json";
const mermaidPath = ".doctrine/out/adapters/local-repo-graph.mmd";

const baseEvidencePack = JSON.parse(
  readFileSync(resolve(root, baseEvidencePath), "utf8")
) as JsonRecord;

const scan = scanLocalRepo(resolve(root, repoRoot));
const evidencePack = buildLocalRepoEvidencePack(scan, baseEvidencePack);

const parsed = EvidencePackSchema.parse(evidencePack);
assertLocalRepoEvidencePackShape(parsed as Record<string, unknown>);

const output = resolve(root, outputPath);
const mermaidOutput = resolve(root, mermaidPath);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(parsed, null, 2) + "\n", "utf8");
writeFileSync(mermaidOutput, renderLocalRepoGraphMermaid(parsed as Record<string, unknown>), "utf8");

console.log("Local repo imported into DREPS evidence-pack.");
console.log("evidencePack: " + outputPath);
console.log("mermaid: " + mermaidPath);
console.log("graph: repository -> ci_pipeline -> container_image; Dockerfile -> container_image; SBOM -> evidence");
