import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertSimulationResultsShape,
  loadSimulationContext,
  renderAttackPathMermaid,
  renderTimelineMarkdown,
  runSimulationSuite,
  simulateScenario,
  SimulationScenarioIds
} from "../../packages/dreps-simulation-engine/src/index.js";

const contextPath = resolve("labs/supply-chain/examples/simulation-engine-fixture/simulation-context.json");

function contextForTest() {
  return loadSimulationContext(contextPath);
}

describe("phase 30 simulation engine", () => {
  it("declares all expected simulation scenarios", () => {
    const context = contextForTest();
    const ids = new Set(context.scenarios.map((scenario) => scenario.id));

    for (const scenarioId of SimulationScenarioIds) {
      expect(ids.has(scenarioId)).toBe(true);
    }
  });

  it("simulates GitLab runner -> registry -> image -> pod -> DB", () => {
    const context = contextForTest();
    const run = simulateScenario(context, "compromised-gitlab-runner", []);

    expect(run.attackPath.nodeIds).toContain("runner_privileged");
    expect(run.attackPath.nodeIds).toContain("registry-prod");
    expect(run.attackPath.nodeIds).toContain("image-auth-service");
    expect(run.attackPath.nodeIds).toContain("pod-auth-api");
    expect(run.attackPath.nodeIds).toContain("db-auth-users");
    expect(run.reachedTargets).toContain("db-auth-users");
  });

  it("breaks the DB attack path after remediation", () => {
    const context = contextForTest();
    const results = runSimulationSuite(context, "compromised-gitlab-runner", ["network-policy-db-egress"]);

    expect(results.beforeAfterScore.beforeReachedTargets).toContain("db-auth-users");
    expect(results.beforeAfterScore.afterReachedTargets).not.toContain("db-auth-users");
    expect(results.beforeAfterScore.pathBroken).toBe(true);
    expect(results.beforeAfterScore.afterScore).toBeLessThan(results.beforeAfterScore.beforeScore);
  });

  it("renders Mermaid and timeline outputs", () => {
    const context = contextForTest();
    const results = runSimulationSuite(context, "compromised-gitlab-runner", ["network-policy-db-egress"]);

    const mermaid = renderAttackPathMermaid(results.focusedScenario, context);
    const timeline = renderTimelineMarkdown(results.focusedScenario, results.remediatedScenario);

    expect(mermaid).toContain("flowchart TD");
    expect(mermaid).toContain("runner_privileged");
    expect(mermaid).toContain("db-auth-users");
    expect(timeline).toContain("Before remediation");
    expect(timeline).toContain("After remediation");
    expect(timeline).toContain("Path broken");
  });

  it("asserts simulation results shape", () => {
    const context = contextForTest();
    const results = runSimulationSuite(context, "compromised-gitlab-runner", ["network-policy-db-egress"]);

    expect(results.schemaVersion).toBe("dreps-simulation-results.v1");
    assertSimulationResultsShape(results);
  });

  it("declares simulation scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["simulation:run"]).toContain("run-simulation.ts");
    expect(pkg.scripts["simulation:certify"]).toContain("certify-simulation-engine.ts");
    expect(pkg.scripts["supplychain:certify"]).toContain("simulation:certify");
  });
});
