## Open Source Examples

This category is a **showcase for real-world OpenCode Walkthrough workflows** in open source repos — configs, prompts, extension settings, and lessons learned.

Use it to share what worked, ask for feedback on your setup, and discover patterns from other contributors.

---

### Maintainer-curated starters

| Example | What it shows |
|---------|----------------|
| [Building the OpenCode Agent Harness](https://github.com/aadorian/opencodeCLI/wiki/Building-the-OpenCode-Agent-Harness) | VS Code–native agent loop on top of the OpenCode CLI |
| [Agent Loop feature plan](https://github.com/aadorian/opencodeCLI/blob/master/.github/FEATURE_PLAN_opencode-agent-loop.md) | Phased harness roadmap and architecture |
| [Good first issues](https://github.com/aadorian/opencodeCLI/issues/17) | Beginner-friendly contribution paths |
| [Git workflow](https://github.com/aadorian/opencodeCLI/blob/master/.github/GIT_WORKFLOW.md) | Branching, conventional commits, and CI |
| [Extension README](https://github.com/aadorian/opencodeCLI/blob/master/README.md) | Commands, views, walkthrough, and settings |

---

### Share your example

When you open a new thread in **Open Source Examples**, include:

1. **Repo or gist link** — public code others can clone or fork
2. **OpenCode features used** — e.g. agents, MCP, `opencode serve`, walkthrough commands
3. **VS Code / extension settings** — relevant `opencode.*` keys or workspace snippets
4. **One thing you learned** — what you'd do differently next time

Short examples are welcome. Maintainers may highlight standout posts in the [wiki](https://github.com/aadorian/opencodeCLI/wiki) or README.

---

### Example prompt templates

**Minimal “run on project files” flow**

```bash
# From the OpenCode sidebar: Run on Project Files
# Select src/ and ask:
Review this folder for missing error handling and suggest patches.
```

**Agent harness smoke test**

```bash
opencode --version
opencode auth status
# In VS Code: OpenCode → Agent sidebar → New session
```

**Custom agent sketch (`opencode.json`)**

```json
{
  "agents": {
    "doc-writer": {
      "description": "Updates README and walkthrough steps from code changes",
      "prompt": "You improve docs only. Prefer small, reviewable edits."
    }
  }
}
```

Adapt these to your repo and post your variant as a new discussion.
