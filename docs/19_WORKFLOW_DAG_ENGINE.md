# Phase 13 - Workflow DAG Engine

## Objectif

Decrire des chaines : remediation, attaque, publication, formation.

## Inspiration

ops-framework/scheduler_defs, reecrit en moteur DAG propre et local.

## Package

- packages/dreps-workflow-dag/

## Usages

- attack timeline
- remediation workflow
- audit-pack publication workflow
- training workflow

## Workflows fournis

- workflows/remediate-network-policy.workflow.yml
- workflows/attack-timeline.workflow.yml
- workflows/audit-pack-publication.workflow.yml
- workflows/training-supply-chain.workflow.yml

## Commandes

- pnpm workflow:certify
- pnpm artifact:certify
- pnpm supplychain:certify

## Sorties

- .doctrine/out/workflows/index.json
- .doctrine/out/workflows/*.validated.json
- .doctrine/out/workflows/*.mmd
- .doctrine/out/audit-pack/workflows/

## Definition of Done

- Un workflow YAML est valide.
- Il est exporte en Mermaid.
- Il peut etre inclus dans un audit-pack.

## Garanties

- Detection des dependances manquantes.
- Detection des cycles.
- Export Mermaid deterministe.
- Inclusion des workflows dans le manifest et le hash de l'audit-pack.
