# Kubernetes foundations

## Objectif

Relier namespace, workload, pod, service et NetworkPolicy dans un evidence-pack pedagogique.

## Cible pedagogique

- Track : Kubernetes
- Cible : Namespace Kubernetes expose
- Type de noeud : k8s_namespace
- Finding : missing-network-policy
- Framework : DORA
- Controle : DORA-ICT-Risk-Protection

## Parcours

| Ordre | Etape | Intention | Evidence-pack |
|---:|---|---|---|
| 0 | 00-start | Initialiser le scenario | evidence/00-start.evidence-pack.json |
| 1 | 01-observe | Observer les preuves | evidence/01-observe.evidence-pack.json |
| 2 | 02-assess | Qualifier risque et conformite | evidence/02-assess.evidence-pack.json |
| 3 | 03-remediate | Preparer remediation et rollback | evidence/03-remediate.evidence-pack.json |

## Commandes

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 02-kubernetes-foundations -Step 00-start
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 02-kubernetes-foundations -Step 01-observe
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 02-kubernetes-foundations -Step 02-assess
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 02-kubernetes-foundations -Step 03-remediate

## Remediation pedagogique

Ajouter une NetworkPolicy minimale, verifier les flux autorises et documenter le rollback.

## Definition of Done locale

- Le scenario contient un scenario.json.
- Les 4 etapes existent.
- Chaque etape reference un evidence-pack valide.
- Le hash de chaque evidence-pack differe de l'etape precedente.
- L'etape 03-remediate contient au moins une remediation avec verification et rollback.
