'use strict';

const { test } = require('node:test');
const assert = require('assert');
const {
  assembleContext,
  assembleContextFromData,
  formatContextForPrompt,
  DEFAULT_TOGGLES,
} = require('../lib/context');

test('assembleContext includes workspace when enabled', async () => {
  const vscode = {
    workspace: {
      workspaceFolders: [{ name: 'proj', uri: { fsPath: '/tmp/proj' } }],
    },
    window: { activeTextEditor: null },
    languages: { getDiagnostics: () => new Map() },
  };
  const getConfig = () => ({
    get: (key) => {
      if (key === 'opencode.harness.context.includeWorkspace') return true;
      if (key === 'opencode.harness.context.includeOpenEditors') return false;
      if (key === 'opencode.harness.context.includeActiveFile') return true;
      if (key === 'opencode.harness.context.includeSelection') return true;
      if (key === 'opencode.harness.context.includeDiagnostics') return true;
      if (key === 'opencode.harness.context.includeGit') return true;
      if (key === 'opencode.harness.context.includeFileContents') return false;
      if (key === 'opencode.harness.customInstructions') return '';
      return null;
    },
  });
  const result = await assembleContext(vscode, getConfig);
  assert.ok(result.workspace);
  assert.equal(result.workspace.length, 1);
  assert.equal(result.workspace[0].name, 'proj');
});

test('assembleContext excludes workspace when disabled', async () => {
  const vscode = {
    workspace: { workspaceFolders: [] },
    window: { activeTextEditor: null },
    languages: { getDiagnostics: () => new Map() },
  };
  const getConfig = () => ({
    get: (key) => {
      if (key === 'opencode.harness.context.includeWorkspace') return false;
      if (key === 'opencode.harness.context.includeOpenEditors') return false;
      if (key === 'opencode.harness.context.includeActiveFile') return true;
      if (key === 'opencode.harness.context.includeSelection') return true;
      if (key === 'opencode.harness.context.includeDiagnostics') return true;
      if (key === 'opencode.harness.context.includeGit') return true;
      if (key === 'opencode.harness.context.includeFileContents') return false;
      if (key === 'opencode.harness.customInstructions') return '';
      return null;
    },
  });
  const result = await assembleContext(vscode, getConfig);
  assert.ok(!result.workspace);
});