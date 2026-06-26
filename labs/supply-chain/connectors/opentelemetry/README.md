# OpenTelemetry connector

## Objectif

Importer des donnees OpenTelemetry et les convertir en evidence-pack DREPS.

## Mode supporte

- fixture-first
- live non implemente dans cette phase

## Commande

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/connectors/import-advanced-connector.ps1 -Connector opentelemetry

## Sortie

    labs/supply-chain/connectors/out/opentelemetry/evidence-pack.json

## Finding pedagogique

- otel-missing-deployment-environment - OpenTelemetry resource lacks deployment.environment
