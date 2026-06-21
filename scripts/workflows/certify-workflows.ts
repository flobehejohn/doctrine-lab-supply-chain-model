import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, resolve } from "node:path";
import {
  assertValidWorkflow,
  exportWorkflowToMermaid,
  parseWorkflowYaml,
  validateWorkflow,
  workflowSummary
} from "../../packages/dreps-workflow-dag/src/index.js";

const root = process.cwd();
const workflowDir = resolve(root, "workflows");
const outDir = resolve(root, ".doctrine/out/workflows");

if (!existsSync(workflowDir)) {
  throw new Error("workflows directory is missing.");
}

mkdirSync(outDir, { recursive: true });

const workflowFiles = readdirSync(workflowDir)
  .filter((file) => file.endsWith(".workflow.yml"))
  .sort();

if (workflowFiles.length === 0) {
  throw new Error("No workflow YAML file found.");
}

const index: Array<{
  workflowId: string;
  kind: string;
  source: string;
  validatedJson: string;
  mermaid: string;
  jobCount: number;
  edgeCount: number;
  topologicalOrder: string[];
}> = [];

for (const file of workflowFiles) {
  const sourcePath = resolve(workflowDir, file);
  const source = readFileSync(sourcePath, "utf8");
  const document = assertValidWorkflow(parseWorkflowYaml(source));
  const validation = validateWorkflow(document);

  const workflowId = document.workflow.id;
  const baseName = workflowId.replace(/[^A-Za-z0-9_.-]/g, "-");
  const jsonOutput = resolve(outDir, baseName + ".validated.json");
  const mermaidOutput = resolve(outDir, baseName + ".mmd");

  const mermaid = exportWorkflowToMermaid(document);

  writeFileSync(jsonOutput, JSON.stringify(document, null, 2) + "\n", "utf8");
  writeFileSync(mermaidOutput, mermaid, "utf8");

  if (!mermaid.includes("flowchart TD")) {
    throw new Error("Mermaid export missing flowchart TD for " + workflowId);
  }

  index.push({
    workflowId,
    kind: document.workflow.kind,
    source: "workflows/" + file,
    validatedJson: ".doctrine/out/workflows/" + basename(jsonOutput),
    mermaid: ".doctrine/out/workflows/" + basename(mermaidOutput),
    jobCount: validation.jobCount,
    edgeCount: validation.edgeCount,
    topologicalOrder: validation.topologicalOrder
  });

  console.log("Workflow validated.");
  console.log(workflowSummary(document));
  console.log("- " + ".doctrine/out/workflows/" + basename(jsonOutput));
  console.log("- " + ".doctrine/out/workflows/" + basename(mermaidOutput));
}

const indexPath = resolve(outDir, "index.json");
writeFileSync(
  indexPath,
  JSON.stringify(
    {
      schemaVersion: "workflow-dag.index.v1",
      generatedAt: new Date().toISOString(),
      workflows: index
    },
    null,
    2
  ) + "\n",
  "utf8"
);

if (!existsSync(indexPath)) {
  throw new Error("Workflow index was not generated.");
}

console.log("Workflow DAG certification passed.");
console.log("workflows: " + index.length);
console.log("index: .doctrine/out/workflows/index.json");
