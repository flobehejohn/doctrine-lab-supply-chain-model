import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  loadQueryGraph,
  runDoctrineDslQuery,
  runJmesPathLiteQuery,
  toJtablePayload
} from "../../packages/dreps-query-engine/src/index.js";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const root = process.cwd();
const engine = arg("--engine") ?? "doctrine-dsl";
const query =
  arg("--query") ??
  (engine === "jmespath-lite"
    ? "nodes[?type=='k8s_pod' && status=='vulnerable']"
    : "FIND pods WHERE exposed = true AND critical");

const inputPath = arg("--input") ?? "labs/supply-chain/examples/query-engine-fixture/query-graph.json";
const resultPath = ".doctrine/out/query-engine/query-result.json";
const jtablePath = ".doctrine/out/query-engine/query-results.jtable.json";

const graph = loadQueryGraph(resolve(root, inputPath));
const result =
  engine === "jmespath-lite"
    ? runJmesPathLiteQuery(graph, query)
    : runDoctrineDslQuery(graph, query);

const jtable = toJtablePayload(result);

for (const outputPath of [resultPath, jtablePath]) {
  mkdirSync(dirname(resolve(root, outputPath)), { recursive: true });
}

writeFileSync(resolve(root, resultPath), JSON.stringify(result, null, 2) + "\n", "utf8");
writeFileSync(resolve(root, jtablePath), JSON.stringify(jtable, null, 2) + "\n", "utf8");

console.log("Query executed.");
console.log("engine: " + result.engine);
console.log("query: " + result.query);
console.log("matchedNodes: " + result.matchedNodes.map((node) => node.id).join(", "));
console.log("result: " + resultPath);
console.log("jtable: " + jtablePath);
