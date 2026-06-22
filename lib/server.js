'use strict';

const vscode = require('vscode');
const { buildEnvExports } = require('./env');

class ServerManager {
  constructor(getConfig) {
    this._getConfig = getConfig;
    this._terminal = null;
    this._port = null;
    this._url = null;
  }

  getConfig() {
    return this._getConfig();
  }

  getUrl() {
    if (this._url) return this._url;
    const config = this.getConfig();
    return config.get('opencode.harness.serverUrl') || 'http://127.0.0.1:4096';
  }

  getPort() {
    if (this._port) return this._port;
    const url = this.getUrl();
    try {
      return new URL(url).port || '4096';
    } catch {
      return '4096';
    }
  }

  isRunning() {
    return this._terminal !== null;
  }

  async ensureRunning(options = {}) {
    if (this.isRunning()) return this.getUrl();

    const config = this.getConfig();
    const autoStart = config.get('opencode.harness.autoStartServer');
    if (!autoStart && !options.force) {
      return null;
    }

    return this.start();
  }

  start() {
    const port = this.getPort();
    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    this._terminal = vscode.window.createTerminal({ name: 'OpenCode Server', cwd });
    this._terminal.show(true);

    const envPrefix = buildEnvExports(this._getConfig);
    const serveCmd = envPrefix.length > 0
      ? envPrefix.join(' && ') + ` && opencode serve --hostname 127.0.0.1 --port ${port}`
      : `opencode serve --hostname 127.0.0.1 --port ${port}`;
    this._terminal.sendText(serveCmd);

    this._port = port;
    this._url = `http://127.0.0.1:${port}`;
    return this._url;
  }

  stop() {
    if (this._terminal) {
      this._terminal.dispose();
      this._terminal = null;
    }
    this._port = null;
    this._url = null;
  }

  dispose() {
    this.stop();
  }
}

module.exports = { ServerManager };
