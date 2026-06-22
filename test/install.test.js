'use strict';

const { test } = require('node:test');
const assert = require('assert');
const {
  INSTALL_SCRIPT,
  NPM_INSTALL,
  OPENCODE_DOCS_URL,
  getInstallTerminalCommand,
  getInstallHelpText,
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
  Object.defineProperty(process, 'platform', { value: original });
});

test('docs url points to opencode.ai', () => {
  assert.equal(OPENCODE_DOCS_URL, 'https://opencode.ai/docs');
});
