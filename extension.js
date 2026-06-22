const vscode = require('vscode');
const { exec } = require('child_process');
const { buildEnvExports } = require('./lib/env');
const { checkInstall, getGitBranch } = require('./lib/cli');
const { checkHealth } = require('./lib/health');
const { listSessions } = require('./lib/sessions');
const { ServerManager } = require('./lib/server');
const { ToolRegistry } = require('./lib/tools');
const { AgentLoop } = require('./lib/agentLoop');
const { AgentPanelProvider } = require('./lib/agentPanel');

function sendToTerminal(text) {
  const prefix = buildEnvExports(() => vscode.workspace.getConfiguration());
  const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal('OpenCode');
  terminal.show();
  const fullText = prefix.length > 0 ? prefix.join(' && ') + ' && ' + text : text;
  terminal.sendText(fullText);
}

class AgentTreeItem extends vscode.TreeItem {
  constructor(label, description, icon, command) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.iconPath = new vscode.ThemeIcon(icon);
    this.command = { command, title: '', arguments: [] };
    this.contextValue = 'agent';
  }
}

class AgentsProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.items = [];
  }

  refresh() {
    exec('opencode agent list 2>/dev/null || true', (err, stdout) => {
      this.items = [];
      if (!err && stdout) {
        for (const line of stdout.trim().split('\n')) {
          const m = line.match(/^(\S+)\s+(.+)/);
          if (m) this.items.push(new AgentTreeItem(m[1], m[2].trim(), 'robot', 'opencode-walkthrough.listAgents'));
        }
      }
      if (this.items.length === 0) {
        this.items.push(new AgentTreeItem('No agents found', 'Create one to get started', 'info', 'opencode-walkthrough.createAgent'));
      }
      this.items.push(new AgentTreeItem('+ Create New Agent', '', 'add', 'opencode-walkthrough.createAgent'));
      this._onDidChangeTreeData.fire();
    });
  }

  getTreeItem(el) { return el; }
  getChildren(el) { return el ? [] : this.items; }
}

class McpTreeItem extends vscode.TreeItem {
  constructor(label, description, icon, command) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.iconPath = new vscode.ThemeIcon(icon);
    this.command = { command, title: '', arguments: [] };
    this.contextValue = 'mcp';
  }
}

class McpProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.items = [];
  }

  refresh() {
    exec('opencode mcp list 2>/dev/null || true', (err, stdout) => {
      this.items = [];
      if (!err && stdout) {
        for (const line of stdout.trim().split('\n')) {
          const m = line.match(/^(\S+)\s+(.+)/);
          if (m) this.items.push(new McpTreeItem(m[1], m[2].trim(), 'plug', 'opencode-walkthrough.listMcp'));
        }
      }
      if (this.items.length === 0) {
        this.items.push(new McpTreeItem('No MCP servers', 'Add one to get started', 'info', 'opencode-walkthrough.addMcp'));
      }
      this.items.push(new McpTreeItem('+ Add MCP Server', '', 'add', 'opencode-walkthrough.addMcp'));
      this._onDidChangeTreeData.fire();
    });
  }

  getTreeItem(el) { return el; }
  getChildren(el) { return el ? [] : this.items; }
}

class SessionTreeItem extends vscode.TreeItem {
  constructor(label, description, icon, id, cmd) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.iconPath = new vscode.ThemeIcon(icon);
    this.sessionId = id;
    this.command = { command: cmd, title: '', arguments: id ? [id] : [] };
    this.contextValue = 'session';
  }
}

class SessionsProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.items = [];
  }

  refresh() {
    listSessions().then(sessions => {
      this.items = [];
      for (const s of sessions.slice(0, 20)) {
        const label = s.title || s.id || 'Untitled';
        const desc = s.model || (s.id ? `Session ${s.id.slice(0, 8)}` : '');
        const cmd = s.id ? 'opencode-walkthrough.resumeSession' : 'opencode-walkthrough.sessionList';
        this.items.push(new SessionTreeItem(label, desc, 'history', s.id, cmd));
      }
      if (this.items.length === 0) {
        this.items.push(new SessionTreeItem('No sessions yet', 'Run a prompt to start one', 'info', '', 'opencode-walkthrough.runInline'));
      }
      this._onDidChangeTreeData.fire();
    });
  }

  getTreeItem(el) { return el; }
  getChildren(el) { return el ? [] : this.items; }
}

class ModelsTreeItem extends vscode.TreeItem {
  constructor(label, description, icon, cmd) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.iconPath = new vscode.ThemeIcon(icon);
    this.command = { command: cmd, title: '', arguments: [] };
    this.contextValue = 'model';
  }
}

class ModelsProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.items = [];
  }

  refresh() {
    exec('opencode models 2>/dev/null || true', (err, stdout) => {
      this.items = [];
      if (!err && stdout) {
        const groups = {};
        for (const line of stdout.trim().split('\n')) {
          const m = line.match(/^(\S+)\/(\S+)/);
          if (m) {
            (groups[m[1]] = groups[m[1]] || []).push(m[2]);
          } else if (line.trim()) {
            this.items.push(new ModelsTreeItem(line.trim(), '', 'symbol-parameter', 'opencode-walkthrough.listModels'));
          }
        }
        for (const [provider, models] of Object.entries(groups)) {
          const parent = new vscode.TreeItem(provider, vscode.TreeItemCollapsibleState.Collapsed);
          parent.iconPath = new vscode.ThemeIcon('server');
          parent.contextValue = 'provider';
          parent.children = models.map(m => new ModelsTreeItem(m, provider, 'symbol-parameter', 'opencode-walkthrough.listModels'));
          this.items.push(parent);
        }
      }
      if (this.items.length === 0) {
        this.items.push(new ModelsTreeItem('No models found', 'Configure a provider and auth login', 'info', 'opencode-walkthrough.authLogin'));
      }
      this.items.push(new ModelsTreeItem('$(sync) Refresh Models', '', 'refresh', 'opencode-walkthrough.refreshModels'));
      this._onDidChangeTreeData.fire();
    });
  }

  getTreeItem(el) {
    if (el.children) {
      el.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
      el.command = undefined;
    }
    return el;
  }
  getChildren(el) { return el ? (el.children || []) : this.items; }
}

function getTipsHtml() {
  const tips = [
    {
      title: 'Getting Started',
      items: [
        'Install OpenCode globally: `sudo npm install -g opencode`',
        'Verify your install: `opencode --version`',
        'Run `opencode` without arguments to start the interactive TUI',
        'Pass a prompt directly: `opencode run "write a sorting function"`',
        'Open the walkthrough via **Help > Get Started > OpenCode Walkthrough**',
      ],
    },
    {
      title: 'Interactive Mode',
      items: [
        'Start with `opencode` for a chat-like experience with follow-ups',
        'Type `/help` in the TUI to see available slash commands',
        'Use `opencode run` for one-shot prompts without interactive mode',
        'Refine code by asking follow-ups in the same session',
        'Review the session tree when available: `opencode session list`',
      ],
    },
    {
      title: 'Working with Files',
      items: [
        'Use `opencode run --file path/to/file "prompt"` to process specific files',
        'From VS Code, use **Run on Project Files** (`⌥⌘P`) to select files via dialog',
        'The `--file` flag can be repeated for multiple files',
        'OpenCode respects `.gitignore` — excluded files are skipped',
      ],
    },
    {
      title: 'Agents',
      items: [
        'Create a custom agent: `opencode agent create`',
        'List your agents: `opencode agent list`',
        'Agents can have specific instructions, permissions, and skill sets',
        'Use background subagents for parallel tasks (enable experimental setting)',
        'The Scout subagent helps find relevant files during tasks',
      ],
    },
    {
      title: 'MCP Servers',
      items: [
        'Add an MCP server: `opencode mcp add`',
        'List connected servers: `opencode mcp list`',
        'MCP servers extend OpenCode with custom tools and data sources',
        'Manage MCP servers from the **MCP Servers** panel in VS Code',
      ],
    },
    {
      title: 'Authentication',
      items: [
        'Log in to a provider: `opencode auth login`',
        'View authenticated providers: `opencode auth ls`',
        'Configure API keys in your OpenCode config file',
        'Use the `opencode.serverPassword` and `opencode.serverUsername` settings for HTTP auth',
      ],
    },
    {
      title: 'Models & Configuration',
      items: [
        'List available models: `opencode models`',
        'Set a custom models URL with `opencode.modelsUrl` setting',
        'Disable fetching models remotely: `opencode.disableModelsFetch`',
        'Set log level: `opencode.logLevel = DEBUG|INFO|WARN|ERROR`',
        'All 23 VS Code settings map to OpenCode environment variables automatically',
      ],
    },
    {
      title: 'Stats & Monitoring',
      items: [
        'View token usage and costs: `opencode stats`',
        'Quick stats from the editor toolbar: click the **Stats** button',
        'Track sessions: `opencode session list`',
        'Use the Status Bar **OpenCode** item for quick command access',
      ],
    },
    {
      title: 'Server & Web',
      items: [
        'Start a headless server: `opencode serve`',
        'Start the web interface: `opencode web`',
        'Configure HTTP auth with username/password settings',
        'Use `opencode upgrade` to update to the latest version',
      ],
    },
    {
      title: 'Keyboard Shortcuts',
      items: [
        '`⌘⌥O` — Show Actions quick pick',
        '`⌘⌥I` — Run Inline Prompt',
        '`⌘⌥P` — Run on Project Files',
        '`⌘⌥T` — Start Interactive Session',
        '`⌘⌥H` — CLI Help',
        '`⌘⌥S` — Stats',
      ],
    },
  ];

  const sections = tips.map(s => `
    <details open>
      <summary><strong>${s.title}</strong></summary>
      <ul>
        ${s.items.map(i => `<li>${i}</li>`).join('\n        ')}
      </ul>
    </details>
  `).join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.6;
    }
    h1 {
      font-size: 1.8em;
      font-weight: 600;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .subtitle {
      color: var(--vscode-descriptionForeground);
      margin-top: 0;
      margin-bottom: 24px;
      font-size: 1em;
    }
    details {
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-sideBar-border);
      border-radius: 6px;
      padding: 8px 16px;
      margin-bottom: 8px;
    }
    summary {
      cursor: pointer;
      padding: 4px 0;
      font-size: 1.05em;
      color: var(--vscode-sideBarTitle-foreground);
    }
    summary::-webkit-details-marker {
      color: var(--vscode-textLink-foreground);
    }
    ul {
      padding-left: 20px;
      margin: 8px 0 4px;
    }
    li {
      margin-bottom: 6px;
    }
    code {
      font-family: var(--vscode-editor-font-family);
      font-size: 0.92em;
      background: var(--vscode-textCodeBlock-background);
      padding: 1px 6px;
      border-radius: 3px;
    }
    strong {
      color: var(--vscode-editor-foreground);
    }
    hr {
      border: none;
      border-top: 1px solid var(--vscode-sideBar-border);
      margin: 20px 0;
    }
  </style>
  <title>OpenCode Tips & Tricks</title>
</head>
<body>
  <h1>OpenCode Tips & Tricks</h1>
  <p class="subtitle">Use these tips and tricks to be productive with the OpenCode CLI.</p>
  ${sections}
  <hr>
  <p style="color: var(--vscode-descriptionForeground); font-size: 0.9em;">
    <a href="https://opencode.ai" style="color: var(--vscode-textLink-foreground);">opencode.ai</a>
    &nbsp;·&nbsp; Learn more in the <a href="https://opencode.ai/docs" style="color: var(--vscode-textLink-foreground);">documentation</a>
  </p>
</body>
</html>`;
}

function getAgentsHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.6;
    }
    h1 { font-size: 1.8em; font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    .subtitle { color: var(--vscode-descriptionForeground); margin-top: 0; margin-bottom: 24px; }
    .section {
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-sideBar-border);
      border-radius: 6px;
      padding: 16px 20px;
      margin-bottom: 12px;
    }
    .section h2 { margin: 0 0 8px; font-size: 1.15em; display: flex; align-items: center; gap: 8px; }
    .section p { margin: 0 0 12px; color: var(--vscode-descriptionForeground); }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .actions a {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 14px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-radius: 4px;
      text-decoration: none;
      font-size: 0.92em;
      cursor: pointer;
    }
    .actions a:hover { background: var(--vscode-button-hoverBackground); }
    .actions a.sec {
      background: var(--vscode-sideBar-background);
      color: var(--vscode-textLink-foreground);
      border: 1px solid var(--vscode-sideBar-border);
    }
    .actions a.sec:hover { background: var(--vscode-list-hoverBackground); }
    ul { padding-left: 20px; margin: 8px 0; }
    li { margin-bottom: 4px; }
    code {
      font-family: var(--vscode-editor-font-family);
      font-size: 0.92em;
      background: var(--vscode-textCodeBlock-background);
      padding: 1px 6px;
      border-radius: 3px;
    }
    hr { border: none; border-top: 1px solid var(--vscode-sideBar-border); margin: 20px 0; }
  </style>
  <title>OpenCode Agents</title>
</head>
<body>
  <h1>$(robot) OpenCode Agents</h1>
  <p class="subtitle">Create custom agents with specific instructions, permissions, and models.</p>

  <div class="section">
    <h2>$(robot) Agents</h2>
    <p>Agents are specialized configurations that define how OpenCode behaves for different tasks. Each agent can have its own system prompt, tool permissions, and model.</p>
    <ul>
      <li>Create agents with custom system prompts</li>
      <li>Control which tools each agent can use (<code>bash</code>, <code>read</code>, <code>edit</code>, etc.)</li>
      <li>Assign a specific model per agent</li>
      <li>Choose from <code>all</code>, <code>primary</code>, or <code>subagent</code> modes</li>
    </ul>
    <div class="actions">
      <a href="command:opencode-walkthrough.createAgent">Create Agent</a>
      <a href="command:opencode-walkthrough.listAgents" class="sec">List Agents</a>
      <a href="https://opencode.ai/docs/agents" class="sec">Documentation</a>
    </div>
  </div>

  <div class="section">
    <h2>$(symbol-parameter) Models</h2>
    <p>View and manage the models available through your configured providers.</p>
    <ul>
      <li>List all models from configured providers</li>
      <li>Filter by provider ID</li>
      <li>Refresh the models cache</li>
      <li>Use <code>provider/model</code> format to specify a model</li>
    </ul>
    <div class="actions">
      <a href="command:opencode-walkthrough.listModels">List Models</a>
      <a href="command:opencode-walkthrough.showModels" class="sec">Models Overview</a>
      <a href="https://opencode.ai/docs/models" class="sec">Documentation</a>
    </div>
  </div>

  <div class="section">
    <h2>$(key) Providers</h2>
    <p>Configure API keys for LLM providers to use with OpenCode.</p>
    <div class="actions">
      <a href="command:opencode-walkthrough.authLogin">Auth Login</a>
      <a href="command:opencode-walkthrough.authList" class="sec">Auth List</a>
      <a href="https://opencode.ai/docs/providers" class="sec">Documentation</a>
    </div>
  </div>

  <hr>
  <p style="color: var(--vscode-descriptionForeground); font-size: 0.9em;">
    <a href="https://opencode.ai" style="color: var(--vscode-textLink-foreground);">opencode.ai</a>
    &nbsp;·&nbsp; <a href="https://opencode.ai/docs/agents" style="color: var(--vscode-textLink-foreground);">Agent Documentation</a>
  </p>
</body>
</html>`;
}

function getModelsHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.6;
    }
    h1 { font-size: 1.8em; font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    .subtitle { color: var(--vscode-descriptionForeground); margin-top: 0; margin-bottom: 24px; }
    .section {
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-sideBar-border);
      border-radius: 6px;
      padding: 16px 20px;
      margin-bottom: 12px;
    }
    .section h2 { margin: 0 0 8px; font-size: 1.15em; display: flex; align-items: center; gap: 8px; }
    .section p { margin: 0 0 12px; color: var(--vscode-descriptionForeground); }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .actions a {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 14px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-radius: 4px;
      text-decoration: none;
      font-size: 0.92em;
      cursor: pointer;
    }
    .actions a:hover { background: var(--vscode-button-hoverBackground); }
    .actions a.sec {
      background: var(--vscode-sideBar-background);
      color: var(--vscode-textLink-foreground);
      border: 1px solid var(--vscode-sideBar-border);
    }
    .actions a.sec:hover { background: var(--vscode-list-hoverBackground); }
    ul { padding-left: 20px; margin: 8px 0; }
    li { margin-bottom: 4px; }
    code {
      font-family: var(--vscode-editor-font-family);
      font-size: 0.92em;
      background: var(--vscode-textCodeBlock-background);
      padding: 1px 6px;
      border-radius: 3px;
    }
    hr { border: none; border-top: 1px solid var(--vscode-sideBar-border); margin: 20px 0; }
  </style>
  <title>OpenCode Models</title>
</head>
<body>
  <h1>$(symbol-parameter) OpenCode Models</h1>
  <p class="subtitle">Browse and manage models available through your configured LLM providers.</p>

  <div class="section">
    <h2>$(symbol-parameter) Available Models</h2>
    <p>OpenCode supports models from multiple providers. Use the commands below to list your configured models.</p>
    <ul>
      <li>Models are listed in <code>provider/model</code> format</li>
      <li>Filter by provider: <code>opencode models anthropic</code></li>
      <li>Refresh the cache with <code>--refresh</code> to see newly added models</li>
      <li>Pass <code>--verbose</code> to see metadata and costs</li>
    </ul>
    <div class="actions">
      <a href="command:opencode-walkthrough.listModels">List All Models</a>
      <a href="command:opencode-walkthrough.showAgents" class="sec">Agents Overview</a>
      <a href="https://opencode.ai/docs/models" class="sec">Documentation</a>
    </div>
  </div>

  <div class="section">
    <h2>$(server) Local Models</h2>
    <p>Run models locally using providers like Ollama, LM Studio, or vLLM.</p>
    <ul>
      <li>Configure local providers in your <code>opencode.json</code></li>
      <li>Set <code>baseURL</code> to point to your local server</li>
      <li>Use the same <code>provider/model</code> format in prompts</li>
    </ul>
    <div class="actions">
      <a href="https://opencode.ai/docs/models" class="sec">Local Model Docs</a>
    </div>
  </div>

  <div class="section">
    <h2>$(key) Provider Setup</h2>
    <p>Before listing models, authenticate with your preferred provider.</p>
    <div class="actions">
      <a href="command:opencode-walkthrough.authLogin">Auth Login</a>
      <a href="command:opencode-walkthrough.authList" class="sec">Auth List</a>
      <a href="https://opencode.ai/docs/providers" class="sec">Provider Docs</a>
    </div>
  </div>

  <hr>
  <p style="color: var(--vscode-descriptionForeground); font-size: 0.9em;">
    <a href="https://opencode.ai" style="color: var(--vscode-textLink-foreground);">opencode.ai</a>
    &nbsp;·&nbsp; <a href="https://opencode.ai/docs/models" style="color: var(--vscode-textLink-foreground);">Model Documentation</a>
  </p>
</body>
</html>`;
}

function activate(context) {
  const getConfig = () => vscode.workspace.getConfiguration();
  const outputChannel = vscode.window.createOutputChannel('OpenCode Agent');
  const log = msg => outputChannel.appendLine(msg);

  const serverManager = new ServerManager(getConfig);
  const toolRegistry = new ToolRegistry(getConfig, { log });
  const agentLoop = new AgentLoop({
    vscode,
    getConfig,
    serverManager,
    toolRegistry,
    options: { log },
  });
  const agentPanelProvider = new AgentPanelProvider(agentLoop, checkHealth);

  checkHealth().then(health => {
    if (!health.installed) {
      vscode.window.setStatusBarMessage('OpenCode: CLI not installed', 5000);
    } else if (!health.ready) {
      vscode.window.setStatusBarMessage(health.message, 5000);
    }
  });

  const showWalkthrough = vscode.commands.registerCommand('opencode-walkthrough.showWalkthrough', () => {
    vscode.commands.executeCommand('workbench.action.openWalkthrough', 'aadorian.opencode-walkthrough#opencode.gettingStarted');
  });

  const installCmd = vscode.commands.registerCommand('opencode-walkthrough.install', async () => {
    const version = await checkInstall();
    if (version) {
      vscode.window.showInformationMessage(`OpenCode is already installed (${version})`);
    } else {
      sendToTerminal('sudo npm install -g opencode');
    }
  });

  const runCmd = vscode.commands.registerCommand('opencode-walkthrough.runInline', async () => {
    const version = await checkInstall();
    if (!version) {
      sendToTerminal('echo "OpenCode is not installed. Install it with:" && echo "  sudo npm install -g opencode" && echo "Or visit: https://github.com/anomalyco/opencode"');
      const action = await vscode.window.showWarningMessage(
        'OpenCode is not installed. Install it from GitHub.',
        'Open GitHub',
        'Install'
      );
      if (action === 'Open GitHub') {
        vscode.env.openExternal(vscode.Uri.parse('https://github.com/anomalyco/opencode'));
      } else if (action === 'Install') {
        vscode.commands.executeCommand('opencode-walkthrough.install');
      }
      return;
    }

    const prompt = await vscode.window.showInputBox({
      placeHolder: 'What do you want OpenCode to do?',
      prompt: 'Run an inline prompt via opencode run',
      ignoreFocusOut: true,
    });
    if (!prompt) return;

    const folders = vscode.workspace.workspaceFolders;
    const cwd = folders?.[0]?.uri.fsPath;
    const term = cwd
      ? vscode.window.createTerminal({ name: 'OpenCode', cwd })
      : (vscode.window.activeTerminal ?? vscode.window.createTerminal('OpenCode'));
    term.show();
    const envPrefix = buildEnvExports(() => vscode.workspace.getConfiguration());
    const escaped = prompt.replace(/"/g, '\\"');
    const fullCmd = envPrefix.length > 0
      ? envPrefix.join(' && ') + ` && opencode run "${escaped}"`
      : `opencode run "${escaped}"`;
    term.sendText(fullCmd);
  });

  const interactiveCmd = vscode.commands.registerCommand('opencode-walkthrough.runInteractive', () => {
    sendToTerminal('opencode');
  });

  const createAgentCmd = vscode.commands.registerCommand('opencode-walkthrough.createAgent', () => {
    sendToTerminal('opencode agent create');
  });

  const listAgentsCmd = vscode.commands.registerCommand('opencode-walkthrough.listAgents', () => {
    sendToTerminal('opencode agent list');
  });

  const addMcpCmd = vscode.commands.registerCommand('opencode-walkthrough.addMcp', () => {
    sendToTerminal('opencode mcp add');
  });

  const listMcpCmd = vscode.commands.registerCommand('opencode-walkthrough.listMcp', () => {
    sendToTerminal('opencode mcp list');
  });

  const authLoginCmd = vscode.commands.registerCommand('opencode-walkthrough.authLogin', () => {
    sendToTerminal('opencode auth login');
  });

  const authListCmd = vscode.commands.registerCommand('opencode-walkthrough.authList', () => {
    sendToTerminal('opencode auth ls');
  });

  const modelsCmd = vscode.commands.registerCommand('opencode-walkthrough.listModels', () => {
    sendToTerminal('opencode models');
  });

  const sessionListCmd = vscode.commands.registerCommand('opencode-walkthrough.sessionList', () => {
    sendToTerminal('opencode session list');
  });

  const statsCmd = vscode.commands.registerCommand('opencode-walkthrough.stats', () => {
    sendToTerminal('opencode stats');
  });

  const upgradeCmd = vscode.commands.registerCommand('opencode-walkthrough.upgrade', () => {
    sendToTerminal('opencode upgrade');
  });

  const serveCmd = vscode.commands.registerCommand('opencode-walkthrough.serve', () => {
    sendToTerminal('opencode serve');
  });

  const webCmd = vscode.commands.registerCommand('opencode-walkthrough.web', () => {
    sendToTerminal('opencode web');
  });

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = '$(terminal) OpenCode';
  statusBarItem.tooltip = 'OpenCode — Click to run an action';
  statusBarItem.command = 'opencode-walkthrough.showActions';
  statusBarItem.show();

  const agentsItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
  agentsItem.text = '$(robot) Agents';
  agentsItem.tooltip = 'OpenCode Agents — Click to list agents';
  agentsItem.command = 'opencode-walkthrough.listAgents';
  agentsItem.show();

  const showActionsCmd = vscode.commands.registerCommand('opencode-walkthrough.showActions', () => {
    vscode.window.showQuickPick([
      { label: '$(book) Show Walkthrough', command: 'opencode-walkthrough.showWalkthrough' },
      { label: '$(lightbulb) Tips & Tricks', command: 'opencode-walkthrough.showTips' },
      { label: '$(cloud-download) Install CLI', command: 'opencode-walkthrough.install' },
      { label: '$(play) Run Inline Prompt', command: 'opencode-walkthrough.runInline' },
      { label: '$(hubot) Start Agent Session', command: 'opencode-walkthrough.startAgent' },
      { label: '$(folder) Run on Project Files', command: 'opencode-walkthrough.runOnProject' },
      { label: '$(terminal) Start Interactive', command: 'opencode-walkthrough.runInteractive' },
      { label: '$(robot) Agents Overview', command: 'opencode-walkthrough.showAgents' },
      { label: '$(symbol-parameter) Models Overview', command: 'opencode-walkthrough.showModels' },
      { label: '$(robot) Create Agent', command: 'opencode-walkthrough.createAgent' },
      { label: '$(list-tree) List Agents', command: 'opencode-walkthrough.listAgents' },
      { label: '$(key) Auth Login', command: 'opencode-walkthrough.authLogin' },
      { label: '$(key) Auth List', command: 'opencode-walkthrough.authList' },
      { label: '$(plug) Add MCP Server', command: 'opencode-walkthrough.addMcp' },
      { label: '$(list-tree) List MCP Servers', command: 'opencode-walkthrough.listMcp' },
      { label: '$(symbol-parameter) List Models', command: 'opencode-walkthrough.listModels' },
      { label: '$(list-tree) List Sessions', command: 'opencode-walkthrough.sessionList' },
      { label: '$(graph) Stats', command: 'opencode-walkthrough.stats' },
      { label: '$(server) Start Server', command: 'opencode-walkthrough.serve' },
      { label: '$(globe) Start Web', command: 'opencode-walkthrough.web' },
      { label: '$(arrow-up) Upgrade CLI', command: 'opencode-walkthrough.upgrade' },
    ]).then(selected => {
      if (selected) {
        vscode.commands.executeCommand(selected.command);
      }
    });
  });

  const showCliHelpCmd = vscode.commands.registerCommand('opencode-walkthrough.showCliHelp', () => {
    vscode.window.showQuickPick([
      { label: '$(terminal) opencode', description: 'Start the TUI', command: 'opencode-walkthrough.runInteractive' },
      { label: '$(play) opencode run', description: 'Run a prompt', command: 'opencode-walkthrough.runInline' },
      { label: '$(folder) opencode run --file', description: 'Run on selected project files', command: 'opencode-walkthrough.runOnProject' },
      { label: '$(robot) opencode agent create', description: 'Create an agent', command: 'opencode-walkthrough.createAgent' },
      { label: '$(list-tree) opencode agent list', description: 'List agents', command: 'opencode-walkthrough.listAgents' },
      { label: '$(key) opencode auth login', description: 'Log in to a provider', command: 'opencode-walkthrough.authLogin' },
      { label: '$(key) opencode auth list', description: 'List authenticated providers', command: 'opencode-walkthrough.authList' },
      { label: '$(plug) opencode mcp add', description: 'Add an MCP server', command: 'opencode-walkthrough.addMcp' },
      { label: '$(list-tree) opencode mcp list', description: 'List MCP servers', command: 'opencode-walkthrough.listMcp' },
      { label: '$(symbol-parameter) opencode models', description: 'List available models', command: 'opencode-walkthrough.listModels' },
      { label: '$(list-tree) opencode session list', description: 'List sessions', command: 'opencode-walkthrough.sessionList' },
      { label: '$(graph) opencode stats', description: 'Token usage and costs', command: 'opencode-walkthrough.stats' },
      { label: '$(server) opencode serve', description: 'Start a headless server', command: 'opencode-walkthrough.serve' },
      { label: '$(globe) opencode web', description: 'Start web interface', command: 'opencode-walkthrough.web' },
      { label: '$(arrow-up) opencode upgrade', description: 'Upgrade the CLI', command: 'opencode-walkthrough.upgrade' },
    ]).then(selected => {
      if (selected) {
        vscode.commands.executeCommand(selected.command);
      }
    });
  });

  const showTipsCmd = vscode.commands.registerCommand('opencode-walkthrough.showTips', () => {
    const panel = vscode.window.createWebviewPanel(
      'opencodeTips',
      'OpenCode Tips & Tricks',
      vscode.ViewColumn.One,
      { enableScripts: false }
    );
    panel.webview.html = getTipsHtml();
  });

  const showAgentsCmd = vscode.commands.registerCommand('opencode-walkthrough.showAgents', () => {
    const panel = vscode.window.createWebviewPanel(
      'opencodeAgents',
      'OpenCode Agents',
      vscode.ViewColumn.One,
      { enableScripts: false }
    );
    panel.webview.html = getAgentsHtml();
  });

  const showModelsCmd = vscode.commands.registerCommand('opencode-walkthrough.showModels', () => {
    const panel = vscode.window.createWebviewPanel(
      'opencodeModels',
      'OpenCode Models',
      vscode.ViewColumn.One,
      { enableScripts: false }
    );
    panel.webview.html = getModelsHtml();
  });

  const runOnProjectCmd = vscode.commands.registerCommand('opencode-walkthrough.runOnProject', async () => {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      vscode.window.showErrorMessage('Open a workspace folder first.');
      return;
    }
    const folder = folders.length === 1
      ? folders[0]
      : await vscode.window.showQuickPick(
          folders.map(f => ({ label: f.name, description: f.uri.fsPath, folder: f })),
          { placeHolder: 'Select a project' }
        ).then(p => p?.folder);
    if (!folder) return;

    const branch = await getGitBranch(folder.uri.fsPath);
    const branchLabel = branch ? ` $(git-branch) ${branch}` : '';

    const uris = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: true,
      defaultUri: folder.uri,
      openLabel: 'Select files for OpenCode',
    });
    if (!uris || uris.length === 0) return;

    const prompt = await vscode.window.showInputBox({
      placeHolder: 'What do you want OpenCode to do?',
      prompt: `Running in ${folder.name}${branchLabel}`,
      ignoreFocusOut: true,
    });
    if (!prompt) return;

    const fileFlags = uris.map(u => `--file "${u.fsPath}"`).join(' ');
    const term = vscode.window.createTerminal({ name: 'OpenCode', cwd: folder.uri.fsPath });
    term.show();
    const envPrefix = buildEnvExports(() => vscode.workspace.getConfiguration());
    const fullCmd = envPrefix.length > 0
      ? envPrefix.join(' && ') + ` && opencode run ${fileFlags} "${prompt}"`
      : `opencode run ${fileFlags} "${prompt}"`;
    term.sendText(fullCmd);
  });

  const agentsProvider = new AgentsProvider();
  const mcpProvider = new McpProvider();
  const sessionsProvider = new SessionsProvider();
  const modelsProvider = new ModelsProvider();

  vscode.window.registerTreeDataProvider('opencode-walkthrough.agents', agentsProvider);
  vscode.window.registerTreeDataProvider('opencode-walkthrough.mcp', mcpProvider);
  vscode.window.registerTreeDataProvider('opencode-walkthrough.sessions', sessionsProvider);
  vscode.window.registerTreeDataProvider('opencode-walkthrough.models', modelsProvider);

  const refreshAgentsCmd = vscode.commands.registerCommand('opencode-walkthrough.refreshAgents', () => agentsProvider.refresh());
  const refreshMcpCmd = vscode.commands.registerCommand('opencode-walkthrough.refreshMcp', () => mcpProvider.refresh());
  const refreshSessionsCmd = vscode.commands.registerCommand('opencode-walkthrough.refreshSessions', () => sessionsProvider.refresh());
  const refreshModelsCmd = vscode.commands.registerCommand('opencode-walkthrough.refreshModels', () => modelsProvider.refresh());

  const startAgentCmd = vscode.commands.registerCommand('opencode-walkthrough.startAgent', async () => {
    await vscode.commands.executeCommand('opencode-walkthrough.agent.focus');
    const health = await checkHealth();
    if (!health.installed) {
      vscode.window.showWarningMessage('OpenCode CLI is not installed.');
      return;
    }
    const prompt = await vscode.window.showInputBox({
      placeHolder: 'What should the agent do?',
      prompt: 'Start an agent session',
      ignoreFocusOut: true,
    });
    if (prompt) {
      await agentPanelProvider.sendMessage(prompt);
    }
  });

  const cancelAgentCmd = vscode.commands.registerCommand('opencode-walkthrough.cancelAgent', () => {
    agentLoop.cancel();
    vscode.window.showInformationMessage('Agent session cancelled.');
  });

  const openAgentPanelCmd = vscode.commands.registerCommand('opencode-walkthrough.openAgentPanel', () => {
    vscode.commands.executeCommand('opencode-walkthrough.agent.focus');
  });

  const resumeSessionCmd = vscode.commands.registerCommand('opencode-walkthrough.resumeSession', async (sessionId) => {
    if (!sessionId) {
      vscode.commands.executeCommand('opencode-walkthrough.sessionList');
      return;
    }
    await vscode.commands.executeCommand('opencode-walkthrough.agent.focus');
    const prompt = await vscode.window.showInputBox({
      placeHolder: 'Continue this session…',
      prompt: `Resume session ${sessionId.slice(0, 8)}`,
      ignoreFocusOut: true,
    });
    if (!prompt) return;
    agentLoop.sessionId = sessionId;
    await agentPanelProvider.sendMessage(prompt);
  });

  const webviewRegistration = vscode.window.registerWebviewViewProvider('opencode-walkthrough.agent', agentPanelProvider);

  agentsProvider.refresh();
  mcpProvider.refresh();
  sessionsProvider.refresh();
  modelsProvider.refresh();

  context.subscriptions.push(
    showWalkthrough, installCmd, runCmd, interactiveCmd,
    createAgentCmd, listAgentsCmd, addMcpCmd, listMcpCmd,
    authLoginCmd, authListCmd, modelsCmd, sessionListCmd,
    statsCmd, upgradeCmd, serveCmd, webCmd,
    statusBarItem, agentsItem, showActionsCmd, showCliHelpCmd,
    runOnProjectCmd, showTipsCmd, showAgentsCmd, showModelsCmd,
    agentsProvider, mcpProvider, sessionsProvider, modelsProvider,
    refreshAgentsCmd, refreshMcpCmd, refreshSessionsCmd, refreshModelsCmd,
    startAgentCmd, cancelAgentCmd, openAgentPanelCmd, resumeSessionCmd,
    webviewRegistration, agentPanelProvider, agentLoop, outputChannel
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
