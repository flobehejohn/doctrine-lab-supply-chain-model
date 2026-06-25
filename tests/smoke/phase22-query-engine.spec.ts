import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertQueryEvidencePackShape,
  buildQueryEvidencePack,
  evaluateRegoPolicy,
  loadQueryGraph,
  runDoctrineDslQuery,
  runJmesPathLiteQuery,
  toJtablePayload,
  type JsonRecord
} from "../../packages/dreps-query-engine/src/index.js";

const graphPath = resolve("labs/supply-chain/examples/query-engine-fixture/query-graph.json");
const policyPath = resolve("labs/supply-chain/examples/query-engine-fixture/policies/critical-exposed-pod.rego");

const baseEvidencePack = JSON.parse(
  readFileSync("labs/supply-chain/examples/ecommerce/evidence-pack.json", "utf8")
) as JsonRecord;

describe("phase 22 query engine", () => {
  it("runs Doctrine DSL and returns nodes", () => {
    const graph = loadQueryGraph(graphPath);
    const result = runDoctrineDslQuery(graph, "FIND pods WHERE exposed = true AND critical");

    expect(result.engine).toBe("doctrine-dsl");
    expect(result.matchedNodes.map((node) => node.id)).toEqual(["pod_checkout"]);
  });

  it("runs JMESPath-lite and returns vulnerable pods", () => {
    const graph = loadQueryGraph(graphPath);
    const result = runJmesPathLiteQuery(graph, "nodes[?type=='k8s_pod' && status=='vulnerable']");

    expect(result.engine).toBe("jmespath-lite");
    expect(result.matchedNodes.map((node) => node.id)).toEqual(["pod_checkout"]);
  });

  it("evaluates Rego policy metadata and produces a finding", () => {
    const graph = loadQueryGraph(graphPath);
    const policy = evaluateRegoPolicy(graph, policyPath);

    expect(policy.finding?.id).toBe("policy-critical-exposed-pod");
    expect(policy.finding?.affectedNodes).toContain("pod_checkout");
  });

  it("produces jtable-compatible query view", () => {
    const graph = loadQueryGraph(graphPath);
    const result = runDoctrineDslQuery(graph, "FIND pods WHERE exposed = true AND critical");
    const table = toJtablePayload(result);

    expect(table.schemaVersion).toBe("jtable.compat.v1");
    expect(table.rows.length).toBe(1);
    expect(table.rows[0]?.id).toBe("pod_checkout");
  });

  it("builds valid DREPS evidence-pack with policy finding", () => {
    const graph = loadQueryGraph(graphPath);
    const policy = evaluateRegoPolicy(graph, policyPath);
    const evidencePack = buildQueryEvidencePack(baseEvidencePack, graph, policy.result, policy, {
      graphPath: "labs/supply-chain/examples/query-engine-fixture/query-graph.json",
      queryResultPath: ".doctrine/out/query-engine/policy-query-result.json",
      policyPath: "labs/supply-chain/examples/query-engine-fixture/policies/critical-exposed-pod.rego",
      jtablePath: ".doctrine/out/query-engine/query-results.jtable.json"
    });

    const parsed = EvidencePackSchema.parse(evidencePack);

    expect(parsed.packId).toBe("query-engine-dreps-evidence-pack");
    assertQueryEvidencePackShape(parsed as Record<string, unknown>);
  });

  it("declares query engine scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["query:engine:run"]).toContain("run-query.ts");
    expect(pkg.scripts["query:engine:jmespath"]).toContain("jmespath-lite");
    expect(pkg.scripts["query:engine:policy"]).toContain("run-policy-query.ts");
    expect(pkg.scripts["query:engine:certify"]).toContain("certify-query-engine.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("query:engine:certify");
  });
});
