![Create agent example](../media/walkthrough/agent.svg)

Create custom agents with specific instructions and permissions:

```bash
opencode agent create
```

You'll be prompted to name your agent and describe what it should do. Agents can specialize in areas like testing, code review, or documentation.

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
