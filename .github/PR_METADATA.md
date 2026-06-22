# Pull request metadata

When you open a PR (especially one that **Closes #N**), fill or verify the sidebar fields below. CI applies most of this automatically; maintainers finish anything that still needs a human decision.

## Automatic (CI + CODEOWNERS)

| Field | What happens |
| --- | --- |
| **Reviewers** | GitHub requests review from [CODEOWNERS](./CODEOWNERS) (`@aadorian`) |
| **Assignees** | PR author is assigned on open |
| **Labels** | From (1) Conventional Commit prefix in the title and (2) labels on the linked issue, plus [path-based labels](./labeler.yml) |

### Title prefix → label

| PR title prefix | Label applied |
| --- | --- |
| `fix:` | `bug` |
| `feat:` | `enhancement` |
| `docs:` | `documentation` |
| `test:` | `testing` |
| `ci:` | `ci` |

Link the issue in the PR body so its labels carry over:

```markdown
Closes #14
```

## Manual (maintainers)

| Field | When to set | Suggested values |
| --- | --- | --- |
| **Milestone** | Bug fix or feature scheduled for a release | Create milestones such as `v0.0.2` or `Backlog` in **Issues → Milestones**, then assign the PR |
| **Projects** | Tracking on a board | Add to your GitHub Project when the team uses one |
| **Labels (extra)** | Scope or priority | `help wanted`, `good first issue`, `question`, `wontfix` |

## Example: PR for issue #14

| Field | Value |
| --- | --- |
| Reviewers | `@aadorian` (auto) |
| Assignees | PR author (auto) |
| Labels | `bug`, `good first issue` (from issue + `fix:` title) |
| Milestone | `v0.0.2` (maintainer, when cut) |
| Projects | Optional — extension backlog board |

## `gh` shortcuts

```bash
# After opening a PR
gh pr edit <number> --add-label "bug" --add-assignee @me
gh pr edit <number> --add-reviewer aadorian
gh pr edit <number> --milestone "v0.0.2"
```

See also [Contributing](../CONTRIBUTING.md) and [Pull request template](./PULL_REQUEST_TEMPLATE.md).
