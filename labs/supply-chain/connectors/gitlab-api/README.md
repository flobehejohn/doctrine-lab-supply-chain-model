# GitLab API connector

## Objectif

Importer des donnees GitLab API et les convertir en evidence-pack DREPS.

## Mode supporte

- fixture-first
- live non implemente dans cette phase

## Commande

    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/connectors/import-advanced-connector.ps1 -Connector gitlab-api

## Sortie

    labs/supply-chain/connectors/out/gitlab-api/evidence-pack.json

## Finding pedagogique

- gitlab-runner-privileged - GitLab runner allows privileged Docker execution
