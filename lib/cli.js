'use strict';

const { exec, spawn } = require('child_process');
const { buildEnvObject } = require('./env');

function execPromise(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, options, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
        return;
      }
      resolve({ stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

function getWorkspaceCwd() {
  const vscode = require('vscode');
  const folders = vscode.workspace.workspaceFolders;
  return folders?.[0]?.uri.fsPath || process.cwd();
}

function runCli(args, options = {}) {
  const getConfig = options.getConfig || (() => require('vscode').workspace.getConfiguration());
  const cwd = options.cwd || getWorkspaceCwd();
  const env = buildEnvObject(getConfig);
  return execPromise(`opencode ${args}`, { cwd, env, maxBuffer: 10 * 1024 * 1024 });
}

function spawnCli(args, options = {}) {
  const getConfig = options.getConfig || (() => require('vscode').workspace.getConfiguration());
  const cwd = options.cwd || getWorkspaceCwd();
  const env = buildEnvObject(getConfig);
  const home = process.env.HOME || '';
  const extraPaths = [
    home && `${home}/.opencode/bin`,
    home && `${home}/.local/bin`,
    '/usr/local/bin',
  ].filter(Boolean).join(':');
  if (extraPaths) {
    env.PATH = `${extraPaths}:${env.PATH || ''}`;
  }
  return spawn('opencode', args, {
    cwd,
    env,
    shell: process.platform === 'win32',
  });
}

async function checkInstall() {
  try {
    const { stdout } = await execPromise('opencode --version');
    return stdout.trim();
  } catch {
    return null;
  }
}

async function getGitBranch(folder) {
  try {
    const { stdout } = await execPromise('git rev-parse --abbrev-ref HEAD', { cwd: folder });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

module.exports = {
  execPromise,
  runCli,
  spawnCli,
  checkInstall,
  getGitBranch,
  getWorkspaceCwd,
};
