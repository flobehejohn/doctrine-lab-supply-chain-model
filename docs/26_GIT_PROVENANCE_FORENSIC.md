# Phase 20 - Git Provenance / Forensic

## Objectif

Auditer l'historique Git, les tags/releases et les preuves de provenance.

## Inspiration

~~~text
cheat-sheet-main/git
~~~

## Package

~~~text
packages/dreps-git-provenance/
~~~

## Scripts

~~~text
scripts/git-provenance/check-git-provenance.ts
scripts/git-provenance/import-git-provenance.ts
scripts/git-provenance/certify-git-provenance.ts
~~~

## Findings

~~~text
unsigned-release-tag
missing-release-provenance
missing-codeowners
force-push-risk
secret-history-risk
no-release-tags
~~~

## Sorties

~~~text
.doctrine/out/git-provenance/git-provenance.normalized.json
.doctrine/out/git-provenance/evidence-pack.git-provenance.json
~~~

## Definition of Done

- Le repo local produit des nodes/provenance.
- Les tags sont détectés.
- CODEOWNERS est détecté.
- Les releases non signées deviennent findings.
- L'evidence-pack DREPS est valide.
- `pnpm git:provenance:certify` passe.
- `pnpm supplychain:certify` passe.
