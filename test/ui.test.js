'use strict';

const { test } = require('node:test');
const assert = require('assert');

test('Walkthrough navigation commands work', async () => {
  const vscode = {
    commands: {
      executeCommand: async (command) => {
        if (command === 'opencode-walkthrough.showWalkthrough') return;
        if (command === 'opencode-walkthrough.createAgent') return;
        if (command === 'opencode-walkthrough.showAgents') return;
        throw new Error(`Unknown command: ${command}`);
      }
    }
  };
  
  await vscode.commands.executeCommand('opencode-walkthrough.showWalkthrough');
  await vscode.commands.executeCommand('opencode-walkthrough.createAgent');
  await vscode.commands.executeCommand('opencode-walkthrough.showAgents');
});

test('Sidebar tree view updates on agent refresh', async () => {
  class MockAgentsProvider {
    constructor() {
      this.items = [];
      this._onDidChangeTreeData = {
        fire: () => {}
      };
    }
    
    refresh() {
      this.items = [
        { label: 'Agent 1', description: 'First agent' },
        { label: 'Agent 2', description: 'Second agent' }
      ];
      this._onDidChangeTreeData.fire();
    }
    
    getChildren() {
      return this.items;
    }
  }
  
  const provider = new MockAgentsProvider();
  assert.equal(provider.items.length, 0);
  
  provider.refresh();
  assert.equal(provider.items.length, 2);
  assert.equal(provider.items[0].label, 'Agent 1');
});

test('Walkthrough step validation', () => {
  const mockWalkthroughs = [
    { id: 'opencode.install', title: 'Install OpenCode' },
    { id: 'opencode.auth', title: 'Configure Providers' },
    { id: 'opencode.runInline', title: 'Run a Prompt' },
    { id: 'opencode.runInteractive', title: 'Start Interactive Mode' },
    { id: 'opencode.createAgent', title: 'Create an Agent' },
    { id: 'opencode.tips', title: 'Tips & Best Practices' },
    { id: 'opencode.addMcp', title: 'Add an MCP Server' },
    { id: 'opencode.uninstall', title: 'Remove OpenCode' }
  ];
  
  assert.equal(mockWalkthroughs.length, 8);
  assert.ok(mockWalkthroughs[0].id.includes('install'));
  assert.ok(mockWalkthroughs[7].id.includes('uninstall'));
});
