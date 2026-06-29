'use strict';

const { test } = require('node:test');
const assert = require('assert');
const {
  listSessions,
  parseSessionOutput,
} = require('../lib/sessions');

test('parseSessionOutput handles JSON array', () => {
  const result = parseSessionOutput('[{"id":"abc123","title":"Test","model":"gpt"}]');
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'abc123');
  assert.equal(result[0].title, 'Test');
});

test('parseSessionOutput handles text lines', () => {
  const result = parseSessionOutput('session-one\nsession-two');
  assert.equal(result.length, 2);
  assert.equal(result[0].title, 'session-one');
});

test('listSessions runs cli command', async () => {
  const originalRunCli = require('../lib/sessions').runCli;
  const mockResult = { stdout: '[{"id":"test123","title":"My Session"}]' };
  require('../lib/sessions').runCli = async () => mockResult;
  try {
    const sessions = await listSessions();
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].id, 'test123');
    assert.equal(sessions[0].title, 'My Session');
  } finally {
    require('../lib/sessions').runCli = originalRunCli;
  }
});