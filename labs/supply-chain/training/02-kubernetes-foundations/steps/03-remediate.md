# Etape 03 - Remedier

Objectif : ajouter une remediation exploitable, verifiable et rollbackable.

Strategie :

Ajouter une NetworkPolicy minimale, verifier les flux autorises et documenter le rollback.

Commande :

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 02-kubernetes-foundations -Step 03-remediate
