const vscode = require('vscode');
const { exec } = require('child_process');

function sendToTerminal(text) {
  const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal('OpenCode');
  terminal.show();
  terminal.sendText(text);
}

function checkInstall() {
  return new Promise(resolve => {
    exec('opencode --version', (err, stdout) => {
      if (err) return resolve(null);
      resolve(stdout.trim());
    });
  });
}

function activate(context) {
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

  const runCmd = vscode.commands.registerCommand('opencode-walkthrough.runInline', () => {
    sendToTerminal("opencode \"write a hello world script in Python that prints 'Hello, OpenCode!'\" > hello.py");
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
      { label: '$(cloud-download) Install CLI', command: 'opencode-walkthrough.install' },
      { label: '$(play) Run Inline Prompt', command: 'opencode-walkthrough.runInline' },
      { label: '$(terminal) Start Interactive', command: 'opencode-walkthrough.runInteractive' },
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

  context.subscriptions.push(
    showWalkthrough, installCmd, runCmd, interactiveCmd,
    createAgentCmd, listAgentsCmd, addMcpCmd, listMcpCmd,
    authLoginCmd, authListCmd, modelsCmd, sessionListCmd,
    statsCmd, upgradeCmd, serveCmd, webCmd,
    statusBarItem, agentsItem, showActionsCmd, showCliHelpCmd
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
