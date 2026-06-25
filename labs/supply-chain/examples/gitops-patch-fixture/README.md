# GitOps Patch Engine fixture

This fixture turns remediation advice into a PR-ready GitOps patch.

Expected generated outputs:

- `.doctrine/out/gitops-patch/patch.diff`
- `.doctrine/out/gitops-patch/remediation-plan.json`
- `.doctrine/out/gitops-patch/pull-request-body.md`
- `.doctrine/out/gitops-patch/verification.ps1`
- `.doctrine/out/gitops-patch/rollback.md`
- `.doctrine/out/gitops-patch/pull-request-tables.jtable.json`

The generated patch must be applicable with:

~~~bash
git apply --check .doctrine/out/gitops-patch/patch.diff
~~~
