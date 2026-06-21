# Unsigned Container Image

## Goal
Detect, document and remediate unsigned container images.

## Commands
- registry-certificates.inspect-image-signature
- registry-certificates.verify-signature-policy
- remediation.revert-image-policy

## Verification
The image signature policy is visible and the unsigned image finding remains auditable.

## Rollback
Temporary exceptions must be reverted and documented.
