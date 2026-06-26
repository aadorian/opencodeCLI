# Contributing

Thanks for your interest in contributing to the OpenCode Walkthrough extension!

## Git workflow

This project follows **GitHub Flow** with Conventional Commits. Read the full guide:

**[.github/GIT_WORKFLOW.md](./.github/GIT_WORKFLOW.md)**

Quick reference:

```bash
# 1. Branch from master
git checkout master && git pull origin master
git checkout -b feat/my-feature

# 2. Commit (Conventional Commits)
git commit -m "feat: add my feature"

# 3. Validate and test
npm ci && npm run validate && npm test

# 4. Push and open PR
git push -u origin feat/my-feature
gh pr create --title "feat: add my feature" --body "Closes #N"
```

Enable the commit message template locally:

```bash
git config commit.template .gitmessage
```

Contributors are credited in [CONTRIBUTORS.md](./CONTRIBUTORS.md).

## Getting Started

1. Fork the repository
2. Clone your fork and add upstream: `git remote add upstream https://github.com/aadorian/opencodeCLI.git`
3. Open the project in VS Code
4. Press `F5` to launch the Extension Development Host

See the full **[extension roadmap](.github/ROADMAP.md)** and the ordered checklist in [issue #17](https://github.com/aadorian/opencodeCLI/issues/17).

## GitHub Copilot agents

Custom agents for this repo live in [`.github/agents/`](.github/agents/). Browse and assign them at **[github.com/aadorian/opencodeCLI/agents](https://github.com/aadorian/opencodeCLI/agents)**. Shared instructions: [`AGENTS.md`](./AGENTS.md) and [`.github/copilot-instructions.md`](.github/copilot-instructions.md).

## Making Changes

- Follow the existing code style
- Update walkthrough markdown files in `walkthroughs/`
- Update `package.json` if adding new steps
- Run `npm run validate` before pushing

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add step for configuring API key
fix: correct typo in install walkthrough
docs: update usage instructions
ci: add release workflow
```

PR titles and commits are validated by CI. See [commitlint config](./.github/commitlint.config.mjs).

## Pull Requests

1. Create a branch from `master` using the naming convention (`feat/`, `fix/`, etc.)
2. Make your changes and test locally (**F5** + `npm test`)
3. Ensure CI passes (validate, tests, VSIX package, commit lint, branch name)
4. Submit a PR with a Conventional Commit title
5. Request review or wait for CODEOWNERS approval

Review in VS Code with the [GitHub Pull Requests extension](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-pull-request-github).

New contributor? Start with the [good first issues roadmap](https://github.com/aadorian/opencodeCLI/issues/17).

## Releases

Maintainers cut releases by tagging `v*` on `master`. See [Git workflow — Releases](./.github/GIT_WORKFLOW.md#releases).

### PR sidebar metadata

When you fix an issue or open a PR, do not leave the sidebar empty. Use **`Closes #N`** in the body and a Conventional Commit title so CI can fill most fields automatically.

| Field | How it gets set |
| --- | --- |
| **Reviewers** | [CODEOWNERS](.github/CODEOWNERS) → review requested from `@aadorian` |
| **Assignees** | PR author (automatic via [pull-request-metadata workflow](.github/workflows/pull-request-metadata.yml)) |
| **Labels** | PR title prefix + linked issue labels + [path-based labeler](.github/labeler.yml) |
| **Milestone** | Maintainer assigns when scheduling a release |
| **Projects** | Optional — add to your GitHub Project board if you use one |

Full guide: [.github/PR_METADATA.md](.github/PR_METADATA.md)

Example for a bug fix PR:

```bash
gh pr create --title "fix: wire Models tree Refresh to refreshModels" --body "Closes #14"
# After merge workflow runs: assignee + labels bug, good first issue
gh pr edit <number> --add-reviewer aadorian --milestone "v0.0.2"  # milestone when it exists
```

## Code of Conduct

Please note that this project adheres to a [Code of Conduct](./CODE_OF_CONDUCT.md). By participating you agree to its terms.
