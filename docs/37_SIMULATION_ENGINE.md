# Phase 30 - Simulation Engine

## Objectif

Simuler attaque, panne, dérive ou remédiation.

## Package

~~~text
packages/dreps-simulation-engine/
~~~

## Scénarios

~~~text
compromised-github-token
compromised-gitlab-runner
malicious-dependency
unsigned-image-deployed
public-database-exposure
k8s-secret-exfiltration
ci-permission-escalation
compromised-registry
no-network-policy-lateral-movement
~~~

## Sorties

~~~text
.doctrine/out/simulation/simulation-results.json
.doctrine/out/simulation/attack-path.mmd
.doctrine/out/simulation/timeline.md
.doctrine/out/simulation/before-after-score.json
~~~

## Definition of Done

- Une attaque GitLab runner -> registry -> image -> pod -> DB est simulable.
- Une remédiation casse le chemin d'attaque.
- `pnpm simulation:certify` passe.
- `pnpm supplychain:certify` passe.
