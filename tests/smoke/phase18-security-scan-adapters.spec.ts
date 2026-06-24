import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertSecurityScanEvidencePackShape,
  attachSecurityScansToEvidencePack,
  importAllSecurityScans,
  importCheckov,
  importKubescape,
  importSyft,
  importTrivy,
  type JsonRecord
} from "../../packages/dreps-adapters/src/security-scans.js";

const scanRoot = resolve("labs/supply-chain/examples/security-scans-fixture");
const runtimePack = JSON.parse(
  readFileSync(".doctrine/out/runtime/evidence-pack.runtime.json", "utf8")
) as JsonRecord;

describe("phase 18 security scan adapters", () => {
  it("imports Trivy finding and links it to container image", () => {
    const trivy = importTrivy(resolve(scanRoot, "trivy.json"));

    expect(trivy.tool).toBe("trivy");
    expect(trivy.findings.length).toBeGreaterThanOrEqual(1);
    expect(trivy.findings[0]?.id).toBe("trivy-image-vulnerability");
    expect(trivy.findings[0]?.targetNode).toBe("container_image");
  });

  it("imports Syft as SBOM components", () => {
    const syft = importSyft(resolve(scanRoot, "syft.json"));

    expect(syft.tool).toBe("syft");
    expect(syft.components?.length).toBeGreaterThanOrEqual(2);
  });

  it("imports Checkov findings and links them to k8s/Terraform nodes", () => {
    const checkov = importCheckov(resolve(scanRoot, "checkov.json"));
    const targets = new Set(checkov.findings.map((finding) => finding.targetNode));

    expect(targets.has("k8s_workload")).toBe(true);
    expect(targets.has("database")).toBe(true);
  });

  it("imports Kubescape findings and links them to namespace/pod", () => {
    const kubescape = importKubescape(resolve(scanRoot, "kubescape.json"));
    const targets = new Set(kubescape.findings.map((finding) => finding.targetNode));

    expect(targets.has("k8s_pod")).toBe(true);
    expect(targets.has("k8s_namespace")).toBe(true);
  });

  it("attaches all security scans to a valid DREPS evidence-pack", () => {
    const scans = importAllSecurityScans({
      trivy: resolve(scanRoot, "trivy.json"),
      syft: resolve(scanRoot, "syft.json"),
      checkov: resolve(scanRoot, "checkov.json"),
      kubescape: resolve(scanRoot, "kubescape.json"),
      sonarqube: resolve(scanRoot, "sonarqube.json"),
      dependencyTrack: resolve(scanRoot, "dependency-track.json")
    });

    const evidencePack = attachSecurityScansToEvidencePack(runtimePack, scans);
    const parsed = EvidencePackSchema.parse(evidencePack);

    expect(parsed.packId).toBe("security-scans-dreps-evidence-pack");
    assertSecurityScanEvidencePackShape(parsed as Record<string, unknown>);
  });

  it("declares security scan scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["security:scans:import:trivy"]).toContain("import-trivy.ts");
    expect(pkg.scripts["security:scans:import:syft"]).toContain("import-syft.ts");
    expect(pkg.scripts["security:scans:import:checkov"]).toContain("import-checkov.ts");
    expect(pkg.scripts["security:scans:import:kubescape"]).toContain("import-kubescape.ts");
    expect(pkg.scripts["security:scans:import:sonarqube"]).toContain("import-sonarqube.ts");
    expect(pkg.scripts["security:scans:certify"]).toContain("certify-security-scans.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("security:scans:certify");
  });
});
