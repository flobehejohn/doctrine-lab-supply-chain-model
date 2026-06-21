# Phase 15 - GitLab Adapter

## Objectif

Importer GitLab dans DREPS.

Le but est de transformer une fixture GitLab locale en evidence-pack DREPS valide.

## Package

~~~text
packages/dreps-gitlab-adapter/
~~~

## Scripts

~~~text
scripts/gitlab/import-gitlab.ts
scripts/gitlab/import-gitlab-ci.ts
scripts/gitlab/import-gitlab-runner.ts
scripts/gitlab/import-gitlab-registry.ts
scripts/gitlab/certify-gitlab-adapter.ts
~~~

## Fixture source

~~~text
labs/supply-chain/environments/gitlab-local/fixtures/gitlab-export.fixture.json
~~~

## Sorties

~~~text
.doctrine/out/gitlab-adapter/gitlab-ci.normalized.json
.doctrine/out/gitlab-adapter/gitlab-runner.normalized.json
.doctrine/out/gitlab-adapter/gitlab-registry.normalized.json
.doctrine/out/gitlab-adapter/evidence-pack.gitlab-local.json
.doctrine/out/gitlab-adapter/gitlab-dreps-graph.mmd
~~~

## Nœuds DREPS GitLab

~~~text
gitlab_instance
gitlab_project
repository
ci_pipeline
build_job
gitlab_runner
registry
container_image
~~~

## Findings GitLab

~~~text
gitlab-runner-privileged
gitlab-runner-docker-sock-mounted
gitlab-runner-latest-image
gitlab-token-too-broad
gitlab-registry-self-signed-cert
gitlab-ci-builds-unsigned-image
~~~

## Graphe attendu

~~~text
gitlab_project
  -> ci_pipeline
  -> gitlab_runner
  -> container_image
  -> registry
~~~

## Commandes

~~~powershell
pnpm gitlab:import:ci
pnpm gitlab:import:runner
pnpm gitlab:import:registry
pnpm gitlab:import
pnpm gitlab:adapter:certify
pnpm supplychain:certify
~~~

## Definition of Done

- Un export GitLab fixture produit un evidence-pack valide.
- Le graphe montre projet → pipeline → runner → image → registry.
- Les findings GitLab sont présents.
- La sortie est validée par `EvidencePackSchema`.
