# Dependency-Track connector

## Objectif

Importer des donnees Dependency-Track et les convertir en evidence-pack DREPS.

## Mode supporte

- fixture-first
- live non implemente dans cette phase

## Commande

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/connectors/import-advanced-connector.ps1 -Connector dependency-track

## Sortie

    labs/supply-chain/connectors/out/dependency-track/evidence-pack.json

## Finding pedagogique

- dependency-track-critical-vulnerability - Dependency-Track reports critical vulnerable component
