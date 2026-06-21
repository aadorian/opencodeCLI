# Repository ruleset for `master`

This project uses **GitHub Repository Rulesets** (Settings → Rules → Rulesets) as the source of truth for branch protection best practices.

## Rules as code

| File | Purpose |
|------|---------|
| [`.github/rulesets/master-protection.json`](./rulesets/master-protection.json) | Ruleset definition (version controlled) |
| [`scripts/apply-ruleset.js`](../scripts/apply-ruleset.js) | Sync script via GitHub REST API |
| [`.github/workflows/sync-ruleset.yml`](./workflows/sync-ruleset.yml) | Manual workflow to apply/update ruleset |

## Recommended rollout (best practice)

Roll out in phases on the [Repository rules](https://github.com/aadorian/opencodeCLI/settings/rules) page:

| Phase | Enforcement | Who can use |
|-------|-------------|-------------|
| 1. Configure | `disabled` | All plans — rules defined but not blocking |
| 2. Enforce | `active` | All plans — merges blocked until rules pass |
| Audit only | `evaluate` | **GitHub Enterprise only** |

### Current status

Ruleset **Protect master** is synced from this repo. Enable enforcement at:
https://github.com/aadorian/opencodeCLI/settings/rules/17952663

### Apply via GitHub Actions (maintainers)

1. Go to **Actions → Sync Repository Ruleset → Run workflow**
2. Start with `disabled` to verify rules match CI check names
3. Re-run with `active` to enforce on `master`

### Apply locally (repo admin)

```bash
# Audit mode first
node scripts/apply-ruleset.js --enforcement=evaluate

# Then enforce
node scripts/apply-ruleset.js --enforcement=active

# Preview payload
node scripts/apply-ruleset.js --dry-run
```

Requires `gh auth login` with admin access or `GITHUB_TOKEN` with `administration: write`.

### Apply via GitHub UI

1. Open [Settings → Rules → New ruleset](https://github.com/aadorian/opencodeCLI/settings/rules/new?target=branch)
2. Target: **Branch**, include `master`
3. Mirror rules from `master-protection.json`, or import after running sync workflow

## Rules enforced on `master`

| Rule | Setting |
|------|---------|
| Pull request required | 1 approving review |
| Stale reviews | Dismissed on new push |
| Conversation resolution | Required |
| Merge method | Squash only |
| Status checks (strict) | Must pass on latest commit |
| Linear history | Required |
| Force push | Blocked |
| Branch deletion | Blocked |
| Admin bypass | Allowed (audited) |

### Required status checks

These must match CI job names exactly:

- Validate manifest
- Extension tests (ubuntu-latest)
- Extension tests (macos-latest)
- Package VSIX
- Conventional PR title
- Conventional commits
- Branch naming convention

## Repository merge settings

Configure under **Settings → General → Pull Requests**:

- Allow squash merging: **ON** (default method)
- Allow merge commit: **OFF**
- Allow rebase merging: **OFF**
- Automatically delete head branches: **ON** (recommended)

## Legacy branch protection

If an old branch protection rule exists alongside this ruleset, remove it under **Settings → Branches** to avoid conflicting policies. Rulesets supersede classic branch protection.

## Related

- [GIT_WORKFLOW.md](./GIT_WORKFLOW.md)
- [GitHub Repository Rules docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
