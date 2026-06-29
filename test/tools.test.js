'use strict';

const { test } = require('node:test');
const assert = require('assert');
const { DESTRUCTIVE_TOOLS, parseToolCallFromEvent, parseTextFromEvent } = require('../lib/tools');

test('parseToolCallFromEvent extracts tool calls from tool_use format', () => {
  const event = { type: 'tool_use', part: { tool: 'read', state: { input: { filePath: '/tmp/x' } } } };
  const call = parseToolCallFromEvent(event);
  assert.ok(call);
  assert.equal(call.name, 'read');
  assert.equal(call.args.filePath, '/tmp/x');
});

test('parseToolCallFromEvent extracts tool calls from tool_call format', () => {
  const event = { type: 'tool_call', tool: 'bash', args: { command: 'ls' } };
  const call = parseToolCallFromEvent(event);
  assert.ok(call);
  assert.equal(call.name, 'bash');
  assert.equal(call.args.command, 'ls');
});

test('parseTextFromEvent extracts text from text format', () => {
  const event = { type: 'text', delta: 'hi' };
  const text = parseTextFromEvent(event);
  assert.equal(text, 'hi');
});

test('parseTextFromEvent extracts text from content', () => {
  const event = { content: 'hello' };
  const text = parseTextFromEvent(event);
  assert.equal(text, 'hello');
});

test('Destructive tools list includes bash and run_in_terminal', () => {
  assert.ok(DESTRUCTIVE_TOOLS.has('bash'));
  assert.ok(DESTRUCTIVE_TOOLS.has('run_in_terminal'));
  assert.ok(DESTRUCTIVE_TOOLS.has('edit'));
});