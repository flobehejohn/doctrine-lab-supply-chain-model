import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";

function readInputArg(argv: string[]): string {
  const inputIndex = argv.indexOf("--input");

  if (inputIndex === -1) {
    throw new Error("Usage: pnpm supplychain:validate -- --input <path-to-evidence-pack.json>");
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

  const result = EvidencePackSchema.safeParse(json);

  if (!result.success) {
    console.error("Evidence pack validation failed.");
    console.error(JSON.stringify(result.error.issues, null, 2));
    process.exit(1);
  }

  const pack = result.data;

  console.log("Evidence pack validation passed.");
  console.log(`packId: ${pack.packId}`);
  console.log(`nodes: ${pack.nodes.length}`);
  console.log(`edges: ${pack.edges.length}`);
  console.log(`evidence: ${pack.evidence.length}`);
  console.log(`findings: ${pack.findings.length}`);
  console.log(`remediations: ${pack.remediations.length}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
