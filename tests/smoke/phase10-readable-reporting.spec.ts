import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  renderAuditMarkdown
} from "../../packages/dreps-markdown-renderer/src/index.js";
import {
  renderSupplyChainMermaid
} from "../../packages/dreps-mermaid-exporter/src/index.js";
import {
  renderExecutiveMarp
} from "../../packages/dreps-marp-exporter/src/index.js";

const pack = EvidencePackSchema.parse(
  JSON.parse(
    readFileSync("labs/supply-chain/examples/ecommerce/evidence-pack.json", "utf8")
  ) as unknown
);

describe("phase 10 readable reporting", () => {
  it("renders a readable Markdown audit report", () => {
    const markdown = renderAuditMarkdown(pack);

    expect(markdown).toContain("# Supply Chain Audit Report");
    expect(markdown).toContain("## Findings");
    expect(markdown).toContain("finding-critical-pod-no-network-policy");
    expect(markdown).toContain("## Compliance impacts");
  });

  it("renders a Mermaid graph from nodes and edges", () => {
    const mermaid = renderSupplyChainMermaid(pack);

    expect(mermaid).toContain("flowchart LR");
    expect(mermaid).toContain("-->");
    expect(mermaid).toContain("pod_auth_api");
  });

  it("renders a Marp executive presentation", () => {
    const marp = renderExecutiveMarp(pack);

    expect(marp).toContain("marp: true");
    expect(marp).toContain("# Supply Chain Executive Summary");
    expect(marp).toContain("# Critical findings");
    expect(marp).toContain("# Recommended next actions");
  });

  it("declares readable reporting scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["report:markdown:audit"]).toContain("render-markdown-audit.ts");
    expect(pkg.scripts["report:mermaid:graph"]).toContain("render-mermaid-graph.ts");
    expect(pkg.scripts["report:marp:executive"]).toContain("render-marp-executive.ts");
    expect(pkg.scripts["report:readable:certify"]).toContain("certify-readable-reports.ts");
  });
});
