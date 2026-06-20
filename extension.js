const vscode = require('vscode');

function sendToTerminal(text) {
  const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal('OpenCode');
  terminal.show();
  terminal.sendText(text);
}

class OpenCodeTreeItem extends vscode.TreeItem {
  constructor(label, commandId, icon) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.command = {
      command: commandId,
      title: label
    };
    this.iconPath = new vscode.ThemeIcon(icon);
    this.contextValue = 'opencodeAction';
  }
}

class OpenCodeTreeProvider {
  getTreeItem(element) {
    return element;
  }

  getChildren() {
    return [
      new OpenCodeTreeItem('Show Walkthrough', 'opencode-walkthrough.showWalkthrough', 'book'),
      new OpenCodeTreeItem('Install CLI', 'opencode-walkthrough.install', 'cloud-download'),
      new OpenCodeTreeItem('Run Inline Prompt', 'opencode-walkthrough.runInline', 'play'),
      new OpenCodeTreeItem('Start Interactive', 'opencode-walkthrough.runInteractive', 'terminal'),
    ];
  }
}

function activate(context) {
  vscode.window.registerTreeDataProvider('opencode-walkthrough.overview', new OpenCodeTreeProvider());

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

  context.subscriptions.push(showWalkthrough, installCmd, runCmd, interactiveCmd);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
