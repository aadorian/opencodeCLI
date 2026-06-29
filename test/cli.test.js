'use strict';

const { test } = require('node:test');
const assert = require('assert');
const { execPromise, runCli, checkInstall } = require('../lib/cli');

test('execPromise resolves on success', async () => {
  const result = await execPromise('echo hello');
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /hello/);
});

test('execPromise rejects on failure', async () => {
  await assert.rejects(() => execPromise('exit 1'), /exit 1/);
});

test('runCli includes env from config', async () => {
  const getConfig = () => ({
    get: (key) => {
      if (key === 'opencode.configPath') return '/some/path';
      return null;
    },
  });
  const options = {
    getConfig: getConfig,
  };
  const call = await runCli('--version', options);
  assert.equal(call.stderr, '');
});

test('checkInstall returns null when not installed', async () => {
  const mockExecPromise = async (cmd) => {
    if (cmd === 'opencode --version') throw new Error('ENOENT');
    throw cmd;
  };
  const originalExec = require('../lib/cli').execPromise;
  require('../lib/cli').execPromise = mockExecPromise;
  try {
    const result = await checkInstall();
    assert.equal(result, null);
  } finally {
    require('../lib/cli').execPromise = originalExec;
  }
});

test('checkInstall parses version correctly', async () => {
  const mockExecPromise = async (cmd) => {
    if (cmd === 'opencode --version') return { stdout: 'opencode v1.2.3\n', stderr: '' };
    throw cmd;
  };
  const originalExec = require('../lib/cli').execPromise;
  require('../lib/cli').execPromise = mockExecPromise;
  try {
    const result = await checkInstall();
    assert.match(result, /v1\.2\.3/);
  } finally {
    require('../lib/cli').execPromise = originalExec;
  }
});