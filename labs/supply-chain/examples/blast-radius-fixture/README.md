# Blast Radius Engine fixture

This fixture models a compromise starting from `repo-auth-service`.

The expected propagation path is:

~~~text
repo-auth-service
  -> pipeline-auth-service
  -> image-auth-service
  -> registry-prod
  -> workload-auth-api
  -> pod-auth-api
  -> db-auth-users
~~~

The engine must export:

- blast-radius-report.json
- blast-radius.mmd
- blast-radius-summary.jtable.json
- blast-radius-summary.md
