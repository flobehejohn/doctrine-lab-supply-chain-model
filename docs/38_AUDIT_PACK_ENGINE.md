# Phase 31 - Audit Pack Engine

## Objectif

Exporter une preuve portable.

## Package

~~~text
packages/dreps-audit-pack/
~~~

## Structure

~~~text
audit-pack/
  manifest.json
  supplychain.evidence-pack.json
  graph.snapshot.json
  graph.diff.json
  blast-radius-report.json
  findings.json
  remediation-plan.json
  compliance-report.json
  simulation-results.json
  documentation-index.json
  command-catalog.json
  runbook-index.json
  workflow-index.json
  tool-versions.json
  checksums.sha256
  explorer/
    README.md
    jtable-views/
    jq-examples.md
    mermaid/
~~~

## Sortie

~~~text
.doctrine/out/audit-pack-engine/audit-pack/
~~~

## Definition of Done

- L'audit-pack est généré.
- Tous les fichiers sont listés dans `manifest.json`.
- `checksums.sha256` couvre les JSON.
- L'explorer contient des commandes jtable/jq.
- `pnpm auditpack:certify` passe.
- `pnpm supplychain:certify` passe.
