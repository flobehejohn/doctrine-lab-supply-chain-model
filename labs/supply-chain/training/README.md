# Doctrine Supply Chain Training Mode

La Phase 34 transforme le lab supply chain en support de formation vendable.

## Parcours disponibles

1. GitLab supply chain
2. Kubernetes foundations
3. Registry trust
4. Git forensic
5. DORA / NIS2 / SLSA mapping
6. GitOps remediation
7. Audit-pack exploration

## Commandes

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/list-training-scenarios.ps1
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/run-training-step.ps1 -Scenario 01-gitlab-supply-chain -Step 03-remediate
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/training/validate-training-mode.ps1
