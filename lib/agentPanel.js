'use strict';

const vscode = require('vscode');

class AgentPanelProvider {
  /**
   * @param {import('./agentLoop').AgentLoop} agentLoop
   * @param {() => Promise<{ message: string, ready: boolean }>} getHealth
   */
  constructor(agentLoop, getHealth) {
    this.agentLoop = agentLoop;
    this.getHealth = getHealth;
    this._view = null;
    this._messages = [];
    this._status = 'idle';

    agentLoop.on('text', delta => {
      this._appendAssistantDelta(delta);
    });
    agentLoop.on('roundStart', info => {
      this._status = `Round ${info.round}/${info.maxRounds}`;
      this._postState();
    });
    agentLoop.on('toolCall', call => {
      this._messages.push({ role: 'tool', content: `Tool: ${call.name}`, ts: Date.now() });
      this._postState();
    });
    agentLoop.on('done', () => {
      this._status = 'idle';
      this._postState();
    });
    agentLoop.on('cancelled', () => {
      this._status = 'cancelled';
      this._postState();
    });
    agentLoop.on('error', err => {
      this._messages.push({ role: 'error', content: err.message, ts: Date.now() });
      this._status = 'error';
      this._postState();
    });
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this._getHtml();

    webviewView.webview.onDidReceiveMessage(async msg => {
      switch (msg.type) {
        case 'send':
          await this._handleSend(msg.text);
          break;
        case 'cancel':
          this.agentLoop.cancel();
          break;
        case 'openTui':
          vscode.commands.executeCommand('opencode-walkthrough.runInteractive');
          break;
        case 'ready':
          await this._postState();
          break;
      }
    });
  }

  async sendMessage(text) {
    return this._handleSend(text);
  }

  async _handleSend(text) {
    if (!text?.trim()) return;
    this._messages.push({ role: 'user', content: text.trim(), ts: Date.now() });
    this._messages.push({ role: 'assistant', content: '', ts: Date.now(), streaming: true });
    this._status = 'running';
    this._postState();

    try {
      const result = await this.agentLoop.run(text.trim());
      const last = this._messages[this._messages.length - 1];
      if (last?.role === 'assistant') {
        last.streaming = false;
        if (!last.content && result.text) last.content = result.text;
      }
      if (result.sessionId) {
        this._status = `Session ${result.sessionId.slice(0, 8)}`;
      } else {
        this._status = 'idle';
      }
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
    if (!this._view) return;
    const health = await this.getHealth();
    this._view.webview.postMessage({
      type: 'state',
      messages: this._messages,
      status: this._status,
      health: health.message,
      ready: health.ready,
      sessionId: this.agentLoop.sessionId,
      running: this.agentLoop.isRunning(),
    });
  }

  _getHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      margin: 0;
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    #header {
      padding: 8px 12px;
      border-bottom: 1px solid var(--vscode-sideBar-border);
      font-size: 0.85em;
      color: var(--vscode-descriptionForeground);
    }
    #messages {
      flex: 1;
      overflow-y: auto;
      padding: 8px 12px;
    }
    .msg {
      margin-bottom: 10px;
      padding: 8px 10px;
      border-radius: 6px;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .msg.user {
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
    }
    .msg.assistant {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-editorWidget-border);
    }
    .msg.tool, .msg.error {
      font-size: 0.9em;
      color: var(--vscode-descriptionForeground);
      border-left: 3px solid var(--vscode-textLink-foreground);
      padding-left: 8px;
    }
    .msg.error { border-left-color: var(--vscode-errorForeground); color: var(--vscode-errorForeground); }
    .role { font-weight: 600; font-size: 0.8em; margin-bottom: 4px; opacity: 0.8; }
    #input-area {
      border-top: 1px solid var(--vscode-sideBar-border);
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    textarea {
      width: 100%;
      min-height: 64px;
      resize: vertical;
      font-family: inherit;
      font-size: inherit;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      padding: 8px;
    }
    .actions { display: flex; gap: 6px; }
    button {
      padding: 4px 12px;
      font-size: 0.9em;
      cursor: pointer;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button.secondary {
      background: transparent;
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-button-border, var(--vscode-input-border));
    }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    #empty {
      color: var(--vscode-descriptionForeground);
      text-align: center;
      padding: 24px 12px;
      font-size: 0.95em;
    }
  </style>
</head>
<body>
  <div id="header"><span id="status">Ready</span></div>
  <div id="messages"><div id="empty">Send a message to start an agent session.<br>OpenCode handles tool execution via the CLI.</div></div>
  <div id="input-area">
    <textarea id="input" placeholder="Ask OpenCode to help with your code…" rows="3"></textarea>
    <div class="actions">
      <button id="send">Send</button>
      <button id="cancel" class="secondary" disabled>Cancel</button>
      <button id="tui" class="secondary">Open TUI</button>
    </div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const messagesEl = document.getElementById('messages');
    const inputEl = document.getElementById('input');
    const statusEl = document.getElementById('status');
    const sendBtn = document.getElementById('send');
    const cancelBtn = document.getElementById('cancel');

    function renderMessages(messages) {
      if (!messages.length) {
        messagesEl.innerHTML = '<div id="empty">Send a message to start an agent session.</div>';
        return;
      }
      messagesEl.innerHTML = messages.map(m => {
        const role = m.role === 'user' ? 'You' : m.role === 'assistant' ? 'OpenCode' : m.role;
        return '<div class="msg ' + m.role + '"><div class="role">' + role + '</div>' + escapeHtml(m.content || '') + '</div>';
      }).join('');
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function escapeHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    window.addEventListener('message', e => {
      const msg = e.data;
      if (msg.type === 'state') {
        renderMessages(msg.messages);
        statusEl.textContent = msg.status + (msg.health ? ' · ' + msg.health : '');
        sendBtn.disabled = msg.running;
        cancelBtn.disabled = !msg.running;
      }
    });

    sendBtn.addEventListener('click', () => {
      const text = inputEl.value.trim();
      if (!text) return;
      vscode.postMessage({ type: 'send', text });
      inputEl.value = '';
    });

    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        sendBtn.click();
      }
    });

    cancelBtn.addEventListener('click', () => vscode.postMessage({ type: 'cancel' }));
    document.getElementById('tui').addEventListener('click', () => vscode.postMessage({ type: 'openTui' }));
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
  }
}

module.exports = { AgentPanelProvider };
