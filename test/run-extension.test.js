'use strict';

const { test } = require('node:test');
const assert = require('assert');
const path = require('path');
const {
  EDITORS,
  resolvePaths,
  buildLaunchArgs,
  pickEditor,
  createSpawnOptions,
  launchExtensionHost,
} = require('../lib/runExtension');

const repoRoot = path.join(__dirname, '..');

test('EDITORS prefers cursor before code', () => {
  assert.deepEqual(EDITORS, ['cursor', 'code']);
});

test('resolvePaths defaults to repository root', () => {
  const { extensionPath, workspaceFolder } = resolvePaths({
    root: repoRoot,
    env: {},
  });
  assert.equal(extensionPath, repoRoot);
  assert.equal(workspaceFolder, repoRoot);
});

test('resolvePaths honors EXTENSION_PATH and WORKSPACE_FOLDER env', () => {
  const ext = path.join(repoRoot, 'custom-ext');
  const ws = path.join(repoRoot, 'custom-ws');
  const { extensionPath, workspaceFolder } = resolvePaths({
    root: repoRoot,
    env: {
      EXTENSION_PATH: ext,
      WORKSPACE_FOLDER: ws,
    },
  });
  assert.equal(extensionPath, path.resolve(ext));
  assert.equal(workspaceFolder, path.resolve(ws));
});

test('resolvePaths honors explicit options over env', () => {
  const optExt = path.join(repoRoot, 'opt-ext');
  const optWs = path.join(repoRoot, 'opt-ws');
  const { extensionPath, workspaceFolder } = resolvePaths({
    root: repoRoot,
    extensionPath: optExt,
    workspaceFolder: optWs,
    env: {
      EXTENSION_PATH: path.join(repoRoot, 'env-ext'),
      WORKSPACE_FOLDER: path.join(repoRoot, 'env-ws'),
    },
  });
  assert.equal(extensionPath, path.resolve(optExt));
  assert.equal(workspaceFolder, path.resolve(optWs));
});

test('buildLaunchArgs includes extensionDevelopmentPath and workspace', () => {
  const args = buildLaunchArgs('C:\\ext', 'C:\\ws');
  assert.deepEqual(args, ['--extensionDevelopmentPath=C:\\ext', 'C:\\ws']);
});

test('pickEditor returns first available editor', () => {
  const available = new Set(['code']);
  assert.equal(pickEditor(EDITORS, (name) => available.has(name)), 'code');
});

test('pickEditor returns null when none are available', () => {
  assert.equal(pickEditor(EDITORS, () => false), null);
});

test('createSpawnOptions uses shell on Windows', () => {
  assert.deepEqual(createSpawnOptions('win32'), {
    detached: true,
    stdio: 'ignore',
    shell: true,
  });
});

test('createSpawnOptions omits shell on Unix', () => {
  assert.deepEqual(createSpawnOptions('linux'), {
    detached: true,
    stdio: 'ignore',
    shell: false,
  });
});

test('launchExtensionHost spawns cursor with expected args', () => {
  const ext = path.join(repoRoot, 'ext');
  const ws = path.join(repoRoot, 'ws');
  const calls = [];
  const fakeChild = { unref() {} };
  const result = launchExtensionHost({
    spawn: (cmd, args, opts) => {
      calls.push({ cmd, args, opts });
      return fakeChild;
    },
    isEditorAvailable: (name) => name === 'cursor',
    options: {
      root: repoRoot,
      extensionPath: ext,
      workspaceFolder: ws,
      platform: 'linux',
      env: {},
    },
  });

  assert.equal(result.launched, true);
  assert.equal(result.editor, 'cursor');
  assert.equal(result.extensionPath, path.resolve(ext));
  assert.equal(result.workspaceFolder, path.resolve(ws));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cmd, 'cursor');
  assert.deepEqual(calls[0].args, buildLaunchArgs(path.resolve(ext), path.resolve(ws)));
  assert.deepEqual(calls[0].opts, createSpawnOptions('linux'));
});

test('launchExtensionHost returns error when no editor is on PATH', () => {
  const result = launchExtensionHost({
    spawn: () => {
      throw new Error('spawn should not be called');
    },
    isEditorAvailable: () => false,
    options: { root: repoRoot, env: {} },
  });

  assert.equal(result.launched, false);
  assert.equal(result.error, 'editor-not-found');
});
