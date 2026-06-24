import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { importTerraformFiles } from "../../packages/dreps-adapters/src/k8s-terraform.js";

const planPath = process.argv[2] ?? "labs/supply-chain/examples/runtime-fixture/terraform-plan.json";
const statePath = process.argv[3] ?? "labs/supply-chain/examples/runtime-fixture/terraform-state.json";
const outputPath = ".doctrine/out/runtime/terraform.normalized.json";

const result = importTerraformFiles(
  resolve(process.cwd(), planPath),
  resolve(process.cwd(), statePath)
);

const output = resolve(process.cwd(), outputPath);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2) + "\n", "utf8");

console.log("Terraform adapter imported plan and state.");
console.log(outputPath);
