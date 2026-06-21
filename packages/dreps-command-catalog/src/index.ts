import { z } from "zod";

export const OperatorShellSchema = z.enum([
  "bash",
  "powershell",
  "git",
  "gitlab",
  "gitlab-runner",
  "kubectl",
  "jq",
  "registry",
  "text"
]);

export const OperatorRiskLevelSchema = z.enum([
  "safe",
  "low",
  "medium",
  "high"
]);

export const OperatorVerificationSchema = z.object({
  command: z.string().min(1),
  expected: z.string().min(1)
});

export const OperatorRollbackSchema = z.object({
  command: z.string().min(1),
  description: z.string().min(1)
});

export const OperatorCommandSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  command: z.string().min(1),
  shell: OperatorShellSchema,
  riskLevel: OperatorRiskLevelSchema,
  tags: z.array(z.string()).default([]),
  runbookRefs: z.array(z.string()).default([]),
  verification: OperatorVerificationSchema,
  rollback: OperatorRollbackSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const OperatorCommandCatalogSchema = z.object({
  catalogId: z.string().min(1),
  title: z.string().min(1),
  commands: z.array(OperatorCommandSchema)
});

export type OperatorCommand = z.infer<typeof OperatorCommandSchema>;
export type OperatorCommandCatalog = z.infer<typeof OperatorCommandCatalogSchema>;

export function flattenCommandCatalogs(
  catalogs: OperatorCommandCatalog[]
): OperatorCommand[] {
  return catalogs.flatMap((catalog) => catalog.commands);
}

export function buildCommandById(
  catalogs: OperatorCommandCatalog[]
): Map<string, OperatorCommand> {
  const commands = new Map<string, OperatorCommand>();

  for (const command of flattenCommandCatalogs(catalogs)) {
    commands.set(command.id, command);
  }

  return commands;
}

export function findCommandById(
  catalogs: OperatorCommandCatalog[],
  commandId: string
): OperatorCommand | undefined {
  return buildCommandById(catalogs).get(commandId);
}
