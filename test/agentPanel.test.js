'use strict';

const assert = require('assert');
const vscode = require('vscode');
const { EventEmitter } = require('events');
const { AgentPanelProvider, shellQuote } = require('../lib/agentPanel');

function makeAgentLoop(sessionId = null) {
  const loop = new EventEmitter();
  loop.sessionId = sessionId;
  loop.isRunning = () => false;
  loop.cancel = () => { loop.cancelled = true; };
  loop.run = async () => ({ text: '', sessionId: loop.sessionId });
  return loop;
}

function makeProvider(sessionId = null) {
  const loop = makeAgentLoop(sessionId);
  const provider = new AgentPanelProvider(loop, async () => ({ ready: true, message: 'ok' }));
  const sent = [];
  provider._sendToTerminal = cmd => sent.push(cmd);
  return { provider, loop, sent };
}

function makeWebviewView() {
  const webview = {
    options: null,
    html: '',
    posted: [],
    postMessage(msg) { this.posted.push(msg); },
    onDidReceiveMessage(cb) { this._cb = cb; },
    receive(msg) { return this._cb(msg); },
  };
  return { webview, onDidDispose(cb) { this._dispose = cb; } };
}

suite('Agent Panel Terminal Integration', () => {

  suite('shellQuote', () => {
    test('quotes prompts for the current shell', () => {
      if (process.platform === 'win32') {
        assert.equal(shellQuote('say "hi"'), '"say \\"hi\\""');
      } else {
        assert.equal(shellQuote('fix bugs'), "'fix bugs'");
        assert.equal(shellQuote("don't break"), "'don'\\''t break'");
      }
    });

    test('prevents shell expansion of variables and backticks on unix', function() {
      if (process.platform === 'win32') this.skip();
      const quoted = shellQuote('echo $HOME `id`');
      assert.equal(quoted, "'echo $HOME `id`'");
    });
  });

  suite('_handleRunInTerminal', () => {
    test('builds a basic opencode run command', () => {
      const { provider, sent } = makeProvider();
      provider._handleRunInTerminal({ text: 'fix bugs' });
      assert.equal(sent.length, 1);
      assert.ok(sent[0].startsWith('opencode run '));
      assert.ok(sent[0].includes(shellQuote('fix bugs')));
      assert.ok(!sent[0].includes('--agent'));
      assert.ok(!sent[0].includes('--model'));
      assert.ok(!sent[0].includes('--session'));
    });

    test('ignores empty and whitespace-only prompts', () => {
      const { provider, sent } = makeProvider();
      provider._handleRunInTerminal({ text: '' });
      provider._handleRunInTerminal({ text: '   ' });
      provider._handleRunInTerminal({});
      assert.equal(sent.length, 0);
      assert.equal(provider._messages.length, 0);
    });

    test('passes agent and model flags from the message', () => {
      const { provider, sent } = makeProvider();
      provider._handleRunInTerminal({ text: 'go', agent: 'reviewer', model: 'anthropic/claude-sonnet-5' });
      assert.ok(sent[0].includes('--agent ' + shellQuote('reviewer')));
      assert.ok(sent[0].includes('--model ' + shellQuote('anthropic/claude-sonnet-5')));
    });

    test('falls back to panel-selected agent and model', () => {
      const { provider, sent } = makeProvider();
      provider._selectedAgent = 'planner';
      provider._selectedModel = 'openai/gpt-5';
      provider._handleRunInTerminal({ text: 'go' });
      assert.ok(sent[0].includes('--agent ' + shellQuote('planner')));
      assert.ok(sent[0].includes('--model ' + shellQuote('openai/gpt-5')));
    });

    test('continues the active session with --session', () => {
      const { provider, sent } = makeProvider('ses_1234567890abcdef');
      provider._handleRunInTerminal({ text: 'continue' });
      assert.ok(sent[0].includes('--session ' + shellQuote('ses_1234567890abcdef')));
    });

    test('appends context files to the prompt', () => {
      const { provider, sent } = makeProvider();
      provider._handleRunInTerminal({ text: 'review', contextFiles: ['/a/b.js', '/c/d.js'] });
      assert.ok(sent[0].includes('Context files: /a/b.js, /c/d.js'));
    });

    test('shell-quotes prompts containing quotes', function() {
      if (process.platform === 'win32') this.skip();
      const { provider, sent } = makeProvider();
      provider._handleRunInTerminal({ text: "don't $break `things`" });
      assert.ok(sent[0].includes("'don'\\''t $break `things`'"));
    });

    test('echoes the prompt as a user message followed by a notice', () => {
      const { provider } = makeProvider('ses_1234567890abcdef');
      provider._handleRunInTerminal({ text: 'fix bugs' });
      assert.equal(provider._messages.length, 2);
      assert.equal(provider._messages[0].role, 'user');
      assert.equal(provider._messages[0].content, 'fix bugs');
      assert.equal(provider._messages[1].role, 'notice');
      assert.ok(provider._messages[1].content.includes('OpenCode Agent'));
      assert.ok(provider._messages[1].content.includes('ses_1234'));
    });
  });

  suite('_handleContinueInTerminal', () => {
    test('resumes the active session in the TUI', () => {
      const { provider, sent } = makeProvider('ses_1234567890abcdef');
      provider._handleContinueInTerminal();
      assert.equal(sent[0], 'opencode --session ' + shellQuote('ses_1234567890abcdef'));
      assert.equal(provider._messages[0].role, 'notice');
      assert.ok(provider._messages[0].content.includes('resuming session ses_1234'));
    });

    test('opens a plain TUI when there is no session', () => {
      const { provider, sent } = makeProvider();
      provider._handleContinueInTerminal();
      assert.equal(sent[0], 'opencode');
      assert.equal(provider._messages[0].role, 'notice');
    });
  });

  suite('_getTerminal', () => {
    test('reuses a live terminal and replaces an exited one', () => {
      const loop = makeAgentLoop();
      const provider = new AgentPanelProvider(loop, async () => ({ ready: true, message: 'ok' }));
      const created = [];
      const original = vscode.window.createTerminal;
      vscode.window.createTerminal = opts => {
        const term = { name: opts.name, exitStatus: undefined, dispose() {} };
        created.push(term);
        return term;
      };
      try {
        const t1 = provider._getTerminal();
        assert.equal(t1.name, 'OpenCode Agent');
        assert.equal(provider._getTerminal(), t1, 'live terminal should be reused');
        assert.equal(created.length, 1);

        t1.exitStatus = { code: 0 };
        const t2 = provider._getTerminal();
        assert.notEqual(t2, t1, 'exited terminal should be replaced');
        assert.equal(created.length, 2);
      } finally {
        vscode.window.createTerminal = original;
      }
    });
  });

  suite('webview message routing', () => {
    test('runInTerminal messages reach the handler with all options', () => {
      const { provider, sent } = makeProvider();
      const view = makeWebviewView();
      provider.resolveWebviewView(view);
      view.webview.receive({
        type: 'runInTerminal',
        text: 'write tests',
        agent: 'tester',
        model: 'anthropic/claude-sonnet-5',
        contextFiles: ['/x/y.js'],
      });
      assert.equal(sent.length, 1);
      assert.ok(sent[0].includes('--agent ' + shellQuote('tester')));
      assert.ok(sent[0].includes('--model ' + shellQuote('anthropic/claude-sonnet-5')));
      assert.ok(sent[0].includes('Context files: /x/y.js'));
    });

    test('continueInTerminal messages reach the handler', () => {
      const { provider, sent } = makeProvider('ses_abcdef1234567890');
      const view = makeWebviewView();
      provider.resolveWebviewView(view);
      view.webview.receive({ type: 'continueInTerminal' });
      assert.equal(sent.length, 1);
      assert.ok(sent[0].includes('--session'));
    });
  });

  suite('webview HTML', () => {
    test('contains the terminal action controls', () => {
      const { provider } = makeProvider();
      const html = provider._getHtml();
      assert.ok(html.includes('id="term-welcome"'), 'welcome composer has a terminal button');
      assert.ok(html.includes('id="term-chat"'), 'chat composer has a terminal button');
      assert.ok(html.includes('id="continue-term-btn"'), 'chat header has a continue-in-terminal button');
      assert.ok(html.includes('Ctrl/Cmd+Enter'), 'terminal buttons advertise the shortcut');
      assert.ok(html.includes("type: 'runInTerminal'"), 'script posts runInTerminal messages');
      assert.ok(html.includes("type: 'continueInTerminal'"), 'script posts continueInTerminal messages');
      assert.ok(html.includes("m.role === 'notice'"), 'renderer handles notice messages');
      assert.ok(html.includes('e.metaKey || e.ctrlKey'), 'keyboard shortcut is wired');
    });
  });
});
