# Recommended branch protection rules for `master`
#
# Apply these in GitHub: Settings → Branches → Add branch protection rule
# Pattern: master
#
# These cannot be enforced from the repository alone; this file documents
# the intended policy aligned with .github/GIT_WORKFLOW.md

required_status_checks:
  strict: true
  contexts:
    - Validate manifest
    - Extension tests (ubuntu-latest)
    - Extension tests (macos-latest)
    - Package VSIX
    - Conventional PR title
    - Conventional commits
    - Branch naming convention

required_pull_request_reviews:
  required_approving_review_count: 1
  dismiss_stale_reviews: true

required_conversation_resolution: true

required_linear_history: true

allow_force_pushes: false
allow_deletions: false

enforce_admins: false

restrictions: null

# Merge settings (Settings → General → Pull Requests):
# - Allow squash merging: ON (default merge method)
# - Allow merge commit: OFF
# - Allow rebase merging: OFF
