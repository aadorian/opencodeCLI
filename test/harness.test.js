'use strict';

const assert = require('assert');
const {
  assembleContextFromData,
  formatContextForPrompt,
  DEFAULT_TOGGLES,
} = require('../lib/context');
const { parseSessionOutput } = require('../lib/sessions');
const { parseToolCallFromEvent, parseTextFromEvent } = require('../lib/tools');
const { stripAnsi } = require('../lib/agentLoop');

suite('Harness Test Suite', () => {
  test('assembleContextFromData respects toggles', () => {
    const ctx = assembleContextFromData({
      toggles: { ...DEFAULT_TOGGLES, includeFileContents: false, includeGit: false },
      workspaceFolders: [{ name: 'proj', path: '/tmp/proj' }],
      activeEditor: {
        path: '/tmp/proj/foo.js',
        language: 'javascript',
        lineCount: 10,
        selection: { text: 'hello' },
      },
      customInstructions: 'Be concise.',
    });

    assert.ok(ctx.workspace);
    assert.ok(ctx.activeEditor);
    assert.equal(ctx.activeEditor.selection.text, 'hello');
    assert.equal(ctx.customInstructions, 'Be concise.');
    assert.equal(ctx.activeEditor.contents, undefined);
    assert.equal(ctx.git, undefined);
  });

  test('assembleContextFromData omits selection when disabled', () => {
    const ctx = assembleContextFromData({
      toggles: { ...DEFAULT_TOGGLES, includeSelection: false },
      activeEditor: {
        path: '/tmp/a.ts',
        language: 'typescript',
        lineCount: 1,
        selection: { text: 'secret' },
      },
    });
    assert.equal(ctx.activeEditor.selection, undefined);
  });

  test('formatContextForPrompt wraps JSON', () => {
    const formatted = formatContextForPrompt({ foo: 'bar' });
    assert.ok(formatted.includes('<harness-context>'));
    assert.ok(formatted.includes('"foo": "bar"'));
  });

  test('parseSessionOutput handles JSON array', () => {
    const sessions = parseSessionOutput('[{"id":"abc123","title":"Test","model":"gpt"}]');
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].id, 'abc123');
    assert.equal(sessions[0].title, 'Test');
  });

  test('parseSessionOutput handles plain text lines', () => {
    const sessions = parseSessionOutput('session-one\nsession-two');
    assert.equal(sessions.length, 2);
    assert.equal(sessions[0].title, 'session-one');
  });

  test('parseToolCallFromEvent extracts tool calls', () => {
    const call = parseToolCallFromEvent({ type: 'tool_call', tool: 'read_file', args: { path: '/a' } });
    assert.ok(call);
    assert.equal(call.name, 'read_file');
    assert.equal(call.args.path, '/a');
  });

  test('parseTextFromEvent extracts text deltas', () => {
    assert.equal(parseTextFromEvent({ type: 'text', delta: 'hi' }), 'hi');
    assert.equal(parseTextFromEvent({ content: 'hello' }), 'hello');
  });

  test('stripAnsi removes color codes', () => {
    assert.equal(stripAnsi('\x1b[91mError\x1b[0m'), 'Error');
  });
});
