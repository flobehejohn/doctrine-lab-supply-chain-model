import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  assertSimulationResultsShape,
  loadSimulationContext,
  renderAttackPathMermaid,
  renderTimelineMarkdown,
  runSimulationSuite
} from "../../packages/dreps-simulation-engine/src/index.js";

const root = process.cwd();

const contextPath = "labs/supply-chain/examples/simulation-engine-fixture/simulation-context.json";

const resultsPath = ".doctrine/out/simulation/simulation-results.json";
const attackPathPath = ".doctrine/out/simulation/attack-path.mmd";
const timelinePath = ".doctrine/out/simulation/timeline.md";
const beforeAfterPath = ".doctrine/out/simulation/before-after-score.json";

const context = loadSimulationContext(resolve(root, contextPath));
const results = runSimulationSuite(context, "compromised-gitlab-runner", ["network-policy-db-egress"]);

assertSimulationResultsShape(results);

const attackPath = renderAttackPathMermaid(results.focusedScenario, context);
const timeline = renderTimelineMarkdown(results.focusedScenario, results.remediatedScenario);

for (const outputPath of [resultsPath, attackPathPath, timelinePath, beforeAfterPath]) {
  mkdirSync(dirname(resolve(root, outputPath)), { recursive: true });
}

writeFileSync(resolve(root, resultsPath), JSON.stringify(results, null, 2) + "\n", "utf8");
writeFileSync(resolve(root, attackPathPath), attackPath, "utf8");
writeFileSync(resolve(root, timelinePath), timeline, "utf8");
writeFileSync(resolve(root, beforeAfterPath), JSON.stringify(results.beforeAfterScore, null, 2) + "\n", "utf8");

console.log("Simulation engine completed.");
console.log("scenarios: " + results.scenarioResults.length);
console.log("focusedScenario: " + results.focusedScenario.scenarioId);
console.log("beforeScore: " + results.beforeAfterScore.beforeScore);
console.log("afterScore: " + results.beforeAfterScore.afterScore);
console.log("pathBroken: " + results.beforeAfterScore.pathBroken);
console.log("results: " + resultsPath);
console.log("attackPath: " + attackPathPath);
console.log("timeline: " + timelinePath);
console.log("beforeAfterScore: " + beforeAfterPath);
