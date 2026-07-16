'use strict';

const { test } = require('node:test');
const assert = require('assert');
const {
  CONFIG_FILENAME,
  CONFIG_SCHEMA_URL,
  DEFAULT_MODEL,
  getConfigTemplateContent,
  createConfigTemplate,
} = require('../lib/configTemplate');

test('getConfigTemplateContent returns valid JSON with schema and model', () => {
  const content = getConfigTemplateContent();
  const parsed = JSON.parse(content);
  assert.equal(parsed.$schema, CONFIG_SCHEMA_URL);
  assert.equal(parsed.model, DEFAULT_MODEL);
  assert.ok(content.endsWith('\n'));
});

test('createConfigTemplate writes file when it does not exist', async () => {
  const writes = [];
  const result = await createConfigTemplate({
    getWorkspaceFolders: () => [{ uri: { fsPath: '/tmp/project' } }],
    stat: async () => {
      throw new Error('ENOENT');
    },
    writeFile: async (uri, content) => {
      writes.push({ uri, content: Buffer.from(content).toString('utf8') });
    },
    showWarningMessage: async () => undefined,
    openTextDocument: async uri => ({ uri }),
    showTextDocument: async () => ({}),
    showSaveDialog: async () => undefined,
    Uri: {
      joinPath: (folder, name) => ({ fsPath: `${folder.fsPath}/${name}`, path: `/${name}` }),
      file: path => ({ fsPath: path }),
    },
  });

  assert.equal(result.created, true);
  assert.equal(writes.length, 1);
  assert.match(writes[0].content, /"model": "anthropic\/claude-sonnet-4-20250514"/);
});

test('createConfigTemplate opens existing file when user chooses Open', async () => {
  const opened = [];
  const result = await createConfigTemplate({
    getWorkspaceFolders: () => [{ uri: { fsPath: '/tmp/project' } }],
    stat: async () => ({ type: 1 }),
    writeFile: async () => {
      throw new Error('should not write');
    },
    showWarningMessage: async () => 'Open',
    openTextDocument: async uri => {
      opened.push(uri);
      return { uri };
    },
    showTextDocument: async doc => {
      opened.push(doc);
      return {};
    },
    showSaveDialog: async () => undefined,
    Uri: {
      joinPath: (folder, name) => ({ fsPath: `${folder.fsPath}/${name}` }),
      file: path => ({ fsPath: path }),
    },
  });

  assert.equal(result.opened, true);
  assert.equal(opened.length, 2);
});

test('createConfigTemplate cancels when user declines overwrite', async () => {
  const result = await createConfigTemplate({
    getWorkspaceFolders: () => [{ uri: { fsPath: '/tmp/project' } }],
    stat: async () => ({ type: 1 }),
    writeFile: async () => {
      throw new Error('should not write');
    },
    showWarningMessage: async () => "Don't Overwrite",
    openTextDocument: async () => ({}),
    showTextDocument: async () => ({}),
    showSaveDialog: async () => undefined,
    Uri: {
      joinPath: (folder, name) => ({ fsPath: `${folder.fsPath}/${name}` }),
      file: path => ({ fsPath: path }),
    },
  });

  assert.equal(result.cancelled, true);
});

test('createConfigTemplate uses save dialog without workspace folder', async () => {
  let saveDialogCalled = false;
  const result = await createConfigTemplate({
    getWorkspaceFolders: () => undefined,
    stat: async () => {
      throw new Error('ENOENT');
    },
    writeFile: async () => {},
    showWarningMessage: async () => undefined,
    openTextDocument: async uri => ({ uri }),
    showTextDocument: async () => ({}),
    showSaveDialog: async () => {
      saveDialogCalled = true;
      return { fsPath: '/tmp/custom/opencode.json' };
    },
    Uri: {
      joinPath: () => ({}),
      file: path => ({ fsPath: path }),
    },
  });

  assert.ok(saveDialogCalled);
  assert.equal(result.created, true);
});

test('CONFIG_FILENAME is opencode.json', () => {
  assert.equal(CONFIG_FILENAME, 'opencode.json');
});
