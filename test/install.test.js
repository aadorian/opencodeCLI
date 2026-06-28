'use strict';

const { test } = require('node:test');
const assert = require('assert');
const {
  INSTALL_SCRIPT,
  NPM_INSTALL,
  HOMEBREW_INSTALL,
  OPENCODE_DOCS_URL,
  getInstallTerminalCommand,
  getInstallOptions,
  getInstallHelpText,
  getMissingInstallTerminalCommand,
} = require('../lib/install');

test('uses opencode.ai install script on unix', () => {
  const original = process.platform;
  Object.defineProperty(process, 'platform', { value: 'darwin' });
  assert.equal(getInstallTerminalCommand(), INSTALL_SCRIPT);
  assert.match(getInstallHelpText(), /opencode\.ai\/install/);
  Object.defineProperty(process, 'platform', { value: original });
});

test('uses npm package on windows', () => {
  const original = process.platform;
  Object.defineProperty(process, 'platform', { value: 'win32' });
  assert.equal(getInstallTerminalCommand(), NPM_INSTALL);
  assert.match(getInstallHelpText(), /opencode-ai/);
  assert.match(getMissingInstallTerminalCommand(), /Write-Host/);
  Object.defineProperty(process, 'platform', { value: original });
});

test('docs url points to opencode.ai', () => {
  assert.equal(OPENCODE_DOCS_URL, 'https://opencode.ai/docs');
});

test('homebrew install constant is set', () => {
  assert.equal(HOMEBREW_INSTALL, 'brew install opencode');
});

test('getInstallOptions returns curl script as first option on macOS', () => {
  const original = process.platform;
  Object.defineProperty(process, 'platform', { value: 'darwin' });
  const options = getInstallOptions();
  assert.ok(options.length >= 2);
  assert.ok(options[0].command.includes('opencode.ai/install'));
  assert.ok(options.some(o => o.command === HOMEBREW_INSTALL));
  assert.ok(options.some(o => o.command === NPM_INSTALL));
  Object.defineProperty(process, 'platform', { value: original });
});

test('getInstallOptions returns npm on windows', () => {
  const original = process.platform;
  Object.defineProperty(process, 'platform', { value: 'win32' });
  const options = getInstallOptions();
  assert.equal(options.length, 1);
  assert.equal(options[0].command, NPM_INSTALL);
  Object.defineProperty(process, 'platform', { value: original });
});

test('getInstallOptions returns curl and npm on linux', () => {
  const original = process.platform;
  Object.defineProperty(process, 'platform', { value: 'linux' });
  const options = getInstallOptions();
  assert.ok(options.length >= 2);
  assert.ok(options[0].command.includes('opencode.ai/install'));
  Object.defineProperty(process, 'platform', { value: original });
});

test('getMissingInstallTerminalCommand uses curl on unix', () => {
  const original = process.platform;
  Object.defineProperty(process, 'platform', { value: 'linux' });
  const cmd = getMissingInstallTerminalCommand();
  assert.match(cmd, /echo/);
  assert.match(cmd, /opencode\.ai\/install/);
  Object.defineProperty(process, 'platform', { value: original });
});
