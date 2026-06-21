import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createZipArchive,
  hashPath,
  runArtifactPipeline
} from "../../packages/dreps-artifact-pipeline/src/index.js";

describe("phase 11 artifact pipeline", () => {
  it("hashes a directory", () => {
    const dir = ".doctrine/tmp/phase11/hash-input";

    rmSync(".doctrine/tmp/phase11", { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, "hello.txt"), "hello\n", "utf8");

    const manifest = hashPath(dir);

    expect(manifest.algorithm).toBe("sha256");
    expect(manifest.files).toHaveLength(1);
    expect(manifest.files[0]?.path).toBe("hello.txt");
    expect(manifest.aggregateSha256.length).toBe(64);
  });

  it("creates a ZIP archive with PK magic", () => {
    const dir = ".doctrine/tmp/phase11/zip-input";
    const output = ".doctrine/tmp/phase11/sample.zip";

    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, "artifact.txt"), "artifact\n", "utf8");

    createZipArchive(dir, output);

    expect(existsSync(output)).toBe(true);
    expect(readFileSync(output).subarray(0, 2).toString("utf8")).toBe("PK");
  });

  it("runs hash, zip and local upload actions", () => {
    const root = process.cwd();
    const input = ".doctrine/tmp/phase11/pipeline-input";
    const zip = ".doctrine/tmp/phase11/pipeline.zip";
    const vault = ".doctrine/tmp/phase11/vault";

    mkdirSync(input, { recursive: true });
    writeFileSync(resolve(input, "evidence.json"), "{\"ok\":true}\n", "utf8");

    const result = runArtifactPipeline(
      {
        pipelineId: "test-pipeline",
        actions: [
          {
            type: "hash",
            input,
            output: ".doctrine/tmp/phase11/pipeline.sha256.json"
          },
          {
            type: "zip",
            input,
            output: zip
          },
          {
            type: "upload",
            input: zip,
            target: vault
          }
        ]
      },
      { root }
    );

    expect(result.pipelineId).toBe("test-pipeline");
    expect(result.events.map((event) => event.action)).toEqual([
      "hash",
      "zip",
      "upload"
    ]);
    expect(existsSync(".doctrine/tmp/phase11/pipeline.sha256.json")).toBe(true);
    expect(existsSync(zip)).toBe(true);
    expect(existsSync(".doctrine/tmp/phase11/vault/pipeline.zip")).toBe(true);
  });

  it("refuses delete without allowDelete", () => {
    expect(() =>
      runArtifactPipeline({
        pipelineId: "danger-delete",
        actions: [
          {
            type: "delete",
            input: ".doctrine/tmp/phase11",
            allowDelete: false
          }
        ]
      })
    ).toThrow("allowDelete=true");
  });
});
