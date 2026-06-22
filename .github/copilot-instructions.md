# Copilot instructions — OpenCode Walkthrough

You are working on a **VS Code extension** (JavaScript, CommonJS, VS Code Extension API 1.74+). The extension bridges VS Code to the **OpenCode CLI** — it does not embed an LLM.

## Do

- Read `extension.js` and relevant `lib/*.js` before changing behavior
- Keep activation events, commands, views, and settings in sync in `package.json`
- Use `sendToTerminal()` + `buildEnvExports()` for CLI dispatch unless implementing harness APIs (`lib/agentLoop.js`, `lib/server.js`)
- Run `npm run validate && npm test` after manifest or command changes
- Follow Conventional Commits and branch naming in `.github/GIT_WORKFLOW.md`
- Reference open issues and `.github/ROADMAP.md` when scoping work

## Don't

- Change publisher ID (`AlejandroAdorjan`) or extension ID without updating tests in `test/extension.test.js`
- Add large dependencies without justification — extension VSIX should stay small (~30 KB)
- Commit secrets, `.env`, or wiki sync artifacts (`.wiki-push/`, `.wiki-sync/`)
- Use `release:` as a commit type — use `build:` or `chore:` for release prep

## Key files for common tasks

| Task | Files |
| --- | --- |
| New command | `package.json` → `extension.js` → `test/extension.test.js` |
| Sidebar tree | `extension.js` (Provider class) + `package.json` views |
| Walkthrough step | `walkthroughs/*.md`, `package.json` walkthroughs, `media/walkthrough/` |
| Agent harness | `lib/agentLoop.js`, `lib/tools.js`, `lib/context.js`, `lib/agentPanel.js` |
| Release / VSIX | `package.json`, `CHANGELOG.md`, `.vscodeignore`, `.github/workflows/release.yml` |

Use custom agents in `.github/agents/` for focused tasks (extension fixes, harness, docs, releases, triage).
