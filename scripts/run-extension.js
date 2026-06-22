#!/usr/bin/env node
'use strict';

const { execSync, spawn } = require('child_process');
const { formatEditorNotFoundMessage, launchExtensionHost } = require('../lib/runExtension');

function editorOnPath(name) {
  try {
    if (process.platform === 'win32') {
      execSync(`where ${name}`, { stdio: 'ignore' });
    } else {
      execSync(`command -v ${name}`, { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

const result = launchExtensionHost({
  spawn,
  isEditorAvailable: editorOnPath,
});

if (!result.launched) {
  console.error(formatEditorNotFoundMessage());
  process.exit(1);
}

console.log(`Launched ${result.editor} Extension Development Host`);
console.log(`  Extension: ${result.extensionPath}`);
console.log(`  Workspace: ${result.workspaceFolder}`);
