# Etape 03 - Remedier

Objectif : ajouter une remediation exploitable, verifiable et rollbackable.

Strategie :

Ajouter signature keyless, attestation in-toto, controle CI bloquant et guide de verification.

Commande :

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 05-dora-nis2-slsa-mapping -Step 03-remediate
