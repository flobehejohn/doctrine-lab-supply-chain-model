# GitLab Runner Hardening

## Goal
Harden runner execution so untrusted jobs cannot alter trusted delivery paths.

## Checks
- Verify runner executor and privileged mode.
- Restrict runners to protected refs when needed.
- Separate shared and sensitive runners.

## Commands
- gitlab-runner.audit-config
- gitlab-runner.lock-protected

## Verification
Runner configuration is documented and mapped to protected delivery flows.

## Rollback
Revert only through approved platform change control.
