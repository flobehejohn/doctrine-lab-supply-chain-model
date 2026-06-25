# Phase 26 - Compliance Mapper

## Objectif

Traduire technique vers conformité.

## Package

~~~text
packages/dreps-compliance-engine/
~~~

## Frameworks

~~~text
SLSA
DORA
NIS2
ISO27001
CIS_KUBERNETES
OWASP_ASVS
OWASP_SAMM
~~~

## Mappings

~~~text
.doctrine/compliance.map.slsa.json
.doctrine/compliance.map.dora.json
.doctrine/compliance.map.nis2.json
.doctrine/compliance.map.iso27001.json
.doctrine/compliance.map.cis-kubernetes.json
.doctrine/compliance.map.owasp-asvs.json
.doctrine/compliance.map.owasp-samm.json
~~~

## Sorties

~~~text
.doctrine/out/compliance/compliance-impact-report.json
.doctrine/out/compliance/compliance-summary.md
.doctrine/out/compliance/compliance-impact.jtable.json
~~~

## Definition of Done

- Une image non signée produit un impact SLSA.
- Un pod vulnérable exposé produit un impact DORA/NIS2.
- Un runner privileged produit un impact supply chain.
- Les impacts portent `affectedNodes` et `evidenceRefs`.
- `pnpm compliance:certify` passe.
- `pnpm supplychain:certify` passe.
