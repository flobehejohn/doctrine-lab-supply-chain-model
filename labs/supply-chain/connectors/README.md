# Advanced Connectors

Phase 35 ajoute un socle de connecteurs avances.

## Connecteurs cibles

- GUAC
- Dependency-Track
- Backstage
- Grafana
- OpenTelemetry
- SonarQube
- GitHub API
- GitLab API

## Commandes

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/connectors/list-advanced-connectors.ps1
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/connectors/import-advanced-connector.ps1 -Connector github-api
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/connectors/validate-advanced-connectors.ps1

## Definition of Done

- Au moins un outil externe avance est lisible.
- Les donnees importees sont converties en DREPS.
- Un evidence-pack est produit.
- Les mappings entities, relationships, findings, remediations et complianceImpacts sont preserves.
