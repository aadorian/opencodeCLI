# OpenCode Walkthrough — Documentation

| Article | Description |
|---------|-------------|
| [Building the OpenCode Agent Harness](./building-opencode-agent-harness.md) | How we built a VS Code–native agent loop on top of the OpenCode CLI |
| [Agent Loop feature plan](../.github/FEATURE_PLAN_opencode-agent-loop.md) | Phased roadmap and architecture (internal planning doc) |
| [Git workflow](../.github/GIT_WORKFLOW.md) | Branching, commits, and CI for contributors |
| [Open Source Examples](./discussions/open-source-examples.md) | [Discussion hub](https://github.com/aadorian/opencodeCLI/discussions/33) — structured forms in [`.github/DISCUSSION_TEMPLATE/`](../.github/DISCUSSION_TEMPLATE/) |

### Publish to GitHub Wiki

GitHub provisions the wiki git repository only after the **first page is saved in the browser**.

```bash
npm run wiki:init    # one-time: save Home in Chrome (sign in if prompted)
npm run wiki:push    # sync docs/ → GitHub Wiki
npm run wiki:verify  # confirm Home + article pages exist
```
