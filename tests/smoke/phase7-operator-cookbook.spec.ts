import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EvidencePackSchema } from "../../packages/dreps-supplychain-schema/src/index.js";
import {
  OperatorCommandCatalogSchema,
  type OperatorCommandCatalog
} from "../../packages/dreps-command-catalog/src/index.js";
import {
  OperatorRunbookIndexSchema,
  buildFindingOperatorLinks,
  validateFindingOperatorLinks
} from "../../packages/dreps-runbook-engine/src/index.js";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function loadCatalogs(): OperatorCommandCatalog[] {
  return readdirSync("cookbook/commands")
    .filter((file) => file.endsWith(".commands.json"))
    .sort()
    .map((file) =>
      OperatorCommandCatalogSchema.parse(readJson(join("cookbook/commands", file)))
    );
}

describe("phase 7 operator cookbook", () => {
  it("versions all required command catalogs and runbooks", () => {
    const commandCatalogs = [
      "git.commands.json",
      "gitlab.commands.json",
      "gitlab-runner.commands.json",
      "registry-certificates.commands.json",
      "kubernetes.commands.json",
      "jq.commands.json",
      "remediation.commands.json"
    ];

    for (const catalog of commandCatalogs) {
      expect(existsSync(join("cookbook/commands", catalog)), catalog).toBe(true);
    }

    const runbooks = [
      "gitlab-runner-hardening.md",
      "gitlab-registry-trust.md",
      "registry-certificate-trust.md",
      "kubernetes-networkpolicy.md",
      "unsigned-container-image.md",
      "git-forensic.md",
      "audit-pack-exploration.md"
    ];

    for (const runbook of runbooks) {
      expect(existsSync(join("cookbook/runbooks", runbook)), runbook).toBe(true);
    }
  });

  it("validates command catalogs and runbook index", () => {
    const catalogs = loadCatalogs();
    const runbookIndex = OperatorRunbookIndexSchema.parse(
      readJson("cookbook/runbooks/runbook-index.json")
    );

    expect(catalogs.length).toBe(7);
    expect(catalogs.flatMap((catalog) => catalog.commands).length).toBeGreaterThanOrEqual(12);
    expect(runbookIndex.runbooks.length).toBe(7);

    for (const runbook of runbookIndex.runbooks) {
      expect(existsSync(runbook.path), runbook.path).toBe(true);
    }
  });

  it("links findings to commands, runbooks, verification and rollback", () => {
    const pack = EvidencePackSchema.parse(
      readJson("labs/supply-chain/examples/ecommerce/evidence-pack.json")
    );
    const catalogs = loadCatalogs();
    const runbookIndex = OperatorRunbookIndexSchema.parse(
      readJson("cookbook/runbooks/runbook-index.json")
    );

    const issues = validateFindingOperatorLinks(pack, catalogs, runbookIndex);
    const links = buildFindingOperatorLinks(pack, catalogs, runbookIndex);

    expect(issues).toEqual([]);

    for (const link of links) {
      expect(link.commandIds.length).toBeGreaterThan(0);
      expect(link.runbookIds.length).toBeGreaterThan(0);
      expect(link.verificationCommandIds.length).toBeGreaterThan(0);
      expect(link.rollbackCommandIds.length).toBeGreaterThan(0);
    }

    const networkPolicyFinding = links.find(
      (link) => link.findingId === "finding-critical-pod-no-network-policy"
    );

    expect(networkPolicyFinding?.commandIds).toContain("kubernetes.apply-networkpolicy");
    expect(networkPolicyFinding?.runbookIds).toContain("kubernetes-networkpolicy");
    expect(networkPolicyFinding?.verificationCommandIds).toContain("kubernetes.verify-networkpolicy");
    expect(networkPolicyFinding?.rollbackCommandIds).toContain("kubernetes.rollback-networkpolicy");
  });
});
