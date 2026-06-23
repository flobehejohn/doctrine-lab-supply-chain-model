# Phase 16 - Repo / CI / Docker / SBOM adapters

## Objectif

Importer une supply chain depuis un repo sans GitLab complet.

## Package

~~~text
packages/dreps-adapters/
~~~

## Adapters

~~~text
repo adapter
github workflow adapter
gitlab ci adapter
dockerfile adapter
package-lock adapter
pnpm-lock adapter
syft sbom adapter
github sbom adapter
~~~

## Fixture locale

~~~text
labs/supply-chain/examples/local-repo-fixture/
~~~

La fixture contient :

~~~text
README.md
Dockerfile
package.json
package-lock.json
pnpm-lock.yaml
.github/workflows/ci.yml
.gitlab-ci.yml
sbom/syft-sbom.json
sbom/github-dependency-snapshot.json
~~~

## Commandes

~~~powershell
pnpm adapters:import:repo
pnpm adapters:import:github-workflow
pnpm adapters:import:gitlab-ci
pnpm adapters:import:dockerfile
pnpm adapters:import:package-lock
pnpm adapters:import:pnpm-lock
pnpm adapters:import:syft-sbom
pnpm adapters:import:github-sbom
pnpm adapters:import
pnpm adapters:certify
pnpm supplychain:certify
~~~

## Sorties

~~~text
.doctrine/out/adapters/repo.normalized.json
.doctrine/out/adapters/github-workflow.normalized.json
.doctrine/out/adapters/gitlab-ci.normalized.json
.doctrine/out/adapters/dockerfile.normalized.json
.doctrine/out/adapters/package-lock.normalized.json
.doctrine/out/adapters/pnpm-lock.normalized.json
.doctrine/out/adapters/syft-sbom.normalized.json
.doctrine/out/adapters/github-sbom.normalized.json
.doctrine/out/adapters/evidence-pack.local-repo.json
.doctrine/out/adapters/local-repo-graph.mmd
~~~

## Definition of Done

- Un repo local devient un evidence-pack DREPS valide.
- Dockerfile devient un node `container_image` inferred.
- Workflow devient `ci_pipeline`.
- SBOM devient évidence.
- Le graphe montre `repository -> ci_pipeline -> container_image`.
- Le graphe relie `dockerfile -> container_image`.
- Le graphe relie `syft_sbom -> container_image`.
