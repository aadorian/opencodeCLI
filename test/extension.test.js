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
    const pkg = extension?.packageJSON;
    const expected = pkg.contributes.commands.map(command => command.command);

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
  test('Overview commands execute without error', async () => {
    await assert.doesNotReject(
      vscode.commands.executeCommand('opencode-walkthrough.showTips')
    );
    await assert.doesNotReject(
      vscode.commands.executeCommand('opencode-walkthrough.showAgents')
    );
    await assert.doesNotReject(
      vscode.commands.executeCommand('opencode-walkthrough.showModels')
    );
  });

  test('Walkthrough has expected step count', () => {
    const pkg = extension?.packageJSON;
    const walkthrough = pkg.contributes.walkthroughs.find(
      w => w.id === 'opencode.gettingStarted'
    );

    assert.ok(walkthrough);
    assert.equal(walkthrough.steps.length, 6);
  });
});
