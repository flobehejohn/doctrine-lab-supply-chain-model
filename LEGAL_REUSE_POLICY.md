# Legal Reuse Policy

## Objectif

Definir ce qui peut etre copie, reecrit, cite ou exclu.

## Ce qu'on peut copier

- Du code original ecrit dans ce repository.
- Des extraits de configuration generiques si leur licence l'autorise.
- Des schemas ou interfaces crees specifiquement pour ce projet.
- Des exemples minimaux produits pour les fixtures du lab.

## Ce qu'on reecrit

- Les scripts d'installation.
- Les commandes operateur.
- Les workflows CI/CD.
- Les runbooks.
- Les templates de reporting.
- Les schemas DREPS.
- Les adaptateurs GitLab, GitHub, Docker, Kubernetes et scanners.

## Ce qu'on ne reprend pas

- Code externe non licence clairement.
- Scripts dangereux sans comprehension complete.
- Secrets, tokens, certificats prives ou donnees client.
- Configurations contenant des endpoints ou identifiants reels.
- Workflows tiers complexes copies sans attribution.

## Citation des recherches

Chaque source externe significative doit etre referencee dans THIRD_PARTY_RESEARCH.md avec :

- nom de la source ;
- role dans le projet ;
- type de reutilisation ;
- decision clean-room ;
- niveau de risque juridique.

## Politique de dependances

Toute dependance doit etre ajoutee explicitement dans package.json et justifiee par usage.

Les dependances de reporting restent optionnelles quand elles ne sont pas necessaires au moteur DREPS.

