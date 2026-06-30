'use strict';

const vscode = require('vscode');
const { exec } = require('child_process');

class AgentPanelProvider {
  constructor(agentLoop, getHealth) {
    this.agentLoop = agentLoop;
    this.getHealth = getHealth;
    this._views = new Set();
    this._messages = [];
    this._status = 'idle';
    this._selectedAgent = null;
    this._selectedModel = null;

    agentLoop.on('text', delta => this._appendAssistantDelta(delta));
    agentLoop.on('roundStart', info => {
      this._status = 'Round ' + info.round + '/' + info.maxRounds;
      this._postState();
    });
    agentLoop.on('toolCall', call => {
      this._messages.push({ role: 'tool', content: call.name, ts: Date.now() });
      this._postState();
    });
    agentLoop.on('done', () => { this._status = 'idle'; this._postState(); });
    agentLoop.on('cancelled', () => { this._status = 'cancelled'; this._postState(); });
    agentLoop.on('error', err => {
      this._messages.push({ role: 'error', content: err.message, ts: Date.now() });
      this._status = 'error';
      this._postState();
    });
  }

  resolveWebviewView(webviewView) {
    this._views.add(webviewView);
    if (typeof webviewView.onDidDispose === 'function') {
      webviewView.onDidDispose(() => this._views.delete(webviewView));
    }
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this._getHtml();

    webviewView.webview.onDidReceiveMessage(async msg => {
      switch (msg.type) {
        case 'send':
        case 'chip':
          await this._handleSend(msg.text, { model: msg.model, agent: msg.agent, contextFiles: msg.contextFiles });
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
          await this._postState();
          break;
        case 'ready':
          await this._postState();
          break;
        case 'addContext':
          await this._handleAddContext(webviewView.webview);
          break;
        case 'pickAgent':
          await this._handlePickAgent(webviewView.webview);
          break;
        case 'pickModel':
          await this._handlePickModel(webviewView.webview);
          break;
      }
    });
  }

  async _handleAddContext(webview) {
    const uris = await vscode.window.showOpenDialog({
      canSelectMany: true,
      canSelectFiles: true,
      canSelectFolders: false,
      openLabel: 'Add to context',
      title: 'Select files to include as context',
    });
    if (!uris || uris.length === 0) return;
    const paths = uris.map(u => u.fsPath);
    webview.postMessage({ type: 'contextFilesAdded', paths });
  }

  async _handlePickAgent(webview) {
    const agents = await this._listAgents();
    const items = [
      { label: '$(circle-slash) None', description: 'Use default opencode behavior', value: null },
      ...agents.map(a => ({ label: '$(robot) ' + a.name, description: a.description, value: a.name })),
    ];
    const picked = await vscode.window.showQuickPick(items, {
      title: 'Select Agent',
      placeHolder: 'Choose an agent to use for this session',
    });
    if (picked === undefined) return;
    this._selectedAgent = picked.value;
    webview.postMessage({ type: 'agentSelected', agent: picked.value, label: picked.value || 'Agent' });
  }

  async _handlePickModel(webview) {
    const models = await this._listModels();
    const items = [
      { label: '$(zap) Auto', description: 'Let opencode choose the model', value: null },
      ...models.map(m => ({ label: '$(symbol-parameter) ' + m, description: '', value: m })),
    ];
    const picked = await vscode.window.showQuickPick(items, {
      title: 'Select Model',
      placeHolder: 'Choose a model for this session',
    });
    if (picked === undefined) return;
    this._selectedModel = picked.value;
    webview.postMessage({ type: 'modelSelected', model: picked.value, label: picked.value || 'Auto' });
  }

  _listAgents() {
    return new Promise(resolve => {
      exec('opencode agent list 2>/dev/null || true', (err, stdout) => {
        const agents = [];
        if (!err && stdout) {
          for (const line of stdout.trim().split('\n')) {
            const m = line.match(/^(\S+)\s*(.*)/);
            if (m && m[1]) agents.push({ name: m[1], description: (m[2] || '').trim() });
          }
        }
        resolve(agents);
      });
    });
  }

  _listModels() {
    return new Promise(resolve => {
      exec('opencode models 2>/dev/null || true', (err, stdout) => {
        const models = [];
        if (!err && stdout) {
          for (const line of stdout.trim().split('\n')) {
            const trimmed = line.trim();
            if (trimmed) models.push(trimmed);
          }
        }
        resolve(models);
      });
    });
  }

  async sendMessage(text) {
    return this._handleSend(text);
  }

  async _handleSend(text, options = {}) {
    if (!text?.trim()) return;

    let fullText = text.trim();
    if (options.contextFiles && options.contextFiles.length > 0) {
      fullText += '\n\nContext files: ' + options.contextFiles.join(', ');
    }

    this._messages.push({ role: 'user', content: text.trim(), ts: Date.now() });
    this._messages.push({ role: 'assistant', content: '', ts: Date.now(), streaming: true });
    this._status = 'running';
    this._postState();

    try {
      const runOptions = {};
      if (options.agent) runOptions.agent = options.agent;
      if (options.model) runOptions.model = options.model;

      const result = await this.agentLoop.run(fullText, runOptions);
      const last = this._messages[this._messages.length - 1];
      if (last?.role === 'assistant') {
        last.streaming = false;
        if (!last.content && result.text) last.content = result.text;
      }
      this._status = result.sessionId ? 'Session ' + result.sessionId.slice(0, 8) : 'idle';
    } catch (err) {
      this._messages.push({ role: 'error', content: err.message, ts: Date.now() });
      this._status = 'error';
    }
    this._postState();
  }

  _appendAssistantDelta(delta) {
    const last = [...this._messages].reverse().find(m => m.role === 'assistant' && m.streaming);
    if (last) {
      last.content += delta;
    } else {
      this._messages.push({ role: 'assistant', content: delta, ts: Date.now(), streaming: true });
    }
    this._postState();
  }

  async _postState() {
    if (this._views.size === 0) return;
    const health = await this.getHealth();
    const folders = vscode.workspace.workspaceFolders;
    const workspaceName = folders && folders[0] ? folders[0].name : '';
    const state = {
      type: 'state',
      messages: this._messages,
      status: this._status,
      health: health.message,
      ready: health.ready,
      sessionId: this.agentLoop.sessionId,
      running: this.agentLoop.isRunning(),
      workspaceName,
      selectedAgent: this._selectedAgent,
      selectedModel: this._selectedModel,
    };
    for (const view of this._views) {
      view.webview.postMessage(state);
    }
  }

  openInNewTab() {
    const panel = vscode.window.createWebviewPanel(
      'opencode-walkthrough.agentTab',
      'OpenCode Agent',
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    this.resolveWebviewView(panel);
    return panel;
  }

  _getHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenCode</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ── Welcome ── */
    #welcome {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px 14px;
      gap: 14px;
      overflow-y: auto;
    }
    .wc-icon { font-size: 2em; line-height: 1; }
    .wc-title { font-size: 1.1em; font-weight: 600; text-align: center; }
    .wc-meta {
      font-size: 0.79em;
      color: var(--vscode-descriptionForeground);
      display: flex; align-items: center; gap: 5px;
      flex-wrap: wrap; justify-content: center;
    }
    .project-chip {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 1px 8px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 10px; font-size: 0.95em;
    }
    .chips {
      display: flex; flex-wrap: wrap; gap: 5px; justify-content: center;
    }
    .chip {
      padding: 4px 10px;
      border: 1px solid var(--vscode-input-border, var(--vscode-sideBar-border));
      border-radius: 14px; font-size: 0.78em;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      cursor: pointer; font-family: inherit;
      transition: background 0.1s;
    }
    .chip:hover { background: var(--vscode-list-hoverBackground); }

    /* ── Chat ── */
    #chat {
      flex: 1; display: none; flex-direction: column; overflow: hidden;
    }
    #chat.active { display: flex; }
    #chat-header {
      padding: 5px 10px;
      border-bottom: 1px solid var(--vscode-sideBar-border);
      font-size: 0.78em; color: var(--vscode-descriptionForeground);
      display: flex; align-items: center; gap: 5px; flex-shrink: 0;
    }
    #new-chat-btn {
      margin-left: auto; padding: 1px 7px;
      border: 1px solid var(--vscode-sideBar-border); border-radius: 4px;
      background: transparent; color: var(--vscode-descriptionForeground);
      cursor: pointer; font-size: 0.9em; font-family: inherit;
    }
    #new-chat-btn:hover { background: var(--vscode-list-hoverBackground); color: var(--vscode-foreground); }

    #messages {
      flex: 1; overflow-y: auto; padding: 10px 8px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .msg { display: flex; flex-direction: column; gap: 3px; }
    .msg-label {
      font-size: 0.74em; font-weight: 600;
      color: var(--vscode-descriptionForeground);
      display: flex; align-items: center; gap: 4px; padding: 0 1px;
    }
    .avatar {
      width: 14px; height: 14px; border-radius: 50%;
      font-size: 7px; display: flex; align-items: center;
      justify-content: center; font-weight: 700; flex-shrink: 0;
    }
    .msg.user .avatar { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .msg.assistant .avatar { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
    .msg-body {
      border-radius: 6px; padding: 7px 9px;
      line-height: 1.5; font-size: 0.92em;
      word-break: break-word; overflow-wrap: break-word;
    }
    .msg.user .msg-body {
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, transparent);
      white-space: pre-wrap;
    }
    .msg.assistant .msg-body { background: transparent; padding-left: 2px; }
    .msg.tool .msg-body {
      font-size: 0.8em; color: var(--vscode-descriptionForeground);
      border-left: 2px solid var(--vscode-textLink-foreground);
      padding: 2px 6px; background: transparent;
    }
    .msg.error .msg-body {
      background: var(--vscode-inputValidation-errorBackground, rgba(255,0,0,0.1));
      border: 1px solid var(--vscode-inputValidation-errorBorder, var(--vscode-errorForeground));
      color: var(--vscode-errorForeground);
    }
    .msg-body pre {
      background: var(--vscode-textCodeBlock-background);
      border: 1px solid var(--vscode-editorWidget-border, var(--vscode-sideBar-border));
      border-radius: 4px; padding: 6px 8px; overflow-x: auto;
      margin: 5px 0;
      font-family: var(--vscode-editor-font-family); font-size: 0.88em; white-space: pre;
    }
    .msg-body code {
      font-family: var(--vscode-editor-font-family); font-size: 0.88em;
      background: var(--vscode-textCodeBlock-background); padding: 1px 4px; border-radius: 3px;
    }
    .msg-body pre code { background: none; padding: 0; }
    .msg-body p { margin-bottom: 5px; }
    .msg-body p:last-child { margin-bottom: 0; }
    .msg-body ul, .msg-body ol { padding-left: 16px; margin: 3px 0; }
    .msg-body li { margin-bottom: 2px; }
    .msg-body strong { font-weight: 600; }

    /* Streaming cursor */
    .cursor {
      display: inline-block; width: 2px; height: 0.85em;
      background: currentColor; vertical-align: text-bottom;
      margin-left: 1px; animation: blink 1s step-end infinite;
    }
    @keyframes blink { 50% { opacity: 0; } }

    /* Typing dots */
    .typing { display: flex; gap: 3px; align-items: center; padding: 4px 0; }
    .typing span {
      width: 5px; height: 5px; border-radius: 50%;
      background: var(--vscode-descriptionForeground);
      animation: tdot 1.2s ease-in-out infinite;
    }
    .typing span:nth-child(2) { animation-delay: 0.15s; }
    .typing span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes tdot { 0%,80%,100%{transform:scale(0.5);opacity:0.3} 40%{transform:scale(1);opacity:1} }

    /* ── Context file chips ── */
    .ctx-files {
      display: flex; flex-wrap: wrap; gap: 4px;
      padding: 6px 10px 0;
    }
    .ctx-files:empty { display: none; }
    .ctx-file-chip {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 1px 6px 1px 7px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 10px; font-size: 0.73em; max-width: 160px;
    }
    .ctx-file-chip span {
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .ctx-file-chip button {
      background: none; border: none; cursor: pointer;
      color: inherit; padding: 0; font-size: 0.9em; line-height: 1;
      opacity: 0.7; flex-shrink: 0;
    }
    .ctx-file-chip button:hover { opacity: 1; }

    /* ── Shared Input Box ── */
    #input-area-welcome { width: 100%; max-width: 360px; }
    #input-area-chat {
      padding: 8px; border-top: 1px solid var(--vscode-sideBar-border); flex-shrink: 0;
    }
    .input-box {
      border: 1px solid var(--vscode-input-border, var(--vscode-sideBar-border));
      border-radius: 8px; background: var(--vscode-input-background);
      display: flex; flex-direction: column;
      transition: border-color 0.15s, outline 0.15s;
    }
    .input-box:focus-within {
      border-color: var(--vscode-focusBorder);
      outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px;
    }
    .chat-input {
      width: 100%; resize: none; border: none; outline: none;
      font-family: inherit; font-size: inherit;
      color: var(--vscode-input-foreground); background: transparent;
      padding: 8px 10px 4px; line-height: 1.5; overflow-y: auto;
      min-height: 44px; max-height: 160px;
    }
    .chat-input::placeholder { color: var(--vscode-input-placeholderForeground); }
    .input-toolbar {
      display: flex; align-items: center; padding: 4px 6px 6px; gap: 4px;
    }
    .toolbar-left { display: flex; align-items: center; gap: 4px; flex: 1; flex-wrap: wrap; }
    .add-ctx-btn {
      width: 20px; height: 20px;
      border: 1px solid var(--vscode-sideBar-border); border-radius: 50%;
      background: transparent; color: var(--vscode-descriptionForeground);
      cursor: pointer; font-size: 14px; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      font-family: inherit;
    }
    .add-ctx-btn:hover { background: var(--vscode-list-hoverBackground); color: var(--vscode-foreground); }
    .mode-pill {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 7px;
      border: 1px solid var(--vscode-sideBar-border); border-radius: 10px;
      font-size: 0.75em; color: var(--vscode-descriptionForeground); white-space: nowrap;
      background: transparent; cursor: pointer; font-family: inherit;
    }
    .mode-pill:hover { background: var(--vscode-list-hoverBackground); color: var(--vscode-foreground); }
    .mode-pill.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-background);
    }
    .mode-pill.active:hover { background: var(--vscode-button-hoverBackground); }
    .send-btn {
      width: 26px; height: 26px; border-radius: 6px; border: none;
      background: var(--vscode-button-background); color: var(--vscode-button-foreground);
      cursor: pointer; flex-shrink: 0; font-size: 15px;
      display: flex; align-items: center; justify-content: center;
      font-family: inherit;
    }
    .send-btn:hover:not(:disabled) { background: var(--vscode-button-hoverBackground); }
    .send-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .cancel-action {
      display: none; align-items: center; gap: 3px;
      padding: 2px 7px; font-size: 0.76em;
      border: 1px solid var(--vscode-sideBar-border); border-radius: 4px;
      background: transparent; color: var(--vscode-foreground);
      cursor: pointer; font-family: inherit;
    }
    .cancel-action.show { display: inline-flex; }
    .cancel-action:hover { background: var(--vscode-list-hoverBackground); }

    /* ── Status Bar ── */
    #statusbar {
      flex-shrink: 0; padding: 3px 10px; min-height: 22px;
      border-top: 1px solid var(--vscode-sideBar-border);
      font-size: 0.72em; color: var(--vscode-descriptionForeground);
      display: flex; align-items: center; gap: 6px;
      background: var(--vscode-sideBar-background);
    }
    .sdot {
      width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
    }
    .sdot.idle { background: var(--vscode-testing-iconPassed, #4caf50); }
    .sdot.running {
      background: var(--vscode-progressBar-background, #007acc);
      animation: spulse 1.2s ease-in-out infinite;
    }
    .sdot.error { background: var(--vscode-errorForeground); }
    .sdot.cancelled { background: var(--vscode-descriptionForeground); }
    @keyframes spulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
    #tui-btn {
      margin-left: auto; background: none; border: none;
      color: var(--vscode-textLink-foreground); cursor: pointer;
      font-size: inherit; font-family: inherit; padding: 0;
    }
    #tui-btn:hover { text-decoration: underline; }
  </style>
</head>
<body>

  <!-- Welcome View -->
  <div id="welcome">
    <div class="wc-icon">&#x25C8;</div>
    <div class="wc-title">OpenCode Agent</div>
    <div class="wc-meta">
      New session in
      <span class="project-chip">&#x1F4C1;&nbsp;<span id="ws-name">workspace</span></span>
    </div>

    <div id="input-area-welcome">
      <div class="input-box">
        <div class="ctx-files" id="ctx-files-welcome"></div>
        <textarea id="input-welcome" class="chat-input" placeholder="Describe what you want to build…" rows="3"></textarea>
        <div class="input-toolbar">
          <div class="toolbar-left">
            <button class="add-ctx-btn" id="add-ctx-welcome" title="Add context files">+</button>
            <button class="mode-pill" id="agent-btn-welcome" title="Select agent">&#x25CE; Agent</button>
            <button class="mode-pill" id="model-btn-welcome" title="Select model">Auto</button>
          </div>
          <button class="send-btn" id="send-welcome" title="Send (Enter)">&uarr;</button>
        </div>
      </div>
    </div>

    <div class="chips">
      <button class="chip" data-p="Explain this codebase to me">Explain codebase</button>
      <button class="chip" data-p="Find and fix bugs in my code">Fix bugs</button>
      <button class="chip" data-p="Write tests for my code">Write tests</button>
      <button class="chip" data-p="Refactor and improve my code quality">Refactor</button>
      <button class="chip" data-p="Review my recent git changes">Review changes</button>
      <button class="chip" data-p="Help me set up opencode auth login">Auth setup</button>
    </div>
  </div>

  <!-- Chat View -->
  <div id="chat">
    <div id="chat-header">
      <span>&#x25C8; OpenCode</span>
      <span id="session-label" style="opacity:0.65;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:80px;"></span>
      <button id="new-chat-btn">+ New</button>
    </div>
    <div id="messages"></div>
    <div id="input-area-chat">
      <div class="input-box">
        <div class="ctx-files" id="ctx-files-chat"></div>
        <textarea id="input-chat" class="chat-input" placeholder="Ask OpenCode…" rows="2"></textarea>
        <div class="input-toolbar">
          <div class="toolbar-left">
            <button class="add-ctx-btn" id="add-ctx-chat" title="Add context files">+</button>
            <button class="mode-pill" id="agent-btn-chat" title="Select agent">&#x25CE; Agent</button>
            <button class="mode-pill" id="model-btn-chat" title="Select model">Auto</button>
            <button class="cancel-action" id="cancel-btn">&#x2715; Cancel</button>
          </div>
          <button class="send-btn" id="send-chat" title="Send (Enter)">&uarr;</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Status Bar -->
  <div id="statusbar">
    <div class="sdot idle" id="sdot"></div>
    <span id="status-text">Ready</span>
    <button id="tui-btn">Open TUI</button>
  </div>

<script>
(function() {
  var vscode = acquireVsCodeApi();

  var welcomeEl    = document.getElementById('welcome');
  var chatEl       = document.getElementById('chat');
  var messagesEl   = document.getElementById('messages');
  var inputWelcome = document.getElementById('input-welcome');
  var inputChat    = document.getElementById('input-chat');
  var sendWelcome  = document.getElementById('send-welcome');
  var sendChat     = document.getElementById('send-chat');
  var cancelBtn    = document.getElementById('cancel-btn');
  var sdot         = document.getElementById('sdot');
  var statusText   = document.getElementById('status-text');
  var sessionLabel = document.getElementById('session-label');
  var wsNameEl     = document.getElementById('ws-name');
  var newChatBtn   = document.getElementById('new-chat-btn');
  var tuiBtn       = document.getElementById('tui-btn');

  var ctxFilesWelcome = document.getElementById('ctx-files-welcome');
  var ctxFilesChat    = document.getElementById('ctx-files-chat');
  var agentBtnWelcome = document.getElementById('agent-btn-welcome');
  var agentBtnChat    = document.getElementById('agent-btn-chat');
  var modelBtnWelcome = document.getElementById('model-btn-welcome');
  var modelBtnChat    = document.getElementById('model-btn-chat');

  var isRunning    = false;
  var selectedAgent = null;
  var selectedModel = null;
  var contextFiles  = [];

  /* ── Context file chips ── */

  function addContextFiles(paths) {
    for (var i = 0; i < paths.length; i++) {
      var p = paths[i];
      if (contextFiles.indexOf(p) === -1) contextFiles.push(p);
    }
    renderContextFiles();
  }

  function removeContextFile(path) {
    contextFiles = contextFiles.filter(function(p) { return p !== path; });
    renderContextFiles();
  }

  function renderContextFiles() {
    var html = contextFiles.map(function(p) {
      var name = p.replace(/.*[\\/]/, '');
      return '<div class="ctx-file-chip">'
        + '<span title="' + esc(p) + '">' + esc(name) + '</span>'
        + '<button data-path="' + esc(p) + '" title="Remove">&#x2715;</button>'
        + '</div>';
    }).join('');
    ctxFilesWelcome.innerHTML = html;
    ctxFilesChat.innerHTML = html;

    [ctxFilesWelcome, ctxFilesChat].forEach(function(container) {
      container.querySelectorAll('button[data-path]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          removeContextFile(btn.getAttribute('data-path'));
        });
      });
    });
  }

  /* ── Agent / model button labels ── */

  function updateAgentButtons(agent) {
    selectedAgent = agent;
    var label = agent ? ('&#x25CE; ' + esc(agent)) : '&#x25CE; Agent';
    var isActive = !!agent;
    [agentBtnWelcome, agentBtnChat].forEach(function(btn) {
      btn.innerHTML = label;
      if (isActive) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  function updateModelButtons(model) {
    selectedModel = model;
    var label = model ? esc(model.split('/').pop()) : 'Auto';
    var isActive = !!model;
    [modelBtnWelcome, modelBtnChat].forEach(function(btn) {
      btn.textContent = label;
      if (isActive) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  /* ── Send ── */

  function send(text) {
    var t = (text || '').trim();
    if (!t || isRunning) return;
    vscode.postMessage({
      type: 'send',
      text: t,
      agent: selectedAgent,
      model: selectedModel,
      contextFiles: contextFiles.slice(),
    });
    contextFiles = [];
    renderContextFiles();
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  /* ── Render ── */

  function render(s) {
    isRunning = s.running;
    var hasMessages = s.messages && s.messages.length > 0;

    welcomeEl.style.display = hasMessages ? 'none' : '';
    chatEl.style.display = hasMessages ? 'flex' : 'none';
    if (hasMessages) chatEl.classList.add('active');

    if (s.workspaceName) wsNameEl.textContent = s.workspaceName;

    if (hasMessages) {
      renderMessages(s.messages);
      sessionLabel.textContent = s.sessionId ? '· ' + s.sessionId.slice(0, 8) : '';
    }

    if (s.selectedAgent !== undefined) updateAgentButtons(s.selectedAgent);
    if (s.selectedModel !== undefined) updateModelButtons(s.selectedModel);

    var dot = s.running ? 'running' : (s.status === 'error' ? 'error' : (s.status === 'cancelled' ? 'cancelled' : 'idle'));
    sdot.className = 'sdot ' + dot;

    var label = s.running ? 'Running…' : (s.status === 'idle' || !s.status ? 'Ready' : s.status);
    if (s.health && !s.running) label += ' · ' + s.health;
    statusText.textContent = label;

    sendChat.disabled = s.running;
    sendWelcome.disabled = s.running;
    if (s.running) cancelBtn.classList.add('show');
    else cancelBtn.classList.remove('show');
  }

  function renderMessages(messages) {
    var html = '';
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (m.role === 'tool') {
        html += '<div class="msg tool"><div class="msg-body">⚙ Running: ' + esc(m.content) + '</div></div>';
        continue;
      }
      if (m.role === 'error') {
        html += '<div class="msg error"><div class="msg-label">⚠️ Error</div><div class="msg-body">' + esc(m.content) + '</div></div>';
        continue;
      }
      var isUser = m.role === 'user';
      var labelText  = isUser ? 'You' : 'OpenCode';
      var avatarText = isUser ? 'U' : 'OC';
      var body;
      if (!isUser) {
        if (m.streaming && !m.content) {
          body = '<div class="typing"><span></span><span></span><span></span></div>';
        } else {
          body = renderMarkdown(m.content || '') + (m.streaming ? '<span class="cursor"></span>' : '');
        }
      } else {
        body = esc(m.content || '');
      }
      html += '<div class="msg ' + m.role + '">'
        + '<div class="msg-label"><div class="avatar">' + avatarText + '</div>' + labelText + '</div>'
        + '<div class="msg-body">' + body + '</div>'
        + '</div>';
    }
    messagesEl.innerHTML = html;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderMarkdown(raw) {
    var segments = [];
    var pos = 0;
    var fenceRe = /\`\`\`(?:[\w]*)\n([\s\S]*?)\`\`\`/g;
    var fm;
    while ((fm = fenceRe.exec(raw)) !== null) {
      if (fm.index > pos) segments.push({ t: 'text', v: raw.slice(pos, fm.index) });
      segments.push({ t: 'code', v: fm[1] });
      pos = fm.index + fm[0].length;
    }
    if (pos < raw.length) segments.push({ t: 'text', v: raw.slice(pos) });

    var out = '';
    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i];
      if (seg.t === 'code') {
        out += '<pre><code>' + esc(seg.v) + '</code></pre>';
      } else {
        var h = esc(seg.v);
        h = h.replace(/\`([^\`\n]+)\`/g, '<code>$1</code>');
        h = h.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
        h = h.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
        h = '<p>' + h.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
        out += h;
      }
    }
    return out;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Event listeners ── */

  sendWelcome.addEventListener('click', function() {
    send(inputWelcome.value);
    inputWelcome.value = '';
    autoResize(inputWelcome);
  });

  sendChat.addEventListener('click', function() {
    send(inputChat.value);
    inputChat.value = '';
    autoResize(inputChat);
  });

  [inputWelcome, inputChat].forEach(function(el) {
    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (el === inputWelcome) sendWelcome.click();
        else sendChat.click();
      }
    });
    el.addEventListener('input', function() { autoResize(el); });
  });

  document.querySelectorAll('.chip').forEach(function(btn) {
    btn.addEventListener('click', function() {
      vscode.postMessage({
        type: 'chip',
        text: btn.getAttribute('data-p'),
        agent: selectedAgent,
        model: selectedModel,
        contextFiles: contextFiles.slice(),
      });
    });
  });

  document.getElementById('add-ctx-welcome').addEventListener('click', function() {
    vscode.postMessage({ type: 'addContext' });
  });
  document.getElementById('add-ctx-chat').addEventListener('click', function() {
    vscode.postMessage({ type: 'addContext' });
  });

  agentBtnWelcome.addEventListener('click', function() { vscode.postMessage({ type: 'pickAgent' }); });
  agentBtnChat.addEventListener('click', function() { vscode.postMessage({ type: 'pickAgent' }); });

  modelBtnWelcome.addEventListener('click', function() { vscode.postMessage({ type: 'pickModel' }); });
  modelBtnChat.addEventListener('click', function() { vscode.postMessage({ type: 'pickModel' }); });

  cancelBtn.addEventListener('click', function() { vscode.postMessage({ type: 'cancel' }); });
  newChatBtn.addEventListener('click', function() { vscode.postMessage({ type: 'newChat' }); });
  tuiBtn.addEventListener('click', function() { vscode.postMessage({ type: 'openTui' }); });

  window.addEventListener('message', function(e) {
    var msg = e.data;
    if (msg.type === 'state') {
      render(msg);
    } else if (msg.type === 'contextFilesAdded') {
      addContextFiles(msg.paths);
    } else if (msg.type === 'agentSelected') {
      updateAgentButtons(msg.agent);
    } else if (msg.type === 'modelSelected') {
      updateModelButtons(msg.model);
    }
  });

  vscode.postMessage({ type: 'ready' });
})();
</script>
</body>
</html>`;
  }
}

module.exports = { AgentPanelProvider };
