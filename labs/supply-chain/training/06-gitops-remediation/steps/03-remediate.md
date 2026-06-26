# Etape 03 - Remedier

Objectif : ajouter une remediation exploitable, verifiable et rollbackable.

Strategie :

Generer patch.diff, verification.ps1, rollback.md et PR body structure.

Commande :

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 06-gitops-remediation -Step 03-remediate
