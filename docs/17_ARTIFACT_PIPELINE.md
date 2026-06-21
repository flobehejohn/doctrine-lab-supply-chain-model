# Phase 11 - Artifact Pipeline

## Objectif

Industrialiser la production d'artefacts.

## Inspiration

ops-framework : file processor, packager, mini artifactory.

## Package

- packages/dreps-artifact-pipeline/

## Actions

- copy
- hash
- zip
- encrypt
- upload
- delete
- cleanup

## Plan exemple

pipelines/audit-pack-publish.pipeline.json

## Commandes

- pnpm artifact:certify
- pnpm supplychain:certify

## Sorties

- .doctrine/out/audit-pack/
- .doctrine/out/audit-pack.sha256.json
- .doctrine/out/audit-pack.zip
- .doctrine/out/artifact-vault/audit-pack.zip

## Definition of Done

- L'audit-pack peut etre hashe.
- L'audit-pack peut etre zippe.
- L'audit-pack peut etre publie localement.

## Notes

Le ZIP est produit en TypeScript pur, sans dependance externe.
upload publie dans un vault local pour rester compatible clean-room et CI.
delete et cleanup exigent allowDelete=true.
