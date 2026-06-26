# Etape 02 - Qualifier

Objectif : transformer l'observation en finding, puis en impact conformite.

Finding : registry-untrusted-chain - Chaine TLS registry non verifiee
Controle : SLSA - SLSA-Provenance-Integrity

Commande :

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 03-registry-trust -Step 02-assess
