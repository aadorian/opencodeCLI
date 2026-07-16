'use strict';

const AGENT_DIR = '.opencode/agent';

const MODE_OPTIONS = [
  { label: 'primary', description: 'Main agent you switch to and drive directly' },
  { label: 'subagent', description: 'Invoked by other agents to delegate a task' },
  { label: 'all', description: 'Usable both as a primary agent and as a subagent' },
];

const TOOL_OPTIONS = ['bash', 'read', 'edit', 'write', 'grep', 'glob', 'list', 'patch', 'webfetch'];

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildAgentContent({ description, mode, model, tools }) {
  const lines = ['---'];
  lines.push(`description: ${description}`);
  lines.push(`mode: ${mode}`);
  if (model) {
    lines.push(`model: ${model}`);
  }
  if (tools.length) {
    lines.push('tools:');
    for (const tool of tools) {
      lines.push(`  ${tool}: true`);
    }
  }
  lines.push('---');
  lines.push('');
  lines.push('You are a specialized agent. Describe your role, responsibilities, and how you');
  lines.push('should approach tasks here. This system prompt fully replaces the default one');
  lines.push('when this agent is active.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

/**
 * Guided, in-editor agent creation. Prompts for name/description/mode/model/tools,
 * writes a `.opencode/agent/<name>.md` file in the first workspace folder, and opens it.
 *
 * @param {object} deps
 * @param {() => import('vscode').WorkspaceFolder[] | undefined} deps.getWorkspaceFolders
 * @param {(options: object) => Promise<string | undefined>} deps.showInputBox
 * @param {(items: any[], options?: object) => Promise<any>} deps.showQuickPick
 * @param {(uri: import('vscode').Uri) => Promise<import('vscode').FileStat>} deps.stat
 * @param {(uri: import('vscode').Uri, content: Uint8Array) => Promise<void>} deps.writeFile
 * @param {(message: string, ...items: string[]) => Promise<string | undefined>} deps.showWarningMessage
 * @param {(message: string, ...items: string[]) => Promise<string | undefined>} deps.showErrorMessage
 * @param {(uri: import('vscode').Uri) => Promise<import('vscode').TextDocument>} deps.openTextDocument
 * @param {(doc: import('vscode').TextDocument) => Promise<import('vscode').TextEditor>} deps.showTextDocument
 * @param {typeof import('vscode').Uri} deps.Uri
 */
async function createAgentInteractive(deps) {
  const {
    getWorkspaceFolders,
    showInputBox,
    showQuickPick,
    stat,
    writeFile,
    showWarningMessage,
    showErrorMessage,
    openTextDocument,
    showTextDocument,
    Uri,
  } = deps;

  const folders = getWorkspaceFolders();
  if (!folders?.length) {
    await showErrorMessage('Open a workspace folder before creating an agent.');
    return { cancelled: true };
  }

  const rawName = await showInputBox({
    prompt: 'Agent name',
    placeHolder: 'e.g. code-reviewer',
    validateInput: value => (value && value.trim() ? undefined : 'Name is required'),
  });
  if (!rawName) {
    return { cancelled: true };
  }
  const name = slugify(rawName);

  const description = await showInputBox({
    prompt: 'What does this agent specialize in?',
    placeHolder: 'e.g. Reviews pull requests for bugs and style issues',
    validateInput: value => (value && value.trim() ? undefined : 'Description is required'),
  });
  if (description === undefined) {
    return { cancelled: true };
  }

  const modePick = await showQuickPick(MODE_OPTIONS, {
    placeHolder: 'Select agent mode',
  });
  if (!modePick) {
    return { cancelled: true };
  }

  const model = await showInputBox({
    prompt: 'Model (provider/model). Leave blank to inherit the default model.',
    placeHolder: 'e.g. anthropic/claude-sonnet-4-20250514',
  });

  const toolPicks = await showQuickPick(
    TOOL_OPTIONS.map(tool => ({ label: tool })),
    { placeHolder: 'Select tools this agent is allowed to use', canPickMany: true }
  );
  const tools = (toolPicks || []).map(pick => pick.label);

  const targetUri = Uri.joinPath(folders[0].uri, ...AGENT_DIR.split('/'), `${name}.md`);

  try {
    await stat(targetUri);
    const action = await showWarningMessage(
      `An agent named "${name}" already exists.`,
      'Overwrite',
      'Cancel'
    );
    if (action !== 'Overwrite') {
      return { cancelled: true };
    }
  } catch {
    // File does not exist yet — create it below.
  }

  const content = buildAgentContent({ description, mode: modePick.label, model, tools });
  await writeFile(targetUri, Buffer.from(content, 'utf8'));
  const doc = await openTextDocument(targetUri);
  await showTextDocument(doc);
  return { created: true, uri: targetUri, name };
}

module.exports = {
  AGENT_DIR,
  MODE_OPTIONS,
  TOOL_OPTIONS,
  slugify,
  buildAgentContent,
  createAgentInteractive,
};
