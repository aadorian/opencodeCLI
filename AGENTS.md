# OpenCode Walkthrough — agent instructions

This repository is the **OpenCode Walkthrough** VS Code extension: walkthrough onboarding, sidebar trees, CLI command palette actions, and an in-editor agent harness on top of the [OpenCode CLI](https://opencode.ai/docs/cli/).

## Architecture

| Area | Location |
| --- | --- |
| Extension entry | `extension.js` |
| Harness (loop, tools, context) | `lib/agentLoop.js`, `lib/tools.js`, `lib/context.js`, `lib/agentPanel.js`, `lib/server.js` |
| CLI helpers | `lib/cli.js`, `lib/env.js`, `lib/sessions.js`, `lib/health.js` |
| Manifest & commands | `package.json` |
| Walkthrough content | `walkthroughs/`, `media/walkthrough/` |
| Tests | `test/extension.test.js`, `test/harness.test.js` |
| CI / release | `.github/workflows/` |

OpenCode runs in the integrated terminal via `sendToTerminal()` with env vars from VS Code settings (`lib/env.js`). Prefer extending existing modules over duplicating terminal dispatch logic.

## Workflow

1. Branch from `master`: `feat/`, `fix/`, `docs/`, `ci/`, `build/`, etc. — see [.github/GIT_WORKFLOW.md](.github/GIT_WORKFLOW.md)
2. Use [Conventional Commits](https://www.conventionalcommits.org/) for commits and PR titles
3. Before pushing: `npm ci && npm run validate && npm test`
4. Package VSIX: `npm run publish`
5. Link issues in PR body: `Closes #N`

## Conventions

- **Minimal diffs** — match existing style; no drive-by refactors
- **Manifest changes** — update `walkthroughs/` when adding walkthrough steps; run `npm run validate`
- **Publisher ID** — `AlejandroAdorjan` (VS Code Marketplace)
- **Settings prefix** — `opencode.*` in `package.json` (not `opcode.*`)
- **Tree refresh commands** — wire sidebar refresh rows to the correct command IDs in `extension.js`

## Roadmap & issues

- [Extension roadmap](.github/ROADMAP.md) · [Milestones](.github/MILESTONES.md)
- [Agent Loop epic #31](https://github.com/aadorian/opencodeCLI/issues/31) · [Good first issues #17](https://github.com/aadorian/opencodeCLI/issues/17)

## Custom agents

Specialized GitHub Copilot agents live in [.github/agents/](.github/agents/). Browse them at [github.com/aadorian/opencodeCLI/agents](https://github.com/aadorian/opencodeCLI/agents).
