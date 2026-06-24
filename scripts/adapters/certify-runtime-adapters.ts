import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertRuntimeEvidencePackShape,
  RuntimeNodeIds
} from "../../packages/dreps-adapters/src/k8s-terraform.js";

const root = process.cwd();

const requiredOutputs = [
  ".doctrine/out/runtime/k8s.normalized.json",
  ".doctrine/out/runtime/terraform.normalized.json",
  ".doctrine/out/runtime/evidence-pack.runtime.json",
  ".doctrine/out/runtime/runtime-graph.mmd"
];

for (const file of requiredOutputs) {
  if (!existsSync(resolve(root, file))) {
    throw new Error("Missing runtime adapter output: " + file);
  }
}

const evidencePack = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/runtime/evidence-pack.runtime.json"), "utf8")
) as unknown;

const parsed = EvidencePackSchema.parse(evidencePack);
assertRuntimeEvidencePackShape(parsed as Record<string, unknown>);

const mermaid = readFileSync(resolve(root, ".doctrine/out/runtime/runtime-graph.mmd"), "utf8");

for (const fragment of [
  "container_image --> k8s_workload",
  "k8s_workload --> k8s_pod",
  "k8s_pod --> k8s_service",
  "k8s_service --> ingress",
  "ingress --> database"
]) {
  if (!mermaid.includes(fragment)) {
    throw new Error("Runtime Mermaid graph missing fragment: " + fragment);
  }
}

console.log("Kubernetes and Terraform adapters certification passed.");
console.log("nodes: " + RuntimeNodeIds.length);
console.log("evidencePack: .doctrine/out/runtime/evidence-pack.runtime.json");
console.log("graph: .doctrine/out/runtime/runtime-graph.mmd");
