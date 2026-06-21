# Phase 9 - Template Engine

## Objectif

Generer PR body, Markdown reports, Mermaid et Marp depuis un evidence-pack DREPS.

## Package

- packages/dreps-template-engine/

## Templates

- reporting/markdown/templates/audit-report.md.eta
- reporting/markdown/templates/pr-remediation.md.eta
- reporting/mermaid/templates/supplychain.mmd.eta
- reporting/marp/templates/executive-summary.marp.md.eta

## Commandes

- pnpm template:generate
- pnpm template:certify
- pnpm supplychain:certify

## Sorties generees

- .doctrine/out/templates/audit-report.md
- .doctrine/out/templates/pr-remediation.md
- .doctrine/out/templates/supplychain.mmd
- .doctrine/out/templates/executive-summary.marp.md

## Definition of Done

- On genere un Markdown report depuis evidence-pack.
- On genere un PR body depuis remediation-plan.
- On genere un Mermaid graph depuis nodes/edges.

## Notes

Le moteur supporte les variables ETA-like avec la syntaxe <%= path %>.
Il supporte aussi une syntaxe mustache simple avec {{ path }} et {{#each list}}...{{/each}}.
Aucune dependance externe de template n'est obligatoire.
