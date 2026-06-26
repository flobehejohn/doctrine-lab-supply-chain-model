# 23 - Advanced Connectors

## Objectif

La Phase 35 integre le lab a l'ecosysteme professionnel en ajoutant un socle de connecteurs avances.

## Connecteurs cibles

| Connecteur | Role | Mode Phase 35 |
|---|---|---|
| GUAC | Graphe supply chain | Fixture DREPS |
| Dependency-Track | SBOM et vulnerabilites | Fixture DREPS |
| Backstage | Software catalog | Fixture DREPS |
| Grafana | Observabilite dashboards | Fixture DREPS |
| OpenTelemetry | Traces et services | Fixture DREPS |
| SonarQube | Qualite et securite code | Fixture DREPS |
| GitHub API | Repository metadata | Fixture + live optionnel via gh api |
| GitLab API | Projet et pipeline metadata | Fixture DREPS |

## Contrat de conversion

Chaque connecteur convertit les donnees externes vers :

- nodes
- edges
- evidence
- findings
- remediations
- complianceImpacts
- provenance

## Commandes

Lister les connecteurs :

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/connectors/list-advanced-connectors.ps1

Importer GitHub API en mode fixture :

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/connectors/import-advanced-connector.ps1 -Connector github-api

Importer GitHub API en mode live optionnel :

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/connectors/import-advanced-connector.ps1 -Connector github-api -Mode live -Repository owner/repo

Valider la phase :

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/connectors/validate-advanced-connectors.ps1

## Definition of Done

- Le lab declare les connecteurs avances cibles.
- Au moins un connecteur avance est importable.
- Les donnees sont converties en evidence-pack DREPS.
- Le pack contient nodes, evidence, findings, remediations, complianceImpacts et provenance.
- Un rapport de validation versionnable est produit.
