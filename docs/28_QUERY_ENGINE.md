# Phase 22 - Query Engine

## Objectif

Interroger le graphe DREPS.

## Moteurs

~~~text
Doctrine DSL
JMESPath-lite
OPA/Rego policy metadata
jtable views
jq guide
~~~

## Package

~~~text
packages/dreps-query-engine/
~~~

## Exemple DSL

~~~text
FIND pods WHERE exposed = true AND critical
~~~

## Exemple JMESPath

~~~text
nodes[?type=='k8s_pod' && status=='vulnerable']
~~~

## Scripts

~~~text
pnpm query:engine:run
pnpm query:engine:jmespath
pnpm query:engine:policy
pnpm query:engine:certify
~~~

## Sorties

~~~text
.doctrine/out/query-engine/query-result.json
.doctrine/out/query-engine/policy-query-result.json
.doctrine/out/query-engine/query-results.jtable.json
.doctrine/out/query-engine/evidence-pack.query-engine.json
~~~

## Definition of Done

- Une query retourne des nodes.
- Une query peut être utilisée en CI.
- Une query peut produire un finding si une policy est associée.
- Une vue jtable peut afficher les résultats.
- `pnpm query:engine:certify` passe.
- `pnpm supplychain:certify` passe.
