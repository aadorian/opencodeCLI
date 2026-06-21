#!/usr/bin/env node
'use strict';

/**
 * Verify GitHub Wiki is provisioned and lists expected pages.
 * Exit 0 when Home + Building-the-OpenCode-Agent-Harness exist.
 */

const { execSync } = require('child_process');

const REPO = 'aadorian/opencodeCLI';
const WIKI_URL = `https://github.com/${REPO}/wiki`;
const EXPECTED = ['Home', 'Building-the-OpenCode-Agent-Harness'];

function ghJson(args) {
  return JSON.parse(execSync(`gh api ${args}`, { encoding: 'utf8' }));
}

function verify() {
  let pages;
  try {
    pages = ghJson(`repos/${REPO}/wiki/pages`);
  } catch (err) {
    console.error('Wiki API unavailable (wiki not provisioned yet).');
    console.error(`Create the first page at ${WIKI_URL}/_new then run: npm run wiki:push`);
    process.exit(1);
  }

  if (!Array.isArray(pages) || pages.length === 0) {
    console.error('Wiki exists but has no pages.');
    process.exit(1);
  }

  const titles = pages.map(p => p.title);
  console.log(`Wiki OK: ${pages.length} page(s) at ${WIKI_URL}`);
  for (const title of titles) {
    console.log(`  - ${title}`);
  }

  for (const expected of EXPECTED) {
    if (!titles.includes(expected)) {
      console.error(`Missing expected wiki page: ${expected}`);
      process.exit(1);
    }
  }

  console.log('All expected wiki pages present.');
}

verify();
