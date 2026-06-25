# Phase 23 - Policy Engine

## Objectif

Transformer des règles en findings DREPS normalisés.

## Package

~~~text
packages/dreps-policy-engine/
~~~

## Policies

~~~text
no-public-critical-vulnerable-pod
no-unsigned-container-image
no-runner-privileged
no-docker-sock-runner
no-untrusted-registry
no-critical-node-without-runbook
~~~

## Scripts

~~~text
pnpm policy:engine:evaluate
pnpm policy:engine:import
pnpm policy:engine:certify
~~~

## Sorties

~~~text
.doctrine/out/policy-engine/policy-evaluation-report.json
.doctrine/out/policy-engine/evidence-pack.policy-engine.json
~~~

## Definition of Done

- Une policy produit un finding DREPS normalisé.
- Le finding pointe vers `affectedNodes`.
- Le finding pointe vers `evidenceRefs`.
- `pnpm policy:engine:certify` passe.
- `pnpm supplychain:certify` passe.
