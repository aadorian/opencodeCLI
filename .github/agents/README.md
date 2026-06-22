# GitHub Copilot custom agents

Repository agents for [aadorian/opencodeCLI](https://github.com/aadorian/opencodeCLI). They appear in GitHub Copilot (cloud agent, VS Code, and CLI) and on the [Agents tab](https://github.com/aadorian/opencodeCLI/agents).

| Agent | File | Use when |
| --- | --- | --- |
| **opencode_extension** | [opencode-extension.agent.md](./opencode-extension.agent.md) | Commands, trees, webviews, settings, bug fixes |
| **opencode_harness** | [opencode-harness.agent.md](./opencode-harness.agent.md) | Agent loop, tools, context, chat panel (#31) |
| **issue_triage** | [issue-triage.agent.md](./issue-triage.agent.md) | Labeling issues, milestones, duplicates |
| **release_maintainer** | [release-maintainer.agent.md](./release-maintainer.agent.md) | Version bumps, VSIX, Marketplace releases |
| **docs_writer** | [docs-writer.agent.md](./docs-writer.agent.md) | Walkthroughs, README, roadmap docs |

Shared instructions for all agents: [AGENTS.md](../../AGENTS.md) and [copilot-instructions.md](../copilot-instructions.md).

## Add or edit an agent

1. Create or edit `*.agent.md` in this folder with YAML frontmatter (`description` is required)
2. Commit with `docs:` or `ci:` and open a PR
3. Agents are versioned by git SHA on the branch Copilot uses

See [GitHub Docs — Custom agents configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration).
