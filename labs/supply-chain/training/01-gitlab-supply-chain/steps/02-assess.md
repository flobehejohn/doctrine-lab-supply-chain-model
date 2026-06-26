# Etape 02 - Qualifier

Objectif : transformer l'observation en finding, puis en impact conformite.

Finding : gitlab-runner-privileged - Runner GitLab en mode privilegie
Controle : SLSA - SLSA-Build-Isolation

Commande :

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 01-gitlab-supply-chain -Step 02-assess
