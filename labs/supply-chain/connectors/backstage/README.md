# Backstage connector

## Objectif

Importer des donnees Backstage et les convertir en evidence-pack DREPS.

## Mode supporte

- fixture-first
- live non implemente dans cette phase

## Commande

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/connectors/import-advanced-connector.ps1 -Connector backstage

## Sortie

    labs/supply-chain/connectors/out/backstage/evidence-pack.json

## Finding pedagogique

- backstage-missing-owner - Backstage component has incomplete ownership metadata
