const vscode = require('vscode');

function sendToTerminal(text) {
  const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal('OpenCode');
  terminal.show();
  terminal.sendText(text);
}

function activate(context) {
  const showWalkthrough = vscode.commands.registerCommand('opencode-walkthrough.showWalkthrough', () => {
    vscode.commands.executeCommand('workbench.action.openWalkthrough', 'your-publisher.opencode-walkthrough#opencode.gettingStarted');
  });

  const installCmd = vscode.commands.registerCommand('opencode-walkthrough.install', () => {
    sendToTerminal('npm install -g opencode');
  });

  const runCmd = vscode.commands.registerCommand('opencode-walkthrough.runInline', () => {
    sendToTerminal("opencode \"write a hello world script in Python that prints 'Hello, OpenCode!'\" > hello.py");
  });

  const interactiveCmd = vscode.commands.registerCommand('opencode-walkthrough.runInteractive', () => {
    sendToTerminal('opencode');
  });

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = '$(terminal) OpenCode';
  statusBarItem.tooltip = 'OpenCode — Click to run an action';
  statusBarItem.command = 'opencode-walkthrough.showActions';
  statusBarItem.show();

  const showActionsCmd = vscode.commands.registerCommand('opencode-walkthrough.showActions', () => {
    vscode.window.showQuickPick([
      { label: '$(book) Show Walkthrough', command: 'opencode-walkthrough.showWalkthrough' },
      { label: '$(cloud-download) Install CLI', command: 'opencode-walkthrough.install' },
      { label: '$(play) Run Inline Prompt', command: 'opencode-walkthrough.runInline' },
      { label: '$(terminal) Start Interactive', command: 'opencode-walkthrough.runInteractive' },
    ]).then(selected => {
      if (selected) {
        vscode.commands.executeCommand(selected.command);
      }
    });
  });

  context.subscriptions.push(showWalkthrough, installCmd, runCmd, interactiveCmd, statusBarItem, showActionsCmd);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
