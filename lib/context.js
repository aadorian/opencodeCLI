'use strict';

const DEFAULT_TOGGLES = {
  includeWorkspace: true,
  includeOpenEditors: true,
  includeActiveFile: true,
  includeSelection: true,
  includeDiagnostics: true,
  includeGit: true,
  includeFileContents: false,
};

/**
 * Build harness context from plain data (testable without VS Code).
 * @param {object} input
 * @returns {object}
 */
function assembleContextFromData(input = {}) {
  const toggles = { ...DEFAULT_TOGGLES, ...input.toggles };
  const ctx = {
    timestamp: input.timestamp || new Date().toISOString(),
    customInstructions: input.customInstructions || '',
  };

  if (toggles.includeWorkspace && input.workspaceFolders?.length) {
    ctx.workspace = input.workspaceFolders.map(f => ({
      name: f.name,
      path: f.path,
    }));
  }

  if (toggles.includeActiveFile && input.activeEditor) {
    const ed = input.activeEditor;
    ctx.activeEditor = {
      path: ed.path,
      language: ed.language,
      lineCount: ed.lineCount,
    };
    if (toggles.includeSelection && ed.selection) {
      ctx.activeEditor.selection = ed.selection;
    }
    if (toggles.includeFileContents && ed.contents !== undefined) {
      ctx.activeEditor.contents = ed.contents;
    }
  }

  if (toggles.includeOpenEditors && input.openEditors?.length) {
    ctx.openEditors = input.openEditors;
  }

  if (toggles.includeGit && input.git) {
    ctx.git = input.git;
  }

  if (toggles.includeDiagnostics && input.diagnostics?.length) {
    ctx.diagnostics = input.diagnostics;
  }

  return ctx;
}

/**
 * @param {import('vscode')} vscode
 * @param {() => import('vscode').WorkspaceConfiguration} getConfig
 */
async function assembleContext(vscode, getConfig) {
  const config = getConfig();
  const toggles = {
    includeWorkspace: config.get('opencode.harness.context.includeWorkspace', true),
    includeOpenEditors: config.get('opencode.harness.context.includeOpenEditors', true),
    includeActiveFile: config.get('opencode.harness.context.includeActiveFile', true),
    includeSelection: config.get('opencode.harness.context.includeSelection', true),
    includeDiagnostics: config.get('opencode.harness.context.includeDiagnostics', true),
    includeGit: config.get('opencode.harness.context.includeGit', true),
    includeFileContents: config.get('opencode.harness.context.includeFileContents', false),
  };

  const customInstructions = config.get('opencode.harness.customInstructions', '');

  const workspaceFolders = (vscode.workspace.workspaceFolders || []).map(f => ({
    name: f.name,
    path: f.uri.fsPath,
  }));

  let activeEditor;
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    activeEditor = {
      path: editor.document.uri.fsPath,
      language: editor.document.languageId,
      lineCount: editor.document.lineCount,
    };
    if (toggles.includeSelection && !editor.selection.isEmpty) {
      activeEditor.selection = {
        start: editor.selection.start,
        end: editor.selection.end,
        text: editor.document.getText(editor.selection),
      };
    }
    if (toggles.includeFileContents) {
      activeEditor.contents = editor.document.getText();
    }
  }

  const openEditors = [];
  if (toggles.includeOpenEditors) {
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        const input = tab.input;
        if (input && typeof input === 'object' && 'uri' in input && input.uri) {
          openEditors.push({
            label: tab.label,
            path: input.uri.fsPath,
          });
        }
      }
    }
  }

  let git;
  if (toggles.includeGit && workspaceFolders.length > 0) {
    const { getGitBranch } = require('./cli');
    const folder = workspaceFolders[0].path;
    const branch = await getGitBranch(folder);
    git = { branch, folder };
    try {
      const { execPromise } = require('./cli');
      const { stdout } = await execPromise('git status --porcelain', { cwd: folder });
      const dirty = stdout.trim().split('\n').filter(Boolean);
      if (dirty.length) git.dirtyFiles = dirty.slice(0, 50);
    } catch { /* ignore */ }
  }

  const diagnostics = [];
  if (toggles.includeDiagnostics) {
    for (const [uri, diags] of vscode.languages.getDiagnostics()) {
      for (const d of diags) {
        if (d.severity <= vscode.DiagnosticSeverity.Warning) {
          diagnostics.push({
            file: uri.fsPath,
            line: d.range.start.line + 1,
            severity: d.severity === vscode.DiagnosticSeverity.Error ? 'error' : 'warning',
            message: d.message,
          });
        }
      }
    }
  }

  return assembleContextFromData({
    toggles,
    customInstructions,
    workspaceFolders,
    activeEditor,
    openEditors,
    git,
    diagnostics: diagnostics.slice(0, 100),
  });
}

function formatContextForPrompt(context) {
  return `<harness-context>\n${JSON.stringify(context, null, 2)}\n</harness-context>`;
}

module.exports = {
  assembleContext,
  assembleContextFromData,
  formatContextForPrompt,
  DEFAULT_TOGGLES,
};
