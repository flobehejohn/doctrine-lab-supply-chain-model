# Etape 03 - Remedier

Objectif : ajouter une remediation exploitable, verifiable et rollbackable.

Strategie :

Importer la chaine CA, refuser TLS non verifie, signer les images et documenter la verification.

Commande :

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 03-registry-trust -Step 03-remediate
