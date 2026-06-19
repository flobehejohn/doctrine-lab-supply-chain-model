# Third Party Research

## Objectif

Ce document trace les sources d'inspiration externes utilisees pour construire Doctrine Supply Chain Mode Lab en logique clean-room.

## Regle generale

Le projet ne copie pas de code externe sans verification explicite de licence, attribution et compatibilite.

## Sources d'inspiration

### jtable

Usage autorise dans ce lab : dependance optionnelle de reporting si la licence est compatible.

Decision : ne pas copier son code dans le coeur Doctrine. Le lab peut produire des vues JSON, Markdown ou YAML consommables par un outil de table externe.

### cheat-sheet-main

Usage autorise : inspiration documentaire pour cookbook operateur, Markdown, Mermaid, Marp, Kubernetes training, Git forensic, certificats, jq et JMESPath.

Decision : pas de copie directe. Les commandes doivent etre reecrites, contextualisees et testees.

### gitlab-silent-install

Usage autorise : inspiration pour un scenario GitLab local comprenant GitLab, registry, runner, pipeline et image.

Decision : pas de reprise directe des scripts. Les scripts du lab doivent etre reecrits avec logs propres, masquage des secrets et options explicites.

### ops-framework

Usage autorise : inspiration architecturale pour command runner, safe logger, artifact pipeline, workflow DAG et template engine.

Decision : pas de copie directe. Les primitives dangereuses comme eval, shell implicite ou execution destructive sans approbation sont interdites.

### Doctrine Platform

Usage autorise : source conceptuelle interne pour preuve, audit-pack, certification, compliance mapping et scoring.

Decision : le lab open source expose une base pedagogique et certifiable. Les couches premium avancees restent separables.

