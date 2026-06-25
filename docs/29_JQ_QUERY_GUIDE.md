# jq guide - Query Engine

The Query Engine also exports JSON files that can be inspected with jq.

## Query result

~~~bash
jq '.matchedNodes[].id' .doctrine/out/query-engine/query-result.json
~~~

## Policy finding

~~~bash
jq '.finding.id' .doctrine/out/query-engine/policy-query-result.json
~~~

## jtable rows

~~~bash
jq '.rows[] | {id, type, status, exposed, critical}' .doctrine/out/query-engine/query-results.jtable.json
~~~

## Evidence-pack findings

~~~bash
jq '.findings[] | {id, severity, affectedNodes}' .doctrine/out/query-engine/evidence-pack.query-engine.json
~~~
