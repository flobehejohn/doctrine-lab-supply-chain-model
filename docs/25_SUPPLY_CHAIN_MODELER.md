# 25 - Supply Chain Modeler and Kubernetes Log Import

## Objectif

La Phase 37A transforme le visualisateur React Flow en outil de modélisation applicative.

## UI ajoutée

- SupplyChainModeler
- TemplateLibrary
- NodePalette
- EdgeEditor
- KubernetesLogPastePanel
- ImportPreviewPanel
- DrepsExportPanel
- DashboardSyncPanel

## Templates couverts

1. GitLab -> Runner -> Image -> Registry -> Kubernetes
2. GitHub Actions -> Image -> Registry -> Cluster
3. Kubernetes namespace sans NetworkPolicy
4. Pod CrashLoopBackOff
5. ImagePullBackOff
6. Public service -> Pod -> Database
7. Registry untrusted / unsigned image
8. Microservice avec external API

## Import logs Kubernetes

Signaux détectés :

- CrashLoopBackOff
- ImagePullBackOff
- ErrImagePull
- BackOff
- FailedScheduling
- Unhealthy
- Readiness probe failed
- Liveness probe failed
- CreateContainerConfigError
- OOMKilled

## Scanner repo local

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/modeler/scan-local-repo.ps1 -RepoPath C:\path\to\repo -OutputPath apps/web/public/evidence-pack.json -PackId scanned-repo-demo

## Definition of Done

- pnpm dev ouvre le modeler.
- Un utilisateur peut choisir un template.
- Un utilisateur peut coller un log Kubernetes.
- Le log produit un evidence-pack DREPS.
- Le graphe affiche namespace -> workload -> pod -> service.
- Les erreurs Kubernetes deviennent findings.
- Un clic sur le pod affiche evidenceRefs, findings, compliance impacts et remediation.
- Le dashboard exécutif peut lire un export généré depuis le modèle.
