# Phase 32 - Signature / in-toto / SLSA

## Objectif

Rendre l'audit-pack vérifiable.

## Livrables

~~~text
.doctrine/out/signature/audit-pack.sha256.json
.doctrine/out/signature/in-toto.statement.json
.doctrine/out/signature/cosign.bundle
.doctrine/out/signature/release-keyless.yml
.doctrine/out/signature/verification-guide.md
.github/workflows/release-keyless.yml
~~~

## Definition of Done

- L'audit-pack peut être hashé.
- Une attestation in-toto est produite.
- Une signature keyless est prévue en CI.
- Le guide de vérification est inclus.
- `pnpm signature:certify` passe.
- `pnpm supplychain:certify` passe.
