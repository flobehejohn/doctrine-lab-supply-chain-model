# Phase 12 - Local Artifact Vault

## Objectif

Stocker les audit-packs localement dans le lab.

## App / script

- apps/artifact-vault/
- scripts/supplychain/publish-audit-pack.ts
- scripts/supplychain/certify-artifact-vault.ts

## Fonctionnalites

- stocker audit-pack.zip
- stocker checksums
- creer manifest index
- rendre un index JSON
- verifier le checksum d'un audit-pack publie

## Commandes

- pnpm vault:publish
- pnpm vault:certify
- pnpm supplychain:certify

## Sorties

- .doctrine/out/local-artifact-vault/index.json
- .doctrine/out/local-artifact-vault/audit-packs/<artifactId>/audit-pack.zip
- .doctrine/out/local-artifact-vault/audit-packs/<artifactId>/audit-pack.zip.sha256
- .doctrine/out/local-artifact-vault/audit-packs/<artifactId>/manifest.json

## Definition of Done

- Un audit-pack publie apparait dans l'index local.
- Son checksum est verifiable.

## Notes

Le vault est local, deterministe et compatible CI.
Il ne publie rien sur un service distant.
Il sert de mini artifactory locale pour les audit-packs.
