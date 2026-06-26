# GitOps remediation

## Objectif

Passer d'un finding a une remediation versionnee, verifiable et rollbackable.

## Cible pedagogique

- Track : GitOps
- Cible : Patch GitOps NetworkPolicy
- Type de noeud : gitops_patch
- Finding : remediation-without-rollback
- Framework : DORA
- Controle : DORA-Change-Management

## Parcours

| Ordre | Etape | Intention | Evidence-pack |
|---:|---|---|---|
| 0 | 00-start | Initialiser le scenario | evidence/00-start.evidence-pack.json |
| 1 | 01-observe | Observer les preuves | evidence/01-observe.evidence-pack.json |
| 2 | 02-assess | Qualifier risque et conformite | evidence/02-assess.evidence-pack.json |
| 3 | 03-remediate | Preparer remediation et rollback | evidence/03-remediate.evidence-pack.json |

## Commandes

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 06-gitops-remediation -Step 00-start
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 06-gitops-remediation -Step 01-observe
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 06-gitops-remediation -Step 02-assess
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 06-gitops-remediation -Step 03-remediate

## Remediation pedagogique

Generer patch.diff, verification.ps1, rollback.md et PR body structure.

## Definition of Done locale

- Le scenario contient un scenario.json.
- Les 4 etapes existent.
- Chaque etape reference un evidence-pack valide.
- Le hash de chaque evidence-pack differe de l'etape precedente.
- L'etape 03-remediate contient au moins une remediation avec verification et rollback.
