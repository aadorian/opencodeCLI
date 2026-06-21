# Contributing

Thanks for your interest in contributing to the OpenCode Walkthrough extension!

## Getting Started

1. Fork the repository
2. Clone your fork
3. Open the project in VS Code
4. Press `F5` to launch the Extension Development Host

## Making Changes

- Follow the existing code style
- Update walkthrough markdown files in `walkthroughs/`
- Update `package.json` if adding new steps

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add step for configuring API key
fix: correct typo in install walkthrough
docs: update usage instructions
```

## Pull Requests

1. Create a feature branch from `master`
2. Make your changes
3. Test by running the extension in the dev host
4. Submit a PR with a clear description of the change

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
