# Git Provenance fixture

This fixture makes Phase 20 deterministic in local development and GitHub Actions.

It models:

- one release tag;
- one unsigned release tag finding;
- one missing release provenance finding;
- force-push risk through branch protection metadata;
- secret history risk through a redacted deterministic scan fixture.

The adapter still reads the real local Git repository for HEAD, branch, recent commits and CODEOWNERS detection.
