import { readFileSync } from "node:fs";

export type JsonRecord = Record<string, unknown>;
export type FindingSeverity = "low" | "medium" | "high" | "critical";

export interface RemediationNode extends JsonRecord {
  id: string;
  type: string;
  name?: string;
}

export interface RemediationFinding {
  id: string;
  severity: FindingSeverity;
  title: string;
  affectedNodes: string[];
  evidenceRefs: string[];
}

export interface RemediationContext {
  schemaVersion?: string;
  source?: string;
  nodes: RemediationNode[];
  findings: RemediationFinding[];
}

export interface RemediationCommand {
  description: string;
  command: string;
  safeMode: boolean;
}

export interface RemediationPatch {
  path: string;
  description: string;
  patch: string;
}

export interface RemediationVerification {
  description: string;
  command: string;
  expected: string;
}

export interface RemediationRollback {
  description: string;
  command: string;
}

export interface Remediation {
  id: string;
  findingId: string;
  affectedNodes: string[];
  strategy: string;
  risk: FindingSeverity;
  commands: RemediationCommand[];
  patches: RemediationPatch[];
  verification: RemediationVerification[];
  rollback: RemediationRollback[];
  approvalRequired: boolean;
  maintenanceWindow: string;
  evidenceRefs: string[];
}

export interface RemediationPlan {
  schemaVersion: "dreps-remediation-plan.v1";
  generatedAt: string;
  source: string;
  findingsEvaluated: number;
  criticalFindings: string[];
  remediations: Remediation[];
  summary: {
    totalRemediations: number;
    criticalFindingsCovered: number;
    approvalRequired: number;
  };
}

export interface JtablePayload {
  schemaVersion: "jtable.compat.v1";
  title: string;
  columns: Array<{
    key: string;
    label: string;
  }>;
  rows: Array<Record<string, string | number | boolean>>;
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.:-]/g, "-");
}

function approvalRequiredFor(severity: FindingSeverity): boolean {
  return severity === "critical" || severity === "high";
}

function maintenanceWindowFor(severity: FindingSeverity): string {
  if (severity === "critical") {
    return "required: emergency or next approved production window";
  }

  if (severity === "high") {
    return "required: next standard maintenance window";
  }

  return "not required unless production change is needed";
}

function nodesOfType(context: RemediationContext, ids: string[], type: string): string[] {
  const types = new Map(context.nodes.map((node) => [node.id, node.type]));
  return ids.filter((id) => types.get(id) === type);
}

export function loadRemediationContext(path: string): RemediationContext {
  const context = readJsonFile<RemediationContext>(path);

  if (!Array.isArray(context.nodes)) {
    throw new Error("Remediation context requires nodes");
  }

  if (!Array.isArray(context.findings)) {
    throw new Error("Remediation context requires findings");
  }

  return context;
}

export function buildRemediationPlan(
  context: RemediationContext,
  generatedAt = "2026-06-25T00:00:00.000Z"
): RemediationPlan {
  const remediations = context.findings.flatMap((finding) =>
    remediationForFinding(context, finding)
  );

  const criticalFindings = context.findings
    .filter((finding) => finding.severity === "critical")
    .map((finding) => finding.id);

  const criticalCovered = criticalFindings.filter((findingId) =>
    remediations.some((remediation) => remediation.findingId === findingId)
  );

  return {
    schemaVersion: "dreps-remediation-plan.v1",
    generatedAt,
    source: context.source ?? "remediation-context",
    findingsEvaluated: context.findings.length,
    criticalFindings,
    remediations,
    summary: {
      totalRemediations: remediations.length,
      criticalFindingsCovered: criticalCovered.length,
      approvalRequired: remediations.filter((item) => item.approvalRequired).length
    }
  };
}

function remediationForFinding(context: RemediationContext, finding: RemediationFinding): Remediation[] {
  const common = {
    findingId: finding.id,
    affectedNodes: finding.affectedNodes,
    risk: finding.severity,
    approvalRequired: approvalRequiredFor(finding.severity),
    maintenanceWindow: maintenanceWindowFor(finding.severity),
    evidenceRefs: finding.evidenceRefs
  };

  if (finding.id === "no-public-critical-vulnerable-pod") {
    return [
      {
        id: "remediate-" + sanitizeId(finding.id),
        ...common,
        strategy: "Patch or isolate the public critical vulnerable pod before allowing production exposure.",
        commands: [
          {
            description: "Inspect the vulnerable production pod.",
            command: "kubectl -n prod describe pod checkout",
            safeMode: true
          },
          {
            description: "Apply a deny-by-default network policy before re-opening traffic.",
            command: "kubectl -n prod apply -f patches/networkpolicy-checkout-deny-by-default.yaml --dry-run=server",
            safeMode: true
          }
        ],
        patches: [
          {
            path: "patches/networkpolicy-checkout-deny-by-default.yaml",
            description: "Deny unintended ingress and egress around the checkout pod.",
            patch: "kind: NetworkPolicy\nmetadata:\n  name: checkout-deny-by-default\nspec:\n  podSelector:\n    matchLabels:\n      app: checkout\n  policyTypes:\n    - Ingress\n    - Egress\n"
          }
        ],
        verification: [
          {
            description: "Verify that the pod is no longer publicly exposed.",
            command: "kubectl -n prod get networkpolicy checkout-deny-by-default -o json",
            expected: "NetworkPolicy exists and applies to app=checkout"
          },
          {
            description: "Verify that security scan no longer reports a public critical vulnerable pod.",
            command: "pnpm policy:engine:certify",
            expected: "no-public-critical-vulnerable-pod is absent or downgraded after patch"
          }
        ],
        rollback: [
          {
            description: "Remove the deny-by-default policy if it breaks production traffic.",
            command: "kubectl -n prod delete networkpolicy checkout-deny-by-default"
          }
        ]
      }
    ];
  }

  if (finding.id === "no-docker-sock-runner") {
    return [
      {
        id: "remediate-" + sanitizeId(finding.id),
        ...common,
        strategy: "Remove Docker socket mounting from CI runner and move builds to isolated builder mode.",
        commands: [
          {
            description: "Inspect runner configuration for Docker socket mounts.",
            command: "grep -R \"docker.sock\" labs/supply-chain/environments/gitlab-local -n",
            safeMode: true
          },
          {
            description: "Run GitLab adapter certification after changing runner configuration.",
            command: "pnpm gitlab:adapter:certify",
            safeMode: true
          }
        ],
        patches: [
          {
            path: "patches/gitlab-runner-remove-docker-sock.patch",
            description: "Remove /var/run/docker.sock volume from runner configuration.",
            patch: "--- a/config.toml\n+++ b/config.toml\n@@\n- volumes = [\"/var/run/docker.sock:/var/run/docker.sock\"]\n+ volumes = []\n"
          }
        ],
        verification: [
          {
            description: "Verify Docker socket is no longer present.",
            command: "grep -R \"docker.sock\" labs/supply-chain/environments/gitlab-local || true",
            expected: "No active runner configuration mounts docker.sock"
          },
          {
            description: "Verify policy engine no longer reports docker socket runner.",
            command: "pnpm policy:engine:certify",
            expected: "no-docker-sock-runner is absent after remediation"
          }
        ],
        rollback: [
          {
            description: "Revert the runner configuration patch if builds cannot run.",
            command: "git checkout -- labs/supply-chain/environments/gitlab-local"
          }
        ]
      }
    ];
  }

  if (finding.id === "blast-radius-sensitive-db-reachable") {
    return [
      {
        id: "remediate-" + sanitizeId(finding.id),
        ...common,
        strategy: "Reduce blast radius by blocking pod-to-database propagation and enforcing explicit database egress.",
        commands: [
          {
            description: "Inspect blast-radius path to the sensitive DB.",
            command: "pnpm blast:radius:certify",
            safeMode: true
          },
          {
            description: "Dry-run database egress restriction.",
            command: "kubectl -n prod apply -f patches/auth-db-egress-policy.yaml --dry-run=server",
            safeMode: true
          }
        ],
        patches: [
          {
            path: "patches/auth-db-egress-policy.yaml",
            description: "Restrict database access to explicitly approved auth workloads.",
            patch: "kind: NetworkPolicy\nmetadata:\n  name: auth-db-egress-policy\nspec:\n  podSelector:\n    matchLabels:\n      app: auth-api\n  policyTypes:\n    - Egress\n"
          }
        ],
        verification: [
          {
            description: "Verify blast radius no longer reaches sensitive DB without crossing a blocking control.",
            command: "pnpm blast:radius:certify",
            expected: "controlsThatWouldBlock includes database network policy"
          }
        ],
        rollback: [
          {
            description: "Remove the database egress policy.",
            command: "kubectl -n prod delete networkpolicy auth-db-egress-policy"
          }
        ]
      }
    ];
  }

  if (finding.id === "no-unsigned-container-image") {
    return [
      {
        id: "remediate-" + sanitizeId(finding.id),
        ...common,
        strategy: "Sign container images and enforce signature verification before deployment.",
        commands: [
          {
            description: "Inspect unsigned image finding.",
            command: "pnpm security:scans:certify",
            safeMode: true
          },
          {
            description: "Generate image signing attestation placeholder.",
            command: "echo \"cosign sign --keyless localhost:5050/root/sample-project:latest\"",
            safeMode: true
          }
        ],
        patches: [
          {
            path: "patches/ci-require-image-signature.patch",
            description: "Add a CI gate requiring image signature verification.",
            patch: "--- a/.github/workflows/ci.yml\n+++ b/.github/workflows/ci.yml\n@@\n+      - name: Verify image signature\n+        run: cosign verify --certificate-identity-regexp '.*' localhost:5050/root/sample-project:latest\n"
          }
        ],
        verification: [
          {
            description: "Verify registry trust and signature policy are certified.",
            command: "pnpm registry:trust:certify",
            expected: "registry trust certification passes with signature evidence"
          }
        ],
        rollback: [
          {
            description: "Revert the CI signature gate if emergency release is blocked.",
            command: "git checkout -- .github/workflows/ci.yml"
          }
        ]
      }
    ];
  }

  if (finding.id === "no-runner-privileged") {
    return [
      {
        id: "remediate-" + sanitizeId(finding.id),
        ...common,
        strategy: "Disable privileged runner execution and move privileged build steps to a controlled builder.",
        commands: [
          {
            description: "Inspect privileged runner evidence.",
            command: "pnpm gitlab:adapter:certify",
            safeMode: true
          }
        ],
        patches: [
          {
            path: "patches/gitlab-runner-disable-privileged.patch",
            description: "Set privileged=false for GitLab runner.",
            patch: "--- a/config.toml\n+++ b/config.toml\n@@\n- privileged = true\n+ privileged = false\n"
          }
        ],
        verification: [
          {
            description: "Verify runner is no longer privileged.",
            command: "pnpm policy:engine:certify",
            expected: "no-runner-privileged is absent or downgraded after configuration change"
          }
        ],
        rollback: [
          {
            description: "Revert runner hardening if build isolation blocks all builds.",
            command: "git checkout -- labs/supply-chain/environments/gitlab-local"
          }
        ]
      }
    ];
  }

  if (finding.id === "no-untrusted-registry") {
    return [
      {
        id: "remediate-" + sanitizeId(finding.id),
        ...common,
        strategy: "Replace self-signed or untrusted registry trust chain with a trusted certificate path and enforce TLS verification.",
        commands: [
          {
            description: "Inspect registry trust status.",
            command: "pnpm registry:trust:certify",
            safeMode: true
          }
        ],
        patches: [
          {
            path: "patches/registry-trust-policy.patch",
            description: "Require trusted registry TLS verification in CI policy.",
            patch: "--- a/registry-policy.json\n+++ b/registry-policy.json\n@@\n+{\"ciTlsVerified\":true,\"chainTrusted\":true}\n"
          }
        ],
        verification: [
          {
            description: "Verify registry trust check passes.",
            command: "pnpm registry:trust:certify",
            expected: "registry untrusted-chain finding is absent or accepted with evidence"
          }
        ],
        rollback: [
          {
            description: "Restore previous registry trust policy.",
            command: "git checkout -- labs/supply-chain/examples/registry-trust-fixture"
          }
        ]
      }
    ];
  }

  const nodeTypes = nodesOfType(context, finding.affectedNodes, "database").join(", ");

  return [
    {
      id: "remediate-" + sanitizeId(finding.id),
      ...common,
      strategy: "Review and remediate finding " + finding.id + " for affected node types: " + nodeTypes,
      commands: [
        {
          description: "Run full supply-chain certification.",
          command: "pnpm supplychain:certify",
          safeMode: true
        }
      ],
      patches: [
        {
          path: "patches/" + sanitizeId(finding.id) + ".patch",
          description: "Placeholder remediation patch for " + finding.id,
          patch: "# Add a targeted patch after manual triage\n"
        }
      ],
      verification: [
        {
          description: "Verify full certification passes.",
          command: "pnpm supplychain:certify",
          expected: "Full certification succeeds"
        }
      ],
      rollback: [
        {
          description: "Revert targeted remediation patch.",
          command: "git checkout -- ."
        }
      ]
    }
  ];
}

export function renderRemediationMarkdown(plan: RemediationPlan): string {
  const lines = [
    "# Remediation Plan",
    "",
    "- Findings evaluated: `" + plan.findingsEvaluated + "`",
    "- Critical findings: `" + plan.criticalFindings.length + "`",
    "- Remediations: `" + plan.summary.totalRemediations + "`",
    "- Approval required: `" + plan.summary.approvalRequired + "`",
    "",
    "## Remediations",
    ""
  ];

  for (const remediation of plan.remediations) {
    lines.push("### " + remediation.findingId);
    lines.push("");
    lines.push("- Risk: `" + remediation.risk + "`");
    lines.push("- Affected nodes: `" + remediation.affectedNodes.join(", ") + "`");
    lines.push("- Approval required: `" + remediation.approvalRequired + "`");
    lines.push("- Maintenance window: `" + remediation.maintenanceWindow + "`");
    lines.push("- Strategy: " + remediation.strategy);
    lines.push("");
    lines.push("Verification:");
    for (const verification of remediation.verification) {
      lines.push("- `" + verification.command + "` => " + verification.expected);
    }
    lines.push("");
    lines.push("Rollback:");
    for (const rollback of remediation.rollback) {
      lines.push("- `" + rollback.command + "`");
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function toJtablePayload(plan: RemediationPlan): JtablePayload {
  return {
    schemaVersion: "jtable.compat.v1",
    title: "Remediation Plan",
    columns: [
      { key: "findingId", label: "Finding" },
      { key: "risk", label: "Risk" },
      { key: "affectedNodes", label: "Affected nodes" },
      { key: "approvalRequired", label: "Approval" },
      { key: "maintenanceWindow", label: "Maintenance window" },
      { key: "verificationCount", label: "Verifications" },
      { key: "rollbackCount", label: "Rollbacks" }
    ],
    rows: plan.remediations.map((remediation) => ({
      findingId: remediation.findingId,
      risk: remediation.risk,
      affectedNodes: remediation.affectedNodes.join(", "),
      approvalRequired: remediation.approvalRequired,
      maintenanceWindow: remediation.maintenanceWindow,
      verificationCount: remediation.verification.length,
      rollbackCount: remediation.rollback.length
    }))
  };
}

export function assertRemediationPlanShape(plan: RemediationPlan): void {
  if (plan.schemaVersion !== "dreps-remediation-plan.v1") {
    throw new Error("Invalid remediation plan schemaVersion");
  }

  for (const criticalFindingId of plan.criticalFindings) {
    const covered = plan.remediations.some((remediation) => remediation.findingId === criticalFindingId);

    if (!covered) {
      throw new Error("Critical finding has no remediation: " + criticalFindingId);
    }
  }

  for (const remediation of plan.remediations) {
    const missing: string[] = [];

    if (!remediation.findingId) missing.push("findingId");
    if (!Array.isArray(remediation.affectedNodes) || remediation.affectedNodes.length === 0) missing.push("affectedNodes");
    if (!remediation.strategy) missing.push("strategy");
    if (!remediation.risk) missing.push("risk");
    if (!Array.isArray(remediation.commands) || remediation.commands.length === 0) missing.push("commands");
    if (!Array.isArray(remediation.patches) || remediation.patches.length === 0) missing.push("patches");
    if (!Array.isArray(remediation.verification) || remediation.verification.length === 0) missing.push("verification");
    if (!Array.isArray(remediation.rollback) || remediation.rollback.length === 0) missing.push("rollback");
    if (typeof remediation.approvalRequired !== "boolean") missing.push("approvalRequired");
    if (!remediation.maintenanceWindow) missing.push("maintenanceWindow");

    if (missing.length > 0) {
      throw new Error("Remediation " + remediation.id + " is missing fields: " + missing.join(", "));
    }

    for (const verification of remediation.verification) {
      if (!verification.command || !verification.expected) {
        throw new Error("Remediation has incomplete verification: " + remediation.id);
      }
    }

    for (const rollback of remediation.rollback) {
      if (!rollback.command) {
        throw new Error("Remediation has incomplete rollback: " + remediation.id);
      }
    }
  }
}
