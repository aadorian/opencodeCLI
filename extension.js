const vscode = require('vscode');

function sendToTerminal(text) {
  const terminal = vscode.window.activeTerminal || vscode.window.createTerminal('OpenCode');
  terminal.show();
  terminal.sendText(text);
}

function activate(context) {
  const showWalkthrough = vscode.commands.registerCommand('opencode-walkthrough.showWalkthrough', () => {
    vscode.commands.executeCommand('workbench.action.openWalkthrough', {
      walkthroughID: 'opencode-walkthrough.opencode.gettingStarted'
    });
  });

  const installCmd = vscode.commands.registerCommand('opencode-walkthrough.install', () => {
    sendToTerminal('npm install -g opencode');
  });

  const runCmd = vscode.commands.registerCommand('opencode-walkthrough.runInline', () => {
    sendToTerminal("opencode 'write hello world in Python'");
  });

  const interactiveCmd = vscode.commands.registerCommand('opencode-walkthrough.runInteractive', () => {
    sendToTerminal('opencode');
  });

  const treeProvider = vscode.window.registerTreeDataProvider('opencode-welcome', {
    getChildren: () => [],
    getTreeItem: () => null
  });

  context.subscriptions.push(showWalkthrough, installCmd, runCmd, interactiveCmd, treeProvider);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
