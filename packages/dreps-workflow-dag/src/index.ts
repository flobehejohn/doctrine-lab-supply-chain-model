import { z } from "zod";

export const WorkflowKindSchema = z.enum([
  "attack_timeline",
  "remediation_workflow",
  "audit_pack_publication",
  "training_workflow"
]);

export const WorkflowJobSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  dependsOn: z.union([z.string(), z.array(z.string())]).optional(),
  commandRef: z.string().optional(),
  runbookRef: z.string().optional(),
  outputs: z.array(z.string()).default([])
});

export const WorkflowSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  kind: WorkflowKindSchema,
  description: z.string().optional(),
  jobs: z.array(WorkflowJobSchema).min(1)
});

export const WorkflowDocumentSchema = z.object({
  workflow: WorkflowSchema
});

export type WorkflowKind = z.infer<typeof WorkflowKindSchema>;
export type WorkflowJob = z.infer<typeof WorkflowJobSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;
export type WorkflowDocument = z.infer<typeof WorkflowDocumentSchema>;

export interface WorkflowValidationResult {
  workflowId: string;
  valid: boolean;
  jobCount: number;
  edgeCount: number;
  topologicalOrder: string[];
  diagnostics: string[];
}

function normalizeDependsOn(dependsOn: WorkflowJob["dependsOn"]): string[] {
  if (!dependsOn) {
    return [];
  }

  if (Array.isArray(dependsOn)) {
    return dependsOn;
  }

  return [dependsOn];
}

function cleanScalar(value: string): string {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseInlineArray(value: string): string[] {
  const trimmed = value.trim();

  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return [cleanScalar(trimmed)];
  }

  const inner = trimmed.slice(1, -1).trim();

  if (!inner) {
    return [];
  }

  return inner
    .split(",")
    .map((item) => cleanScalar(item))
    .filter((item) => item.length > 0);
}

export function parseWorkflowYaml(yaml: string): WorkflowDocument {
  const lines = yaml
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\t/g, "  "))
    .filter((line) => line.trim().length > 0 && !line.trim().startsWith("#"));

  const workflow: Record<string, unknown> = {};
  const jobs: Array<Record<string, unknown>> = [];
  let inWorkflow = false;
  let inJobs = false;
  let currentJob: Record<string, unknown> | undefined;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed === "workflow:") {
      inWorkflow = true;
      inJobs = false;
      continue;
    }

    if (!inWorkflow) {
      continue;
    }

    if (trimmed === "jobs:") {
      inJobs = true;
      continue;
    }

    if (inJobs && trimmed.startsWith("- ")) {
      currentJob = {};
      jobs.push(currentJob);

      const inline = trimmed.slice(2).trim();

      if (inline.includes(":")) {
        const separator = inline.indexOf(":");
        const key = inline.slice(0, separator).trim();
        const value = inline.slice(separator + 1).trim();

        currentJob[key] = key === "dependsOn" ? parseInlineArray(value) : cleanScalar(value);
      }

      continue;
    }

    const separator = trimmed.indexOf(":");

    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();

    if (inJobs && currentJob) {
      if (key === "dependsOn") {
        currentJob[key] = parseInlineArray(value);
      } else if (key === "outputs") {
        currentJob[key] = parseInlineArray(value);
      } else {
        currentJob[key] = cleanScalar(value);
      }

      continue;
    }

    workflow[key] = cleanScalar(value);
  }

  workflow.jobs = jobs;

  return WorkflowDocumentSchema.parse({
    workflow
  });
}

export function validateWorkflow(input: unknown): WorkflowValidationResult {
  const document = WorkflowDocumentSchema.parse(input);
  const workflow = document.workflow;
  const diagnostics: string[] = [];
  const jobIds = new Set<string>();
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const topologicalOrder: string[] = [];

  for (const job of workflow.jobs) {
    if (jobIds.has(job.id)) {
      diagnostics.push("Duplicate job id: " + job.id);
    }

    jobIds.add(job.id);
  }

  const jobsById = new Map(workflow.jobs.map((job) => [job.id, job]));
  let edgeCount = 0;

  for (const job of workflow.jobs) {
    for (const dependency of normalizeDependsOn(job.dependsOn)) {
      edgeCount += 1;

      if (!jobIds.has(dependency)) {
        diagnostics.push("Job " + job.id + " depends on missing job: " + dependency);
      }
    }
  }

  function visit(jobId: string, path: string[]): void {
    if (visited.has(jobId)) {
      return;
    }

    if (visiting.has(jobId)) {
      diagnostics.push("Cycle detected: " + [...path, jobId].join(" -> "));
      return;
    }

    const job = jobsById.get(jobId);

    if (!job) {
      return;
    }

    visiting.add(jobId);

    for (const dependency of normalizeDependsOn(job.dependsOn)) {
      visit(dependency, [...path, jobId]);
    }

    visiting.delete(jobId);
    visited.add(jobId);
    topologicalOrder.push(jobId);
  }

  for (const job of workflow.jobs) {
    visit(job.id, []);
  }

  return {
    workflowId: workflow.id,
    valid: diagnostics.length === 0,
    jobCount: workflow.jobs.length,
    edgeCount,
    topologicalOrder,
    diagnostics
  };
}

export function assertValidWorkflow(input: unknown): WorkflowDocument {
  const document = WorkflowDocumentSchema.parse(input);
  const validation = validateWorkflow(document);

  if (!validation.valid) {
    throw new Error(
      "Workflow " +
        validation.workflowId +
        " is invalid: " +
        validation.diagnostics.join("; ")
    );
  }

  return document;
}

function mermaidId(id: string): string {
  const normalized = id.replace(/[^A-Za-z0-9_]/g, "_");
  return normalized.length > 0 ? normalized : "job";
}

function mermaidLabel(job: WorkflowJob): string {
  return (job.title ?? job.id).replace(/"/g, "'").replace(/\r?\n/g, " ");
}

export function exportWorkflowToMermaid(input: unknown): string {
  const document = assertValidWorkflow(input);
  const workflow = document.workflow;
  const lines = [
    "flowchart TD",
    "  %% workflow: " + workflow.id,
    "  %% kind: " + workflow.kind
  ];

  for (const job of workflow.jobs) {
    lines.push("  " + mermaidId(job.id) + '["' + mermaidLabel(job) + '"]');
  }

  for (const job of workflow.jobs) {
    for (const dependency of normalizeDependsOn(job.dependsOn)) {
      lines.push("  " + mermaidId(dependency) + " --> " + mermaidId(job.id));
    }
  }

  lines.push("");

  return lines.join("\n");
}

export function workflowSummary(input: unknown): string {
  const document = assertValidWorkflow(input);
  const validation = validateWorkflow(document);

  return [
    "workflowId: " + validation.workflowId,
    "kind: " + document.workflow.kind,
    "jobs: " + validation.jobCount,
    "edges: " + validation.edgeCount,
    "topologicalOrder: " + validation.topologicalOrder.join(" -> ")
  ].join("\n");
}
