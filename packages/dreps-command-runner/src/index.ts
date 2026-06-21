import { spawn } from "node:child_process";
import { z } from "zod";
import { maskSecrets } from "../../dreps-safe-logger/src/index.js";

export const CommandRiskLevelSchema = z.enum([
  "read_only",
  "local_write",
  "remote_write",
  "destructive",
  "credential_sensitive",
  "production_risk"
]);

export const CommandRollbackSchema = z.object({
  executable: z.string().min(1),
  args: z.array(z.string()).default([]),
  description: z.string().min(1)
});

export const SafeCommandSpecSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  executable: z.string().min(1),
  args: z.array(z.string()).default([]),
  riskLevels: z.array(CommandRiskLevelSchema).min(1),
  approvalRequired: z.boolean().default(false),
  approvalId: z.string().optional(),
  rollback: CommandRollbackSchema.optional(),
  productionContext: z.string().optional(),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.string()).default({}),
  allowExecution: z.boolean().default(false)
});

export type CommandRiskLevel = z.infer<typeof CommandRiskLevelSchema>;
export type SafeCommandSpec = z.infer<typeof SafeCommandSpecSchema>;

export interface CommandPolicyIssue {
  kind:
    | "remote_write_without_approval"
    | "destructive_without_approval"
    | "destructive_without_rollback"
    | "production_context_missing";
  commandId: string;
  message: string;
}

export interface CommandRenderResult {
  commandId: string;
  title: string;
  renderedCommand: string;
  riskLevels: CommandRiskLevel[];
  approvalRequired: boolean;
  hasRollback: boolean;
  policyIssues: CommandPolicyIssue[];
}

export interface CommandExecutionResult {
  commandId: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export function parseSafeCommandSpec(input: unknown): SafeCommandSpec {
  return SafeCommandSpecSchema.parse(input);
}

export function validateCommandPolicy(input: unknown): CommandPolicyIssue[] {
  const spec = parseSafeCommandSpec(input);
  const risks = new Set(spec.riskLevels);
  const issues: CommandPolicyIssue[] = [];

  if (risks.has("remote_write") && !spec.approvalRequired) {
    issues.push({
      kind: "remote_write_without_approval",
      commandId: spec.id,
      message: "remote_write commands require approvalRequired=true."
    });
  }

  if (risks.has("destructive") && !spec.approvalRequired) {
    issues.push({
      kind: "destructive_without_approval",
      commandId: spec.id,
      message: "destructive commands require approvalRequired=true."
    });
  }

  if (risks.has("destructive") && !spec.rollback) {
    issues.push({
      kind: "destructive_without_rollback",
      commandId: spec.id,
      message: "destructive commands require a rollback command."
    });
  }

  if (
    risks.has("production_risk") &&
    (!spec.productionContext || spec.productionContext.trim().length < 8)
  ) {
    issues.push({
      kind: "production_context_missing",
      commandId: spec.id,
      message: "production_risk commands require an explicit productionContext."
    });
  }

  return issues;
}

export function assertCommandPolicy(input: unknown): SafeCommandSpec {
  const spec = parseSafeCommandSpec(input);
  const issues = validateCommandPolicy(spec);

  if (issues.length > 0) {
    throw new Error(
      "Command policy rejected " +
        spec.id +
        ": " +
        issues.map((issue) => issue.kind).join(", ")
    );
  }

  return spec;
}

function quoteArg(value: string): string {
  if (/^[A-Za-z0-9_./:@=%+-]+$/.test(value)) {
    return value;
  }

  return JSON.stringify(value);
}

export function renderCommandForRunbook(input: unknown): string {
  const spec = parseSafeCommandSpec(input);
  const rendered = [spec.executable, ...spec.args].map(quoteArg).join(" ");
  return maskSecrets(rendered);
}

export function renderCommandAudit(input: unknown): CommandRenderResult {
  const spec = parseSafeCommandSpec(input);

  return {
    commandId: spec.id,
    title: spec.title,
    renderedCommand: renderCommandForRunbook(spec),
    riskLevels: spec.riskLevels,
    approvalRequired: spec.approvalRequired,
    hasRollback: Boolean(spec.rollback),
    policyIssues: validateCommandPolicy(spec)
  };
}

export async function executeCommand(
  input: unknown,
  options: { allowExecution?: boolean } = {}
): Promise<CommandExecutionResult> {
  const spec = assertCommandPolicy(input);

  if (!spec.allowExecution && !options.allowExecution) {
    throw new Error(
      "Execution disabled for " +
        spec.id +
        ". Render or document the command instead, or pass explicit allowExecution."
    );
  }

  return await new Promise<CommandExecutionResult>((resolve, reject) => {
    const child = spawn(spec.executable, spec.args, {
      cwd: spec.cwd,
      env: {
        ...process.env,
        ...spec.env
      },
      shell: false
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on("error", reject);

    child.on("close", (exitCode) => {
      resolve({
        commandId: spec.id,
        exitCode,
        stdout: maskSecrets(Buffer.concat(stdoutChunks).toString("utf8")),
        stderr: maskSecrets(Buffer.concat(stderrChunks).toString("utf8"))
      });
    });
  });
}
