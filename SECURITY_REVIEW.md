# Security Review

## Objectif

Eviter que le lab devienne un generateur de scripts dangereux ou de fuites de secrets.

## Regles de securite

- Aucun secret en clair dans les fixtures.
- Aucun token dans les logs.
- Aucune commande destructive sans approvalRequired.
- Aucune commande remote_write sans approvalRequired.
- Aucun audit-pack ne doit contenir de credentials.
- Aucun script ne doit utiliser eval.
- Aucun script ne doit executer une commande distante implicite.
- Les operations de suppression doivent etre explicites et locales.

## Niveaux de risque des commandes

- read_only : lecture locale ou inspection.
- local_write : ecriture locale reversible.
- remote_write : modification distante.
- destructive : suppression ou action irreversible.
- credential_sensitive : manipulation de secrets.
- production_risk : impact potentiel sur production.

## Regle d'approbation

Les niveaux remote_write, destructive, credential_sensitive et production_risk exigent approvalRequired=true.

## Verification Phase 2

Le schema DREPS doit rejeter :

- un finding sans affectedNodes ;
- une remediation sans rollback ;
- une commande dangereuse sans approvalRequired.

