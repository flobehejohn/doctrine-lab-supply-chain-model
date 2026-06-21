# GitLab Local Lab Runbook

## 1. Préflight

Depuis la racine du repo :

~~~powershell
Set-Location "C:\ATLAS\INBOX\dev\ecole_dev_lib\doctrine-lab-supply-chain-model"
pnpm gitlab:lab:certify
~~~

Depuis le dossier du lab :

~~~powershell
Set-Location "labs/supply-chain/environments/gitlab-local"
.\bootstrap-gitlab-lab.ps1 -Mode plan
~~~

## 2. Rendu du compose local

~~~powershell
.\bootstrap-gitlab-lab.ps1 -Mode render
~~~

Cela crée :

~~~text
docker-compose.yml
~~~

Ce fichier est généré localement et ne doit pas être committé.

## 3. Démarrage

~~~powershell
.\bootstrap-gitlab-lab.ps1 -Mode up
~~~

GitLab peut prendre plusieurs minutes à devenir disponible.

URL locale :

~~~text
http://localhost:8080
~~~

Registry :

~~~text
http://localhost:5050
~~~

SSH :

~~~text
localhost:2222
~~~

## 4. Statut

~~~powershell
.\bootstrap-gitlab-lab.ps1 -Mode status
~~~

## 5. Projet démo

Le projet source est dans :

~~~text
sample-project/
~~~

À importer ou créer dans GitLab local.

## 6. Runner

Le runner est présent dans `docker-compose.template.yml`, mais l’enregistrement réel dépend d’un token local GitLab.

Le token ne doit pas être écrit en clair dans le repo.

Exemple d’injection temporaire :

~~~powershell
$env:GITLAB_RUNNER_REGISTRATION_TOKEN = "..."
~~~

Le script masque sa présence :

~~~text
***REDACTED***
~~~

## 7. Build image

Le pipeline modèle utilise :

~~~text
$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
~~~

Pas de tag `latest` implicite.

## 8. Arrêt

~~~powershell
.\bootstrap-gitlab-lab.ps1 -Mode down
~~~

## 9. Limites connues

Ce lab modélise le pipeline GitLab CI. L’exécution complète peut nécessiter :

- configuration effective du runner ;
- autorisations Docker locales ;
- ajustement de la stratégie Docker-in-Docker ;
- création du projet dans GitLab local.

## 10. Critère de réussite Phase 14

La Phase 14 est réussie si :

- le lab est présent ;
- les scripts bootstrap existent ;
- le projet démo existe ;
- la CI est modélisée ;
- l’evidence-pack existe ;
- les contrôles de sécurité passent ;
- `pnpm gitlab:lab:certify` passe ;
- `pnpm supplychain:certify` passe.
