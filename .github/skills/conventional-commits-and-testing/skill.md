---
name: conventional-commits-and-testing
description: Enforce Conventional Commits, follow git workflow best practices, and verify tests before completing work.
---

# Conventional Commits, Git Workflow, and Test Verification

Use this skill whenever preparing commits, branches, or pull requests.

## Commit standards
- Write commit messages in Conventional Commits format:
  - `feat: ...`
  - `fix: ...`
  - `chore: ...`
  - `docs: ...`
  - `refactor: ...`
  - `test: ...`
  - `build: ...`
  - `ci: ...`
  - `perf: ...`
  - `style: ...`
  - `revert: ...`
- Keep the subject lowercase and imperative.
- Use a short summary line, followed by a blank line and a more detailed body when needed.
- Avoid vague messages such as `update` or `misc changes`.

## Git workflow best practices
- Work on a dedicated branch for each task or fix.
- Keep commits small, focused, and logically ordered.
- Prefer rebasing or squashing when needed to keep history clean.
- Do not commit secrets, generated artifacts, or unrelated files.
- Ensure the branch is ready for review before asking for merge.

## Verification before completion
- Run the relevant tests before considering work complete.
- For this repository, use:
  - `npm run validate && npm test`
- If tests fail, investigate and fix the issue before committing.
- If a change affects a narrow area, run the most relevant targeted tests as well.

## Expected behavior
- Commits should be conventional and descriptive.
- The work should be verified before completion.
- The final state should be safe to review and merge.
