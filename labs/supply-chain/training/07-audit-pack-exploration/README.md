# Audit-pack exploration

## Objectif

Apprendre a inspecter findings, compliance, blast radius et checksums sans lancer l'UI.

## Cible pedagogique

- Track : Audit
- Cible : Audit-pack externe
- Type de noeud : audit_pack
- Finding : audit-pack-not-explored
- Framework : SLSA
- Controle : SLSA-Verification

## Parcours

| Ordre | Etape | Intention | Evidence-pack |
|---:|---|---|---|
| 0 | 00-start | Initialiser le scenario | evidence/00-start.evidence-pack.json |
| 1 | 01-observe | Observer les preuves | evidence/01-observe.evidence-pack.json |
| 2 | 02-assess | Qualifier risque et conformite | evidence/02-assess.evidence-pack.json |
| 3 | 03-remediate | Preparer remediation et rollback | evidence/03-remediate.evidence-pack.json |

## Commandes

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 07-audit-pack-exploration -Step 00-start
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 07-audit-pack-exploration -Step 01-observe
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 07-audit-pack-exploration -Step 02-assess
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 07-audit-pack-exploration -Step 03-remediate

## Remediation pedagogique

Lire manifest, verifier checksums, filtrer findings critiques et ouvrir le graphe Mermaid.

## Definition of Done locale

- Le scenario contient un scenario.json.
- Les 4 etapes existent.
- Chaque etape reference un evidence-pack valide.
- Le hash de chaque evidence-pack differe de l'etape precedente.
- L'etape 03-remediate contient au moins une remediation avec verification et rollback.
