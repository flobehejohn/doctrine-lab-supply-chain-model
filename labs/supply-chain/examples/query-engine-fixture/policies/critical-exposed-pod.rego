package doctrine.query

# doctrine-query: FIND pods WHERE exposed = true AND critical
# doctrine-finding-id: policy-critical-exposed-pod
# doctrine-finding-title: Critical exposed pod matched by query policy
# doctrine-finding-severity: high

deny[msg] {
  input.type == "k8s_pod"
  input.exposed == true
  input.critical == true
  msg := sprintf("critical exposed pod: %s", [input.id])
}
