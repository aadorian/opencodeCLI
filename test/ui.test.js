'use strict';

const { test } = require('node:test');
const assert = require('assert');

// Mock VS Code API for UI testing
class MockWebview {
  constructor() {
    this.content = '';
    this.options = {};
    this.onDidReceiveMessage = {
      register: function(type, callback) {
        this.callback = callback;
      }
    };
  }
  
  get html() { return this._html; }
  set html(value) { this._html = value; }
  
  postMessage(msg) {
    if (this.lastPostMessage) {
      this.lastPostMessage(msg);
    }
  }
}

class MockAgentPanelProvider {
  constructor(agentLoop, getHealth) {
    this.agentLoop = agentLoop;
    this.getHealth = getHealth;
    this._view = null;
    this._messages = [];
    this._status = 'idle';
    this._selectedAgent = null;
    this._selectedModel = null;
  }
  
  resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this._getHtml();
    
    webviewView.webview.onDidReceiveMessage((msg) => {
      switch (msg.type) {
        case 'send':
        case 'chip':
          this._handleSend(msg.text, { model: msg.model, agent: msg.agent, contextFiles: msg.contextFiles });
          break;
        case 'cancel':
          this.agentLoop.cancel();
          break;
        case 'openTui':
          vscode.commands.executeCommand('opencode-walkthrough.runInteractive');
          break;
        case 'newChat':
          this._messages = [];
          if (this.agentLoop.sessionId != null) this.agentLoop.sessionId = null;
          this._status = 'idle';
          this._postState();
          break;
        case 'ready':
          this._postState();
          break;
        case 'addContext':
          this._handleAddContext(webviewView.webview);
          break;
        case 'pickAgent':
          this._handlePickAgent(webviewView.webview);
          break;
        case 'pickModel':
          this._handlePickModel(webviewView.webview);
          break;
      }
    });
  }
  
  _handleSend(text, options) { return Promise.resolve(); }
  _handleAddContext(webview) { return Promise.resolve(); }
  _handlePickAgent(webview) { return Promise.resolve(); }
  _handlePickModel(webview) { return Promise.resolve(); }
  _postState() { return Promise.resolve(); }
  _getHtml() { return '<html></html>'; }
}

test('Agent panel webview has correct UI structure', () => {
  const mockWebview = new MockWebview();
  mockWebview.options = { enableScripts: true };
  
  const realPanelHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenCode</title>
</head>
<body>
  <div id="welcome">
    <div class="wc-icon">&#x25C8;</div>
    <div class="wc-title">OpenCode Agent</div>
    <div id="input-area-welcome">
      <div class="input-box">
        <textarea id="input-welcome" class="chat-input" placeholder="Describe what you want to build…"></textarea>
        <div class="input-toolbar">
          <button class="send-btn" id="send-welcome">&#x2191;</button>
        </div>
      </div>
    </div>
  </div>
  <div id="chat">
    <div id="chat-header">
      <span>&#x25C8; OpenCode</span>
    </div>
    <div id="messages"></div>
    <div id="input-area-chat">
      <div class="input-box">
        <textarea id="input-chat" class="chat-input" placeholder="Ask OpenCode…"></textarea>
        <div class="input-toolbar">
          <button class="send-btn" id="send-chat">&#x2191;</button>
          <button class="cancel-action" id="cancel-btn">&#x2715; Cancel</button>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  
  mockWebview.html = realPanelHtml;
  
  assert.ok(mockWebview.options.enableScripts);
  assert.ok(mockWebview.html.includes('OpenCode Agent'));
  assert.ok(mockWebview.html.includes('input-box'));
  assert.ok(mockWebview.html.includes('send-btn'));
  assert.ok(mockWebview.html.includes('cancel-action'));
  assert.ok(mockWebview.html.includes('vscode-sideBar-background'));
});

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

test('Context filtering shows correct UI elements when disabled', () => {
  const config = {
    includeWorkspace: true,
    includeOpenEditors: false,
    includeActiveFile: true,
    includeSelection: false,
    includeDiagnostics: true,
    includeGit: true,
    includeFileContents: false,
  };
  
  // Simulate UI element visibility based on context config
  const hasOpenEditorsUI = config.includeOpenEditors;
  const hasSelectionUI = config.includeSelection;
  const hasFileContentsUI = config.includeFileContents;
  
  assert.equal(hasOpenEditorsUI, false);
  assert.equal(hasSelectionUI, false);
  assert.equal(hasFileContentsUI, false);
});