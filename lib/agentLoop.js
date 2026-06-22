'use strict';

const { EventEmitter } = require('events');
const { spawnCli } = require('./cli');
const { assembleContext, formatContextForPrompt } = require('./context');
const { parseToolCallFromEvent, parseTextFromEvent } = require('./tools');

class AgentLoop extends EventEmitter {
  /**
   * @param {object} deps
   * @param {import('vscode')} deps.vscode
   * @param {() => import('vscode').WorkspaceConfiguration} deps.getConfig
   * @param {{ ensureRunning?: (opts?: object) => Promise<string|null> }} deps.serverManager
   * @param {import('./tools').ToolRegistry} deps.toolRegistry
   * @param {{ log?: (msg: string) => void }} [deps.options]
   */
  constructor(deps) {
    super();
    this.vscode = deps.vscode;
    this.getConfig = deps.getConfig;
    this.serverManager = deps.serverManager;
    this.toolRegistry = deps.toolRegistry;
    this._log = deps.options?.log || (() => {});
    this._process = null;
    this._cancelled = false;
    this.sessionId = null;
    this.round = 0;
  }

  cancel() {
    this._cancelled = true;
    if (this._process) {
      this._process.kill('SIGTERM');
      this._process = null;
    }
    this.emit('cancelled');
  }

  isRunning() {
    return this._process !== null;
  }

  /**
   * @param {string} message
   * @param {{ sessionId?: string, agent?: string, model?: string }} [options]
   */
  async run(message, options = {}) {
    if (this.isRunning()) {
      throw new Error('Agent loop is already running');
    }

    this._cancelled = false;

    if (options.sessionId) {
      this.sessionId = options.sessionId;
    }

    const context = await assembleContext(this.vscode, this.getConfig);
    const envelope = formatContextForPrompt(context);
    const fullMessage = `${message}\n\n${envelope}`;

    let serverUrl = null;
    if (this.serverManager) {
      serverUrl = await this.serverManager.ensureRunning();
    }

    let accumulatedText = '';
    this.round = 1;
    this.emit('roundStart', { round: 1, maxRounds: 1 });

    const args = ['run', '--format', 'json'];
    if (this.sessionId) {
      args.push('--session', this.sessionId);
    }
    if (serverUrl) {
      args.push('--attach', serverUrl);
    }
    if (options.agent) {
      args.push('--agent', options.agent);
    }
    if (options.model) {
      args.push('--model', options.model);
    }
    args.push(fullMessage);

    const result = await this._spawnRun(args);
    if (result.sessionId) {
      this.sessionId = result.sessionId;
    }
    accumulatedText = result.text;

    for (const call of result.toolCalls) {
      this.emit('toolCall', call);
      const toolResult = await this.toolRegistry.execute(call.name, call.args);
      this.emit('toolResult', { call, result: toolResult });
    }

    if (this._cancelled) {
      return { text: accumulatedText, sessionId: this.sessionId, cancelled: true };
    }

    this.emit('done', { text: accumulatedText, sessionId: this.sessionId, rounds: 1 });
    return { text: accumulatedText, sessionId: this.sessionId, rounds: 1 };
  }

  /**
   * Resume an existing session with a new message.
   */
  async resume(sessionId, message, options = {}) {
    return this.run(message, { ...options, sessionId });
  }

  _spawnRun(args) {
    return new Promise((resolve, reject) => {
      const proc = spawnCli(args);
      this._process = proc;

      let stdout = '';
      let stderr = '';
      const toolCalls = [];
      let sessionId = null;
      let done = false;
      let text = '';

      proc.stdout.on('data', chunk => {
        const str = chunk.toString();
        stdout += str;
        this._log(str);

        for (const line of str.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const event = JSON.parse(trimmed);
            if (event.sessionId || event.session_id) {
              sessionId = event.sessionId || event.session_id;
            }
            const toolCall = parseToolCallFromEvent(event);
            if (toolCall) toolCalls.push(toolCall);

            const delta = parseTextFromEvent(event);
            if (delta) {
              text += delta;
              this.emit('text', delta);
            }

            const type = event.type || event.event;
            if (type === 'done' || type === 'complete' || type === 'finish') {
              done = true;
            }
          } catch {
            text += trimmed + '\n';
            this.emit('text', trimmed + '\n');
          }
        }
      });

      proc.stderr.on('data', chunk => {
        stderr += chunk.toString();
        this._log(`stderr: ${chunk}`);
      });

      proc.on('error', err => {
        this._process = null;
        this.emit('error', err);
        reject(err);
      });

      proc.on('close', code => {
        this._process = null;
        if (this._cancelled) {
          resolve({ text, toolCalls, sessionId, done: true, cancelled: true });
          return;
        }
        if (code !== 0 && !text && stderr) {
          const err = new Error(stripAnsi(stderr.trim()) || `opencode exited with code ${code}`);
          this.emit('error', err);
          reject(err);
          return;
        }
        if (!text && stdout && !stdout.trim().startsWith('{')) {
          text = stripAnsi(stdout);
          this.emit('text', text);
        }
        resolve({ text, toolCalls, sessionId, done: done || code === 0 });
      });
    });
  }
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

module.exports = { AgentLoop, stripAnsi };
