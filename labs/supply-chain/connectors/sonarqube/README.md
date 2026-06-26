# SonarQube connector

## Objectif

Importer des donnees SonarQube et les convertir en evidence-pack DREPS.

## Mode supporte

- fixture-first
- live non implemente dans cette phase

## Commande

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/connectors/import-advanced-connector.ps1 -Connector sonarqube

## Sortie

    labs/supply-chain/connectors/out/sonarqube/evidence-pack.json

## Finding pedagogique

- sonarqube-quality-gate-failed - SonarQube quality gate failed
