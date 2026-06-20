# Phase 6 - jtable Reporting Layer

## Objectif

Rendre les JSON DREPS lisibles en CLI, CI et Markdown.

## Positionnement

Cette couche s'inspire de l'idee jtable comme Human Evidence Renderer.

Le lab ne depend pas obligatoirement de jtable.

- Si jtable est absent, le renderer PowerShell natif produit les tableaux.
- Si jtable est present plus tard, il pourra etre branche comme renderer optionnel.
- Les vues restent versionnees dans reporting/jtable/views.

## Vues

- reporting/jtable/views/findings-all.yml
- reporting/jtable/views/findings-critical.yml
- reporting/jtable/views/compliance-summary.yml
- reporting/jtable/views/blast-radius-summary.yml
- reporting/jtable/views/drift-summary.yml
- reporting/jtable/views/remediation-pr-table.yml

## Commandes

pnpm run report:jtable:findings
pnpm run report:jtable:critical
pnpm run report:jtable:compliance
pnpm run report:jtable:remediations
pnpm run report:jtable:all

## Sorties

Les rapports sont generes dans .doctrine/out/reporting/jtable/.

Exemples :

- findings-all.md
- findings-all.rows.json
- compliance-summary.md
- compliance-summary.rows.json

## Definition of Done

- Les findings s'affichent en tableau.
- Les compliance impacts s'affichent en tableau.
- Les vues jtable sont versionnees.
- Le lab continue meme sans binaire jtable.
