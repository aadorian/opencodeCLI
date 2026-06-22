#!/usr/bin/env node
'use strict';

/**
 * Sync GitHub repository ruleset from .github/rulesets/master-protection.json
 *
 * Usage:
 *   node scripts/apply-ruleset.js [--enforcement=active|evaluate|disabled] [--dry-run]
 *
 * Requires GITHUB_TOKEN or gh auth with repo admin scope.
 * @see https://docs.github.com/en/rest/repos/rules
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO = process.env.GITHUB_REPOSITORY || 'aadorian/opencodeCLI';
const [owner, repo] = REPO.split('/');
const RULESET_PATH = path.join(__dirname, '..', '.github', 'rulesets', 'master-protection.json');
const API = 'https://api.github.com';

function parseArgs() {
  const args = { enforcement: null, dryRun: false };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--enforcement=')) {
      args.enforcement = arg.split('=')[1];
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    }
  }
  return args;
}

function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execSync('gh auth token', { encoding: 'utf8' }).trim();
  } catch {
    throw new Error('Set GITHUB_TOKEN or run `gh auth login` with admin access');
  }
}

async function api(token, method, endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(`GitHub API ${method} ${endpoint} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  const { enforcement, dryRun } = parseArgs();
  const ruleset = JSON.parse(fs.readFileSync(RULESET_PATH, 'utf8'));

  if (enforcement) {
    ruleset.enforcement = enforcement;
  }

  const validEnforcement = ['active', 'evaluate', 'disabled'];
  if (!validEnforcement.includes(ruleset.enforcement)) {
    throw new Error(`Invalid enforcement "${ruleset.enforcement}". Use: ${validEnforcement.join(', ')}`);
  }

  console.log(`Repository: ${owner}/${repo}`);
  console.log(`Ruleset: ${ruleset.name}`);
  console.log(`Enforcement: ${ruleset.enforcement}`);
  console.log(`Required checks: ${ruleset.rules.find(r => r.type === 'required_status_checks')?.parameters?.required_status_checks?.length ?? 0}`);

  if (dryRun) {
    console.log('\nDry run — payload:\n', JSON.stringify(ruleset, null, 2));
    return;
  }

  const token = getToken();
  const existing = await api(token, 'GET', `/repos/${owner}/${repo}/rulesets`);

  const match = existing.find(r => r.name === ruleset.name);
  let result;

  if (match) {
    console.log(`Updating existing ruleset id=${match.id}…`);
    result = await api(token, 'PUT', `/repos/${owner}/${repo}/rulesets/${match.id}`, ruleset);
  } else {
    console.log('Creating new ruleset…');
    result = await api(token, 'POST', `/repos/${owner}/${repo}/rulesets`, ruleset);
  }

  console.log(`\nDone. Ruleset id=${result.id}, enforcement=${result.enforcement}`);
  console.log(`Manage: https://github.com/${owner}/${repo}/settings/rules/${result.id}`);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
