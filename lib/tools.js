'use strict';

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const DESTRUCTIVE_TOOLS = new Set(['bash', 'run_in_terminal', 'edit', 'write', 'apply_patch', 'replace_string_in_file']);

class ToolRegistry {
  /**
   * @param {() => import('vscode').WorkspaceConfiguration} getConfig
   * @param {{ log?: (msg: string) => void }} options
   */
  constructor(getConfig, options = {}) {
    this._getConfig = getConfig;
    this._log = options.log || (() => {});
  }

  shouldConfirm(toolName) {
    const mode = this._getConfig().get('opencode.harness.toolConfirmation', 'smart');
    if (mode === 'never') return false;
    if (mode === 'always') return true;
    return DESTRUCTIVE_TOOLS.has(toolName);
  }

  async confirm(toolName, args) {
    if (!this.shouldConfirm(toolName)) return true;
    const summary = JSON.stringify(args).slice(0, 200);
    const choice = await vscode.window.showWarningMessage(
      `OpenCode agent wants to run tool "${toolName}": ${summary}`,
      { modal: true },
      'Allow',
      'Deny'
    );
    return choice === 'Allow';
  }

  async execute(toolName, args = {}) {
    this._log(`Tool call: ${toolName} ${JSON.stringify(args).slice(0, 500)}`);

    const allowed = await this.confirm(toolName, args);
    if (!allowed) {
      return { success: false, error: 'User denied tool execution' };
    }

    switch (toolName) {
      case 'read_file':
      case 'read':
        return this._readFile(args);
      case 'list_files':
      case 'list':
        return this._listFiles(args);
      case 'run_in_terminal':
      case 'bash':
        return this._runTerminal(args);
      case 'edit':
      case 'write':
      case 'apply_patch':
      case 'replace_string_in_file':
        return this._applyEdit(toolName, args);
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  }

  async _readFile(args) {
    const filePath = args.path || args.file || args.filepath;
    if (!filePath) return { success: false, error: 'Missing path' };
    try {
      const uri = vscode.Uri.file(filePath);
      const data = await vscode.workspace.fs.readFile(uri);
      return { success: true, content: Buffer.from(data).toString('utf8') };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async _listFiles(args) {
    const dir = args.path || args.directory || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!dir) return { success: false, error: 'Missing directory' };
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      const names = entries.map(e => (e.isDirectory() ? `${e.name}/` : e.name));
      return { success: true, files: names };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async _runTerminal(args) {
    if (!vscode.workspace.isTrusted) {
      return { success: false, error: 'Workspace is not trusted' };
    }
    const command = args.command || args.cmd;
    if (!command) return { success: false, error: 'Missing command' };
    const cwd = args.cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const term = vscode.window.createTerminal({ name: 'OpenCode Agent', cwd });
    term.show();
    term.sendText(command);
    return { success: true, message: 'Command sent to terminal' };
  }

  async _applyEdit(toolName, args) {
    const filePath = args.path || args.file || args.filepath;
    if (!filePath) return { success: false, error: 'Missing path' };

    const uri = vscode.Uri.file(filePath);
    let doc;
    try {
      doc = await vscode.workspace.openTextDocument(uri);
    } catch {
      if (toolName === 'write' && args.content !== undefined) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(args.content, 'utf8'));
        return { success: true, message: 'File created' };
      }
      return { success: false, error: 'File not found' };
    }

    const edit = new vscode.WorkspaceEdit();
    if (args.content !== undefined && (toolName === 'write' || !args.old_string)) {
      const fullRange = new vscode.Range(0, 0, doc.lineCount, 0);
      edit.replace(uri, fullRange, args.content);
    } else if (args.old_string !== undefined && args.new_string !== undefined) {
      const text = doc.getText();
      const idx = text.indexOf(args.old_string);
      if (idx === -1) return { success: false, error: 'old_string not found' };
      const start = doc.positionAt(idx);
      const end = doc.positionAt(idx + args.old_string.length);
      edit.replace(uri, new vscode.Range(start, end), args.new_string);
    } else {
      return { success: false, error: 'Missing edit content' };
    }

    const ok = await vscode.workspace.applyEdit(edit);
    if (ok) await doc.save();
    return { success: ok, message: ok ? 'Edit applied' : 'Edit failed' };
  }
}

/**
 * Parse tool calls from JSON event lines emitted by opencode run --format json.
 * @param {object} event
 * @returns {{ name: string, args: object }|null}
 */
function parseToolCallFromEvent(event) {
  if (!event || typeof event !== 'object') return null;
  const type = event.type || event.event || event.kind;
  if (type === 'tool_call' || type === 'tool_use' || event.tool) {
    const name = event.tool || event.name || event.tool_name;
    const args = event.args || event.input || event.arguments || {};
    if (name) return { name, args };
  }
  return null;
}

/**
 * Extract assistant text from JSON event.
 * @param {object} event
 * @returns {string}
 */
function parseTextFromEvent(event) {
  if (!event || typeof event !== 'object') return '';
  if (typeof event.text === 'string') return event.text;
  if (typeof event.content === 'string') return event.content;
  if (typeof event.delta === 'string') return event.delta;
  if (event.message?.content) return String(event.message.content);
  return '';
}

module.exports = {
  ToolRegistry,
  parseToolCallFromEvent,
  parseTextFromEvent,
  DESTRUCTIVE_TOOLS,
};
