import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import {
  ArtifactPipelinePlanSchema,
  runArtifactPipeline
} from "../../packages/dreps-artifact-pipeline/src/index.js";

const root = process.cwd();

function ensureParent(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
}

function normalize(path: string): string {
  return path.split(sep).join("/");
}

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  const files: string[] = [];

  function walk(current: string): void {
    for (const entry of readdirSync(current)) {
      const fullPath = join(current, entry);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        walk(fullPath);
      } else if (stats.isFile()) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files.sort();
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

function copyDirectoryIfExists(source: string, target: string): void {
  const fullSource = resolve(root, source);

  if (!existsSync(fullSource)) {
    return;
  }

  for (const file of listFiles(fullSource)) {
    const relativePath = relative(fullSource, file);
    const fullTarget = resolve(root, target, relativePath);
    ensureParent(fullTarget);
    copyFileSync(file, fullTarget);
  }
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

copyDirectoryIfExists(
  ".doctrine/out/workflows",
  ".doctrine/out/audit-pack/workflows"
);

const contents = listFiles(auditPackDir).map((file) =>
  normalize(relative(auditPackDir, file))
);

writeFileSync(
  resolve(root, ".doctrine/out/audit-pack/MANIFEST.json"),
  JSON.stringify(
    {
      schemaVersion: "audit-pack.manifest.v1",
      generatedAt: new Date().toISOString(),
      contents
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

if (!hashManifest.files?.some((file) => file.path.startsWith("workflows/"))) {
  throw new Error("Hash manifest must contain workflow artifacts.");
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
console.log("workflow artifacts included: yes");
