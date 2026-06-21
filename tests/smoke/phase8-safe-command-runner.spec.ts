import { describe, expect, it } from "vitest";
import {
  SafeLogger,
  maskSecrets
} from "../../packages/dreps-safe-logger/src/index.js";
import {
  renderCommandAudit,
  renderCommandForRunbook,
  validateCommandPolicy
} from "../../packages/dreps-command-runner/src/index.js";

describe("phase 8 safe logger and command runner", () => {
  it("masks tokens and passwords in logs", () => {
    const raw =
      "token=ghp_abcdefghijklmnopqrstuvwxyz123456 password=super-secret-password Authorization: Bearer glpat-secret-token";
    const masked = maskSecrets(raw);

    expect(masked).toContain("***REDACTED***");
    expect(masked).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz123456");
    expect(masked).not.toContain("super-secret-password");
    expect(masked).not.toContain("glpat-secret-token");

    const logger = new SafeLogger();
    logger.info(raw);

    const flushed = logger.flushText();

    expect(flushed).toContain("***REDACTED***");
    expect(flushed).not.toContain("super-secret-password");
  });

  it("rejects destructive commands without approval and rollback", () => {
    const issues = validateCommandPolicy({
      id: "danger.delete-root",
      title: "Dangerous delete",
      executable: "rm",
      args: ["-rf", "/"],
      riskLevels: ["destructive"]
    });

    expect(issues.map((issue) => issue.kind)).toContain("destructive_without_approval");
    expect(issues.map((issue) => issue.kind)).toContain("destructive_without_rollback");
  });

  it("requires approval for remote_write commands", () => {
    const issues = validateCommandPolicy({
      id: "git.push",
      title: "Push to remote",
      executable: "git",
      args: ["push"],
      riskLevels: ["remote_write"]
    });

    expect(issues.map((issue) => issue.kind)).toContain("remote_write_without_approval");
  });

  it("requires explicit context for production_risk commands", () => {
    const issues = validateCommandPolicy({
      id: "kubectl.apply.production",
      title: "Apply production manifest",
      executable: "kubectl",
      args: ["apply", "-f", "prod.yaml"],
      riskLevels: ["production_risk", "remote_write"],
      approvalRequired: true
    });

    expect(issues.map((issue) => issue.kind)).toContain("production_context_missing");
  });

  it("renders read_only commands directly for runbooks", () => {
    const rendered = renderCommandForRunbook({
      id: "git.status",
      title: "Git status",
      executable: "git",
      args: ["status", "--short"],
      riskLevels: ["read_only"]
    });

    expect(rendered).toBe("git status --short");
  });

  it("masks credential_sensitive commands in runbook rendering", () => {
    const audit = renderCommandAudit({
      id: "curl.with-token",
      title: "Curl with token",
      executable: "curl",
      args: [
        "-H",
        "Authorization: Bearer ghp_abcdefghijklmnopqrstuvwxyz123456",
        "https://example.test"
      ],
      riskLevels: ["read_only", "credential_sensitive"]
    });

    expect(audit.renderedCommand).toContain("***REDACTED***");
    expect(audit.renderedCommand).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz123456");
    expect(audit.policyIssues).toEqual([]);
  });
});
