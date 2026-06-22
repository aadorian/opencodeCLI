'use strict';

const path = require('path');

const EDITOR_DOWNLOADS = [
  {
    name: 'Visual Studio Code',
    cli: 'code',
    url: 'https://code.visualstudio.com/download',
  },
  {
    name: 'Visual Studio Code Insiders',
    cli: 'code-insiders',
    url: 'https://code.visualstudio.com/insiders/',
  },
  {
    name: 'Cursor',
    cli: 'cursor',
    url: 'https://cursor.com/download',
  },
];

const EDITORS = EDITOR_DOWNLOADS.map((editor) => editor.cli);

/**
 * @param {object} [options]
 * @param {string} [options.root]
 * @param {string} [options.extensionPath]
 * @param {string} [options.workspaceFolder]
 * @param {NodeJS.ProcessEnv} [options.env]
 */
function resolvePaths(options = {}) {
  const root = options.root || path.join(__dirname, '..');
  const env = options.env || process.env;
  const extensionPath = path.resolve(options.extensionPath || env.EXTENSION_PATH || root);
  const workspaceFolder = path.resolve(
    options.workspaceFolder || env.WORKSPACE_FOLDER || extensionPath
  );
  return { extensionPath, workspaceFolder };
}

function buildLaunchArgs(extensionPath, workspaceFolder) {
  return [`--extensionDevelopmentPath=${extensionPath}`, workspaceFolder];
}

/**
 * @param {string[]} editors
 * @param {(name: string) => boolean} isAvailable
 */
function pickEditor(editors, isAvailable) {
  return editors.find(isAvailable) || null;
}

function createSpawnOptions(platform = process.platform) {
  return { detached: true, stdio: 'ignore', shell: platform === 'win32' };
}

function formatEditorNotFoundMessage() {
  const lines = [
    'No supported IDE found on PATH (code, code-insiders, cursor).',
    '',
    'Install one of the following and ensure its command-line launcher is on PATH:',
  ];
  for (const { name, cli, url } of EDITOR_DOWNLOADS) {
    lines.push(`  • ${name} (\`${cli}\`): ${url}`);
  }
  lines.push('');
  lines.push('After installing, reopen your terminal or run the IDE’s “Shell Command: Install … in PATH”.');
  lines.push('Or press F5 with the "Run Extension" launch config in an open workspace.');
  return lines.join('\n');
}

/**
 * @param {object} deps
 * @param {typeof import('child_process').spawn} deps.spawn
 * @param {(name: string) => boolean} deps.isEditorAvailable
 * @param {object} [deps.options]
 * @param {string} [deps.options.root]
 * @param {string} [deps.options.extensionPath]
 * @param {string} [deps.options.workspaceFolder]
 * @param {NodeJS.ProcessEnv} [deps.options.env]
 * @param {string} [deps.options.platform]
 * @returns {{ launched: boolean, editor?: string, extensionPath?: string, workspaceFolder?: string, error?: string }}
 */
function launchExtensionHost(deps) {
  const { spawn, isEditorAvailable, options = {} } = deps;
  const { extensionPath, workspaceFolder } = resolvePaths(options);
  const editor = pickEditor(EDITORS, isEditorAvailable);

  if (!editor) {
    return { launched: false, error: 'editor-not-found' };
  }

  const args = buildLaunchArgs(extensionPath, workspaceFolder);
  const child = spawn(editor, args, createSpawnOptions(options.platform));
  child.unref();

  return { launched: true, editor, extensionPath, workspaceFolder };
}

module.exports = {
  EDITOR_DOWNLOADS,
  EDITORS,
  resolvePaths,
  buildLaunchArgs,
  pickEditor,
  createSpawnOptions,
  formatEditorNotFoundMessage,
  launchExtensionHost,
};
