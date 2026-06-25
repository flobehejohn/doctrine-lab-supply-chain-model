# Drift Engine fixture

This fixture compares a baseline release and a current release.

It intentionally models:

- `pod_shadow` added outside baseline;
- `no-unsigned-container-image` resolved;
- ISO27001 change-control compliance regression;
- environment configuration drift;
- missing runbook for a critical new pod;
- edge additions and removals;
- node changes.
