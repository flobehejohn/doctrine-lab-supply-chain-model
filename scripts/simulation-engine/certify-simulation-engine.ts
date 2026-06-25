import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertSimulationResultsShape,
  type BeforeAfterScore,
  type SimulationResults
} from "../../packages/dreps-simulation-engine/src/index.js";

const root = process.cwd();

const requiredOutputs = [
  ".doctrine/out/simulation/simulation-results.json",
  ".doctrine/out/simulation/attack-path.mmd",
  ".doctrine/out/simulation/timeline.md",
  ".doctrine/out/simulation/before-after-score.json"
];

for (const file of requiredOutputs) {
  if (!existsSync(resolve(root, file))) {
    throw new Error("Missing simulation output: " + file);
  }
}

const results = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/simulation/simulation-results.json"), "utf8")
) as SimulationResults;

const beforeAfter = JSON.parse(
  readFileSync(resolve(root, ".doctrine/out/simulation/before-after-score.json"), "utf8")
) as BeforeAfterScore;

const attackPath = readFileSync(resolve(root, ".doctrine/out/simulation/attack-path.mmd"), "utf8");
const timeline = readFileSync(resolve(root, ".doctrine/out/simulation/timeline.md"), "utf8");

assertSimulationResultsShape(results);

for (const expected of ["runner_privileged", "registry-prod", "image-auth-service", "pod-auth-api", "db-auth-users"]) {
  if (!attackPath.includes(expected)) {
    throw new Error("Attack path Mermaid is missing: " + expected);
  }
}

if (!timeline.includes("Before remediation") || !timeline.includes("After remediation") || !timeline.includes("Path broken")) {
  throw new Error("Timeline markdown is incomplete");
}

if (!beforeAfter.pathBroken) {
  throw new Error("Before/after score does not mark pathBroken=true");
}

if (beforeAfter.afterScore >= beforeAfter.beforeScore) {
  throw new Error("After score is not lower than before score");
}

console.log("Simulation engine certification passed.");
console.log("results: .doctrine/out/simulation/simulation-results.json");
console.log("attackPath: .doctrine/out/simulation/attack-path.mmd");
console.log("timeline: .doctrine/out/simulation/timeline.md");
console.log("beforeAfterScore: .doctrine/out/simulation/before-after-score.json");
console.log("GitLab runner -> registry -> image -> pod -> DB: yes");
console.log("remediation breaks attack path: yes");
