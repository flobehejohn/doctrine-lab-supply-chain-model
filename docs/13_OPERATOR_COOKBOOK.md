# Phase 7 - Operator Cookbook

## Objectif

Transformer les idees de cheat-sheet et ops-framework en catalogues propres.

## Dossiers

- cookbook/commands/
- cookbook/runbooks/
- packages/dreps-command-catalog/
- packages/dreps-runbook-engine/

## Command catalogs

- git.commands.json
- gitlab.commands.json
- gitlab-runner.commands.json
- registry-certificates.commands.json
- kubernetes.commands.json
- jq.commands.json
- remediation.commands.json

## Runbooks

- gitlab-runner-hardening.md
- gitlab-registry-trust.md
- registry-certificate-trust.md
- kubernetes-networkpolicy.md
- unsigned-container-image.md
- git-forensic.md
- audit-pack-exploration.md

## Definition of Done

Un finding peut pointer vers :

- une commande ;
- un runbook ;
- une verification ;
- un rollback.

## Commande

pnpm operator:certify
