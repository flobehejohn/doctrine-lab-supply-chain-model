# Registry Certificate Trust

## Goal
Validate registry certificate and signature trust before deployment.

## Commands
- registry-certificates.inspect-image-signature
- registry-certificates.verify-signature-policy

## Verification
Unsigned images are rejected or explicitly flagged.

## Rollback
Rollback temporary trust exceptions after remediation.
