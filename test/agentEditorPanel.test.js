const assert = require('assert');
const vscode = require('vscode');

function findAgentChatTabs() {
  return vscode.window.tabGroups.all
    .flatMap(g => g.tabs)
    .filter(t => t.input && String(t.input.viewType || '').includes('opencodeAgentChat'));
}

suite('Open Agent Chat in Editor', () => {
  let extension;

  suiteSetup(async () => {
    extension = vscode.extensions.getExtension('AlejandroAdorjan.opencode-walkthrough');
    await extension?.activate();
    await vscode.commands.executeCommand('opencode-walkthrough.agent.focus');
    await new Promise(r => setTimeout(r, 300));
  });

  teardown(async () => {
    for (const tab of findAgentChatTabs()) {
      await vscode.window.tabGroups.close(tab);
    }
    await new Promise(r => setTimeout(r, 200));
  });

  test('command is registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('opencode-walkthrough.openAgentInEditor'));
  });

  test('opens the chat as an editor tab beside the sidebar', async () => {
    const groupsBefore = vscode.window.tabGroups.all.length;

    await vscode.commands.executeCommand('opencode-walkthrough.openAgentInEditor');
    await new Promise(r => setTimeout(r, 500));

    const agentTabs = findAgentChatTabs();
    assert.strictEqual(agentTabs.length, 1, 'should open exactly one agent chat tab');
    assert.strictEqual(agentTabs[0].label, 'OpenCode Agent');
    assert.ok(
      vscode.window.tabGroups.all.length > groupsBefore,
      'should open in a new tab group (beside), not replace the active one'
    );
  });

  test('reuses the existing tab on a second invocation instead of duplicating it', async () => {
    await vscode.commands.executeCommand('opencode-walkthrough.openAgentInEditor');
    await new Promise(r => setTimeout(r, 300));
    await vscode.commands.executeCommand('opencode-walkthrough.openAgentInEditor');
    await new Promise(r => setTimeout(r, 300));

    assert.strictEqual(findAgentChatTabs().length, 1, 'second call should reveal, not duplicate, the tab');
  });

  test('reopens a fresh tab after the previous one was closed', async () => {
    await vscode.commands.executeCommand('opencode-walkthrough.openAgentInEditor');
    await new Promise(r => setTimeout(r, 300));

    for (const tab of findAgentChatTabs()) {
      await vscode.window.tabGroups.close(tab);
    }
    await new Promise(r => setTimeout(r, 300));
    assert.strictEqual(findAgentChatTabs().length, 0, 'tab should be closed');

    await vscode.commands.executeCommand('opencode-walkthrough.openAgentInEditor');
    await new Promise(r => setTimeout(r, 500));

    assert.strictEqual(findAgentChatTabs().length, 1, 'should be able to reopen after closing');
  });
});
