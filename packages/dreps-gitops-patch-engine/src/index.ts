import { readFileSync } from "node:fs";

export type JsonRecord = Record<string, unknown>;

export interface GitOpsFinding {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  risk: string;
  why: string;
  affectedNodes: string[];
  evidenceRefs: string[];
}

export interface AffectedNode extends JsonRecord {
  id: string;
  type: string;
  name: string;
  namespace?: string;
  labels?: Record<string, string>;
  critical?: boolean;
  public?: boolean;
  vulnerable?: boolean;
}

export interface ComplianceImpact {
  framework: string;
  control: string;
  impact: string;
  findingId: string;
}

export interface CommandSpec {
  description: string;
  command: string;
}

export interface GitOpsPatchContext {
  schemaVersion?: string;
  source?: string;
  branch: string;
  targetFile: string;
  finding: GitOpsFinding;
  affectedNodes: AffectedNode[];
  complianceImpacts: ComplianceImpact[];
  verificationCommands: CommandSpec[];
  rollbackCommands: CommandSpec[];
  approvalRequired: boolean;
  maintenanceWindow: string;
}

export interface GitOpsRemediationPlan {
  schemaVersion: "dreps-gitops-remediation-plan.v1";
  generatedAt: string;
  branch: string;
  findingId: string;
  affectedNodes: string[];
  strategy: string;
  risk: string;
  patchPath: string;
  verificationScriptPath: string;
  rollbackPath: string;
  approvalRequired: boolean;
  maintenanceWindow: string;
}

export interface GitOpsPatchBundle {
  patchDiff: string;
  remediationPlan: GitOpsRemediationPlan;
  pullRequestBody: string;
  verificationPs1: string;
  rollbackMd: string;
  jtable: JtablePayload;
}

export interface JtablePayload {
  schemaVersion: "jtable.compat.v1";
  title: string;
  tables: Array<{
    id: string;
    title: string;
    columns: Array<{ key: string; label: string }>;
    rows: Array<Record<string, string | number | boolean>>;
  }>;
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function normalizePathForPatch(path: string): string {
  return path.replace(/\\/g, "/");
}

function escapeMarkdown(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

function markdownTable(headers: string[], rows: string[][]): string {
  const header = "| " + headers.map(escapeMarkdown).join(" | ") + " |";
  const sep = "| " + headers.map(() => "---").join(" | ") + " |";
  const body = rows.map((row) => "| " + row.map(escapeMarkdown).join(" | ") + " |");

  return [header, sep, ...body].join("\n");
}

function networkPolicyYaml(context: GitOpsPatchContext): string {
  const node = context.affectedNodes[0];

  if (!node) {
    throw new Error("GitOps patch context requires at least one affected node");
  }

  const namespace = node.namespace ?? "prod";
  const labels = node.labels ?? { app: "checkout" };
  const app = labels.app ?? "checkout";

  return [
    "apiVersion: networking.k8s.io/v1",
    "kind: NetworkPolicy",
    "metadata:",
    "  name: checkout-deny-by-default",
    "  namespace: " + namespace,
    "  labels:",
    "    doctrine.io/generated-by: dreps-gitops-patch-engine",
    "    doctrine.io/finding-id: " + context.finding.id,
    "spec:",
    "  podSelector:",
    "    matchLabels:",
    "      app: " + app,
    "  policyTypes:",
    "    - Ingress",
    "    - Egress",
    "  ingress: []",
    "  egress: []",
    ""
  ].join("\n");
}

function unifiedAddFilePatch(targetFile: string, content: string): string {
  const normalizedTarget = normalizePathForPatch(targetFile);
  const lines = content.endsWith("\n")
    ? content.slice(0, -1).split("\n")
    : content.split("\n");

  const prefixed = lines.map((line) => "+" + line).join("\n");

  return [
    "diff --git a/" + normalizedTarget + " b/" + normalizedTarget,
    "new file mode 100644",
    "index 0000000..1111111",
    "--- /dev/null",
    "+++ b/" + normalizedTarget,
    "@@ -0,0 +1," + lines.length + " @@",
    prefixed,
    ""
  ].join("\n");
}

export function loadGitOpsPatchContext(path: string): GitOpsPatchContext {
  const context = readJsonFile<GitOpsPatchContext>(path);

  if (!context.targetFile) {
    throw new Error("GitOps patch context requires targetFile");
  }

  if (!context.finding?.id) {
    throw new Error("GitOps patch context requires finding");
  }

  if (!Array.isArray(context.affectedNodes) || context.affectedNodes.length === 0) {
    throw new Error("GitOps patch context requires affectedNodes");
  }

  return context;
}

export function buildGitOpsPatchBundle(
  context: GitOpsPatchContext,
  generatedAt = "2026-06-25T00:00:00.000Z"
): GitOpsPatchBundle {
  const yaml = networkPolicyYaml(context);
  const patchDiff = unifiedAddFilePatch(context.targetFile, yaml);

  const remediationPlan: GitOpsRemediationPlan = {
    schemaVersion: "dreps-gitops-remediation-plan.v1",
    generatedAt,
    branch: context.branch,
    findingId: context.finding.id,
    affectedNodes: context.finding.affectedNodes,
    strategy: "Create a GitOps PR adding a deny-by-default Kubernetes NetworkPolicy for the affected workload.",
    risk: context.finding.risk,
    patchPath: ".doctrine/out/gitops-patch/patch.diff",
    verificationScriptPath: ".doctrine/out/gitops-patch/verification.ps1",
    rollbackPath: ".doctrine/out/gitops-patch/rollback.md",
    approvalRequired: context.approvalRequired,
    maintenanceWindow: context.maintenanceWindow
  };

  const jtable = toJtablePayload(context, remediationPlan);
  const pullRequestBody = renderPullRequestBody(context, remediationPlan);
  const verificationPs1 = renderVerificationScript(context);
  const rollbackMd = renderRollbackMarkdown(context);

  return {
    patchDiff,
    remediationPlan,
    pullRequestBody,
    verificationPs1,
    rollbackMd,
    jtable
  };
}

export function renderPullRequestBody(
  context: GitOpsPatchContext,
  plan: GitOpsRemediationPlan
): string {
  const findingRows = [[
    context.finding.id,
    context.finding.severity,
    context.finding.title,
    context.finding.risk
  ]];

  const affectedRows = context.affectedNodes.map((node) => [
    node.id,
    node.type,
    node.namespace ?? "",
    String(Boolean(node.critical)),
    String(Boolean(node.public)),
    String(Boolean(node.vulnerable))
  ]);

  const complianceRows = context.complianceImpacts.map((impact) => [
    impact.framework,
    impact.control,
    impact.impact,
    impact.findingId
  ]);

  const verificationRows = context.verificationCommands.map((command) => [
    command.description,
    "`" + command.command + "`"
  ]);

  return [
    "# GitOps remediation PR",
    "",
    "## Why",
    "",
    context.finding.why,
    "",
    "## Risk",
    "",
    context.finding.risk,
    "",
    "## Strategy",
    "",
    plan.strategy,
    "",
    "## Findings",
    "",
    markdownTable(["Finding", "Severity", "Title", "Risk"], findingRows),
    "",
    "## Affected nodes",
    "",
    markdownTable(["Node", "Type", "Namespace", "Critical", "Public", "Vulnerable"], affectedRows),
    "",
    "## Compliance impacts",
    "",
    markdownTable(["Framework", "Control", "Impact", "Finding"], complianceRows),
    "",
    "## Verification commands",
    "",
    markdownTable(["Description", "Command"], verificationRows),
    "",
    "## Rollback",
    "",
    "- Apply reverse patch: `git apply -R .doctrine/out/gitops-patch/patch.diff`",
    "- Remove live NetworkPolicy if already applied: `kubectl -n prod delete networkpolicy checkout-deny-by-default`",
    "",
    "## Approval and maintenance",
    "",
    "- Approval required: `" + plan.approvalRequired + "`",
    "- Maintenance window: `" + plan.maintenanceWindow + "`",
    ""
  ].join("\n");
}

export function renderVerificationScript(context: GitOpsPatchContext): string {
  const lines = [
    "$ErrorActionPreference = \"Stop\"",
    "Set-StrictMode -Version Latest",
    "",
    "Write-Host \"=== GitOps patch verification ===\"",
    "",
    "git apply --check .doctrine/out/gitops-patch/patch.diff"
  ];

  for (const command of context.verificationCommands) {
    if (command.command === "git apply --check .doctrine/out/gitops-patch/patch.diff") {
      continue;
    }

    lines.push("Write-Host \"- " + command.description.replace(/"/g, "'") + "\"");
    lines.push(command.command);
  }

  lines.push("");
  lines.push("Write-Host \"GitOps patch verification passed.\"");
  lines.push("");

  return lines.join("\n");
}

export function renderRollbackMarkdown(context: GitOpsPatchContext): string {
  const lines = [
    "# Rollback plan",
    "",
    "Finding: `" + context.finding.id + "`",
    "",
    "## Commands",
    ""
  ];

  for (const command of context.rollbackCommands) {
    lines.push("- " + command.description);
    lines.push("");
    lines.push("  ```powershell");
    lines.push("  " + command.command);
    lines.push("  ```");
    lines.push("");
  }

  return lines.join("\n");
}

export function toJtablePayload(
  context: GitOpsPatchContext,
  plan: GitOpsRemediationPlan
): JtablePayload {
  return {
    schemaVersion: "jtable.compat.v1",
    title: "GitOps PR tables",
    tables: [
      {
        id: "findings",
        title: "Findings",
        columns: [
          { key: "findingId", label: "Finding" },
          { key: "severity", label: "Severity" },
          { key: "title", label: "Title" },
          { key: "risk", label: "Risk" }
        ],
        rows: [
          {
            findingId: context.finding.id,
            severity: context.finding.severity,
            title: context.finding.title,
            risk: context.finding.risk
          }
        ]
      },
      {
        id: "affected-nodes",
        title: "Affected nodes",
        columns: [
          { key: "nodeId", label: "Node" },
          { key: "type", label: "Type" },
          { key: "namespace", label: "Namespace" },
          { key: "critical", label: "Critical" }
        ],
        rows: context.affectedNodes.map((node) => ({
          nodeId: node.id,
          type: node.type,
          namespace: node.namespace ?? "",
          critical: Boolean(node.critical)
        }))
      },
      {
        id: "compliance-impacts",
        title: "Compliance impacts",
        columns: [
          { key: "framework", label: "Framework" },
          { key: "control", label: "Control" },
          { key: "impact", label: "Impact" }
        ],
        rows: context.complianceImpacts.map((impact) => ({
          framework: impact.framework,
          control: impact.control,
          impact: impact.impact
        }))
      },
      {
        id: "verification-commands",
        title: "Verification commands",
        columns: [
          { key: "description", label: "Description" },
          { key: "command", label: "Command" }
        ],
        rows: context.verificationCommands.map((command) => ({
          description: command.description,
          command: command.command
        }))
      },
      {
        id: "remediation-plan",
        title: "Remediation plan",
        columns: [
          { key: "branch", label: "Branch" },
          { key: "approvalRequired", label: "Approval" },
          { key: "maintenanceWindow", label: "Maintenance window" }
        ],
        rows: [
          {
            branch: plan.branch,
            approvalRequired: plan.approvalRequired,
            maintenanceWindow: plan.maintenanceWindow
          }
        ]
      }
    ]
  };
}

export function assertGitOpsPatchBundleShape(bundle: GitOpsPatchBundle): void {
  if (!bundle.patchDiff.includes("kind: NetworkPolicy")) {
    throw new Error("Patch does not contain NetworkPolicy");
  }

  if (!bundle.patchDiff.includes("new file mode 100644")) {
    throw new Error("Patch is not an add-file Git patch");
  }

  if (!bundle.patchDiff.includes("checkout-deny-by-default")) {
    throw new Error("Patch does not create checkout-deny-by-default");
  }

  if (bundle.remediationPlan.schemaVersion !== "dreps-gitops-remediation-plan.v1") {
    throw new Error("Invalid GitOps remediation plan schema");
  }

  if (!bundle.pullRequestBody.includes("## Findings")) {
    throw new Error("PR body missing findings table");
  }

  if (!bundle.pullRequestBody.includes("## Affected nodes")) {
    throw new Error("PR body missing affected nodes table");
  }

  if (!bundle.pullRequestBody.includes("## Compliance impacts")) {
    throw new Error("PR body missing compliance impacts table");
  }

  if (!bundle.pullRequestBody.includes("## Verification commands")) {
    throw new Error("PR body missing verification commands table");
  }

  if (!bundle.pullRequestBody.includes("## Rollback")) {
    throw new Error("PR body missing rollback section");
  }

  if (!bundle.verificationPs1.includes("git apply --check .doctrine/out/gitops-patch/patch.diff")) {
    throw new Error("Verification script does not check patch applicability");
  }

  if (!bundle.rollbackMd.includes("git apply -R .doctrine/out/gitops-patch/patch.diff")) {
    throw new Error("Rollback markdown does not include reverse patch");
  }

  const tableIds = new Set(bundle.jtable.tables.map((table) => table.id));

  for (const required of ["findings", "affected-nodes", "compliance-impacts", "verification-commands"]) {
    if (!tableIds.has(required)) {
      throw new Error("Missing jtable PR table: " + required);
    }
  }
}
