# Phase 21 - Env Matrix / Config Drift

## Objectif

Comparer les environnements :

~~~text
dev / staging / prod
~~~

## Inspiration

~~~text
cheat-sheet-main/shell/to_table
~~~

## Package

~~~text
packages/dreps-config-matrix/
~~~

## Scripts

~~~text
scripts/config-matrix/import-env-matrix.ts
scripts/config-matrix/compare-env-matrix.ts
scripts/config-matrix/certify-config-matrix.ts
~~~

## Findings

~~~text
prod-uses-latest-image
prod-config-drift
missing-prod-network-policy
undocumented-env-difference
~~~

## Sorties

~~~text
.doctrine/out/config-matrix/env-matrix.normalized.json
.doctrine/out/config-matrix/config-drift-report.json
.doctrine/out/config-matrix/env-matrix.jtable.json
.doctrine/out/config-matrix/env-matrix.md
.doctrine/out/config-matrix/evidence-pack.config-matrix.json
~~~

## Definition of Done

- Une matrice dev/staging/prod est importée.
- Un rapport drift est généré.
- Une sortie jtable-compatible permet d'afficher la matrice.
- Les findings DREPS sont générés.
- `pnpm config:matrix:certify` passe.
- `pnpm supplychain:certify` passe.
