# GUAC connector

## Objectif

Importer des donnees GUAC et les convertir en evidence-pack DREPS.

## Mode supporte

- fixture-first
- live non implemente dans cette phase

## Commande

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/connectors/import-advanced-connector.ps1 -Connector guac

## Sortie

    labs/supply-chain/connectors/out/guac/evidence-pack.json

## Finding pedagogique

- guac-missing-attestation - GUAC graph has package without attestation
