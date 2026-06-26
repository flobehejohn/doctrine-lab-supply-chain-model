# 24 - Executive Dashboard

## Objectif

La Phase 36 sort le lab du pur usage technique en ajoutant une vue executive lisible en moins de deux minutes.

## UI couverte

- Executive Summary
- Risk Score
- Top Findings
- Blast Radius Score
- Compliance Status
- Remediation Readiness
- Audit Pack Status

## Publics

| Public | Besoin | Reponse dashboard |
|---|---|---|
| C-Level | Comprendre vite le risque et la decision | Executive summary, scores, statut global |
| Auditeur | Creuser les preuves | Evidence refs, compliance, audit pack paths |
| Ingenieur | Aller vers les patchs | Findings, remediation readiness, verification |

## Commandes

Construire le dashboard :

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/dashboard/build-executive-dashboard.ps1

Valider :

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/dashboard/validate-executive-dashboard.ps1

Ouvrir localement :

    Invoke-Item labs/supply-chain/dashboard/executive/index.html

## Definition of Done

- Un C-Level comprend la situation en 2 minutes.
- Un auditeur peut creuser les preuves.
- Un ingenieur peut aller vers les patchs.
- Le dashboard expose scores, findings, compliance, remediation et audit pack.
- Un rapport de validation est produit.
