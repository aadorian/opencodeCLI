const vscode = require('vscode');

function activate(context) {
  const disposable = vscode.commands.registerCommand('opencode-walkthrough.showWalkthrough', () => {
    vscode.commands.executeCommand('workbench.action.openWalkthrough', {
      walkthroughID: 'opencode-walkthrough.opencode.gettingStarted'
    });
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
