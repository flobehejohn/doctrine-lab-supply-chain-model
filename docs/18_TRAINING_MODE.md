# 18 - Training Mode

## Objectif

Le Training Mode transforme Doctrine Supply Chain Lab en outil pedagogique vendable.

Il permet a un utilisateur de suivre un scenario progressif : observer, qualifier, mapper conformite, remedier, verifier et exporter une preuve.

## Parcours

| ID | Parcours | Valeur |
|---|---|---|
| 01 | GitLab supply chain | Comprendre repo, pipeline, runner, image et registry |
| 02 | Kubernetes foundations | Relier namespace, workload, pod, service et NetworkPolicy |
| 03 | Registry trust | Comprendre certificat, confiance, signature et provenance |
| 04 | Git forensic | Auditer tags, historique, CODEOWNERS et signatures |
| 05 | DORA NIS2 SLSA mapping | Traduire un finding technique en impact conformite |
| 06 | GitOps remediation | Passer du finding au patch verifiable et rollbackable |
| 07 | Audit-pack exploration | Lire un audit-pack sans lancer l'UI |

## Commandes

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/list-training-scenarios.ps1
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 01-gitlab-supply-chain -Step 03-remediate
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/validate-training-mode.ps1

## Definition of Done

- labs/supply-chain/training existe.
- decks/training-supply-chain.marp.md existe.
- docs/18_TRAINING_MODE.md existe.
- Au moins 7 scenarios sont presents.
- Chaque scenario contient plusieurs etapes.
- Chaque etape produit ou modifie un evidence-pack.
- L'etape 02-assess contient au moins un finding.
- L'etape 03-remediate contient une remediation avec verification et rollback.
- Un rapport de validation est produit dans .doctrine/out/training/training-validation-report.json.
