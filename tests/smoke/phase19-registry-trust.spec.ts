import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  assertRegistryTrustEvidencePackShape,
  buildRegistryTrustEvidencePack,
  checkRegistryCertificate,
  loadRegistryCertificate,
  loadRegistryCiTlsPolicy,
  registryTrustFindings,
  type JsonRecord
} from "../../packages/dreps-registry-trust/src/index.js";

const certPath = resolve("labs/supply-chain/examples/registry-trust-fixture/registry-cert.self-signed.json");
const policyPath = resolve("labs/supply-chain/examples/registry-trust-fixture/ci-tls-policy.json");
const baseEvidencePack = JSON.parse(
  readFileSync("labs/supply-chain/examples/ecommerce/evidence-pack.json", "utf8")
) as JsonRecord;

describe("phase 19 registry trust", () => {
  it("checks a registry certificate fixture", () => {
    const cert = loadRegistryCertificate(certPath);
    const policy = loadRegistryCiTlsPolicy(policyPath);
    const check = checkRegistryCertificate(cert, policy);

    expect(check.registry).toBe("localhost:5050");
    expect(check.selfSigned).toBe(true);
    expect(check.chainTrusted).toBe(false);
    expect(check.ciTlsVerified).toBe(false);
    expect(check.expiringSoon).toBe(true);
  });

  it("generates registry trust findings", () => {
    const cert = loadRegistryCertificate(certPath);
    const policy = loadRegistryCiTlsPolicy(policyPath);
    const check = checkRegistryCertificate(cert, policy);
    const findings = registryTrustFindings(check);
    const ids = new Set(findings.map((finding) => finding.id));

    expect(ids.has("registry-self-signed-cert")).toBe(true);
    expect(ids.has("registry-untrusted-chain")).toBe(true);
    expect(ids.has("registry-tls-not-verified-by-ci")).toBe(true);
    expect(ids.has("registry-cert-expiring-soon")).toBe(true);
    expect(ids.has("registry-cert-expired")).toBe(false);
  });

  it("imports registry certificate as DREPS evidence", () => {
    const cert = loadRegistryCertificate(certPath);
    const policy = loadRegistryCiTlsPolicy(policyPath);
    const check = checkRegistryCertificate(cert, policy);
    const evidencePack = buildRegistryTrustEvidencePack(
      baseEvidencePack,
      check,
      "labs/supply-chain/examples/registry-trust-fixture/registry-cert.self-signed.json",
      "labs/supply-chain/examples/registry-trust-fixture/ci-tls-policy.json"
    );

    const parsed = EvidencePackSchema.parse(evidencePack);
    assertRegistryTrustEvidencePackShape(parsed as Record<string, unknown>);

    const evidence = parsed.evidence.find((item) => item.id === "evidence_registry_certificate");

    expect(parsed.packId).toBe("registry-trust-dreps-evidence-pack");
    expect(evidence?.type).toBe("certificate");
  });

  it("links self-signed certificate finding to registry certificate node", () => {
    const cert = loadRegistryCertificate(certPath);
    const policy = loadRegistryCiTlsPolicy(policyPath);
    const check = checkRegistryCertificate(cert, policy);
    const evidencePack = buildRegistryTrustEvidencePack(
      baseEvidencePack,
      check,
      "labs/supply-chain/examples/registry-trust-fixture/registry-cert.self-signed.json",
      "labs/supply-chain/examples/registry-trust-fixture/ci-tls-policy.json"
    );

    const parsed = EvidencePackSchema.parse(evidencePack);
    const finding = parsed.findings.find((item) => item.id === "registry-self-signed-cert");

    expect(finding?.affectedNodes).toContain("registry_certificate");
    expect(finding?.evidenceRefs).toContain("evidence_registry_certificate");
  });

  it("declares registry trust scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["registry:trust:check"]).toContain("check-registry-cert.ts");
    expect(pkg.scripts["registry:trust:import"]).toContain("import-registry-trust.ts");
    expect(pkg.scripts["registry:trust:certify"]).toContain("certify-registry-trust.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("registry:trust:certify");
  });
});
