# Phase 33 - Audit Pack Explorer

## Objectif

Permettre à un auditeur externe de lire le pack.

## Contenu

~~~text
explorer/README.md
explorer/jtable-views/findings-critical.yml
explorer/jtable-views/compliance-failed.yml
explorer/jq-examples.md
explorer/mermaid/supplychain.mmd
~~~

## Definition of Done

- Un auditeur peut inspecter les findings sans lancer l'UI.
- Un auditeur peut inspecter la compliance sans lancer l'UI.
- Un auditeur peut inspecter le blast radius sans lancer l'UI.
- `pnpm auditpack:explorer:certify` passe.
- `pnpm supplychain:certify` passe.
