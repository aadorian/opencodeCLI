#!/usr/bin/env node
'use strict';

/**
 * Publish docs to GitHub Wiki.
 * 1. Prepare wiki files
 * 2. Open wiki editor if not provisioned
 * 3. Poll until Home exists, then git push + verify
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');

const REPO = 'aadorian/opencodeCLI';
const WIKI_URL = `https://github.com/${REPO}/wiki`;
const WIKI_NEW = `${WIKI_URL}/_new`;
const root = path.join(__dirname, '..');
const HOME_PATH = path.join(root, '.wiki-sync', 'Home.md');

function wikiPages() {
  try {
    return JSON.parse(execSync(`gh api repos/${REPO}/wiki/pages`, { encoding: 'utf8' }));
  } catch {
    return null;
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function prepare() {
  execSync('node scripts/sync-wiki.js', { cwd: root, stdio: 'inherit' });
}

function openEditor() {
  spawnSync('gh', ['browse', '/wiki/_new', '--repo', REPO], { stdio: 'inherit' });
}

function push() {
  const r = spawnSync('npm', ['run', 'wiki:push'], { cwd: root, stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status || 1);
}

function verify() {
  execSync('node scripts/verify-wiki.js', { cwd: root, stdio: 'inherit' });
}

prepare();

let pages = wikiPages();
if (!pages || pages.length === 0) {
  console.log('\n=== GitHub Wiki first-time setup ===');
  console.log(`1. Browser opening: ${WIKI_NEW}`);
  console.log('2. Sign in to GitHub if prompted');
  console.log('3. Title: Home');
  console.log(`4. Paste content from: ${HOME_PATH}`);
  console.log('5. Click Save Page\n');
  console.log('Waiting for Home page (up to 10 minutes)…\n');
  openEditor();

  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    pages = wikiPages();
    if (pages && pages.length > 0) {
      console.log(`Detected wiki page(s): ${pages.map(p => p.title).join(', ')}`);
      break;
    }
    sleep(5000);
    process.stdout.write('.');
  }
  console.log('');
  if (!pages || pages.length === 0) {
    console.error('Timed out. Save Home at the wiki editor, then run: npm run wiki:publish');
    process.exit(1);
  }
}

console.log('Pushing wiki content…');
push();
verify();
console.log(`\nPublished: ${WIKI_URL}`);
