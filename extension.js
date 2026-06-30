const vscode = require('vscode');
const { exec } = require('child_process');
const { buildTerminalCommand } = require('./lib/env');
const { checkInstall, getGitBranch } = require('./lib/cli');
const { getInstallTerminalCommand, getInstallOptions, promptInstallIfMissing } = require('./lib/install');
const { checkHealth } = require('./lib/health');
const { listSessions } = require('./lib/sessions');
const { ServerManager } = require('./lib/server');
const { ToolRegistry } = require('./lib/tools');
const { AgentLoop } = require('./lib/agentLoop');
const { AgentPanelProvider } = require('./lib/agentPanel');

function sendToTerminal(text) {
  const getConfig = () => vscode.workspace.getConfiguration();
  const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal('OpenCode');
  terminal.show();
  terminal.sendText(buildTerminalCommand(getConfig, text));
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
  constructor(runListAgents = (callback) => exec('opencode agent list 2>/dev/null || true', callback)) {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.items = [];
    this.runListAgents = runListAgents;
  }

  refresh() {
    this.runListAgents((err, stdout) => {
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
  const shortcuts = getShortcutHints(process.platform);
  const tips = [
    {
      title: 'Getting Started',
      items: [
        'Install OpenCode: `curl -fsSL https://opencode.ai/install | bash` or `npm install -g opencode-ai`',
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
      html: `
        <table>
          <thead>
            <tr><th>Action</th><th>${shortcuts.platformLabel}</th></tr>
          </thead>
          <tbody>
            ${shortcuts.rows.map(row => `<tr><td>${row.action}</td><td><code>${row.shortcut}</code></td></tr>`).join('\n            ')}
          </tbody>
        </table>
      `,
    },
  ];

  const sections = tips.map(s => `
    <details open>
      <summary><strong>${s.title}</strong></summary>
      ${s.html ?? `<ul>
        ${s.items.map(i => `<li>${i}</li>`).join('\n        ')}
      </ul>`}
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
    table {
      border-collapse: collapse;
      margin-top: 8px;
      width: 100%;
    }
    th, td {
      border-bottom: 1px solid var(--vscode-panel-border);
      padding: 6px 8px;
      text-align: left;
    }
    th {
      color: var(--vscode-descriptionForeground);
      font-weight: 600;
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

function getShortcutHints(platform = process.platform) {
  const isMac = platform === 'darwin';
  const modifier = isMac ? '⌘⌥' : 'Ctrl+Alt+';
  const platformLabel = isMac ? 'macOS' : 'Windows/Linux';
  const actions = [
    ['Show Actions quick pick', 'O'],
    ['Run Inline Prompt', 'I'],
    ['Run on Project Files', 'P'],
    ['Start Interactive Session', 'T'],
    ['CLI Help', 'H'],
    ['Stats', 'S'],
  ];

  return {
    platformLabel,
    rows: actions.map(([action, key]) => ({
      action,
      shortcut: `${modifier}${key}`,
    })),
  };
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

function getSettingsHtml(config) {
  const GROUPS = [
    { id: 'general', title: 'General', settings: [
      { key: 'opencode.logLevel', label: 'Log Level', type: 'select',
        options: [{ label: '(default)', value: '' }, { label: 'DEBUG', value: 'DEBUG' },
                  { label: 'INFO', value: 'INFO' }, { label: 'WARN', value: 'WARN' }, { label: 'ERROR', value: 'ERROR' }],
        desc: 'CLI log verbosity level (OPENCODE_LOG_LEVEL)' },
      { key: 'opencode.modelsUrl', label: 'Models URL', type: 'text', placeholder: 'https://...', desc: 'Custom URL for fetching models configuration' },
      { key: 'opencode.configPath', label: 'Config Path', type: 'text', placeholder: '/path/to/opencode.json', desc: 'Path to opencode.json config file' },
      { key: 'opencode.configDir', label: 'Config Dir', type: 'text', placeholder: '/path/to/config/', desc: 'Path to OpenCode config directory' },
      { key: 'opencode.tuiConfigPath', label: 'TUI Config', type: 'text', placeholder: '/path/to/tui.json', desc: 'Path to tui.json config file' },
      { key: 'opencode.autoShare', label: 'Auto Share Sessions', type: 'bool', desc: 'Automatically share sessions (OPENCODE_AUTO_SHARE)' },
      { key: 'opencode.enableExa', label: 'Enable Exa Search', type: 'bool', desc: 'Enable Exa web search tools (OPENCODE_ENABLE_EXA)' },
    ]},
    { id: 'auth', title: 'Server Auth', settings: [
      { key: 'opencode.serverUsername', label: 'Username', type: 'text', placeholder: 'opencode', desc: 'HTTP basic auth username for serve/web (default: opencode)' },
      { key: 'opencode.serverPassword', label: 'Password', type: 'password', placeholder: '', desc: 'HTTP basic auth password for serve/web' },
    ]},
    { id: 'disable', title: 'Disable Options', settings: [
      { key: 'opencode.disableAutoUpdate', label: 'Auto Update', type: 'bool', desc: 'Disable automatic update checks' },
      { key: 'opencode.disableModelsFetch', label: 'Models Fetch', type: 'bool', desc: 'Disable fetching models from remote sources' },
      { key: 'opencode.disableAutoCompact', label: 'Auto Compact', type: 'bool', desc: 'Disable automatic context compaction' },
      { key: 'opencode.disableClaudeCode', label: 'Claude Code Files', type: 'bool', desc: 'Disable reading from .claude files' },
      { key: 'opencode.disableMouse', label: 'Mouse Capture', type: 'bool', desc: 'Disable mouse capture in the TUI' },
      { key: 'opencode.disablePrune', label: 'Data Pruning', type: 'bool', desc: 'Disable pruning of old session data' },
      { key: 'opencode.disableTerminalTitle', label: 'Terminal Title', type: 'bool', desc: 'Disable automatic terminal title updates' },
      { key: 'opencode.disableDefaultPlugins', label: 'Default Plugins', type: 'bool', desc: 'Disable default built-in plugins' },
      { key: 'opencode.disableLspDownload', label: 'LSP Download', type: 'bool', desc: 'Disable automatic LSP server downloads' },
    ]},
    { id: 'experimental', title: 'Experimental', settings: [
      { key: 'opencode.experimental', label: 'Enable All Experimental', type: 'bool', desc: 'Enable all experimental features at once' },
      { key: 'opencode.experimental.planMode', label: 'Plan Mode', type: 'bool', desc: 'Experimental plan-before-execute mode' },
      { key: 'opencode.experimental.backgroundSubagents', label: 'Background Subagents', type: 'bool', desc: 'Enable background subagent tasks' },
      { key: 'opencode.experimental.nativeLlm', label: 'Native LLM', type: 'bool', desc: 'Use native LLM request path' },
      { key: 'opencode.experimental.scout', label: 'Scout Subagent', type: 'bool', desc: 'Enable Scout subagent for file discovery' },
      { key: 'opencode.experimental.workspaces', label: 'Workspaces', type: 'bool', desc: 'Enable workspace support' },
    ]},
    { id: 'harness', title: 'Agent Harness', settings: [
      { key: 'opencode.harness.maxRounds', label: 'Max Rounds', type: 'number', min: 1, max: 100, desc: 'Maximum agent loop rounds per user turn (default: 25)' },
      { key: 'opencode.harness.serverUrl', label: 'Server URL', type: 'text', placeholder: 'http://127.0.0.1:4096', desc: 'URL for opencode serve in harness mode' },
      { key: 'opencode.harness.autoStartServer', label: 'Auto Start Server', type: 'bool', desc: 'Auto-start opencode serve when using the harness' },
      { key: 'opencode.harness.toolConfirmation', label: 'Tool Confirmation', type: 'select',
        options: [{ label: 'Always', value: 'always' }, { label: 'Smart (recommended)', value: 'smart' }, { label: 'Never', value: 'never' }],
        desc: 'When to ask before running destructive tools' },
      { key: 'opencode.harness.customInstructions', label: 'Custom Instructions', type: 'textarea', placeholder: 'Always prefer TypeScript. Follow project conventions.', desc: 'Instructions injected into every harness-initiated session' },
    ]},
    { id: 'context', title: 'Harness Context', settings: [
      { key: 'opencode.harness.context.includeWorkspace', label: 'Workspace Folders', type: 'bool', desc: 'Include workspace folder paths in context' },
      { key: 'opencode.harness.context.includeOpenEditors', label: 'Open Editors', type: 'bool', desc: 'Include open editor tabs in context' },
      { key: 'opencode.harness.context.includeActiveFile', label: 'Active File', type: 'bool', desc: 'Include active file metadata in context' },
      { key: 'opencode.harness.context.includeSelection', label: 'Editor Selection', type: 'bool', desc: 'Include active editor selection in context' },
      { key: 'opencode.harness.context.includeDiagnostics', label: 'Diagnostics', type: 'bool', desc: 'Include workspace diagnostics in context' },
      { key: 'opencode.harness.context.includeGit', label: 'Git Status', type: 'bool', desc: 'Include git branch and dirty files in context' },
      { key: 'opencode.harness.context.includeFileContents', label: 'File Contents', type: 'bool', desc: 'Include full active file contents (privacy-sensitive)' },
    ]},
  ];

  function renderControl(s, val) {
    const v = val !== null && val !== undefined ? val : '';
    if (s.type === 'bool') {
      const checked = v === true ? 'checked' : '';
      return `<label class="toggle"><input type="checkbox" data-key="${s.key}" ${checked}><span class="slider"></span></label>`;
    }
    if (s.type === 'select') {
      const opts = s.options.map(o => `<option value="${o.value}"${v === o.value ? ' selected' : ''}>${o.label}</option>`).join('');
      return `<select data-key="${s.key}">${opts}</select>`;
    }
    if (s.type === 'number') {
      return `<input type="number" data-key="${s.key}" value="${v !== '' ? v : ''}" min="${s.min || 1}" max="${s.max || 100}" class="num-input">`;
    }
    if (s.type === 'textarea') {
      return `<textarea data-key="${s.key}" rows="3" placeholder="${s.placeholder || ''}">${v}</textarea>`;
    }
    if (s.type === 'password') {
      return `<input type="password" data-key="${s.key}" value="${v}" placeholder="${s.placeholder || ''}">`;
    }
    return `<input type="text" data-key="${s.key}" value="${v}" placeholder="${s.placeholder || ''}">`;
  }

  const sections = GROUPS.map(g => {
    const rows = g.settings.map(s => {
      const val = config.get(s.key);
      const isBool = s.type === 'bool';
      return `<div class="row${isBool ? ' row-bool' : ''}">
        <div class="row-left">
          <span class="row-label">${s.label}</span>
          <span class="row-desc">${s.desc}</span>
        </div>
        <div class="row-ctrl">${renderControl(s, val)}</div>
      </div>`;
    }).join('\n');
    return `<details open>
      <summary><strong>${g.title}</strong></summary>
      <div class="section-body">${rows}</div>
    </details>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenCode Settings</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      padding: 24px;
      max-width: 760px;
      margin: 0 auto;
      line-height: 1.5;
    }
    h1 { font-size: 1.6em; font-weight: 600; margin-bottom: 4px; }
    .subtitle { color: var(--vscode-descriptionForeground); margin: 0 0 20px; font-size: 0.92em; }
    .subtitle a { color: var(--vscode-textLink-foreground); cursor: pointer; text-decoration: none; }
    .subtitle a:hover { text-decoration: underline; }
    details {
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-sideBar-border);
      border-radius: 6px;
      margin-bottom: 8px;
      overflow: hidden;
    }
    summary {
      cursor: pointer; padding: 10px 16px;
      font-size: 1em; color: var(--vscode-sideBarTitle-foreground);
      list-style: none; display: flex; align-items: center; gap: 6px;
      user-select: none;
    }
    summary::-webkit-details-marker { display: none; }
    summary::before { content: '▶'; font-size: 0.7em; opacity: 0.6; transition: transform 0.15s; }
    details[open] summary::before { transform: rotate(90deg); }
    .section-body { padding: 4px 0 8px; border-top: 1px solid var(--vscode-sideBar-border); }
    .row {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 8px 16px; gap: 12px;
      border-bottom: 1px solid var(--vscode-sideBar-border, rgba(128,128,128,0.1));
    }
    .row:last-child { border-bottom: none; }
    .row-bool { align-items: center; }
    .row-left { flex: 1; min-width: 0; }
    .row-label { display: block; font-size: 0.9em; font-weight: 500; margin-bottom: 2px; }
    .row-desc { display: block; font-size: 0.77em; color: var(--vscode-descriptionForeground); }
    .row-ctrl { flex-shrink: 0; }
    input[type="text"], input[type="password"], input[type="number"], select, textarea {
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 3px;
      padding: 4px 7px;
      font-family: inherit;
      font-size: 0.88em;
      outline: none;
      width: 220px;
    }
    input[type="number"] { width: 80px; }
    textarea { width: 220px; resize: vertical; }
    input:focus, select:focus, textarea:focus {
      border-color: var(--vscode-focusBorder);
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }
    .saved-flash { color: var(--vscode-testing-iconPassed, #4caf50); font-size: 0.78em; margin-left: 6px; opacity: 0; transition: opacity 0.3s; }
    .saved-flash.show { opacity: 1; }
    /* Toggle switch */
    .toggle { position: relative; display: inline-block; width: 34px; height: 20px; flex-shrink: 0; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute; cursor: pointer; inset: 0;
      background: var(--vscode-input-border, #555);
      border-radius: 20px; transition: background 0.2s;
    }
    .slider::before {
      content: ''; position: absolute;
      height: 14px; width: 14px; left: 3px; bottom: 3px;
      background: #fff; border-radius: 50%; transition: transform 0.2s;
    }
    input:checked + .slider { background: var(--vscode-button-background); }
    input:checked + .slider::before { transform: translateX(14px); }
    hr { border: none; border-top: 1px solid var(--vscode-sideBar-border); margin: 20px 0; }
    .footer { color: var(--vscode-descriptionForeground); font-size: 0.85em; }
    .footer a { color: var(--vscode-textLink-foreground); }
  </style>
</head>
<body>
  <h1>OpenCode Settings</h1>
  <p class="subtitle">
    Configure the OpenCode VS Code extension. Changes take effect immediately.
    &nbsp;<a id="btn-vscode-settings">Open in VS Code Settings editor ↗</a>
  </p>
  ${sections}
  <hr>
  <p class="footer">
    Settings map to OpenCode environment variables.
    <a href="https://opencode.ai/docs">Read the docs</a> for details.
  </p>
<script>
(function() {
  var vscode = acquireVsCodeApi();
  var saveTimers = {};

  function flashSaved(key) {
    var el = document.querySelector('[data-saved="' + key + '"]');
    if (!el) return;
    el.classList.add('show');
    clearTimeout(saveTimers[key]);
    saveTimers[key] = setTimeout(function() { el.classList.remove('show'); }, 1400);
  }

  function postUpdate(key, value) {
    vscode.postMessage({ type: 'updateSetting', key: key, value: value });
    flashSaved(key);
  }

  document.querySelectorAll('input[type="checkbox"][data-key]').forEach(function(el) {
    el.addEventListener('change', function() {
      postUpdate(el.getAttribute('data-key'), el.checked);
    });
  });

  document.querySelectorAll('select[data-key]').forEach(function(el) {
    el.addEventListener('change', function() {
      postUpdate(el.getAttribute('data-key'), el.value);
    });
  });

  var textTimers = {};
  document.querySelectorAll('input[type="text"][data-key], input[type="password"][data-key], input[type="number"][data-key], textarea[data-key]').forEach(function(el) {
    el.addEventListener('input', function() {
      var key = el.getAttribute('data-key');
      clearTimeout(textTimers[key]);
      textTimers[key] = setTimeout(function() {
        var val = el.type === 'number' ? (el.value === '' ? null : parseInt(el.value, 10)) : el.value;
        postUpdate(key, val);
      }, 600);
    });
  });

  document.getElementById('btn-vscode-settings').addEventListener('click', function() {
    vscode.postMessage({ type: 'openVscodeSettings' });
  });
})();
</script>
</body>
</html>`;
}

class TerminalPanelProvider {
  constructor(getConfigFn) {
    this._getConfig = getConfigFn;
    this._view = null;
    this._history = [];
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this._getHtml();

    webviewView.webview.onDidReceiveMessage(msg => {
      if (msg.type === 'run') {
        const cmd = (msg.command || '').trim();
        if (!cmd) return;
        const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal('OpenCode');
        terminal.show();
        terminal.sendText(buildTerminalCommand(this._getConfig, cmd));
        if (!this._history.includes(cmd)) {
          this._history.unshift(cmd);
          if (this._history.length > 30) this._history.pop();
        }
        this._postHistory();
      } else if (msg.type === 'clearHistory') {
        this._history = [];
        this._postHistory();
      } else if (msg.type === 'ready') {
        this._postHistory();
      }
    });
  }

  _postHistory() {
    if (this._view) {
      this._view.webview.postMessage({ type: 'history', items: this._history });
    }
  }

  _getHtml() {
    const quickCmds = [
      { label: 'Run', cmds: [
        { label: 'opencode', cmd: 'opencode', title: 'Start interactive TUI' },
        { label: 'run "…"', cmd: 'opencode run ""', title: 'Run a one-shot prompt', focus: true },
        { label: 'stats', cmd: 'opencode stats', title: 'Token usage and costs' },
        { label: '--version', cmd: 'opencode --version', title: 'Show installed version' },
        { label: 'upgrade', cmd: 'opencode upgrade', title: 'Upgrade the CLI' },
      ]},
      { label: 'Auth', cmds: [
        { label: 'auth login', cmd: 'opencode auth login', title: 'Log in to a provider' },
        { label: 'auth ls', cmd: 'opencode auth ls', title: 'List authenticated providers' },
        { label: 'auth logout', cmd: 'opencode auth logout', title: 'Log out from a provider' },
      ]},
      { label: 'Agents', cmds: [
        { label: 'agent create', cmd: 'opencode agent create', title: 'Create a new agent' },
        { label: 'agent list', cmd: 'opencode agent list', title: 'List agents' },
      ]},
      { label: 'MCP', cmds: [
        { label: 'mcp add', cmd: 'opencode mcp add', title: 'Add an MCP server' },
        { label: 'mcp list', cmd: 'opencode mcp list', title: 'List MCP servers' },
        { label: 'mcp remove', cmd: 'opencode mcp remove', title: 'Remove an MCP server' },
      ]},
      { label: 'Models', cmds: [
        { label: 'models', cmd: 'opencode models', title: 'List available models' },
        { label: 'models --refresh', cmd: 'opencode models --refresh', title: 'Refresh model cache' },
      ]},
      { label: 'Server', cmds: [
        { label: 'serve', cmd: 'opencode serve', title: 'Start headless server' },
        { label: 'web', cmd: 'opencode web', title: 'Start web interface' },
        { label: 'session list', cmd: 'opencode session list', title: 'List sessions' },
      ]},
    ];

    const categorySections = quickCmds.map(cat => {
      const btns = cat.cmds.map(c =>
        `<button class="qbtn" data-cmd="${c.cmd.replace(/"/g, '&quot;')}" data-focus="${c.focus ? '1' : '0'}" title="${c.title}">${c.label}</button>`
      ).join('');
      return `<div class="cat"><div class="cat-label">${cat.label}</div><div class="cat-btns">${btns}</div></div>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenCode Terminal</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      height: 100vh; display: flex; flex-direction: column; overflow: hidden;
    }
    #cmd-area {
      padding: 8px; border-bottom: 1px solid var(--vscode-sideBar-border); flex-shrink: 0;
    }
    .cmd-row {
      display: flex; align-items: center; gap: 6px;
      border: 1px solid var(--vscode-input-border, var(--vscode-sideBar-border));
      border-radius: 5px; background: var(--vscode-input-background);
      padding: 0 8px;
    }
    .cmd-row:focus-within {
      border-color: var(--vscode-focusBorder);
      outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px;
    }
    .prompt { color: var(--vscode-terminal-ansiGreen, #4caf50); font-family: var(--vscode-editor-font-family); font-size: 0.9em; flex-shrink: 0; }
    #cmd-input {
      flex: 1; border: none; outline: none; background: transparent;
      color: var(--vscode-input-foreground); font-family: var(--vscode-editor-font-family);
      font-size: 0.9em; padding: 7px 0;
    }
    #cmd-input::placeholder { color: var(--vscode-input-placeholderForeground); }
    #run-btn {
      background: var(--vscode-button-background); color: var(--vscode-button-foreground);
      border: none; border-radius: 4px; padding: 3px 10px; cursor: pointer;
      font-size: 0.82em; font-family: inherit; flex-shrink: 0;
    }
    #run-btn:hover { background: var(--vscode-button-hoverBackground); }
    #quick-area {
      flex: 1; overflow-y: auto; padding: 6px 8px;
    }
    .cat { margin-bottom: 10px; }
    .cat-label {
      font-size: 0.72em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--vscode-descriptionForeground); margin-bottom: 4px;
    }
    .cat-btns { display: flex; flex-wrap: wrap; gap: 4px; }
    .qbtn {
      padding: 3px 9px; border: 1px solid var(--vscode-sideBar-border);
      border-radius: 12px; background: var(--vscode-editor-background);
      color: var(--vscode-foreground); cursor: pointer; font-size: 0.78em;
      font-family: var(--vscode-editor-font-family);
    }
    .qbtn:hover { background: var(--vscode-list-hoverBackground); border-color: var(--vscode-focusBorder); }
    #history-area { flex-shrink: 0; border-top: 1px solid var(--vscode-sideBar-border); }
    #history-header {
      padding: 4px 10px; display: flex; align-items: center; justify-content: space-between;
      font-size: 0.72em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--vscode-descriptionForeground);
    }
    #clear-btn {
      background: none; border: none; cursor: pointer; font-size: 0.9em; padding: 0;
      color: var(--vscode-descriptionForeground);
    }
    #clear-btn:hover { color: var(--vscode-foreground); }
    #history-list { max-height: 140px; overflow-y: auto; }
    .hist-item {
      display: flex; align-items: center; padding: 3px 10px; gap: 6px;
      cursor: pointer; font-family: var(--vscode-editor-font-family); font-size: 0.82em;
    }
    .hist-item:hover { background: var(--vscode-list-hoverBackground); }
    .hist-arrow { color: var(--vscode-descriptionForeground); flex-shrink: 0; }
    .hist-cmd { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #no-history { padding: 6px 10px; font-size: 0.8em; color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <div id="cmd-area">
    <div class="cmd-row">
      <span class="prompt">$</span>
      <input id="cmd-input" type="text" placeholder="opencode command…" autocomplete="off" spellcheck="false">
      <button id="run-btn">Run</button>
    </div>
  </div>

  <div id="quick-area">
    ${categorySections}
  </div>

  <div id="history-area">
    <div id="history-header">
      <span>History</span>
      <button id="clear-btn" title="Clear history">✕ clear</button>
    </div>
    <div id="history-list"><div id="no-history">No commands yet</div></div>
  </div>

<script>
(function() {
  var vscode = acquireVsCodeApi();
  var cmdInput = document.getElementById('cmd-input');
  var runBtn = document.getElementById('run-btn');
  var histList = document.getElementById('history-list');
  var noHist = document.getElementById('no-history');
  var clearBtn = document.getElementById('clear-btn');

  function run(cmd) {
    if (!cmd.trim()) return;
    vscode.postMessage({ type: 'run', command: cmd });
    cmdInput.value = '';
    cmdInput.focus();
  }

  runBtn.addEventListener('click', function() { run(cmdInput.value); });
  cmdInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); run(cmdInput.value); }
  });

  document.querySelectorAll('.qbtn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var cmd = btn.getAttribute('data-cmd');
      var needsFocus = btn.getAttribute('data-focus') === '1';
      if (needsFocus) {
        cmdInput.value = cmd;
        cmdInput.focus();
        var pos = cmd.indexOf('"') + 1;
        if (pos) cmdInput.setSelectionRange(pos, pos + 1);
      } else {
        run(cmd);
      }
    });
  });

  clearBtn.addEventListener('click', function() { vscode.postMessage({ type: 'clearHistory' }); });

  function renderHistory(items) {
    if (!items || items.length === 0) {
      histList.innerHTML = '<div id="no-history">No commands yet</div>';
      return;
    }
    histList.innerHTML = items.map(function(cmd) {
      return '<div class="hist-item" data-cmd="' + cmd.replace(/"/g, '&quot;') + '">'
        + '<span class="hist-arrow">↵</span>'
        + '<span class="hist-cmd" title="' + cmd.replace(/"/g, '&quot;') + '">' + cmd.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</span>'
        + '</div>';
    }).join('');
    histList.querySelectorAll('.hist-item').forEach(function(el) {
      el.addEventListener('click', function() {
        run(el.getAttribute('data-cmd'));
      });
    });
  }

  window.addEventListener('message', function(e) {
    if (e.data.type === 'history') renderHistory(e.data.items);
  });

  vscode.postMessage({ type: 'ready' });
})();
</script>
</body>
</html>`;
  }
}

function activate(context) {
  const getConfig = () => vscode.workspace.getConfiguration();
  const outputChannel = vscode.window.createOutputChannel('OpenCode Agent');
  const log = msg => outputChannel.appendLine(msg);
  const gettingStartedWalkthroughId = `${context.extension.id}#opencode.gettingStarted`;

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
    vscode.commands.executeCommand('workbench.action.openWalkthrough', gettingStartedWalkthroughId);
  });

  const installCmd = vscode.commands.registerCommand('opencode-walkthrough.install', async () => {
    const version = await checkInstall();
    if (version) {
      const action = await vscode.window.showInformationMessage(
        `OpenCode ${version} is installed.`,
        'Upgrade',
        'Check Health'
      );
      if (action === 'Upgrade') {
        sendToTerminal('opencode upgrade');
      } else if (action === 'Check Health') {
        vscode.commands.executeCommand('opencode-walkthrough.checkHealth');
      }
      return;
    }
    const options = getInstallOptions();
    if (options.length === 1) {
      sendToTerminal(options[0].command);
      return;
    }
    const selected = await vscode.window.showQuickPick(
      options.map(o => ({ label: o.label, description: o.description })),
      { placeHolder: 'Choose install method for OpenCode' }
    );
    if (selected) {
      const option = options.find(o => o.label === selected.label);
      if (option) sendToTerminal(option.command);
    }
  });

  const ensureInstalled = () => promptInstallIfMissing(vscode, {
    checkInstall,
    sendToTerminal,
    executeCommand: cmd => vscode.commands.executeCommand(cmd),
  });

  const runCmd = vscode.commands.registerCommand('opencode-walkthrough.runInline', async () => {
    if (!(await ensureInstalled())) {
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
    const getConfig = () => vscode.workspace.getConfiguration();
    // Single-quote on Unix to prevent shell expansion of $vars, backticks, etc.
    // On Windows, double-quote with escaped double-quotes.
    const shellQuote = (str) => process.platform === 'win32'
      ? '"' + str.replace(/"/g, '\\"') + '"'
      : "'" + str.replace(/'/g, "'\\''") + "'";
    term.sendText(buildTerminalCommand(getConfig, `opencode run ${shellQuote(prompt)}`));
  });

  const interactiveCmd = vscode.commands.registerCommand('opencode-walkthrough.runInteractive', async () => {
    if (!(await ensureInstalled())) {
      return;
    }
    sendToTerminal('opencode');
  });

  const createAgentCmd = vscode.commands.registerCommand('opencode-walkthrough.createAgent', async () => {
    if (!(await ensureInstalled())) {
      return;
    }
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

  const authLoginCmd = vscode.commands.registerCommand('opencode-walkthrough.authLogin', async () => {
    if (!(await ensureInstalled())) {
      return;
    }
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

  const versionCmd = vscode.commands.registerCommand('opencode-walkthrough.version', async () => {
    const version = await checkInstall();
    if (version) {
      vscode.window.showInformationMessage(`OpenCode version: ${version}`);
    } else {
      const action = await vscode.window.showWarningMessage(
        'OpenCode is not installed.',
        'Install'
      );
      if (action === 'Install') {
        vscode.commands.executeCommand('opencode-walkthrough.install');
      }
    }
  });

  const checkHealthCmd = vscode.commands.registerCommand('opencode-walkthrough.checkHealth', async () => {
    const health = await checkHealth();
    if (!health.installed) {
      const action = await vscode.window.showWarningMessage(
        'OpenCode is not installed.',
        'Install'
      );
      if (action === 'Install') {
        vscode.commands.executeCommand('opencode-walkthrough.install');
      }
    } else if (!health.ready) {
      const action = await vscode.window.showWarningMessage(
        `${health.message}`,
        'Auth Login',
        'Auth List'
      );
      if (action === 'Auth Login') {
        sendToTerminal('opencode auth login');
      } else if (action === 'Auth List') {
        sendToTerminal('opencode auth ls');
      }
    } else {
      vscode.window.showInformationMessage(`${health.message}`);
    }
  });

  const authLogoutCmd = vscode.commands.registerCommand('opencode-walkthrough.authLogout', async () => {
    if (!(await ensureInstalled())) {
      return;
    }
    sendToTerminal('opencode auth logout');
  });

  const mcpRemoveCmd = vscode.commands.registerCommand('opencode-walkthrough.mcpRemove', async () => {
    if (!(await ensureInstalled())) {
      return;
    }
    sendToTerminal('opencode mcp remove');
  });

  const uninstallCmd = vscode.commands.registerCommand('opencode-walkthrough.uninstall', async () => {
    const version = await checkInstall();
    if (!version) {
      vscode.window.showInformationMessage('OpenCode is not installed.');
      return;
    }
    const choice = await vscode.window.showWarningMessage(
      `Uninstall OpenCode ${version} from your system?`,
      { modal: true },
      'Uninstall Everything',
      'Keep Config & Data',
    );
    if (!choice) return;
    const flags = choice === 'Keep Config & Data' ? ' --keep-config --keep-data' : '';
    sendToTerminal(`opencode uninstall${flags}`);
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
      { label: '$(book) Show Walkthrough', description: 'Open the getting started guide', command: 'opencode-walkthrough.showWalkthrough' },
      { label: '$(lightbulb) Tips & Tricks', description: 'View usage tips and keyboard shortcuts', command: 'opencode-walkthrough.showTips' },
      { label: '$(settings-gear) Settings', description: 'Configure OpenCode VS Code extension settings', command: 'opencode-walkthrough.showSettings' },
      { label: '$(terminal) Terminal Panel', description: 'Run OpenCode commands from the sidebar terminal', command: 'opencode-walkthrough.openTerminalPanel' },
      { label: '$(cloud-download) Install CLI', description: 'Install or update the OpenCode CLI', command: 'opencode-walkthrough.install' },
      { label: '$(versions) Check Version', description: 'Show the installed OpenCode version', command: 'opencode-walkthrough.version' },
      { label: '$(heart) Check Health', description: 'Check auth status and CLI health', command: 'opencode-walkthrough.checkHealth' },
      { label: '$(play) Run Inline Prompt', description: 'Send a prompt to OpenCode from VS Code', command: 'opencode-walkthrough.runInline' },
      { label: '$(hubot) Start Agent Session', description: 'Start an agent loop session', command: 'opencode-walkthrough.startAgent' },
      { label: '$(folder) Run on Project Files', description: 'Run OpenCode with selected files', command: 'opencode-walkthrough.runOnProject' },
      { label: '$(terminal) Start Interactive', description: 'Open the interactive OpenCode TUI', command: 'opencode-walkthrough.runInteractive' },
      { label: '$(robot) Agents Overview', description: 'Show available agent concepts and actions', command: 'opencode-walkthrough.showAgents' },
      { label: '$(symbol-parameter) Models Overview', description: 'Show model/provider overview', command: 'opencode-walkthrough.showModels' },
      { label: '$(robot) Create Agent', description: 'Create a custom agent configuration', command: 'opencode-walkthrough.createAgent' },
      { label: '$(list-tree) List Agents', description: 'List configured OpenCode agents', command: 'opencode-walkthrough.listAgents' },
      { label: '$(key) Auth Login', description: 'Log in to an OpenCode provider', command: 'opencode-walkthrough.authLogin' },
      { label: '$(key) Auth List', description: 'List authenticated providers', command: 'opencode-walkthrough.authList' },
      { label: '$(key) Auth Logout', description: 'Log out from an OpenCode provider', command: 'opencode-walkthrough.authLogout' },
      { label: '$(plug) Add MCP Server', description: 'Add an MCP server to OpenCode', command: 'opencode-walkthrough.addMcp' },
      { label: '$(list-tree) List MCP Servers', description: 'List configured MCP servers', command: 'opencode-walkthrough.listMcp' },
      { label: '$(trash) Remove MCP Server', description: 'Remove a configured MCP server', command: 'opencode-walkthrough.mcpRemove' },
      { label: '$(symbol-parameter) List Models', description: 'List available OpenCode models', command: 'opencode-walkthrough.listModels' },
      { label: '$(list-tree) List Sessions', description: 'List recent OpenCode sessions', command: 'opencode-walkthrough.sessionList' },
      { label: '$(graph) Stats', description: 'Show token usage and costs', command: 'opencode-walkthrough.stats' },
      { label: '$(server) Start Server', description: 'Start the headless OpenCode server', command: 'opencode-walkthrough.serve' },
      { label: '$(globe) Start Web', description: 'Start the OpenCode web interface', command: 'opencode-walkthrough.web' },
      { label: '$(arrow-up) Upgrade CLI', description: 'Upgrade the OpenCode CLI', command: 'opencode-walkthrough.upgrade' },
      { label: '$(trash) Uninstall OpenCode', description: 'Remove the OpenCode CLI from your system', command: 'opencode-walkthrough.uninstall' },
    ]).then(selected => {
      if (selected) {
        vscode.commands.executeCommand(selected.command);
      }
    });
  });

  const showCliHelpCmd = vscode.commands.registerCommand('opencode-walkthrough.showCliHelp', () => {
    vscode.window.showQuickPick([
      { label: '$(cloud-download) opencode install', description: 'Install or upgrade OpenCode CLI', command: 'opencode-walkthrough.install' },
      { label: '$(versions) opencode --version', description: 'Show installed version', command: 'opencode-walkthrough.version' },
      { label: '$(heart) opencode health', description: 'Check health and auth status', command: 'opencode-walkthrough.checkHealth' },
      { label: '$(terminal) opencode', description: 'Start the TUI', command: 'opencode-walkthrough.runInteractive' },
      { label: '$(play) opencode run', description: 'Run a prompt', command: 'opencode-walkthrough.runInline' },
      { label: '$(folder) opencode run --file', description: 'Run on selected project files', command: 'opencode-walkthrough.runOnProject' },
      { label: '$(robot) opencode agent create', description: 'Create an agent', command: 'opencode-walkthrough.createAgent' },
      { label: '$(list-tree) opencode agent list', description: 'List agents', command: 'opencode-walkthrough.listAgents' },
      { label: '$(key) opencode auth login', description: 'Log in to a provider', command: 'opencode-walkthrough.authLogin' },
      { label: '$(key) opencode auth list', description: 'List authenticated providers', command: 'opencode-walkthrough.authList' },
      { label: '$(key) opencode auth logout', description: 'Log out from a provider', command: 'opencode-walkthrough.authLogout' },
      { label: '$(plug) opencode mcp add', description: 'Add an MCP server', command: 'opencode-walkthrough.addMcp' },
      { label: '$(list-tree) opencode mcp list', description: 'List MCP servers', command: 'opencode-walkthrough.listMcp' },
      { label: '$(trash) opencode mcp remove', description: 'Remove an MCP server', command: 'opencode-walkthrough.mcpRemove' },
      { label: '$(symbol-parameter) opencode models', description: 'List available models', command: 'opencode-walkthrough.listModels' },
      { label: '$(list-tree) opencode session list', description: 'List sessions', command: 'opencode-walkthrough.sessionList' },
      { label: '$(graph) opencode stats', description: 'Token usage and costs', command: 'opencode-walkthrough.stats' },
      { label: '$(server) opencode serve', description: 'Start a headless server', command: 'opencode-walkthrough.serve' },
      { label: '$(globe) opencode web', description: 'Start web interface', command: 'opencode-walkthrough.web' },
      { label: '$(arrow-up) opencode upgrade', description: 'Upgrade the CLI', command: 'opencode-walkthrough.upgrade' },
      { label: '$(trash) opencode uninstall', description: 'Uninstall OpenCode from your system', command: 'opencode-walkthrough.uninstall' },
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

  const showSettingsCmd = vscode.commands.registerCommand('opencode-walkthrough.showSettings', () => {
    const panel = vscode.window.createWebviewPanel(
      'opencodeSettings',
      'OpenCode Settings',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );
    panel.webview.html = getSettingsHtml(vscode.workspace.getConfiguration());

    const configListener = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('opencode')) {
        panel.webview.html = getSettingsHtml(vscode.workspace.getConfiguration());
      }
    });
    panel.onDidDispose(() => configListener.dispose());

    panel.webview.onDidReceiveMessage(async msg => {
      if (msg.type === 'updateSetting') {
        const cfg = vscode.workspace.getConfiguration();
        const value = msg.value === null || msg.value === '' ? undefined : msg.value;
        await cfg.update(msg.key, value, vscode.ConfigurationTarget.Global);
      } else if (msg.type === 'openVscodeSettings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'opencode');
      }
    });
  });

  const terminalPanelProvider = new TerminalPanelProvider(getConfig);
  const openTerminalPanelCmd = vscode.commands.registerCommand('opencode-walkthrough.openTerminalPanel', () => {
    vscode.commands.executeCommand('opencode-walkthrough.terminal.focus');
  });
  const terminalPanelRegistration = vscode.window.registerWebviewViewProvider('opencode-walkthrough.terminal', terminalPanelProvider);

  const runOnProjectCmd = vscode.commands.registerCommand('opencode-walkthrough.runOnProject', async () => {
    if (!(await ensureInstalled())) {
      return;
    }
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
    const getConfig = () => vscode.workspace.getConfiguration();
    term.sendText(buildTerminalCommand(getConfig, `opencode run ${fileFlags} "${prompt}"`));
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

  const openAgentInEditorCmd = vscode.commands.registerCommand('opencode-walkthrough.openAgentInEditor', () => {
    agentPanelProvider.openInEditor();
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
    authLoginCmd, authListCmd, authLogoutCmd, modelsCmd, sessionListCmd,
    statsCmd, upgradeCmd, serveCmd, webCmd,
    versionCmd, checkHealthCmd, mcpRemoveCmd, uninstallCmd,
    statusBarItem, agentsItem, showActionsCmd, showCliHelpCmd,
    runOnProjectCmd, showTipsCmd, showAgentsCmd, showModelsCmd,
    showSettingsCmd, openTerminalPanelCmd, terminalPanelRegistration,
    agentsProvider, mcpProvider, sessionsProvider, modelsProvider,
    refreshAgentsCmd, refreshMcpCmd, refreshSessionsCmd, refreshModelsCmd,
    startAgentCmd, cancelAgentCmd, openAgentPanelCmd, openAgentInEditorCmd, resumeSessionCmd,
    webviewRegistration, agentPanelProvider, agentLoop, outputChannel
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
  AgentsProvider,
  AgentTreeItem,
  getShortcutHints
};
