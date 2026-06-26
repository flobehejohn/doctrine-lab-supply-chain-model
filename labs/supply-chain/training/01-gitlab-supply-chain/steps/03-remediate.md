# Etape 03 - Remedier

Objectif : ajouter une remediation exploitable, verifiable et rollbackable.

Strategie :

Desactiver privileged=true, isoler le runner, pinner l'image d'execution et tracer la provenance.

Commande :

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 01-gitlab-supply-chain -Step 03-remediate
