# Registry Trust fixture

This fixture models a local registry certificate trust audit.

It intentionally contains:

- a self-signed certificate;
- an untrusted certificate chain;
- an expiration date close to the deterministic audit date;
- a CI policy declaring TLS verification as disabled for the local fixture.

The goal is to make Phase 19 reproducible in local development and GitHub Actions without requiring a live registry or OpenSSL.
