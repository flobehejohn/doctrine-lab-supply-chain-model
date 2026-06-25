# Phase 27 - Remediation Engine

## Objectif

Générer un plan de remédiation contextualisé.

## Package

~~~text
packages/dreps-remediation-engine/
~~~

## Règle absolue

Une remédiation contient toujours :

~~~text
findingId
affectedNodes
strategy
risk
commands
patches
verification
rollback
approvalRequired
maintenanceWindow
~~~

## Sorties

~~~text
.doctrine/out/remediation/remediation-plan.json
.doctrine/out/remediation/remediation-plan.md
.doctrine/out/remediation/remediation-plan.jtable.json
~~~

## Definition of Done

- Chaque finding critique a au moins une remédiation proposée.
- Chaque remédiation a une vérification.
- Chaque remédiation a un rollback.
- `pnpm remediation:certify` passe.
- `pnpm supplychain:certify` passe.
