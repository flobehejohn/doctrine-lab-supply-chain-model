import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, resolve } from "node:path";
import {
  ArtifactPipelinePlanSchema,
  runArtifactPipeline
} from "../../packages/dreps-artifact-pipeline/src/index.js";

const root = process.cwd();

function ensureParent(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
}

function copyIfExists(source: string, target: string): void {
  const fullSource = resolve(root, source);

  if (!existsSync(fullSource)) {
    return;
  }

  const fullTarget = resolve(root, target);
  ensureParent(fullTarget);
  copyFileSync(fullSource, fullTarget);
}

const auditPackDir = resolve(root, ".doctrine/out/audit-pack");

rmSync(auditPackDir, { recursive: true, force: true });
mkdirSync(auditPackDir, { recursive: true });

copyIfExists(
  "labs/supply-chain/examples/ecommerce/evidence-pack.json",
  ".doctrine/out/audit-pack/evidence-pack.json"
);

copyIfExists(
  ".doctrine/out/reports/audit-report.md",
  ".doctrine/out/audit-pack/reports/audit-report.md"
);

copyIfExists(
  ".doctrine/out/diagrams/supplychain.mmd",
  ".doctrine/out/audit-pack/diagrams/supplychain.mmd"
);

copyIfExists(
  ".doctrine/out/decks/executive-summary.marp.md",
  ".doctrine/out/audit-pack/decks/executive-summary.marp.md"
);

writeFileSync(
  resolve(root, ".doctrine/out/audit-pack/MANIFEST.json"),
  JSON.stringify(
    {
      schemaVersion: "audit-pack.manifest.v1",
      generatedAt: new Date().toISOString(),
      contents: [
        "evidence-pack.json",
        "reports/audit-report.md",
        "diagrams/supplychain.mmd",
        "decks/executive-summary.marp.md"
      ]
    },
    null,
    2
  ) + "\n",
  "utf8"
);

const plan = ArtifactPipelinePlanSchema.parse(
  JSON.parse(
    readFileSync(
      resolve(root, "pipelines/audit-pack-publish.pipeline.json"),
      "utf8"
    )
  ) as unknown
);

const result = runArtifactPipeline(plan, { root });

const hashPath = resolve(root, ".doctrine/out/audit-pack.sha256.json");
const zipPath = resolve(root, ".doctrine/out/audit-pack.zip");
const vaultPath = resolve(root, ".doctrine/out/artifact-vault/audit-pack.zip");

if (!existsSync(hashPath)) {
  throw new Error("Hash manifest missing.");
}

if (!existsSync(zipPath)) {
  throw new Error("ZIP archive missing.");
}

if (!existsSync(vaultPath)) {
  throw new Error("Published artifact missing.");
}

const hashManifest = JSON.parse(readFileSync(hashPath, "utf8")) as {
  files?: Array<{ path: string; sha256: string }>;
  aggregateSha256?: string;
};

if (!hashManifest.files?.some((file) => file.path === "evidence-pack.json")) {
  throw new Error("Hash manifest must contain evidence-pack.json.");
}

if (!hashManifest.aggregateSha256) {
  throw new Error("Hash manifest must contain aggregateSha256.");
}

const zipMagic = readFileSync(zipPath).subarray(0, 2).toString("utf8");

if (zipMagic !== "PK") {
  throw new Error("ZIP archive does not have PK magic header.");
}

if (statSync(vaultPath).size <= 0) {
  throw new Error("Published artifact is empty.");
}

console.log("Artifact pipeline validation passed.");
console.log("pipelineId: " + result.pipelineId);

for (const event of result.events) {
  console.log(
    "- " +
      event.action +
      " " +
      event.status +
      " " +
      (event.output ?? event.target ?? event.input ?? "")
  );
}

console.log("hash: .doctrine/out/audit-pack.sha256.json");
console.log("zip: .doctrine/out/audit-pack.zip");
console.log("vault: .doctrine/out/artifact-vault/audit-pack.zip");
