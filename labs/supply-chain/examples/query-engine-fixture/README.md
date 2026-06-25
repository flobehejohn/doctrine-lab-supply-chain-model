# Query Engine fixture

This fixture gives Phase 22 deterministic query input.

It contains:

- one critical exposed vulnerable pod;
- one safe pod;
- one exposed service;
- one ingress;
- one critical database;
- one OPA/Rego-style policy with Doctrine metadata comments.

Supported query examples:

~~~text
FIND pods WHERE exposed = true AND critical
nodes[?type=='k8s_pod' && status=='vulnerable']
~~~
