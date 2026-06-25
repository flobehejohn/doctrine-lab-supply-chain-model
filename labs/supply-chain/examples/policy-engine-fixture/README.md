# Policy Engine fixture

This fixture gives Phase 23 deterministic policy inputs.

It models:

- a public critical vulnerable pod;
- an unsigned container image;
- a privileged GitLab runner;
- a runner with Docker socket mounted;
- an untrusted self-signed registry;
- critical nodes without runbooks.

Each policy generates a normalized DREPS finding with:

- `affectedNodes`;
- `evidenceRefs`;
- severity;
- remediation;
- compliance impact.
