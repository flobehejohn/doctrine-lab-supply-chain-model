import type { EvidencePack } from "@supply-chain-mode-lab/dreps-supplychain-schema";
import type { KubernetesLogImportResult } from "./modeler-types.js";
import { nowIso, slugify } from "./dreps-modeler-utils.js";

type Rule = {
  signal: string;
  severity: EvidencePack["findings"][number]["severity"];
  title: string;
  description: string;
  remediation: string;
  framework: EvidencePack["complianceImpacts"][number]["framework"];
  control: string;
  impact: EvidencePack["complianceImpacts"][number]["impact"];
};

const RULES: Rule[] = [
  { signal: "CrashLoopBackOff", severity: "critical", title: "Pod is in CrashLoopBackOff", description: "The pod restarts repeatedly and may be unavailable.", remediation: "Inspect logs, startup command, env vars, probes and resource limits.", framework: "DORA", control: "operational-resilience", impact: "critical" },
  { signal: "ImagePullBackOff", severity: "high", title: "Pod cannot pull container image", description: "The kubelet cannot pull the configured image.", remediation: "Check image reference, registry reachability and imagePullSecrets.", framework: "SLSA", control: "artifact-availability", impact: "high" },
  { signal: "ErrImagePull", severity: "high", title: "Image pull failed", description: "The runtime failed while pulling the image.", remediation: "Verify image tag, registry trust and credentials.", framework: "SLSA", control: "artifact-integrity", impact: "high" },
  { signal: "BackOff", severity: "medium", title: "Kubernetes reports BackOff", description: "Kubernetes is backing off repeated operation attempts.", remediation: "Inspect events and container status.", framework: "DORA", control: "incident-detection", impact: "medium" },
  { signal: "FailedScheduling", severity: "high", title: "Pod scheduling failed", description: "The scheduler could not place the pod on a node.", remediation: "Check resources, taints, tolerations, affinity and quotas.", framework: "DORA", control: "capacity-management", impact: "high" },
  { signal: "Unhealthy", severity: "high", title: "Kubernetes reports unhealthy workload", description: "A health signal reports the workload as unhealthy.", remediation: "Review probes, readiness and dependency availability.", framework: "DORA", control: "monitoring-detection", impact: "high" },
  { signal: "Readiness probe failed", severity: "high", title: "Readiness probe failed", description: "The workload is not ready to receive traffic.", remediation: "Fix readiness endpoint, dependencies or startup timing.", framework: "DORA", control: "service-continuity", impact: "high" },
  { signal: "Liveness probe failed", severity: "high", title: "Liveness probe failed", description: "The workload is failing liveness checks.", remediation: "Fix liveness endpoint and application runtime health.", framework: "DORA", control: "service-continuity", impact: "high" },
  { signal: "CreateContainerConfigError", severity: "high", title: "Container configuration error", description: "Kubernetes cannot create the container from its configuration.", remediation: "Check ConfigMaps, Secrets, env vars and volume mounts.", framework: "NIS2", control: "secure-configuration", impact: "high" },
  { signal: "OOMKilled", severity: "high", title: "Container was OOMKilled", description: "The container exceeded memory limits.", remediation: "Review memory requests, limits and application usage.", framework: "DORA", control: "capacity-management", impact: "high" }
];

function readValue(log: string, label: string): string | undefined {
  const regex = new RegExp(`^\\s*${label}:\\s*(.+)$`, "im");
  return log.match(regex)?.[1]?.trim();
}

function readImage(log: string): string | undefined {
  return readValue(log, "Image") ?? log.match(/image\s+"([^"]+)"/i)?.[1];
}

export function importKubernetesLog(log: string): KubernetesLogImportResult {
  const rawLog = log.trim();

  if (!rawLog) {
    throw new Error("Le log Kubernetes est vide.");
  }

  const podName = readValue(rawLog, "Name") ?? "unknown-pod";
  const namespace = readValue(rawLog, "Namespace") ?? "default";
  const image = readImage(rawLog) ?? "unknown-image";
  const workload = podName.replace(/-[a-z0-9]{5,10}$/i, "");

  const podSlug = slugify(podName) || "unknown-pod";
  const nsSlug = slugify(namespace) || "default";
  const workloadSlug = slugify(workload) || podSlug;
  const imageSlug = slugify(image.replace(/[/:@.]/g, "-")) || "unknown-image";

  const rules = RULES.filter((rule) => rawLog.toLowerCase().includes(rule.signal.toLowerCase()));
  const detectedSignals = Array.from(new Set(rules.map((rule) => rule.signal)));

  const evidenceId = `evidence-k8s-log-${podSlug}`;
  const nsNode = `ns-${nsSlug}`;
  const workloadNode = `workload-${workloadSlug}`;
  const podNode = `pod-${podSlug}`;
  const imageNode = `image-${imageSlug}`;
  const svcNode = `svc-${workloadSlug}`;

  const findings: EvidencePack["findings"] = rules.map((rule, index) => ({
    id: `finding-${slugify(rule.signal)}-${podSlug}-${index}`,
    title: rule.title,
    severity: rule.severity,
    status: "open",
    affectedNodes: [podNode],
    evidenceRefs: [evidenceId],
    description: rule.description,
    metadata: { signal: rule.signal, generatedBy: "kubernetes-log-importer" }
  }));

  const remediations: EvidencePack["remediations"] = findings.map((finding, index) => ({
    id: `remediate-${finding.id}`,
    findingId: finding.id,
    affectedNodes: finding.affectedNodes,
    strategy: rules[index]?.remediation ?? "Investigate Kubernetes event.",
    risk: finding.severity === "critical" ? "high" : "medium",
    commands: [],
    approvalRequired: true,
    verification: {
      expectedOutcome: "The Kubernetes event is no longer present and the pod is healthy.",
      commands: [
        {
          id: `cmd-verify-${finding.id}`,
          description: "Verify pod health.",
          command: `kubectl describe pod ${podName} -n ${namespace}`,
          riskLevel: "read_only",
          approvalRequired: false
        }
      ]
    },
    rollback: {
      description: "Rollback to previous workload revision.",
      commands: [
        {
          id: `cmd-rollback-${finding.id}`,
          description: "Rollback Kubernetes deployment.",
          command: `kubectl rollout undo deployment/${workload} -n ${namespace}`,
          riskLevel: "remote_write",
          approvalRequired: true
        }
      ]
    },
    metadata: { generatedBy: "kubernetes-log-importer" }
  }));

  const complianceImpacts: EvidencePack["complianceImpacts"] = findings.map((finding, index) => ({
    id: `impact-${finding.id}`,
    framework: rules[index]?.framework ?? "DORA",
    control: rules[index]?.control ?? "runtime-risk",
    impact: rules[index]?.impact ?? "medium",
    findingRefs: [finding.id],
    affectedNodes: finding.affectedNodes,
    rationale: `Detected Kubernetes signal ${rules[index]?.signal ?? "unknown"} from pasted log.`
  }));

  const pack: EvidencePack = {
    schemaVersion: "dreps.supplychain.v1",
    packId: `kubernetes-log-${podSlug}`,
    createdAt: nowIso(),
    mode: "imported",
    nodes: [
      { id: nsNode, type: "k8s_namespace", name: namespace, criticality: "high", metadata: { importedFrom: "kubernetes-log" } },
      { id: workloadNode, type: "k8s_workload", name: workload, criticality: "high", metadata: { inferred: true } },
      { id: podNode, type: "k8s_pod", name: podName, criticality: rules.length > 0 ? "critical" : "high", metadata: { namespace, image, detectedSignals, rawLogPreview: rawLog.slice(0, 1200) } },
      { id: imageNode, type: "container_image", name: image, criticality: "high", metadata: { importedFrom: "kubernetes-log" } },
      { id: svcNode, type: "k8s_service", name: `${workload} service`, criticality: "medium", metadata: { inferred: true } }
    ],
    edges: [
      { id: `edge-${nsNode}-${workloadNode}`, type: "contains", source: nsNode, target: workloadNode, metadata: {} },
      { id: `edge-${workloadNode}-${podNode}`, type: "contains", source: workloadNode, target: podNode, metadata: {} },
      { id: `edge-${imageNode}-${podNode}`, type: "deploys", source: imageNode, target: podNode, metadata: {} },
      { id: `edge-${svcNode}-${podNode}`, type: "routes_to", source: svcNode, target: podNode, metadata: {} }
    ],
    evidence: [
      {
        id: evidenceId,
        type: "runtime_observation",
        source: "pasted kubernetes log",
        createdAt: nowIso(),
        metadata: { podName, namespace, image, detectedSignals, rawLog }
      }
    ],
    findings,
    remediations,
    complianceImpacts,
    documentation: [],
    simulations: [],
    commandRefs: [],
    runbooks: [],
    workflows: [],
    graphMetrics: { detectedSignalCount: detectedSignals.length },
    toolchain: { importer: "phase-37a-kubernetes-log-importer" },
    provenance: { source: "pasted-kubernetes-log", generatedBy: "SupplyChainModeler" }
  };

  return {
    pack,
    detectedSignals,
    warnings: rules.length === 0 ? ["Aucun signal Kubernetes connu détecté."] : []
  };
}
