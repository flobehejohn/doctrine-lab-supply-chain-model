# Phase 19 - Registry Trust

## Objectif

Auditer la confiance de la registry.

## Inspirations

- `cheat-sheet-main/certificates`
- `gitlab-silent-install`

## Package

~~~text
packages/dreps-registry-trust/
~~~

## Scripts

~~~text
scripts/registry-trust/check-registry-cert.ts
scripts/registry-trust/import-registry-trust.ts
scripts/registry-trust/certify-registry-trust.ts
~~~

## Findings

~~~text
registry-cert-expired
registry-cert-expiring-soon
registry-self-signed-cert
registry-untrusted-chain
registry-tls-not-verified-by-ci
~~~

## Fixtures

~~~text
labs/supply-chain/examples/registry-trust-fixture/registry-cert.self-signed.json
labs/supply-chain/examples/registry-trust-fixture/ci-tls-policy.json
~~~

## Evidence

~~~text
evidence_registry_certificate
evidence_registry_ci_tls_policy
evidence_registry_trust_check
~~~

## Definition of Done

- Un certificat registry est importé comme evidence.
- Un certificat self-signed génère un finding.
- La chaîne non fiable génère un finding.
- Le TLS non vérifié par la CI génère un finding.
- Le certificat proche expiration génère un finding.
- `pnpm registry:trust:certify` passe.
- `pnpm supplychain:certify` passe.
