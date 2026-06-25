# Simulation Engine fixture

This fixture validates Phase 30.

Required scenario:

~~~text
GitLab runner -> registry -> image -> pod -> DB
~~~

Required remediation effect:

~~~text
network-policy-db-egress breaks the path to DB
~~~

Generated outputs:

- `.doctrine/out/simulation/simulation-results.json`
- `.doctrine/out/simulation/attack-path.mmd`
- `.doctrine/out/simulation/timeline.md`
- `.doctrine/out/simulation/before-after-score.json`
