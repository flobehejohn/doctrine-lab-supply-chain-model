# DORA NIS2 SLSA mapping

## Objectif

Transformer un finding technique en impact conformite explicite et actionnable.

## Cible pedagogique

- Track : Compliance
- Cible : Image critique non signee
- Type de noeud : container_image
- Finding : unsigned-critical-image
- Framework : DORA/NIS2/SLSA
- Controle : DORA-ICT-Third-Party-Risk / NIS2-Supply-Chain / SLSA-Provenance

## Parcours

| Ordre | Etape | Intention | Evidence-pack |
|---:|---|---|---|
| 0 | 00-start | Initialiser le scenario | evidence/00-start.evidence-pack.json |
| 1 | 01-observe | Observer les preuves | evidence/01-observe.evidence-pack.json |
| 2 | 02-assess | Qualifier risque et conformite | evidence/02-assess.evidence-pack.json |
| 3 | 03-remediate | Preparer remediation et rollback | evidence/03-remediate.evidence-pack.json |

## Commandes

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 05-dora-nis2-slsa-mapping -Step 00-start
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 05-dora-nis2-slsa-mapping -Step 01-observe
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 05-dora-nis2-slsa-mapping -Step 02-assess
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 05-dora-nis2-slsa-mapping -Step 03-remediate

## Remediation pedagogique

Ajouter signature keyless, attestation in-toto, controle CI bloquant et guide de verification.

## Definition of Done locale

- Le scenario contient un scenario.json.
- Les 4 etapes existent.
- Chaque etape reference un evidence-pack valide.
- Le hash de chaque evidence-pack differe de l'etape precedente.
- L'etape 03-remediate contient au moins une remediation avec verification et rollback.
