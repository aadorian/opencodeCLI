'use strict';

const { test } = require('node:test');
const assert = require('assert');
const {
  buildEnvShellStatements,
  buildTerminalCommand,
  joinTerminalCommand,
} = require('../lib/env');

function mockConfig(values) {
  return {
    get: (key) => values[key],
  };
}

test('uses PowerShell env syntax on Windows', () => {
  const statements = buildEnvShellStatements(
    () => mockConfig({ 'opencode.serverUsername': 'opencode' }),
    'win32'
  );
  assert.deepEqual(statements, ['$env:OPENCODE_SERVER_USERNAME="opencode"']);
});

test('uses export syntax on Unix', () => {
  const statements = buildEnvShellStatements(
    () => mockConfig({ 'opencode.serverUsername': 'opencode' }),
    'darwin'
  );
  assert.deepEqual(statements, ['export OPENCODE_SERVER_USERNAME="opencode"']);
});

test('joins Windows commands with semicolons', () => {
  const command = joinTerminalCommand(
    ['$env:OPENCODE_SERVER_USERNAME="opencode"'],
    'npm install -g opencode-ai',
    'win32'
  );
  assert.equal(
    command,
    '$env:OPENCODE_SERVER_USERNAME="opencode"; npm install -g opencode-ai'
  );
});

test('joins Unix commands with &&', () => {
  const command = joinTerminalCommand(
    ['export OPENCODE_SERVER_USERNAME="opencode"'],
    'npm install -g opencode-ai',
    'linux'
  );
  assert.equal(
    command,
    'export OPENCODE_SERVER_USERNAME="opencode" && npm install -g opencode-ai'
  );
});

test('buildTerminalCommand returns command unchanged when no env is set', () => {
  const command = buildTerminalCommand(() => mockConfig({}), 'opencode --version', 'win32');
  assert.equal(command, 'opencode --version');
});

test('skips empty config values', () => {
  const statements = buildEnvShellStatements(
    () => mockConfig({ 'opencode.serverUsername': '' }),
    'win32'
  );
  assert.deepEqual(statements, []);
});
