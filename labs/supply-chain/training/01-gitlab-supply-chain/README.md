# GitLab supply chain

## Objectif

Comprendre la chaine repo -> pipeline -> runner -> image -> registry -> preuve DREPS.

## Cible pedagogique

- Track : GitLab
- Cible : GitLab runner Docker
- Type de noeud : gitlab_runner
- Finding : gitlab-runner-privileged
- Framework : SLSA
- Controle : SLSA-Build-Isolation

## Parcours

| Ordre | Etape | Intention | Evidence-pack |
|---:|---|---|---|
| 0 | 00-start | Initialiser le scenario | evidence/00-start.evidence-pack.json |
| 1 | 01-observe | Observer les preuves | evidence/01-observe.evidence-pack.json |
| 2 | 02-assess | Qualifier risque et conformite | evidence/02-assess.evidence-pack.json |
| 3 | 03-remediate | Preparer remediation et rollback | evidence/03-remediate.evidence-pack.json |

## Commandes

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 01-gitlab-supply-chain -Step 00-start
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 01-gitlab-supply-chain -Step 01-observe
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 01-gitlab-supply-chain -Step 02-assess
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 01-gitlab-supply-chain -Step 03-remediate

## Remediation pedagogique

Desactiver privileged=true, isoler le runner, pinner l'image d'execution et tracer la provenance.

## Definition of Done locale

- Le scenario contient un scenario.json.
- Les 4 etapes existent.
- Chaque etape reference un evidence-pack valide.
- Le hash de chaque evidence-pack differe de l'etape precedente.
- L'etape 03-remediate contient au moins une remediation avec verification et rollback.
