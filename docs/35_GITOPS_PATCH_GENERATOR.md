# Phase 28 - GitOps Patch Generator

## Objectif

Passer de conseil à PR.

## Package

~~~text
packages/dreps-gitops-patch-engine/
~~~

## Sorties

~~~text
.doctrine/out/gitops-patch/patch.diff
.doctrine/out/gitops-patch/remediation-plan.json
.doctrine/out/gitops-patch/pull-request-body.md
.doctrine/out/gitops-patch/verification.ps1
.doctrine/out/gitops-patch/rollback.md
.doctrine/out/gitops-patch/pull-request-tables.jtable.json
~~~

## Avec jtable

Le PR body contient :

~~~text
table findings
table affected nodes
table compliance impacts
table verification commands
~~~

## Definition of Done

- Le lab génère un patch NetworkPolicy.
- Le patch est applicable par `git apply --check`.
- Le PR body explique le pourquoi.
- Le PR body explique le risque.
- Le PR body explique la vérification.
- Le PR body explique le rollback.
- `pnpm gitops:patch:certify` passe.
- `pnpm supplychain:certify` passe.
