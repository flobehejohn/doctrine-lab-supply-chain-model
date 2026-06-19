import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  buildGraph,
  buildGraphMetrics,
  validateGraphIntegrity
} from "../../packages/dreps-graph-engine/src/index.js";

function readInputArg(argv: string[]): string {
  const inputIndex = argv.indexOf("--input");

  if (inputIndex === -1) {
    return "labs/supply-chain/examples/ecommerce/evidence-pack.json";
  }

  const input = argv[inputIndex + 1];

  if (input === undefined || input.trim().length === 0) {
    throw new Error("Missing value after --input.");
  }

  return input;
}

try {
  const input = readInputArg(process.argv.slice(2));
  const absolutePath = resolve(process.cwd(), input);
  const raw = readFileSync(absolutePath, "utf8");
  const json = JSON.parse(raw) as unknown;

  const parseResult = EvidencePackSchema.safeParse(json);

  if (!parseResult.success) {
    console.error("schema validation failed");
    console.error(JSON.stringify(parseResult.error.issues, null, 2));
    process.exit(1);
  }

  console.log("schema validation passed");

  const graph = buildGraph(parseResult.data);
  const integrity = validateGraphIntegrity(graph);

  if (!integrity.valid) {
    console.error("graph integrity failed");
    console.error(JSON.stringify(integrity.issues, null, 2));
    process.exit(1);
  }

  console.log("graph integrity passed");

  const metrics = buildGraphMetrics(graph);

  console.log("graph metrics:");
  console.log("  nodes: " + metrics.nodeCount);
  console.log("  edges: " + metrics.edgeCount);
  console.log("  evidence: " + metrics.evidenceCount);
  console.log("  findings: " + metrics.findingCount);
  console.log("  remediations: " + metrics.remediationCount);
  console.log("  complianceImpacts: " + metrics.complianceImpactCount);
  console.log("certification complete");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}

