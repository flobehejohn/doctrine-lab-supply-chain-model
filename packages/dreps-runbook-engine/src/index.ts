import { z } from "zod";
import type { EvidencePack, Finding } from "../../dreps-supplychain-schema/src/index.js";
import {
  buildCommandById,
  type OperatorCommand,
  type OperatorCommandCatalog
} from "../../dreps-command-catalog/src/index.js";

export const OperatorRunbookSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  path: z.string().min(1),
  relatedFindingIds: z.array(z.string()).default([]),
  commandIds: z.array(z.string()).default([]),
  verificationCommandIds: z.array(z.string()).default([]),
  rollbackCommandIds: z.array(z.string()).default([])
});

export const OperatorRunbookIndexSchema = z.object({
  schemaVersion: z.literal("operator.runbook-index.v1"),
  runbooks: z.array(OperatorRunbookSchema)
});

export type OperatorRunbook = z.infer<typeof OperatorRunbookSchema>;
export type OperatorRunbookIndex = z.infer<typeof OperatorRunbookIndexSchema>;

export interface FindingOperatorRefs {
  commandIds: string[];
  runbookIds: string[];
  verificationCommandIds: string[];
  rollbackCommandIds: string[];
}

export interface FindingOperatorLink {
  findingId: string;
  commandIds: string[];
  runbookIds: string[];
  verificationCommandIds: string[];
  rollbackCommandIds: string[];
  commands: OperatorCommand[];
  runbooks: OperatorRunbook[];
  missingCommandIds: string[];
  missingRunbookIds: string[];
}

export interface OperatorCookbookIssue {
  kind:
    | "finding_without_operator_metadata"
    | "missing_command"
    | "missing_runbook"
    | "missing_verification_command"
    | "missing_rollback_command";
  findingId: string;
  refId: string;
  message: string;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export function readFindingOperatorRefs(finding: Finding): FindingOperatorRefs {
  const metadata = asRecord(finding.metadata);
  const operator = metadata ? asRecord(metadata.operator) : undefined;

  if (!operator) {
    return {
      commandIds: [],
      runbookIds: [],
      verificationCommandIds: [],
      rollbackCommandIds: []
    };
  }

  return {
    commandIds: asStringArray(operator.commandIds),
    runbookIds: asStringArray(operator.runbookIds),
    verificationCommandIds: asStringArray(operator.verificationCommandIds),
    rollbackCommandIds: asStringArray(operator.rollbackCommandIds)
  };
}

export function buildRunbookById(
  index: OperatorRunbookIndex
): Map<string, OperatorRunbook> {
  const runbooks = new Map<string, OperatorRunbook>();

  for (const runbook of index.runbooks) {
    runbooks.set(runbook.id, runbook);
  }

  return runbooks;
}

export function buildFindingOperatorLinks(
  pack: EvidencePack,
  catalogs: OperatorCommandCatalog[],
  runbookIndex: OperatorRunbookIndex
): FindingOperatorLink[] {
  const commandById = buildCommandById(catalogs);
  const runbookById = buildRunbookById(runbookIndex);

  return pack.findings.map((finding) => {
    const refs = readFindingOperatorRefs(finding);

    const allCommandIds = Array.from(
      new Set([
        ...refs.commandIds,
        ...refs.verificationCommandIds,
        ...refs.rollbackCommandIds
      ])
    );

    const commands = allCommandIds
      .map((commandId) => commandById.get(commandId))
      .filter((command): command is OperatorCommand => command !== undefined);

    const runbooks = refs.runbookIds
      .map((runbookId) => runbookById.get(runbookId))
      .filter((runbook): runbook is OperatorRunbook => runbook !== undefined);

    const missingCommandIds = allCommandIds.filter(
      (commandId) => !commandById.has(commandId)
    );

    const missingRunbookIds = refs.runbookIds.filter(
      (runbookId) => !runbookById.has(runbookId)
    );

    return {
      findingId: finding.id,
      commandIds: refs.commandIds,
      runbookIds: refs.runbookIds,
      verificationCommandIds: refs.verificationCommandIds,
      rollbackCommandIds: refs.rollbackCommandIds,
      commands,
      runbooks,
      missingCommandIds,
      missingRunbookIds
    };
  });
}

export function validateFindingOperatorLinks(
  pack: EvidencePack,
  catalogs: OperatorCommandCatalog[],
  runbookIndex: OperatorRunbookIndex
): OperatorCookbookIssue[] {
  const links = buildFindingOperatorLinks(pack, catalogs, runbookIndex);
  const issues: OperatorCookbookIssue[] = [];

  for (const link of links) {
    if (
      link.commandIds.length === 0 ||
      link.runbookIds.length === 0 ||
      link.verificationCommandIds.length === 0 ||
      link.rollbackCommandIds.length === 0
    ) {
      issues.push({
        kind: "finding_without_operator_metadata",
        findingId: link.findingId,
        refId: link.findingId,
        message: "Finding must point to commands, runbooks, verification commands and rollback commands."
      });
    }

    for (const commandId of link.missingCommandIds) {
      issues.push({
        kind: "missing_command",
        findingId: link.findingId,
        refId: commandId,
        message: "Finding references a missing command: " + commandId
      });
    }

    for (const runbookId of link.missingRunbookIds) {
      issues.push({
        kind: "missing_runbook",
        findingId: link.findingId,
        refId: runbookId,
        message: "Finding references a missing runbook: " + runbookId
      });
    }

    for (const verificationCommandId of link.verificationCommandIds) {
      if (!link.commands.some((command) => command.id === verificationCommandId)) {
        issues.push({
          kind: "missing_verification_command",
          findingId: link.findingId,
          refId: verificationCommandId,
          message: "Finding references a missing verification command: " + verificationCommandId
        });
      }
    }

    for (const rollbackCommandId of link.rollbackCommandIds) {
      if (!link.commands.some((command) => command.id === rollbackCommandId)) {
        issues.push({
          kind: "missing_rollback_command",
          findingId: link.findingId,
          refId: rollbackCommandId,
          message: "Finding references a missing rollback command: " + rollbackCommandId
        });
      }
    }
  }

  return issues;
}
