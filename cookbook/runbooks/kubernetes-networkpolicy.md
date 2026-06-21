# Kubernetes NetworkPolicy

## Goal
Reduce blast radius for critical pods by applying explicit network policy.

## Commands
- kubernetes.inspect-networkpolicy
- kubernetes.apply-networkpolicy
- kubernetes.verify-networkpolicy
- kubernetes.rollback-networkpolicy

## Verification
The auth-api pod remains healthy and only expected traffic is allowed.

## Rollback
Delete the NetworkPolicy if legitimate traffic is blocked.
