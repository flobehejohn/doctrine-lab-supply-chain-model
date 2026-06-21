# Phase 14 - GitLab Local Lab

## Objectif

Créer le scénario démonstrateur majeur du lab supply-chain.

Le scénario cible :

~~~text
GitLab local
→ projet démo
→ GitLab CI
→ runner Docker
→ build image
→ push registry
→ evidence-pack
~~~

## Dossier

~~~text
labs/supply-chain/environments/gitlab-local/
~~~

## Livrables

~~~text
README.md
RUNBOOK.md
SECURITY_MODEL.md
docker-compose.template.yml
bootstrap-gitlab-lab.ps1
bootstrap-gitlab-lab.sh
sample-project/
  README.md
  Dockerfile
  .gitlab-ci.yml
evidence/
  evidence-pack.gitlab-local.json
~~~

## Commandes

Depuis la racine du repo :

~~~powershell
pnpm gitlab:lab:certify
pnpm supplychain:certify
~~~

Depuis le dossier du lab :

~~~powershell
.\bootstrap-gitlab-lab.ps1 -Mode plan
.\bootstrap-gitlab-lab.ps1 -Mode render
.\bootstrap-gitlab-lab.ps1 -Mode up
.\bootstrap-gitlab-lab.ps1 -Mode status
.\bootstrap-gitlab-lab.ps1 -Mode down
~~~

## Ce qu’on évite

### Pas de token affiché en clair

Le bootstrap masque les tokens détectés :

~~~text
***REDACTED***
~~~

### Pas de `validate_certs false` silencieux

Aucun fichier du lab ne doit introduire ce contournement.

### Pas de `latest` non documenté

Les images sont épinglées :

~~~text
gitlab/gitlab-ce:17.11.2-ce.0
gitlab/gitlab-runner:v17.11.0
alpine:3.20.3
docker:27.5.1-cli
docker:27.5.1-dind
~~~

### Pas de runner privileged par défaut

Le runner n’est pas configuré en `privileged: true`.

Si une phase ultérieure a besoin du mode privileged pour Docker-in-Docker, elle devra produire :

- finding ;
- justification ;
- mitigation ;
- evidence ;
- rollback.

## Evidence-pack

~~~text
labs/supply-chain/environments/gitlab-local/evidence/evidence-pack.gitlab-local.json
~~~

Il modélise :

- GitLab local ;
- registry locale ;
- runner Docker ;
- projet démo ;
- image ;
- pipeline ;
- contrôles ;
- finding DIND.

## Definition of Done

- Le lab démarre localement via `bootstrap-gitlab-lab.ps1 -Mode up`.
- Un projet démo existe.
- Le pipeline est modélisable même si on ne l’exécute pas encore totalement.
- La certification vérifie les fichiers, les règles de sécurité et l’evidence-pack.
