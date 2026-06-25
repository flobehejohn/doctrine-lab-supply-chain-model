# Remediation Engine fixture

This fixture contains critical and high findings.

Absolute remediation contract:

- findingId
- affectedNodes
- strategy
- risk
- commands
- patches
- verification
- rollback
- approvalRequired
- maintenanceWindow

Definition of Done:

- every critical finding has at least one remediation;
- every remediation has verification;
- every remediation has rollback.
