# GitLab Local Lab Security Model

## Objectif

Définir les règles de sécurité minimales du lab GitLab local.

## Règles

### 1. Aucun token en clair

Les scripts ne doivent jamais afficher :

- registration token ;
- registry password ;
- access token ;
- personal access token ;
- secret GitLab.

Tout secret détecté dans l’environnement doit être masqué :

~~~text
***REDACTED***
~~~

### 2. Pas de `validate_certs: false` silencieux

Le lab ne doit pas introduire de désactivation TLS silencieuse.

Si un certificat local est utilisé plus tard, il devra être documenté comme finding ou comme exception contrôlée.

### 3. Pas de `latest` non documenté

Les images doivent être épinglées.

Exemples attendus :

~~~text
gitlab/gitlab-ce:17.11.2-ce.0
gitlab/gitlab-runner:v17.11.0
alpine:3.20.3
docker:27.5.1-cli
docker:27.5.1-dind
~~~

### 4. Runner non privileged par défaut

Le runner GitLab ne doit pas être `privileged: true` par défaut.

Si une phase future active le mode privileged pour Docker-in-Docker, cela doit être modélisé comme :

- finding ;
- risk acceptance ;
- remediation ;
- evidence.

### 5. Secrets via runtime

Les secrets doivent être fournis via :

- variables d’environnement temporaires ;
- variables CI GitLab masquées ;
- mécanisme de secret local non committé.

### 6. Evidence-pack

Le fichier suivant doit modéliser les risques :

~~~text
evidence/evidence-pack.gitlab-local.json
~~~

Il doit inclure :

- les nœuds ;
- le pipeline ;
- les contrôles ;
- les findings de risque.

## Certification

~~~powershell
pnpm gitlab:lab:certify
~~~
