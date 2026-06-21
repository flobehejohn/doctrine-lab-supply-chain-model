# GitLab Local Supply Chain Lab

## Objectif

Ce lab fournit le scénario démonstrateur majeur du modèle supply-chain :

GitLab local
→ projet démo
→ GitLab CI
→ runner Docker
→ build image
→ push registry
→ evidence-pack

Le lab est volontairement conçu pour être :

- local ;
- reproductible ;
- auditable ;
- documenté ;
- sécurisé par défaut ;
- modélisable même si l’exécution complète du pipeline n’est pas encore obligatoire.

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

## Architecture locale

~~~text
+-------------------------+
| GitLab local            |
| http://localhost:8080   |
+-----------+-------------+
            |
            | GitLab CI
            v
+-------------------------+
| GitLab Runner Docker    |
| privileged=false défaut |
+-----------+-------------+
            |
            | docker build
            v
+-------------------------+
| Sample image            |
| tag = commit SHA        |
+-----------+-------------+
            |
            | docker push
            v
+-------------------------+
| GitLab Registry         |
| http://localhost:5050   |
+-------------------------+
~~~

## Ports locaux

| Service | Port |
| --- | ---: |
| GitLab HTTP | 8080 |
| GitLab SSH | 2222 |
| Registry | 5050 |

## Commandes principales

Plan sans démarrer Docker :

~~~powershell
.\bootstrap-gitlab-lab.ps1 -Mode plan
~~~

Générer `docker-compose.yml` depuis le template :

~~~powershell
.\bootstrap-gitlab-lab.ps1 -Mode render
~~~

Démarrer le lab :

~~~powershell
.\bootstrap-gitlab-lab.ps1 -Mode up
~~~

Voir le statut :

~~~powershell
.\bootstrap-gitlab-lab.ps1 -Mode status
~~~

Arrêter le lab :

~~~powershell
.\bootstrap-gitlab-lab.ps1 -Mode down
~~~

## Version Bash / WSL

~~~bash
bash bootstrap-gitlab-lab.sh plan
bash bootstrap-gitlab-lab.sh render
bash bootstrap-gitlab-lab.sh up
bash bootstrap-gitlab-lab.sh status
bash bootstrap-gitlab-lab.sh down
~~~

## Projet démo

Le projet démo est situé ici :

~~~text
sample-project/
~~~

Il contient :

- un `Dockerfile` minimal ;
- une `.gitlab-ci.yml` ;
- un README ;
- une image de base épinglée ;
- un tag d’image déterministe basé sur `$CI_COMMIT_SHORT_SHA`.

## Pipeline modèle

~~~text
lint:metadata
  -> build:image
  -> publish:image
~~~

Le pipeline est modélisable même si l’exécution complète dépend ensuite de la configuration réelle du runner.

## Sécurité par défaut

Ce lab évite explicitement :

- les tokens affichés en clair ;
- `validate_certs: false` silencieux ;
- les images `latest` non documentées ;
- le runner `privileged: true` par défaut ;
- les secrets dans le repo ;
- les credentials hardcodés.

## Evidence-pack

Le modèle de preuves est ici :

~~~text
evidence/evidence-pack.gitlab-local.json
~~~

Il documente :

- GitLab local ;
- registry locale ;
- runner Docker ;
- projet démo ;
- image produite ;
- pipeline GitLab CI ;
- contrôles de sécurité ;
- finding associé au Docker-in-Docker en contexte lab.

## Certification

Depuis la racine du repo :

~~~powershell
pnpm gitlab:lab:certify
pnpm supplychain:certify
~~~
