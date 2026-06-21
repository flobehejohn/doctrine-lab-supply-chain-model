# Phase 8 - Safe Logger and Command Runner

## Objectif

Executer ou documenter des commandes sans fuite de secrets.

## Packages

- packages/dreps-safe-logger/
- packages/dreps-command-runner/

## Risk levels

- read_only
- local_write
- remote_write
- destructive
- credential_sensitive
- production_risk

## Regles

- read_only peut etre affichee directement.
- remote_write necessite approvalRequired.
- destructive necessite approvalRequired et rollback.
- credential_sensitive masque tokens/passwords.
- production_risk necessite un contexte explicite.

## Commandes

- pnpm security:certify
- pnpm supplychain:certify

## Definition of Done

- Un token est masque dans les logs.
- Une commande destructive sans approval echoue.
- Une commande read_only peut etre rendue dans un runbook.

## Notes de securite

Le runner n'utilise pas eval.
L'execution est desactivee par defaut.
Le rendu documentaire passe par le safe logger.
