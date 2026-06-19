# Phase 3 - Graph Engine minimal

## Objectif

Transformer un DREPS Evidence Pack en graphe exploitable.

## Fonctions

- buildGraph()
- buildGraphMetrics()
- validateGraphIntegrity()
- findNodeById()
- findIncomingEdges()
- findOutgoingEdges()
- findFindingsForNode()
- findRemediationsForFinding()

## Definition of Done

- Le moteur compte nodes, edges, findings et remediations.
- Le moteur detecte une edge vers un noeud manquant.
- Le moteur detecte un finding vers un noeud manquant.
- Le moteur retourne les findings d'un pod vulnerable.

