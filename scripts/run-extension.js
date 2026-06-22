#!/usr/bin/env node
'use strict';

const { execSync, spawn } = require('child_process');
const { launchExtensionHost } = require('../lib/runExtension');

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
  console.error('Could not find cursor or code on PATH.');
  console.error('Install Cursor/VS Code, or press F5 with the "Run Extension" launch config.');
  process.exit(1);
}

console.log(`Launched ${result.editor} Extension Development Host`);
console.log(`  Extension: ${result.extensionPath}`);
console.log(`  Workspace: ${result.workspaceFolder}`);
