# Phase 18 - Security Scan adapters

## Objectif

Importer des findings sécurité dans DREPS.

## Outils

~~~text
Trivy
Syft
Checkov
Kubescape
SonarQube
Dependency-Track
~~~

## Scripts

~~~text
scripts/security-scans/import-trivy.ts
scripts/security-scans/import-syft.ts
scripts/security-scans/import-checkov.ts
scripts/security-scans/import-kubescape.ts
scripts/security-scans/import-sonarqube.ts
scripts/security-scans/import-dependency-track.ts
scripts/security-scans/import-security-evidence-pack.ts
scripts/security-scans/certify-security-scans.ts
~~~

## Fixtures

~~~text
labs/supply-chain/examples/security-scans-fixture/trivy.json
labs/supply-chain/examples/security-scans-fixture/syft.json
labs/supply-chain/examples/security-scans-fixture/checkov.json
labs/supply-chain/examples/security-scans-fixture/kubescape.json
labs/supply-chain/examples/security-scans-fixture/sonarqube.json
labs/supply-chain/examples/security-scans-fixture/dependency-track.json
~~~

## Sortie

~~~text
.doctrine/out/security-scans/evidence-pack.security-scans.json
~~~

## Liens attendus

~~~text
Trivy finding      -> container_image
Kubescape finding -> k8s_namespace / k8s_pod
Checkov finding   -> k8s_workload / database
SonarQube finding -> repository
Dependency-Track  -> repository
Syft              -> SBOM evidence
~~~

## Definition of Done

- Un finding Trivy est relié à une image.
- Un finding Kubescape est relié à un namespace/pod.
- Un finding Checkov est relié à Terraform/K8s YAML.
- Les findings sont injectés dans un evidence-pack DREPS valide.
- `pnpm security:scans:certify` passe.
- `pnpm supplychain:certify` passe.
