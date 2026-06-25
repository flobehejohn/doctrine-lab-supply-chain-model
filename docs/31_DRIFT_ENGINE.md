# Phase 24 - Drift Engine

## Objectif

Comparer une baseline et un état current.

## Package

~~~text
packages/dreps-drift-engine/
~~~

## Types de drift

~~~text
node_added
node_removed
node_changed
edge_added
edge_removed
edge_changed
finding_added
finding_resolved
documentation_missing
compliance_regression
env_config_drift
~~~

## Sorties

~~~text
.doctrine/out/drift-engine/drift-report.json
.doctrine/out/drift-engine/drift-summary.md
.doctrine/out/drift-engine/drift.mmd
~~~

## Definition of Done

- Un pod ajouté hors baseline est détecté.
- Un finding résolu est détecté.
- Une régression compliance est détectée.
- `pnpm drift:engine:certify` passe.
- `pnpm supplychain:certify` passe.
