import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertRuntimeEvidencePackShape,
  buildRuntimeEvidencePack,
  importK8sFullYaml,
  importTerraformFiles,
  renderRuntimeGraphMermaid,
  type JsonRecord
} from "../../packages/dreps-adapters/src/k8s-terraform.js";

const root = process.cwd();

const k8sPath = "labs/supply-chain/examples/runtime-fixture/k8s-full.yaml";
const planPath = "labs/supply-chain/examples/runtime-fixture/terraform-plan.json";
const statePath = "labs/supply-chain/examples/runtime-fixture/terraform-state.json";
const baseEvidencePath = "labs/supply-chain/examples/ecommerce/evidence-pack.json";

const outputPath = ".doctrine/out/runtime/evidence-pack.runtime.json";
const mermaidPath = ".doctrine/out/runtime/runtime-graph.mmd";

const baseEvidencePack = JSON.parse(
  readFileSync(resolve(root, baseEvidencePath), "utf8")
) as JsonRecord;

const k8s = importK8sFullYaml(resolve(root, k8sPath));
const terraform = importTerraformFiles(resolve(root, planPath), resolve(root, statePath));
const evidencePack = buildRuntimeEvidencePack(k8s, terraform, baseEvidencePack);

const parsed = EvidencePackSchema.parse(evidencePack);
assertRuntimeEvidencePackShape(parsed as Record<string, unknown>);

const output = resolve(root, outputPath);
const mermaidOutput = resolve(root, mermaidPath);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(parsed, null, 2) + "\n", "utf8");
writeFileSync(mermaidOutput, renderRuntimeGraphMermaid(parsed as Record<string, unknown>), "utf8");

console.log("Runtime Kubernetes/Terraform imported into DREPS evidence-pack.");
console.log("evidencePack: " + outputPath);
console.log("mermaid: " + mermaidPath);
console.log("graph: image -> workload -> pod -> service -> ingress -> database");
