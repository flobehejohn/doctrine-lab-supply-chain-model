import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertConfigMatrixEvidencePackShape,
  buildConfigMatrixEvidencePack,
  compareEnvMatrix,
  loadEnvMatrix,
  renderMarkdownMatrix,
  toJtablePayload,
  type JsonRecord
} from "../../packages/dreps-config-matrix/src/index.js";

const matrixPath = resolve("labs/supply-chain/examples/config-matrix-fixture/env-matrix.json");
const baseEvidencePack = JSON.parse(
  readFileSync("labs/supply-chain/examples/ecommerce/evidence-pack.json", "utf8")
) as JsonRecord;

describe("phase 21 env matrix config drift", () => {
  it("loads dev staging prod matrix", () => {
    const matrix = loadEnvMatrix(matrixPath);
    const envs = new Set(matrix.environments.map((env) => env.name));

    expect(envs.has("dev")).toBe(true);
    expect(envs.has("staging")).toBe(true);
    expect(envs.has("prod")).toBe(true);
  });

  it("detects production drift findings", () => {
    const matrix = loadEnvMatrix(matrixPath);
    const report = compareEnvMatrix(matrix);
    const findingIds = new Set(report.findings.map((finding) => finding.id));

    expect(findingIds.has("prod-uses-latest-image")).toBe(true);
    expect(findingIds.has("prod-config-drift")).toBe(true);
    expect(findingIds.has("missing-prod-network-policy")).toBe(true);
    expect(findingIds.has("undocumented-env-difference")).toBe(true);
  });

  it("produces jtable compatible matrix", () => {
    const matrix = loadEnvMatrix(matrixPath);
    const table = toJtablePayload(matrix);
    const markdown = renderMarkdownMatrix(table);

    expect(table.schemaVersion).toBe("jtable.compat.v1");
    expect(table.columns.map((column) => column.key)).toEqual(["key", "dev", "staging", "prod"]);
    expect(table.rows.length).toBeGreaterThanOrEqual(8);
    expect(markdown).toContain("| Key | Dev | Staging | Prod |");
    expect(markdown).toContain("allowedExternalEgress");
  });

  it("builds valid DREPS evidence-pack", () => {
    const matrix = loadEnvMatrix(matrixPath);
    const report = compareEnvMatrix(matrix);
    const evidencePack = buildConfigMatrixEvidencePack(baseEvidencePack, report, {
      matrixPath: ".doctrine/out/config-matrix/env-matrix.normalized.json",
      driftReportPath: ".doctrine/out/config-matrix/config-drift-report.json",
      jtablePath: ".doctrine/out/config-matrix/env-matrix.jtable.json",
      markdownTablePath: ".doctrine/out/config-matrix/env-matrix.md"
    });

    const parsed = EvidencePackSchema.parse(evidencePack);

    expect(parsed.packId).toBe("config-matrix-dreps-evidence-pack");
    assertConfigMatrixEvidencePackShape(parsed as Record<string, unknown>);
  });

  it("declares config matrix scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["config:matrix:import"]).toContain("import-env-matrix.ts");
    expect(pkg.scripts["config:matrix:compare"]).toContain("compare-env-matrix.ts");
    expect(pkg.scripts["config:matrix:certify"]).toContain("certify-config-matrix.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("config:matrix:certify");
  });
});
