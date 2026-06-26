# GitHub API connector

## Objectif

Importer des donnees GitHub API et les convertir en evidence-pack DREPS.

## Mode supporte

- fixture-first
- live optionnel via gh api

## Commande

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/connectors/import-advanced-connector.ps1 -Connector github-api

## Sortie

    labs/supply-chain/connectors/out/github-api/evidence-pack.json

## Finding pedagogique

- github-actions-unpinned-workflow - GitHub Actions workflow uses unpinned actions
