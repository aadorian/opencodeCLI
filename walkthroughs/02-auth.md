![Configure OpenCode providers](../media/walkthrough/auth.svg)

Before running prompts, connect an LLM provider. See the [OpenCode docs](https://opencode.ai/docs) for setup options.

**Log in from the terminal:**

```bash
opencode auth login
```

**Or configure in the interactive TUI:**

```bash
opencode
/connect
```

You can use [OpenCode Zen](https://opencode.ai), GitHub Copilot, ChatGPT Plus/Pro, or any provider supported via [Models.dev](https://opencode.ai/docs/providers).

Verify configured providers:

```bash
opencode auth ls
```
