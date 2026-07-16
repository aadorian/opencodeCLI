![Create agent example](../media/walkthrough/agent.svg)

Create custom agents with specific instructions and permissions. New to agents? Use **Guided setup** — it walks you through name, description, mode, model, and tools, then creates and opens the agent file for you. Prefer the CLI? Choose **Use opencode CLI** to run:

```bash
opencode agent create
```

Either way you'll define a name and description for your agent. Agents can specialize in areas like testing, code review, or documentation.

### Non-interactive creation

```bash
opencode agent create \
  --path .opencode/agents \
  --description "Specializes in testing" \
  --mode subagent \
  --permissions bash,read,edit,grep
```

### List your agents

```bash
opencode agent list
```

[Learn more about agents](https://opencode.ai/docs/agents/)
