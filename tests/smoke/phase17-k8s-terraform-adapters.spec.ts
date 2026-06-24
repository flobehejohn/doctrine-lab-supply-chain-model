import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertRuntimeEvidencePackShape,
  buildRuntimeEvidencePack,
  importK8sFullYaml,
  importTerraformFiles,
  renderRuntimeGraphMermaid,
  RuntimeNodeIds,
  type JsonRecord
} from "../../packages/dreps-adapters/src/k8s-terraform.js";

const k8sPath = resolve("labs/supply-chain/examples/runtime-fixture/k8s-full.yaml");
const planPath = resolve("labs/supply-chain/examples/runtime-fixture/terraform-plan.json");
const statePath = resolve("labs/supply-chain/examples/runtime-fixture/terraform-state.json");

const baseEvidencePack = JSON.parse(
  readFileSync("labs/supply-chain/examples/ecommerce/evidence-pack.json", "utf8")
) as JsonRecord;

describe("phase 17 Kubernetes and Terraform adapters", () => {
  it("imports k8s-full.yaml", () => {
    const k8s = importK8sFullYaml(k8sPath);

    expect(k8s.namespace).toBe("supplychain-demo");
    expect(k8s.workloadName).toBe("auth-api");
    expect(k8s.podName).toBe("auth-api-pod-template");
    expect(k8s.serviceName).toBe("auth-api");
    expect(k8s.ingressName).toBe("auth-api");
    expect(k8s.image).toBe("localhost:5050/root/sample-project:local-fixture");
    expect(k8s.secretName).toBe("db-credentials");
    expect(k8s.configMapName).toBe("auth-api-config");
  });

  it("imports terraform plan and state", () => {
    const terraform = importTerraformFiles(planPath, statePath);

    expect(terraform.databaseName).toBe("doctrine-demo-db");
    expect(terraform.databaseEngine).toBe("postgres");
    expect(terraform.databaseAddress).toBe("doctrine-demo-db.local");
    expect(terraform.resourceCount).toBeGreaterThanOrEqual(2);
  });

  it("builds a valid runtime evidence-pack", () => {
    const k8s = importK8sFullYaml(k8sPath);
    const terraform = importTerraformFiles(planPath, statePath);
    const evidencePack = buildRuntimeEvidencePack(k8s, terraform, baseEvidencePack);
    const parsed = EvidencePackSchema.parse(evidencePack);

    expect(parsed.packId).toBe("runtime-k8s-terraform-dreps-evidence-pack");
    assertRuntimeEvidencePackShape(parsed as Record<string, unknown>);
  });

  it("creates all expected runtime node ids", () => {
    const k8s = importK8sFullYaml(k8sPath);
    const terraform = importTerraformFiles(planPath, statePath);
    const evidencePack = buildRuntimeEvidencePack(k8s, terraform, baseEvidencePack);
    const nodes = evidencePack.nodes as Array<{ id: string; type: string }>;
    const nodeIds = new Set(nodes.map((node) => node.id));

    for (const nodeId of RuntimeNodeIds) {
      expect(nodeIds.has(nodeId), nodeId).toBe(true);
    }

    expect(nodes.find((node) => node.id === "configmap")?.type).toBe("artifact");
    expect(nodes.find((node) => node.id === "cloud_resource")?.type).toBe("artifact");
  });

  it("renders image to database runtime graph", () => {
    const k8s = importK8sFullYaml(k8sPath);
    const terraform = importTerraformFiles(planPath, statePath);
    const evidencePack = buildRuntimeEvidencePack(k8s, terraform, baseEvidencePack);
    const mermaid = renderRuntimeGraphMermaid(evidencePack);

    expect(mermaid).toContain("flowchart LR");
    expect(mermaid).toContain("container_image --> k8s_workload");
    expect(mermaid).toContain("k8s_workload --> k8s_pod");
    expect(mermaid).toContain("k8s_pod --> k8s_service");
    expect(mermaid).toContain("k8s_service --> ingress");
    expect(mermaid).toContain("ingress --> database");
  });

  it("declares runtime adapter scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["runtime:import:k8s"]).toContain("import-k8s.ts");
    expect(pkg.scripts["runtime:import:terraform"]).toContain("import-terraform.ts");
    expect(pkg.scripts["runtime:import"]).toContain("import-runtime-evidence-pack.ts");
    expect(pkg.scripts["runtime:certify"]).toContain("certify-runtime-adapters.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("runtime:certify");
  });
});
