'use strict';

const { test } = require('node:test');
const assert = require('assert');
const {
  AGENT_DIR,
  slugify,
  buildAgentContent,
  createAgentInteractive,
} = require('../lib/agentCreate');

const fakeUri = {
  joinPath: (folder, ...parts) => ({ fsPath: `${folder.fsPath}/${parts.join('/')}` }),
};

test('slugify normalizes names', () => {
  assert.equal(slugify('  Code Reviewer! '), 'code-reviewer');
  assert.equal(slugify('test_agent-01'), 'test-agent-01');
});

test('buildAgentContent includes frontmatter fields', () => {
  const content = buildAgentContent({
    description: 'Reviews code',
    mode: 'subagent',
    model: 'anthropic/claude-sonnet-4-20250514',
    tools: ['bash', 'read'],
  });
  assert.match(content, /^---\n/);
  assert.match(content, /description: Reviews code/);
  assert.match(content, /mode: subagent/);
  assert.match(content, /model: anthropic\/claude-sonnet-4-20250514/);
  assert.match(content, /tools:\n {2}bash: true\n {2}read: true/);
});

test('buildAgentContent omits model and tools blocks when absent', () => {
  const content = buildAgentContent({ description: 'x', mode: 'primary', model: '', tools: [] });
  assert.doesNotMatch(content, /model:/);
  assert.doesNotMatch(content, /tools:/);
});

test('createAgentInteractive cancels when no workspace folder is open', async () => {
  let errored = '';
  const result = await createAgentInteractive({
    getWorkspaceFolders: () => undefined,
    showInputBox: async () => 'name',
    showQuickPick: async () => ({ label: 'primary' }),
    stat: async () => { throw new Error('ENOENT'); },
    writeFile: async () => {},
    showWarningMessage: async () => undefined,
    showErrorMessage: async message => { errored = message; },
    openTextDocument: async uri => ({ uri }),
    showTextDocument: async () => ({}),
    Uri: fakeUri,
  });
  assert.equal(result.cancelled, true);
  assert.match(errored, /workspace folder/);
});

test('createAgentInteractive writes an agent file with the guided answers', async () => {
  const writes = [];
  const result = await createAgentInteractive({
    getWorkspaceFolders: () => [{ uri: { fsPath: '/tmp/project' } }],
    showInputBox: async options => (options.prompt.startsWith('Agent name') ? 'Code Reviewer' : 'Reviews PRs'),
    showQuickPick: async (items, options) => {
      if (options?.canPickMany) return [{ label: 'bash' }, { label: 'read' }];
      return items[0];
    },
    stat: async () => { throw new Error('ENOENT'); },
    writeFile: async (uri, content) => writes.push({ uri, content: Buffer.from(content).toString('utf8') }),
    showWarningMessage: async () => undefined,
    showErrorMessage: async () => undefined,
    openTextDocument: async uri => ({ uri }),
    showTextDocument: async () => ({}),
    Uri: fakeUri,
  });

  assert.equal(result.created, true);
  assert.equal(result.name, 'code-reviewer');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].uri.fsPath, `/tmp/project/${AGENT_DIR}/code-reviewer.md`);
  assert.match(writes[0].content, /description: Reviews PRs/);
  assert.match(writes[0].content, /mode: primary/);
});

test('createAgentInteractive cancels overwrite when user declines', async () => {
  const result = await createAgentInteractive({
    getWorkspaceFolders: () => [{ uri: { fsPath: '/tmp/project' } }],
    showInputBox: async () => 'existing',
    showQuickPick: async (items, options) => (options?.canPickMany ? [] : items[0]),
    stat: async () => ({ type: 1 }),
    writeFile: async () => { throw new Error('should not write'); },
    showWarningMessage: async () => 'Cancel',
    showErrorMessage: async () => undefined,
    openTextDocument: async uri => ({ uri }),
    showTextDocument: async () => ({}),
    Uri: fakeUri,
  });
  assert.equal(result.cancelled, true);
});
