#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

let failed = false;

function error(message) {
  console.error(`validate-manifest: ${message}`);
  failed = true;
}

function assertExists(relativePath, label) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    error(`Missing ${label}: ${relativePath}`);
  }
}

assertExists('extension.js', 'entry point');
assertExists('media/opencode-icon.png', 'extension icon');

for (const [key, schema] of Object.entries(pkg.contributes?.configuration?.properties ?? {})) {
  if (key.startsWith('opcode.')) {
    error(`Setting key must use opencode.* prefix, not opcode.*: ${key}`);
  }
  if (schema.type === 'boolean' && schema.default === null) {
    error(`Boolean setting must omit default or use true/false, not null: ${key}`);
  }
}

const viewIds = new Set(Object.values(pkg.contributes?.views ?? {}).flat().map((view) => view.id));
for (const event of pkg.activationEvents ?? []) {
  if (event.startsWith('onView:')) {
    const viewId = event.slice('onView:'.length);
    if (!viewIds.has(viewId)) {
      error(`Activation event references unknown view: ${event}`);
    }
  }
}

const commands = pkg.contributes?.commands ?? [];
if (commands.length === 0) {
  error('No commands contributed in package.json');
}

for (const command of commands) {
  if (!command.command || !command.title) {
    error(`Command missing id or title: ${JSON.stringify(command)}`);
  }
}

const walkthroughs = pkg.contributes?.walkthroughs ?? [];
for (const walkthrough of walkthroughs) {
  for (const step of walkthrough.steps ?? []) {
    const markdown = step.media?.markdown;
    if (markdown) {
      assertExists(markdown, `walkthrough step "${step.id}" media`);
    }
  }
}

const views = Object.values(pkg.contributes?.views ?? {}).flat();
const registeredProviders = new Set([
  'opencode-walkthrough.agents',
  'opencode-walkthrough.models',
  'opencode-walkthrough.mcp',
  'opencode-walkthrough.sessions',
]);

const registeredWebviews = new Set([
  'opencode-walkthrough.agent',
]);

for (const view of views) {
  if (view.type === 'tree' && view.id !== 'opencode-walkthrough.overview' && !registeredProviders.has(view.id)) {
    console.warn(`validate-manifest: warning — tree view "${view.id}" has no known provider in extension.js`);
  }
  if (view.type === 'webview' && !registeredWebviews.has(view.id)) {
    console.warn(`validate-manifest: warning — webview "${view.id}" has no known provider in extension.js`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`validate-manifest: OK (${commands.length} commands, ${walkthroughs.length} walkthrough(s))`);
