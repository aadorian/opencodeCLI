## Description

Briefly describe the change and what it accomplishes.

Closes #(issue)

## Type of change

- [ ] Bug fix (`fix:` → label `bug`)
- [ ] New feature (`feat:` → label `enhancement`)
- [ ] Documentation update (`docs:` → label `documentation`)
- [ ] CI / tooling (`ci:` → label `ci`)
- [ ] Tests (`test:` → label `testing`)
- [ ] Other

## Metadata

CI fills most sidebar fields when the PR opens. Verify or complete the rest:

| Field | Expected |
| --- | --- |
| **Reviewers** | Auto-requested from [CODEOWNERS](./CODEOWNERS) |
| **Assignees** | You (PR author), set automatically |
| **Labels** | From PR title prefix + linked issue labels + changed paths |
| **Milestone** | Maintainer sets when targeting a release (e.g. `v0.0.2`) |
| **Projects** | Optional — add if tracked on a GitHub Project board |

Guide: [PR metadata](./PR_METADATA.md)

## Checklist

- [ ] Branch name follows convention (`feat/`, `fix/`, `docs/`, `ci/`, etc.) — see [Git workflow](.github/GIT_WORKFLOW.md)
- [ ] PR title uses [Conventional Commits](https://www.conventionalcommits.org/) (`fix:`, `feat:`, …)
- [ ] Body includes `Closes #N` when fixing an issue
- [ ] CI checks pass (validate, tests, VSIX package, commit lint)
- [ ] I have tested my changes in the Extension Development Host (**F5**)
- [ ] I have updated the walkthrough content if needed

## Review locally

```bash
git fetch origin pull/ID/head:pr-ID && git checkout pr-ID
npm ci && npm test
```

Press **F5** in VS Code to launch the Extension Development Host.

For in-editor PR review, use the [GitHub Pull Requests extension](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-pull-request-github) — see [GitHub Pull Requests in VS Code](https://code.visualstudio.com/blogs/2018/09/10/introducing-github-pullrequests).

## Screenshots (if applicable)
