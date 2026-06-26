# Grafana connector

## Objectif

Importer des donnees Grafana et les convertir en evidence-pack DREPS.

## Mode supporte

- fixture-first
- live non implemente dans cette phase

## Commande

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/connectors/import-advanced-connector.ps1 -Connector grafana

## Sortie

    labs/supply-chain/connectors/out/grafana/evidence-pack.json

## Finding pedagogique

- grafana-missing-slo-panel - Grafana dashboard lacks explicit SLO / error budget panel
