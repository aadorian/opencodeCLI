#!/usr/bin/env node
'use strict';

/**
 * Initialize GitHub Wiki — sign in (if needed), save Home, then push all pages.
 * Usage: npm run wiki:init
 *        npm run wiki:publish   (init + push + verify)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const { chromium } = require('playwright');

const REPO = 'aadorian/opencodeCLI';
const LOGIN = 'https://github.com/login';
const WIKI_NEW = `https://github.com/${REPO}/wiki/_new`;
const HOME_PATH = path.join(__dirname, '..', '.wiki-sync', 'Home.md');
const profileDir = path.join(__dirname, '..', '.wiki-browser-profile');
const publish = process.argv.includes('--publish');

function prepareHome() {
  execSync('node scripts/sync-wiki.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
}

function wikiPageCount() {
  try {
    return Number(execSync(`gh api repos/${REPO}/wiki/pages --jq 'length'`, { encoding: 'utf8' }).trim());
  } catch {
    return 0;
  }
}

async function isSignedIn(page) {
  await page.goto('https://github.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  return !(await page.getByRole('link', { name: 'Sign in' }).first().isVisible({ timeout: 3000 }).catch(() => false));
}

async function waitForSignIn(page) {
  console.log('Sign in to GitHub in the browser window (up to 5 minutes)…');
  await page.goto(LOGIN, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 60; i++) {
    if (await isSignedIn(page)) return;
    await page.waitForTimeout(5000);
  }
  throw new Error('Timed out waiting for GitHub sign-in.');
}

async function saveHomePage(page, content) {
  await page.goto(WIKI_NEW, { waitUntil: 'domcontentloaded', timeout: 60000 });

  if (await page.getByText('You do not have permission to update this wiki').isVisible({ timeout: 3000 }).catch(() => false)) {
    throw new Error('GitHub says this account cannot edit the wiki. Check repo Settings → Wiki.');
  }

  const title = page.locator('#gollum-editor-title, input[name="page[title]"], input[name="page"]').first();
  await title.waitFor({ state: 'visible', timeout: 30000 });
  await title.fill('Home');

  const body = page.locator('#gollum-editor-body, textarea[name="page[body]"]').first();
  await body.waitFor({ state: 'visible', timeout: 30000 });
  await body.fill(content);

  await page.locator('#gollum-editor-submit, button:has-text("Save Page")').first().click();
  await page.waitForURL(/\/wiki(\/Home)?(\?|$)/, { timeout: 60000 });
}

async function initWiki() {
  if (wikiPageCount() > 0) {
    console.log('Wiki already provisioned.');
    return;
  }

  prepareHome();
  const content = fs.readFileSync(HOME_PATH, 'utf8');
  fs.mkdirSync(profileDir, { recursive: true });

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1280, height: 900 },
  });

  try {
    const page = context.pages()[0] || await context.newPage();
    if (!(await isSignedIn(page))) {
      await waitForSignIn(page);
    }
    await saveHomePage(page, content);

    for (let i = 0; i < 12; i++) {
      if (wikiPageCount() > 0) break;
      await page.waitForTimeout(2500);
    }
    if (wikiPageCount() === 0) {
      throw new Error('Home saved in browser but wiki API not ready yet — wait and run npm run wiki:push');
    }
    console.log('Wiki Home page created.');
  } finally {
    await context.close();
  }
}

function pushWiki() {
  const result = spawnSync('npm', ['run', 'wiki:push'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

async function main() {
  await initWiki();
  if (publish) {
    pushWiki();
    execSync('node scripts/verify-wiki.js', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
  } else {
    console.log('\nNext: npm run wiki:push && npm run wiki:verify');
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
