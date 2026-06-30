const assert = require('assert');
const vscode = require('vscode');
const { AgentsProvider, getShortcutHints } = require('../extension');

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

  test('Tips shortcut hints match the current platform family', () => {
    assert.deepEqual(getShortcutHints('darwin'), {
      platformLabel: 'macOS',
      rows: [
        { action: 'Show Actions quick pick', shortcut: '⌘⌥O' },
        { action: 'Run Inline Prompt', shortcut: '⌘⌥I' },
        { action: 'Run on Project Files', shortcut: '⌘⌥P' },
        { action: 'Start Interactive Session', shortcut: '⌘⌥T' },
        { action: 'CLI Help', shortcut: '⌘⌥H' },
        { action: 'Stats', shortcut: '⌘⌥S' },
      ],
    });

    assert.equal(getShortcutHints('win32').platformLabel, 'Windows/Linux');
    assert.equal(getShortcutHints('linux').rows[0].shortcut, 'Ctrl+Alt+O');
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
    assert.equal(walkthrough.steps.length, 8);
  });

  test('Agents empty-state CTA opens create-agent flow', async () => {
    const provider = new AgentsProvider((callback) => callback(null, ''));

    provider.refresh();
    const items = await provider.getChildren();

    assert.equal(items[0].label, 'No agents found');
    assert.equal(items[0].description, 'Create one to get started');
    assert.equal(items[0].command.command, 'opencode-walkthrough.createAgent');
  });

  test('Opening the agent in a new tab creates a visible editor webview panel', async () => {
    await assert.doesNotReject(
      vscode.commands.executeCommand('opencode-walkthrough.openAgentTab')
    );

    const hasAgentTab = () =>
      vscode.window.tabGroups.all.flatMap(g => g.tabs).some(t => t.label === 'OpenCode Agent');

    for (let i = 0; i < 20 && !hasAgentTab(); i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    assert.ok(hasAgentTab(), 'The new tab should be the OpenCode Agent panel');
  });
});
