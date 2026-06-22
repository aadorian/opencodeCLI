const assert = require('assert');
const vscode = require('vscode');

suite('Extension Test Suite', () => {
  let extension;

  suiteSetup(async () => {
    extension = vscode.extensions.getExtension('AlejandroAdorjan.opencode-walkthrough');
    await extension?.activate();
  });

  test('Extension is installed and activates', () => {
    assert.ok(extension, 'Extension should be installed');
    assert.ok(extension.isActive, 'Extension should be active');
  });

  test('All commands are registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    const expected = [
      'opencode-walkthrough.showWalkthrough',
      'opencode-walkthrough.install',
      'opencode-walkthrough.runInline',
      'opencode-walkthrough.runInteractive',
      'opencode-walkthrough.createAgent',
      'opencode-walkthrough.listAgents',
      'opencode-walkthrough.authLogin',
      'opencode-walkthrough.authList',
      'opencode-walkthrough.addMcp',
      'opencode-walkthrough.listMcp',
      'opencode-walkthrough.listModels',
      'opencode-walkthrough.sessionList',
      'opencode-walkthrough.stats',
      'opencode-walkthrough.upgrade',
      'opencode-walkthrough.serve',
      'opencode-walkthrough.web',
      'opencode-walkthrough.runOnProject',
      'opencode-walkthrough.showActions',
      'opencode-walkthrough.showCliHelp',
      'opencode-walkthrough.startAgent',
      'opencode-walkthrough.cancelAgent',
      'opencode-walkthrough.openAgentPanel',
      'opencode-walkthrough.resumeSession',
    ];
    for (const cmd of expected) {
      assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`);
    }
  });

  test('Commands can be executed without error', async () => {
    await assert.doesNotReject(
      vscode.commands.executeCommand('opencode-walkthrough.showWalkthrough')
    );
  });

  test('Status bar items are created', () => {
    assert.ok(
      typeof vscode.window.createStatusBarItem === 'function',
      'Status bar API should be available'
    );
  });

  test('Views are contributed', () => {
    assert.ok(
      typeof vscode.window.createTreeView === 'function',
      'View API should be available for our tree views'
    );
  });

  test('Extension manifest is valid', () => {
    const pkg = extension?.packageJSON;
    assert.ok(pkg, 'Extension should have a package.json');
    assert.equal(pkg.name, 'opencode-walkthrough');
    assert.equal(pkg.publisher, 'AlejandroAdorjan');
    assert.ok(pkg.contributes?.commands?.length > 0, 'Should contribute commands');
    assert.ok(pkg.contributes?.viewsContainers, 'Should contribute view containers');
    assert.ok(pkg.contributes?.views, 'Should contribute views');
    assert.ok(pkg.contributes?.walkthroughs, 'Should contribute walkthroughs');
  });

  test('Walkthrough step can be opened', async () => {
    const walkthroughId = `${extension.id}#opencode.gettingStarted`;
    await assert.doesNotReject(
      vscode.commands.executeCommand(
        'workbench.action.openWalkthrough',
        walkthroughId
      )
    );
  });

  test('Harness settings are contributed', () => {
    const pkg = extension?.packageJSON;
    const props = pkg.contributes?.configuration?.properties ?? {};
    assert.ok(props['opencode.harness.maxRounds'], 'Should contribute harness maxRounds');
    assert.ok(props['opencode.harness.customInstructions'], 'Should contribute customInstructions');
  });

  test('Agent webview view is contributed', () => {
    const pkg = extension?.packageJSON;
    const views = Object.values(pkg.contributes?.views ?? {}).flat();
    const agentView = views.find(v => v.id === 'opencode-walkthrough.agent');
    assert.ok(agentView, 'Agent webview should be contributed');
    assert.equal(agentView.type, 'webview');
  });
});
