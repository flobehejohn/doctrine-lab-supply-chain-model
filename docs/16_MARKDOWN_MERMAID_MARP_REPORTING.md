# Phase 10 - Markdown / Mermaid / Marp Reporting

## Objectif

Produire des sorties lisibles sans UI.

## Packages

- packages/dreps-markdown-renderer/
- packages/dreps-mermaid-exporter/
- packages/dreps-marp-exporter/

## Commandes

- pnpm report:markdown:audit
- pnpm report:mermaid:graph
- pnpm report:marp:executive
- pnpm report:readable:certify

## Sorties

- .doctrine/out/reports/audit-report.md
- .doctrine/out/diagrams/supplychain.mmd
- .doctrine/out/decks/executive-summary.marp.md

## Definition of Done

- Un audit peut etre lu en Markdown.
- Le graphe peut etre vu en Mermaid.
- Une presentation executive peut etre generee.

## Notes

Ces sorties sont generees localement et ne dependent pas de l'UI React.
