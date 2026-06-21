import { assertMasked, maskSecrets } from "../../packages/dreps-safe-logger/src/index.js";
import {
  renderCommandForRunbook,
  validateCommandPolicy
} from "../../packages/dreps-command-runner/src/index.js";

const secretCommand =
  "curl -H Authorization: Bearer ghp_abcdefghijklmnopqrstuvwxyz123456 https://example.test?password=super-secret-password";

const masked = maskSecrets(secretCommand);

assertMasked(secretCommand, [
  "ghp_abcdefghijklmnopqrstuvwxyz123456",
  "super-secret-password"
]);

if (!masked.includes("***REDACTED***")) {
  throw new Error("Expected redaction marker in masked log.");
}

const destructiveWithoutApproval = {
  id: "danger.delete-root",
  title: "Dangerous delete",
  executable: "rm",
  args: ["-rf", "/"],
  riskLevels: ["destructive"]
};

const destructiveIssues = validateCommandPolicy(destructiveWithoutApproval);

if (
  !destructiveIssues.some((issue) => issue.kind === "destructive_without_approval") ||
  !destructiveIssues.some((issue) => issue.kind === "destructive_without_rollback")
) {
  throw new Error("Destructive command without approval and rollback must fail policy.");
}

const remoteWriteWithoutApproval = {
  id: "git.push",
  title: "Push to remote",
  executable: "git",
  args: ["push"],
  riskLevels: ["remote_write"]
};

const remoteIssues = validateCommandPolicy(remoteWriteWithoutApproval);

if (!remoteIssues.some((issue) => issue.kind === "remote_write_without_approval")) {
  throw new Error("remote_write command without approval must fail policy.");
}

const productionRiskWithoutContext = {
  id: "kubectl.prod.change",
  title: "Production cluster change",
  executable: "kubectl",
  args: ["apply", "-f", "prod.yaml"],
  riskLevels: ["production_risk", "remote_write"],
  approvalRequired: true
};

const productionIssues = validateCommandPolicy(productionRiskWithoutContext);

if (!productionIssues.some((issue) => issue.kind === "production_context_missing")) {
  throw new Error("production_risk command without explicit context must fail policy.");
}

const readOnlyCommand = {
  id: "git.status",
  title: "Git status",
  executable: "git",
  args: ["status", "--short"],
  riskLevels: ["read_only"]
};

const rendered = renderCommandForRunbook(readOnlyCommand);

if (rendered !== "git status --short") {
  throw new Error("read_only command should render directly in runbook.");
}

console.log("Safe logger and command runner validation passed.");
console.log("masked command: " + masked);
console.log("destructive issues: " + destructiveIssues.map((issue) => issue.kind).join(", "));
console.log("remote issues: " + remoteIssues.map((issue) => issue.kind).join(", "));
console.log("production issues: " + productionIssues.map((issue) => issue.kind).join(", "));
console.log("read_only render: " + rendered);
