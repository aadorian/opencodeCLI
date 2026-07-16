'use strict';

const CONFIG_FILENAME = 'opencode.json';
const CONFIG_SCHEMA_URL = 'https://opencode.ai/config.json';
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-20250514';

function getConfigTemplateContent() {
  const config = {
    $schema: CONFIG_SCHEMA_URL,
    model: DEFAULT_MODEL,
  };
  return `${JSON.stringify(config, null, 2)}\n`;
}

/**
 * @param {object} deps
 * @param {() => import('vscode').WorkspaceFolder[] | undefined} deps.getWorkspaceFolders
 * @param {(uri: import('vscode').Uri) => Promise<import('vscode').FileStat>} deps.stat
 * @param {(uri: import('vscode').Uri, content: Uint8Array) => Promise<void>} deps.writeFile
 * @param {(message: string, ...items: string[]) => Promise<string | undefined>} deps.showWarningMessage
 * @param {(uri: import('vscode').Uri) => Promise<import('vscode').TextDocument>} deps.openTextDocument
 * @param {(doc: import('vscode').TextDocument) => Promise<import('vscode').TextEditor>} deps.showTextDocument
 * @param {(options: object) => Promise<import('vscode').Uri | undefined>} deps.showSaveDialog
 * @param {typeof import('vscode').Uri} deps.Uri
 */
async function createConfigTemplate(deps) {
  const {
    getWorkspaceFolders,
    stat,
    writeFile,
    showWarningMessage,
    openTextDocument,
    showTextDocument,
    showSaveDialog,
    Uri,
  } = deps;

  const folders = getWorkspaceFolders();
  let targetUri;

  if (folders?.length) {
    targetUri = Uri.joinPath(folders[0].uri, CONFIG_FILENAME);
  } else {
    const saveUri = await showSaveDialog({
      defaultUri: Uri.file(CONFIG_FILENAME),
      filters: { 'OpenCode Config': ['json'] },
      saveLabel: 'Create',
    });
    if (!saveUri) {
      return { cancelled: true };
    }
    targetUri = saveUri;
  }

  try {
    await stat(targetUri);
    const action = await showWarningMessage(
      `${CONFIG_FILENAME} already exists in this location.`,
      'Open',
      "Don't Overwrite",
      'Cancel'
    );
    if (!action || action === 'Cancel' || action === "Don't Overwrite") {
      return { cancelled: true };
    }
    if (action === 'Open') {
      const doc = await openTextDocument(targetUri);
      await showTextDocument(doc);
      return { opened: true, uri: targetUri };
    }
  } catch {
    // File does not exist yet — create it below.
  }

  const content = getConfigTemplateContent();
  await writeFile(targetUri, Buffer.from(content, 'utf8'));
  const doc = await openTextDocument(targetUri);
  await showTextDocument(doc);
  return { created: true, uri: targetUri };
}

module.exports = {
  CONFIG_FILENAME,
  CONFIG_SCHEMA_URL,
  DEFAULT_MODEL,
  getConfigTemplateContent,
  createConfigTemplate,
};
