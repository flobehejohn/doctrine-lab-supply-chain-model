# Phase 29 - Maintenance Planner

## Objectif

Planifier les remédiations.

## Inspiration

~~~text
cheat-sheet-main/python/planning
~~~

## Package

~~~text
packages/dreps-maintenance-planner/
~~~

## Entrée

~~~text
remediation-plan.json
maintenance.rules.json
businessCriticality
riskLevel
~~~

## Sorties

~~~text
.doctrine/out/maintenance/remediation-calendar.json
.doctrine/out/maintenance/remediation-calendar.md
.doctrine/out/maintenance/remediation-calendar.jtable.json
~~~

## Definition of Done

- Une remédiation critique est planifiée plus tôt.
- Une remédiation destructive nécessite une fenêtre de maintenance.
- Le calendrier est exportable en Markdown.
- `pnpm maintenance:certify` passe.
- `pnpm supplychain:certify` passe.
