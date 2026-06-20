const vscode = require('vscode');

function activate(context) {
  const showWalkthrough = vscode.commands.registerCommand('opencode-walkthrough.showWalkthrough', () => {
    vscode.commands.executeCommand('workbench.action.openWalkthrough', {
      walkthroughID: 'opencode-walkthrough.opencode.gettingStarted'
    });
  });

  const treeProvider = vscode.window.registerTreeDataProvider('opencode-welcome', {
    getChildren: () => [],
    getTreeItem: () => null
  });

  context.subscriptions.push(showWalkthrough, treeProvider);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
