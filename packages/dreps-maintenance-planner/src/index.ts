import { readFileSync } from "node:fs";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type BusinessCriticality = "tier0" | "tier1" | "tier2" | "tier3";

export interface RemediationCommand {
  description: string;
  command: string;
  safeMode?: boolean;
}

export interface RemediationPatch {
  path: string;
  description: string;
  patch: string;
}

export interface RemediationVerification {
  description: string;
  command: string;
  expected: string;
}

export interface RemediationRollback {
  description: string;
  command: string;
}

export interface Remediation {
  id: string;
  findingId: string;
  affectedNodes: string[];
  strategy: string;
  risk: RiskLevel;
  commands: RemediationCommand[];
  patches: RemediationPatch[];
  verification: RemediationVerification[];
  rollback: RemediationRollback[];
  approvalRequired: boolean;
  maintenanceWindow: string;
  evidenceRefs?: string[];
}

export interface RemediationPlan {
  schemaVersion?: string;
  remediations: Remediation[];
}

export interface MaintenanceWindowRule {
  id: string;
  label: string;
  daysFromStart: number;
  startTime: string;
  durationMinutes: number;
  allowedRiskLevels: RiskLevel[];
  destructiveAllowed: boolean;
  approvalRequired: boolean;
}

export interface MaintenanceRules {
  schemaVersion?: string;
  timezone: string;
  planningStartDate: string;
  defaultDurationMinutes: number;
  riskLevelWeights: Record<RiskLevel, number>;
  businessCriticalityWeights: Record<BusinessCriticality, number>;
  earliestStartByRisk: Record<RiskLevel, number>;
  maintenanceWindows: MaintenanceWindowRule[];
  businessCriticality: Record<string, BusinessCriticality>;
  riskLevel: Record<string, RiskLevel>;
}

export interface ScheduledRemediation {
  remediationId: string;
  findingId: string;
  affectedNodes: string[];
  riskLevel: RiskLevel;
  businessCriticality: BusinessCriticality;
  priorityScore: number;
  destructive: boolean;
  approvalRequired: boolean;
  maintenanceWindowRequired: boolean;
  windowId: string;
  windowLabel: string;
  plannedStart: string;
  plannedEnd: string;
  timezone: string;
  strategy: string;
  verificationCommands: string[];
  rollbackCommands: string[];
}

export interface RemediationCalendar {
  schemaVersion: "dreps-remediation-calendar.v1";
  generatedAt: string;
  timezone: string;
  planningStartDate: string;
  items: ScheduledRemediation[];
  summary: {
    total: number;
    critical: number;
    destructive: number;
    approvalRequired: number;
    earliestCriticalFindingId: string;
  };
}

export interface JtablePayload {
  schemaVersion: "jtable.compat.v1";
  title: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string | number | boolean>>;
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function addDays(date: string, days: number): string {
  const current = new Date(date + "T00:00:00.000Z");
  current.setUTCDate(current.getUTCDate() + days);
  return current.toISOString().slice(0, 10);
}

function toIsoLocal(date: string, time: string): string {
  return date + "T" + time + ":00";
}

function addMinutesLocal(dateTime: string, minutes: number): string {
  const parsed = new Date(dateTime + ".000Z");
  parsed.setUTCMinutes(parsed.getUTCMinutes() + minutes);
  return parsed.toISOString().slice(0, 19);
}

function containsDestructiveCommand(remediation: Remediation): boolean {
  const joined = [
    remediation.strategy,
    remediation.maintenanceWindow,
    ...remediation.commands.map((item) => item.command),
    ...remediation.patches.map((item) => item.patch),
    ...remediation.rollback.map((item) => item.command)
  ].join("\n").toLowerCase();

  return (
    joined.includes("delete ") ||
    joined.includes("kubectl delete") ||
    joined.includes("networkpolicy") ||
    joined.includes("deny-by-default") ||
    joined.includes("egress") ||
    joined.includes("git apply -r")
  );
}

function priorityScore(remediation: Remediation, rules: MaintenanceRules): number {
  const risk = rules.riskLevel[remediation.findingId] ?? remediation.risk;
  const criticality = rules.businessCriticality[remediation.findingId] ?? "tier2";
  const destructiveBoost = containsDestructiveCommand(remediation) ? 15 : 0;
  const approvalBoost = remediation.approvalRequired ? 5 : 0;

  return (
    rules.riskLevelWeights[risk] +
    rules.businessCriticalityWeights[criticality] +
    destructiveBoost +
    approvalBoost
  );
}

function chooseWindow(
  remediation: Remediation,
  rules: MaintenanceRules,
  destructive: boolean
): MaintenanceWindowRule {
  const risk = rules.riskLevel[remediation.findingId] ?? remediation.risk;
  const minDays = rules.earliestStartByRisk[risk];

  const candidates = rules.maintenanceWindows
    .filter((window) => window.daysFromStart >= minDays)
    .filter((window) => window.allowedRiskLevels.includes(risk))
    .filter((window) => !destructive || window.destructiveAllowed)
    .filter((window) => !remediation.approvalRequired || window.approvalRequired)
    .sort((left, right) => left.daysFromStart - right.daysFromStart);

  const selected = candidates[0];

  if (!selected) {
    throw new Error("No maintenance window available for remediation: " + remediation.findingId);
  }

  return selected;
}

export function loadRemediationPlan(path: string): RemediationPlan {
  const plan = readJsonFile<RemediationPlan>(path);

  if (!Array.isArray(plan.remediations)) {
    throw new Error("Remediation plan requires remediations");
  }

  return plan;
}

export function loadMaintenanceRules(path: string): MaintenanceRules {
  const rules = readJsonFile<MaintenanceRules>(path);

  if (!Array.isArray(rules.maintenanceWindows)) {
    throw new Error("Maintenance rules require maintenanceWindows");
  }

  return rules;
}

export function buildRemediationCalendar(
  plan: RemediationPlan,
  rules: MaintenanceRules,
  generatedAt = "2026-06-25T00:00:00.000Z"
): RemediationCalendar {
  const sorted = [...plan.remediations].sort((left, right) => {
    const byPriority = priorityScore(right, rules) - priorityScore(left, rules);

    if (byPriority !== 0) {
      return byPriority;
    }

    return left.findingId.localeCompare(right.findingId);
  });

  const items = sorted.map((remediation) => {
    const riskLevel = rules.riskLevel[remediation.findingId] ?? remediation.risk;
    const businessCriticality = rules.businessCriticality[remediation.findingId] ?? "tier2";
    const destructive = containsDestructiveCommand(remediation);
    const window = chooseWindow(remediation, rules, destructive);
    const plannedDate = addDays(rules.planningStartDate, window.daysFromStart);
    const plannedStart = toIsoLocal(plannedDate, window.startTime);
    const plannedEnd = addMinutesLocal(plannedStart, window.durationMinutes);

    return {
      remediationId: remediation.id,
      findingId: remediation.findingId,
      affectedNodes: remediation.affectedNodes,
      riskLevel,
      businessCriticality,
      priorityScore: priorityScore(remediation, rules),
      destructive,
      approvalRequired: remediation.approvalRequired || window.approvalRequired,
      maintenanceWindowRequired: destructive || remediation.maintenanceWindow.toLowerCase().includes("required"),
      windowId: window.id,
      windowLabel: window.label,
      plannedStart,
      plannedEnd,
      timezone: rules.timezone,
      strategy: remediation.strategy,
      verificationCommands: remediation.verification.map((item) => item.command),
      rollbackCommands: remediation.rollback.map((item) => item.command)
    };
  });

  const criticalItems = items.filter((item) => item.riskLevel === "critical");

  return {
    schemaVersion: "dreps-remediation-calendar.v1",
    generatedAt,
    timezone: rules.timezone,
    planningStartDate: rules.planningStartDate,
    items,
    summary: {
      total: items.length,
      critical: criticalItems.length,
      destructive: items.filter((item) => item.destructive).length,
      approvalRequired: items.filter((item) => item.approvalRequired).length,
      earliestCriticalFindingId: criticalItems[0]?.findingId ?? ""
    }
  };
}

export function renderCalendarMarkdown(calendar: RemediationCalendar): string {
  const lines = [
    "# Remediation Calendar",
    "",
    "- Timezone: `" + calendar.timezone + "`",
    "- Planning start: `" + calendar.planningStartDate + "`",
    "- Total remediations: `" + calendar.summary.total + "`",
    "- Critical remediations: `" + calendar.summary.critical + "`",
    "- Destructive remediations: `" + calendar.summary.destructive + "`",
    "",
    "| Planned start | Finding | Risk | Business criticality | Destructive | Window | Approval |",
    "| --- | --- | --- | --- | ---: | --- | ---: |"
  ];

  for (const item of calendar.items) {
    lines.push(
      "| " +
        item.plannedStart +
        " | " +
        item.findingId +
        " | " +
        item.riskLevel +
        " | " +
        item.businessCriticality +
        " | " +
        String(item.destructive) +
        " | " +
        item.windowLabel +
        " | " +
        String(item.approvalRequired) +
        " |"
    );
  }

  lines.push("");
  lines.push("## Verification");
  lines.push("");

  for (const item of calendar.items) {
    lines.push("### `" + item.findingId + "`");
    for (const command of item.verificationCommands) {
      lines.push("- `" + command + "`");
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function toJtablePayload(calendar: RemediationCalendar): JtablePayload {
  return {
    schemaVersion: "jtable.compat.v1",
    title: "Maintenance Planner Calendar",
    columns: [
      { key: "plannedStart", label: "Planned start" },
      { key: "findingId", label: "Finding" },
      { key: "riskLevel", label: "Risk" },
      { key: "businessCriticality", label: "Business criticality" },
      { key: "destructive", label: "Destructive" },
      { key: "windowLabel", label: "Window" },
      { key: "approvalRequired", label: "Approval" }
    ],
    rows: calendar.items.map((item) => ({
      plannedStart: item.plannedStart,
      findingId: item.findingId,
      riskLevel: item.riskLevel,
      businessCriticality: item.businessCriticality,
      destructive: item.destructive,
      windowLabel: item.windowLabel,
      approvalRequired: item.approvalRequired
    }))
  };
}

export function assertMaintenanceCalendarShape(calendar: RemediationCalendar): void {
  if (calendar.schemaVersion !== "dreps-remediation-calendar.v1") {
    throw new Error("Invalid remediation calendar schemaVersion");
  }

  if (calendar.items.length === 0) {
    throw new Error("Calendar is empty");
  }

  const criticalItems = calendar.items.filter((item) => item.riskLevel === "critical");
  const nonCriticalItems = calendar.items.filter((item) => item.riskLevel !== "critical");

  if (criticalItems.length === 0) {
    throw new Error("No critical remediation in calendar");
  }

  if (nonCriticalItems.length > 0) {
    const firstCritical = criticalItems[0]!;
    const firstNonCritical = nonCriticalItems[0]!;

    if (firstCritical.plannedStart > firstNonCritical.plannedStart) {
      throw new Error("Critical remediation is not planned earlier than non-critical remediation");
    }
  }

  for (const item of calendar.items) {
    if (item.destructive && !item.maintenanceWindowRequired) {
      throw new Error("Destructive remediation does not require maintenance window: " + item.findingId);
    }

    if (item.destructive && !item.windowId) {
      throw new Error("Destructive remediation has no maintenance window: " + item.findingId);
    }

    if (item.verificationCommands.length === 0) {
      throw new Error("Scheduled remediation has no verification command: " + item.findingId);
    }

    if (item.rollbackCommands.length === 0) {
      throw new Error("Scheduled remediation has no rollback command: " + item.findingId);
    }
  }
}
