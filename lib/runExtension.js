'use strict';

const path = require('path');

const EDITORS = ['cursor', 'code'];

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
  EDITORS,
  resolvePaths,
  buildLaunchArgs,
  pickEditor,
  createSpawnOptions,
  launchExtensionHost,
};
