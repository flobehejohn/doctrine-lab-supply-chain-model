import type { EvidencePack } from "@supply-chain-mode-lab/dreps-supplychain-schema";
import type { SupplyChainTemplate } from "./modeler-types.js";
import { nowIso } from "./dreps-modeler-utils.js";

type Node = EvidencePack["nodes"][number];
type Edge = EvidencePack["edges"][number];

type FindingSeed = {
  id: string;
  title: string;
  severity: EvidencePack["findings"][number]["severity"];
  affectedNodes: string[];
  description: string;
  framework: EvidencePack["complianceImpacts"][number]["framework"];
  control: string;
  impact: EvidencePack["complianceImpacts"][number]["impact"];
};

function makeTemplate(
  id: string,
  title: string,
  category: string,
  summary: string,
  nodes: Node[],
  edges: Edge[],
  finding?: FindingSeed
): SupplyChainTemplate {
  const evidenceId = `evidence-${id}`;

  const pack: EvidencePack = {
    schemaVersion: "dreps.supplychain.v1",
    packId: id,
    createdAt: nowIso(),
    mode: "simulated",
    nodes,
    edges,
    evidence: [
      {
        id: evidenceId,
        type: "manual_attestation",
        source: `Template: ${title}`,
        createdAt: nowIso(),
        metadata: { templateId: id }
      }
    ],
    findings: finding
      ? [
          {
            id: finding.id,
            title: finding.title,
            severity: finding.severity,
            status: "open",
            affectedNodes: finding.affectedNodes,
            evidenceRefs: [evidenceId],
            description: finding.description,
            metadata: { templateId: id }
          }
        ]
      : [],
    remediations: finding
      ? [
          {
            id: `remediate-${finding.id}`,
            findingId: finding.id,
            affectedNodes: finding.affectedNodes,
            strategy: "Créer un patch GitOps contextualisé, vérifier le résultat et documenter le rollback.",
            risk: finding.severity === "critical" ? "high" : "medium",
            commands: [],
            approvalRequired: true,
            verification: {
              expectedOutcome: "Le finding n’est plus présent après remédiation.",
              commands: [
                {
                  id: `cmd-verify-${finding.id}`,
                  description: "Revalider le modèle et les preuves.",
                  command: "pnpm supplychain:validate -- --input apps/web/public/evidence-pack.json",
                  riskLevel: "read_only",
                  approvalRequired: false
                }
              ]
            },
            rollback: {
              description: "Revenir au manifeste précédent si la remédiation casse le service.",
              commands: [
                {
                  id: `cmd-rollback-${finding.id}`,
                  description: "Rollback GitOps.",
                  command: "git revert HEAD",
                  riskLevel: "local_write",
                  approvalRequired: true
                }
              ]
            },
            metadata: { templateId: id }
          }
        ]
      : [],
    complianceImpacts: finding
      ? [
          {
            id: `impact-${finding.id}`,
            framework: finding.framework,
            control: finding.control,
            impact: finding.impact,
            findingRefs: [finding.id],
            affectedNodes: finding.affectedNodes,
            rationale: `Impact généré depuis le template ${title}.`
          }
        ]
      : [],
    documentation: [],
    simulations: [],
    commandRefs: [],
    runbooks: [],
    workflows: [],
    graphMetrics: {},
    toolchain: { modeler: "phase-37a-template-library" },
    provenance: { source: "template-library", generatedBy: "SupplyChainModeler" }
  };

  return { id, title, category, summary, pack };
}

export const SUPPLY_CHAIN_TEMPLATES: SupplyChainTemplate[] = [
  makeTemplate(
    "template-gitlab-runner-kubernetes",
    "GitLab -> Runner -> Image -> Registry -> Kubernetes",
    "CI/CD",
    "Chaîne GitLab complète avec runner, image, registry et runtime Kubernetes.",
    [
      { id: "repo-app", type: "repository", name: "Application repository", criticality: "high", metadata: {} },
      { id: "gitlab-project", type: "gitlab_project", name: "GitLab project", criticality: "high", metadata: {} },
      { id: "ci-pipeline", type: "ci_pipeline", name: "GitLab CI pipeline", criticality: "high", metadata: {} },
      { id: "gitlab-runner", type: "gitlab_runner", name: "Docker GitLab runner", criticality: "critical", metadata: { privileged: true } },
      { id: "image-app", type: "container_image", name: "Application image", criticality: "critical", metadata: { signed: false } },
      { id: "registry-gitlab", type: "registry", name: "GitLab registry", criticality: "high", metadata: {} },
      { id: "k8s-cluster", type: "k8s_cluster", name: "Production cluster", criticality: "critical", metadata: {} },
      { id: "namespace-prod", type: "k8s_namespace", name: "prod namespace", criticality: "critical", metadata: {} },
      { id: "pod-app", type: "k8s_pod", name: "application pod", criticality: "critical", metadata: {} }
    ],
    [
      { id: "e-project-repo", type: "contains", source: "gitlab-project", target: "repo-app", metadata: {} },
      { id: "e-repo-pipeline", type: "triggers", source: "repo-app", target: "ci-pipeline", metadata: {} },
      { id: "e-pipeline-runner", type: "runs_on", source: "ci-pipeline", target: "gitlab-runner", metadata: {} },
      { id: "e-runner-image", type: "builds", source: "gitlab-runner", target: "image-app", metadata: {} },
      { id: "e-image-registry", type: "publishes", source: "image-app", target: "registry-gitlab", metadata: {} },
      { id: "e-registry-cluster", type: "deploys", source: "registry-gitlab", target: "k8s-cluster", metadata: {} },
      { id: "e-cluster-namespace", type: "contains", source: "k8s-cluster", target: "namespace-prod", metadata: {} },
      { id: "e-namespace-pod", type: "contains", source: "namespace-prod", target: "pod-app", metadata: {} }
    ],
    {
      id: "finding-runner-privileged",
      title: "GitLab runner uses privileged execution",
      severity: "high",
      affectedNodes: ["gitlab-runner"],
      description: "Privileged runner increases supply-chain blast radius.",
      framework: "SLSA",
      control: "build-isolation",
      impact: "high"
    }
  ),

  makeTemplate(
    "template-github-actions-registry-cluster",
    "GitHub Actions -> Image -> Registry -> Cluster",
    "CI/CD",
    "Chaîne GitHub Actions vers image, registry et cluster.",
    [
      { id: "repo-github", type: "repository", name: "GitHub repository", criticality: "high", metadata: {} },
      { id: "gha-pipeline", type: "ci_pipeline", name: "GitHub Actions workflow", criticality: "high", metadata: {} },
      { id: "image-gha", type: "container_image", name: "built container image", criticality: "high", metadata: {} },
      { id: "registry-oci", type: "registry", name: "OCI registry", criticality: "high", metadata: {} },
      { id: "cluster-prod", type: "k8s_cluster", name: "production cluster", criticality: "critical", metadata: {} }
    ],
    [
      { id: "e-gh-repo-pipeline", type: "triggers", source: "repo-github", target: "gha-pipeline", metadata: {} },
      { id: "e-gh-pipeline-image", type: "builds", source: "gha-pipeline", target: "image-gha", metadata: {} },
      { id: "e-gh-image-registry", type: "publishes", source: "image-gha", target: "registry-oci", metadata: {} },
      { id: "e-gh-registry-cluster", type: "deploys", source: "registry-oci", target: "cluster-prod", metadata: {} }
    ]
  ),

  makeTemplate(
    "template-namespace-without-networkpolicy",
    "Kubernetes namespace sans NetworkPolicy",
    "Kubernetes",
    "Namespace critique avec pod exposé et absence de NetworkPolicy.",
    [
      { id: "cluster-k8s", type: "k8s_cluster", name: "Kubernetes cluster", criticality: "critical", metadata: {} },
      { id: "ns-payments", type: "k8s_namespace", name: "payments namespace", criticality: "critical", metadata: { networkPolicy: false } },
      { id: "pod-payments", type: "k8s_pod", name: "payments pod", criticality: "critical", metadata: {} },
      { id: "svc-payments", type: "k8s_service", name: "payments service", criticality: "high", metadata: {} }
    ],
    [
      { id: "e-cluster-ns", type: "contains", source: "cluster-k8s", target: "ns-payments", metadata: {} },
      { id: "e-ns-pod", type: "contains", source: "ns-payments", target: "pod-payments", metadata: {} },
      { id: "e-service-pod", type: "routes_to", source: "svc-payments", target: "pod-payments", metadata: {} }
    ],
    {
      id: "finding-no-networkpolicy",
      title: "Critical namespace has no NetworkPolicy",
      severity: "critical",
      affectedNodes: ["ns-payments", "pod-payments"],
      description: "Missing network segmentation increases lateral movement risk.",
      framework: "DORA",
      control: "ict-risk-management",
      impact: "critical"
    }
  ),

  makeTemplate(
    "template-pod-crashloopbackoff",
    "Pod CrashLoopBackOff",
    "Kubernetes logs",
    "Pod en redémarrage continu.",
    [
      { id: "ns-default", type: "k8s_namespace", name: "default namespace", criticality: "medium", metadata: {} },
      { id: "workload-api", type: "k8s_workload", name: "api deployment", criticality: "high", metadata: {} },
      { id: "pod-api-crash", type: "k8s_pod", name: "api pod CrashLoopBackOff", criticality: "critical", metadata: { reason: "CrashLoopBackOff" } }
    ],
    [
      { id: "e-ns-workload", type: "contains", source: "ns-default", target: "workload-api", metadata: {} },
      { id: "e-workload-pod", type: "contains", source: "workload-api", target: "pod-api-crash", metadata: {} }
    ],
    {
      id: "finding-crashloopbackoff",
      title: "Pod is in CrashLoopBackOff",
      severity: "critical",
      affectedNodes: ["pod-api-crash"],
      description: "The pod restarts repeatedly and may be unavailable.",
      framework: "DORA",
      control: "operational-resilience",
      impact: "critical"
    }
  ),

  makeTemplate(
    "template-imagepullbackoff",
    "ImagePullBackOff",
    "Kubernetes logs",
    "Pod incapable de tirer son image depuis la registry.",
    [
      { id: "registry-private", type: "registry", name: "private registry", criticality: "high", metadata: {} },
      { id: "image-private", type: "container_image", name: "private image", criticality: "high", metadata: {} },
      { id: "pod-imagepull", type: "k8s_pod", name: "pod ImagePullBackOff", criticality: "high", metadata: { reason: "ImagePullBackOff" } }
    ],
    [
      { id: "e-image-registry", type: "publishes", source: "image-private", target: "registry-private", metadata: {} },
      { id: "e-image-pod", type: "deploys", source: "image-private", target: "pod-imagepull", metadata: {} }
    ],
    {
      id: "finding-imagepullbackoff",
      title: "Pod cannot pull container image",
      severity: "high",
      affectedNodes: ["pod-imagepull", "image-private"],
      description: "The kubelet cannot pull the configured image.",
      framework: "SLSA",
      control: "artifact-availability",
      impact: "high"
    }
  ),

  makeTemplate(
    "template-public-service-database",
    "Public service -> Pod -> Database",
    "Exposure",
    "Chemin public vers workload puis base de données sensible.",
    [
      { id: "ingress-public", type: "ingress", name: "Public ingress", criticality: "high", metadata: { public: true } },
      { id: "svc-api", type: "k8s_service", name: "api service", criticality: "high", metadata: {} },
      { id: "pod-api", type: "k8s_pod", name: "api pod", criticality: "critical", metadata: {} },
      { id: "db-main", type: "database", name: "main database", criticality: "critical", metadata: { sensitiveData: true } }
    ],
    [
      { id: "e-ingress-service", type: "routes_to", source: "ingress-public", target: "svc-api", metadata: {} },
      { id: "e-service-pod", type: "routes_to", source: "svc-api", target: "pod-api", metadata: {} },
      { id: "e-pod-db", type: "connects_to", source: "pod-api", target: "db-main", metadata: {} }
    ],
    {
      id: "finding-public-critical-path",
      title: "Public service can reach critical database",
      severity: "critical",
      affectedNodes: ["pod-api", "db-main"],
      description: "A public ingress routes to a workload connected to a sensitive database.",
      framework: "DORA",
      control: "ict-risk-management",
      impact: "critical"
    }
  ),

  makeTemplate(
    "template-registry-untrusted-unsigned-image",
    "Registry untrusted / unsigned image",
    "Registry trust",
    "Registry non fiable et image sans signature.",
    [
      { id: "registry-untrusted", type: "registry", name: "untrusted registry", criticality: "critical", metadata: { trusted: false } },
      { id: "image-unsigned", type: "container_image", name: "unsigned image", criticality: "critical", metadata: { signed: false } },
      { id: "security-control-signing", type: "security_control", name: "image signing control", criticality: "high", metadata: { enforced: false } }
    ],
    [
      { id: "e-image-registry-untrusted", type: "publishes", source: "image-unsigned", target: "registry-untrusted", metadata: {} },
      { id: "e-control-image", type: "verifies", source: "security-control-signing", target: "image-unsigned", metadata: {} }
    ],
    {
      id: "finding-unsigned-image",
      title: "Container image is unsigned or registry is untrusted",
      severity: "high",
      affectedNodes: ["image-unsigned", "registry-untrusted"],
      description: "Image provenance and registry trust cannot be verified.",
      framework: "SLSA",
      control: "artifact-integrity",
      impact: "high"
    }
  ),

  makeTemplate(
    "template-microservice-external-api",
    "Microservice avec external API",
    "Application architecture",
    "Microservice interne qui appelle une API externe.",
    [
      { id: "repo-ms", type: "repository", name: "microservice repo", criticality: "medium", metadata: {} },
      { id: "pod-ms", type: "k8s_pod", name: "microservice pod", criticality: "high", metadata: {} },
      { id: "api-third-party", type: "external_api", name: "third-party API", criticality: "high", metadata: {} },
      { id: "observability-ms", type: "observability", name: "observability stack", criticality: "medium", metadata: {} }
    ],
    [
      { id: "e-repo-pod-ms", type: "deploys", source: "repo-ms", target: "pod-ms", metadata: {} },
      { id: "e-pod-external-api", type: "connects_to", source: "pod-ms", target: "api-third-party", metadata: {} },
      { id: "e-obs-pod", type: "documents", source: "observability-ms", target: "pod-ms", metadata: {} }
    ]
  )
];
