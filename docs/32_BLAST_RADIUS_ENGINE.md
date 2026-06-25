# Phase 25 - Blast Radius Engine

## Objectif

Calculer l'impact potentiel d'une compromission.

## Package

~~~text
packages/dreps-blast-radius-engine/
~~~

## Entrées

~~~text
startNode
scenario
maxDepth
edgeWeights
controlBlocks
~~~

## Sorties

~~~text
.doctrine/out/blast-radius/blast-radius-report.json
.doctrine/out/blast-radius/blast-radius.mmd
.doctrine/out/blast-radius/blast-radius-summary.jtable.json
.doctrine/out/blast-radius/blast-radius-summary.md
~~~

Le rapport contient :

~~~text
topPropagationPaths
criticalNodes
sensitiveDataNodes
blastRadiusScore
controlsThatWouldBlock
~~~

## Definition of Done

Depuis `repo-auth-service`, le moteur atteint :

~~~text
pipeline-auth-service
image-auth-service
workload-auth-api
pod-auth-api
db-auth-users
~~~

Les chemins sont exportables en Mermaid.

jtable affiche le résumé.
