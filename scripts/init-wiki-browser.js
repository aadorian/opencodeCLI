#!/usr/bin/env node
'use strict';

/**
 * Initialize GitHub Wiki by saving the Home page in a logged-in browser session.
 * Requires Playwright and an existing GitHub login in Chrome.
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const REPO = 'aadorian/opencodeCLI';
const WIKI_NEW = `https://github.com/${REPO}/wiki/_new`;
const HOME_PATH = path.join(__dirname, '..', '.wiki-sync', 'Home.md');

async function main() {
  if (!fs.existsSync(HOME_PATH)) {
    require('./sync-wiki.js');
  }
  const content = fs.readFileSync(HOME_PATH, 'utf8');

  const profileDir = path.join(__dirname, '..', '.wiki-browser-profile');
  fs.mkdirSync(profileDir, { recursive: true });

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless: false,
  });

  try {
    const page = context.pages()[0] || await context.newPage();
    await page.goto(WIKI_NEW, { waitUntil: 'domcontentloaded', timeout: 60000 });

    if (await page.getByText('Sign in').first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.error('Not signed in to GitHub in Chrome. Sign in, then re-run: npm run wiki:init');
      process.exit(1);
    }

    if (await page.getByText('You do not have permission to update this wiki').isVisible({ timeout: 3000 }).catch(() => false)) {
      console.error('GitHub reports no wiki edit permission for this account.');
      process.exit(1);
    }

    const titleInput = page.locator('#gollum-editor-title, input[name="page"], input[placeholder*="Title"]').first();
    await titleInput.waitFor({ timeout: 15000 });
    await titleInput.fill('Home');

    const editor = page.locator('#gollum-editor-body, textarea[name="page[body]"], .CodeMirror textarea').first();
    await editor.waitFor({ timeout: 15000 });
    await editor.fill(content);

    const save = page.locator('#gollum-editor-submit, button:has-text("Save Page")').first();
    await save.click();

    await page.waitForURL(/\/wiki(\/Home)?$/, { timeout: 30000 });
    console.log('Wiki Home page created.');
  } finally {
    await context.close();
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
