#!/usr/bin/env node
'use strict';

/**
 * Sync docs/ to the GitHub wiki repository.
 * Usage: node scripts/sync-wiki.js [--push]
 *
 * Note: GitHub provisions the wiki git repo only after the first wiki page
 * is created in the UI. If push fails, open the wiki and save Home once, then retry.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const repo = 'aadorian/opencodeCLI';
const wikiRemote = `https://github.com/${repo}.wiki.git`;
const wikiDir = path.join(root, '.wiki-sync');
const push = process.argv.includes('--push');

const REPO_BASE = `https://github.com/${repo}/blob/master`;
const WIKI_URL = `https://github.com/${repo}/wiki`;
const WIKI_NEW_URL = `https://github.com/${repo}/wiki/_new`;

function wikiLink(title) {
  return title.replace(/ /g, '-');
}

function adaptHarnessContent(content) {
  return content
    .replace(
      /\(\.\.\/\.github\/FEATURE_PLAN_opencode-agent-loop\.md\)/g,
      `(${REPO_BASE}/.github/FEATURE_PLAN_opencode-agent-loop.md)`
    )
    .replace(
      /\(\.\.\/\.github\/GIT_WORKFLOW\.md\)/g,
      `(${REPO_BASE}/.github/GIT_WORKFLOW.md)`
    )
    .replace(
      /\(\.\.\/lib\/([^)]+)\)/g,
      (_, file) => `(${REPO_BASE}/lib/${file})`
    )
    .replace(
      /\(\.\.\/extension\.js\)/g,
      `(${REPO_BASE}/extension.js)`
    );
}

function writeHome() {
  return `# OpenCode Walkthrough — Wiki

Documentation for the [OpenCode Walkthrough](https://github.com/${repo}) VS Code extension.

| Article | Description |
|---------|-------------|
| [Building the OpenCode Agent Harness](${wikiLink('Building the OpenCode Agent Harness')}) | How we built a VS Code–native agent loop on top of the OpenCode CLI |
| [Agent Loop feature plan](${REPO_BASE}/.github/FEATURE_PLAN_opencode-agent-loop.md) | Phased roadmap and architecture |
| [Git workflow](${REPO_BASE}/.github/GIT_WORKFLOW.md) | Branching, commits, and CI for contributors |
| [Repository README](${REPO_BASE}/README.md) | Install, commands, settings, testing |

---

_Synced from \`docs/\` via \`npm run wiki:push\`._
`;
}

function prepareWikiFiles() {
  const harnessSrc = fs.readFileSync(
    path.join(root, 'docs/building-opencode-agent-harness.md'),
    'utf8'
  );

  fs.mkdirSync(wikiDir, { recursive: true });
  fs.writeFileSync(path.join(wikiDir, 'Home.md'), writeHome());
  fs.writeFileSync(
    path.join(wikiDir, 'Building-the-OpenCode-Agent-Harness.md'),
    adaptHarnessContent(harnessSrc)
  );
}

function run(cmd, opts = {}) {
  return execSync(cmd, {
    stdio: opts.inherit === false ? 'pipe' : 'inherit',
    cwd: opts.cwd || wikiDir,
    encoding: opts.inherit === false ? 'utf8' : undefined,
    ...opts,
  });
}

function pushWiki() {
  prepareWikiFiles();
  const homeContent = fs.readFileSync(path.join(wikiDir, 'Home.md'), 'utf8');
  const harnessContent = fs.readFileSync(path.join(wikiDir, 'Building-the-OpenCode-Agent-Harness.md'), 'utf8');

  const workDir = path.join(root, '.wiki-push');
  if (fs.existsSync(workDir)) {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
  fs.mkdirSync(workDir, { recursive: true });

  execSync('gh auth setup-git', { stdio: 'inherit' });

  const lsRemote = spawnSync('git', ['ls-remote', wikiRemote], { encoding: 'utf8' });
  const wikiExists = lsRemote.status === 0 && lsRemote.stdout.trim().length > 0;

  if (wikiExists) {
    run(`git clone ${wikiRemote} .`, { cwd: workDir });
  } else {
    run('git init', { cwd: workDir });
    run('git checkout -b master', { cwd: workDir });
    run(`git remote add origin ${wikiRemote}`, { cwd: workDir, inherit: false });
  }

  fs.writeFileSync(path.join(workDir, 'Home.md'), homeContent);
  fs.writeFileSync(path.join(workDir, 'Building-the-OpenCode-Agent-Harness.md'), harnessContent);

  run('git add .', { cwd: workDir });
  const diff = spawnSync('git', ['diff', '--staged', '--quiet'], { cwd: workDir });
  if (diff.status === 0) {
    console.log('Wiki already up to date.');
  } else {
    run('git commit -m "docs: sync wiki from docs/"', { cwd: workDir });
    const result = spawnSync('git', ['push', 'origin', 'master'], {
      cwd: workDir,
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      const err = `${result.stderr || ''}${result.stdout || ''}`;
      if (/repository not found/i.test(err)) {
        console.error('\nGitHub Wiki git repository is not provisioned yet.');
        console.error(`Create Home at ${WIKI_NEW_URL}, then re-run: npm run wiki:push\n`);
        process.exit(1);
      }
      process.stderr.write(err);
      process.exit(result.status || 1);
    }
  }

  console.log(`\nWiki published: ${WIKI_URL}`);
  console.log(`Article: ${WIKI_URL}/${wikiLink('Building the OpenCode Agent Harness')}`);
}

prepareWikiFiles();
console.log(`Prepared wiki files in ${wikiDir}`);

if (push) {
  pushWiki();
} else {
  console.log('Run with --push to publish to GitHub Wiki.');
}
