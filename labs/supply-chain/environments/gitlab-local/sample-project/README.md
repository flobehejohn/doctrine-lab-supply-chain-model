# Doctrine GitLab Local Sample Project

## Objectif

Projet minimal pour démontrer une chaîne GitLab CI locale :

source
→ CI
→ Docker build
→ registry locale
→ evidence-pack

## Fichiers

~~~text
README.md
Dockerfile
.gitlab-ci.yml
~~~

## Build local

~~~bash
docker build -t doctrine/gitlab-local-sample:0.1.0 .
~~~

## Image

L’image utilise une base épinglée :

~~~text
alpine:3.20.3
~~~

Pas de `latest`.

## Pipeline CI

Le pipeline contient :

- `lint:metadata`
- `build:image`
- `publish:image`

Le tag image attendu est :

~~~text
$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
~~~

## Secrets

Le login registry utilise :

~~~text
--password-stdin
~~~

Aucun mot de passe ne doit être affiché dans les logs.
