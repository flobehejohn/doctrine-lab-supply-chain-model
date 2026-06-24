# Phase 17 - Kubernetes et Terraform adapters

## Objectif

Relier code, CI, image et runtime.

Le graphe attendu relie :

~~~text
image -> workload -> pod -> service -> ingress -> database
~~~

## Scripts

~~~text
scripts/adapters/import-k8s.ts
scripts/adapters/import-terraform.ts
scripts/adapters/import-runtime-evidence-pack.ts
scripts/adapters/certify-runtime-adapters.ts
~~~

## Entrées

~~~text
labs/supply-chain/examples/runtime-fixture/k8s-full.yaml
labs/supply-chain/examples/runtime-fixture/terraform-plan.json
labs/supply-chain/examples/runtime-fixture/terraform-state.json
~~~

## Nœuds

~~~text
k8s_cluster
k8s_namespace
k8s_workload
k8s_pod
k8s_service
ingress
database
secret
configmap
cloud_resource
container_image
~~~

Note importante : dans le schéma DREPS actuel, `configmap` et `cloud_resource` sont des IDs de nœuds, mais leur `type` est `artifact`, car `configmap` et `cloud_resource` ne sont pas encore des valeurs natives de `NodeTypeSchema`.

## Sorties

~~~text
.doctrine/out/runtime/k8s.normalized.json
.doctrine/out/runtime/terraform.normalized.json
.doctrine/out/runtime/evidence-pack.runtime.json
.doctrine/out/runtime/runtime-graph.mmd
~~~

## Commandes

~~~powershell
pnpm runtime:import:k8s
pnpm runtime:import:terraform
pnpm runtime:import
pnpm runtime:certify
pnpm supplychain:certify
~~~

## Definition of Done

- `k8s-full.yaml` est importé.
- `terraform-plan.json` est importé.
- `terraform-state.json` est importé.
- Un evidence-pack DREPS valide est généré.
- Le graphe relie image → workload → pod → service → ingress → database.
