import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
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

const root = process.cwd();

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(root, path), "utf8")) as unknown;
}

function loadCatalogs(): OperatorCommandCatalog[] {
  const dir = resolve(root, "cookbook/commands");
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".commands.json"))
    .sort();

  return files.map((file) => {
    const relativePath = join("cookbook/commands", file);
    const parsed = OperatorCommandCatalogSchema.safeParse(readJson(relativePath));

    if (!parsed.success) {
      throw new Error("Invalid command catalog: " + relativePath + "\n" + JSON.stringify(parsed.error.issues, null, 2));
    }

    return parsed.data;
  });
}

const pack = EvidencePackSchema.parse(
  readJson("labs/supply-chain/examples/ecommerce/evidence-pack.json")
);

const catalogs = loadCatalogs();

const runbookIndex = OperatorRunbookIndexSchema.parse(
  readJson("cookbook/runbooks/runbook-index.json")
);

for (const runbook of runbookIndex.runbooks) {
  if (!existsSync(resolve(root, runbook.path))) {
    throw new Error("Runbook file missing: " + runbook.path);
  }
}

const issues = validateFindingOperatorLinks(pack, catalogs, runbookIndex);

if (issues.length > 0) {
  console.error("Operator cookbook validation failed.");
  console.error(JSON.stringify(issues, null, 2));
  process.exit(1);
}

const links = buildFindingOperatorLinks(pack, catalogs, runbookIndex);
const commandCount = catalogs.reduce((total, catalog) => total + catalog.commands.length, 0);

console.log("Operator cookbook validation passed.");
console.log("catalogs: " + catalogs.length);
console.log("commands: " + commandCount);
console.log("runbooks: " + runbookIndex.runbooks.length);
console.log("finding links: " + links.length);

for (const link of links) {
  console.log(
    [
      "-",
      link.findingId,
      "commands=" + link.commandIds.length,
      "runbooks=" + link.runbookIds.length,
      "verification=" + link.verificationCommandIds.length,
      "rollback=" + link.rollbackCommandIds.length
    ].join(" ")
  );
}
