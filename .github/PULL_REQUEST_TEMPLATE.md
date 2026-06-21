## Description

Briefly describe the change and what it accomplishes.

Closes #(issue)

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Other

## Checklist

- [ ] CI checks pass (validate, tests, VSIX package)
- [ ] I have tested my changes in the Extension Development Host (**F5**)
- [ ] I have updated the walkthrough content if needed
- [ ] My PR title follows [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat: add auth walkthrough step`)

## Review locally

```bash
git fetch origin pull/ID/head:pr-ID && git checkout pr-ID
npm ci && npm test
```

Press **F5** in VS Code to launch the Extension Development Host.

For in-editor PR review, use the [GitHub Pull Requests extension](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-pull-request-github) — see [GitHub Pull Requests in VS Code](https://code.visualstudio.com/blogs/2018/09/10/introducing-github-pullrequests).

## Screenshots (if applicable)
