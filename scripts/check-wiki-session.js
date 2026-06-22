#!/usr/bin/env node
'use strict';

const path = require('path');
const { chromium } = require('playwright');

const WIKI_NEW = 'https://github.com/aadorian/opencodeCLI/wiki/_new';
const profileDir = path.join(__dirname, '..', '.wiki-browser-profile');

(async () => {
  const ctx = await chromium.launchPersistentContext(profileDir, { channel: 'chrome', headless: true });
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(WIKI_NEW, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const text = await page.locator('body').innerText();
  console.log(text.slice(0, 800));
  await ctx.close();
})();
