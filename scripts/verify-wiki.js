#!/usr/bin/env node
'use strict';

const { execSync, spawnSync } = require('child_process');

const REPO = 'aadorian/opencodeCLI';
const WIKI_URL = `https://github.com/${REPO}/wiki`;
const WIKI_REMOTE = `https://github.com/${REPO}.wiki.git`;
const EXPECTED = ['Home', 'Building-the-OpenCode-Agent-Harness'];

function listRemoteFiles() {
  const out = execSync(`git ls-remote --heads ${WIKI_REMOTE}`, { encoding: 'utf8' });
  if (!out.trim()) return null;
  const cloneDir = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'wiki-verify-'));
  execSync(`git clone --depth 1 ${WIKI_REMOTE} .`, { cwd: cloneDir, stdio: 'pipe' });
  const files = require('fs').readdirSync(cloneDir).filter(f => f.endsWith('.md'));
  require('fs').rmSync(cloneDir, { recursive: true, force: true });
  return files.map(f => f.replace(/\.md$/, ''));
}

function verify() {
  const titles = listRemoteFiles();
  if (!titles) {
    console.error('Wiki git repository not found.');
    process.exit(1);
  }

  console.log(`Wiki OK: ${titles.length} page(s) at ${WIKI_URL}`);
  for (const title of titles) {
    console.log(`  - ${title}`);
  }

  for (const expected of EXPECTED) {
    if (!titles.includes(expected)) {
      console.error(`Missing expected wiki page: ${expected}`);
      process.exit(1);
    }
  }

  const homeCheck = spawnSync('curl', ['-sS', '-L', '-o', '/dev/null', '-w', '%{http_code}', `${WIKI_URL}/Home`], { encoding: 'utf8' });
  if (homeCheck.stdout.trim() !== '200') {
    console.error(`Wiki Home page returned HTTP ${homeCheck.stdout.trim()}`);
    process.exit(1);
  }

  console.log('All expected wiki pages present.');
}

verify();
