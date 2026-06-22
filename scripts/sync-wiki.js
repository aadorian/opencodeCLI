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

/** @type {{ src: string, wikiFile: string, title: string, description: string }[]} */
const WIKI_ARTICLES = [
  {
    src: 'docs/installation.md',
    wikiFile: 'Installation.md',
    title: 'Installation',
    description: 'CLI install for all platforms, providers, /init, and extension setup',
  },
  {
    src: 'docs/publishing-cicd.md',
    wikiFile: 'Publishing-and-CI-CD.md',
    title: 'Publishing and CI/CD',
    description: 'VSIX packaging, Marketplace release pipeline, secrets, and vsce best practices',
  },
  {
    src: 'docs/building-opencode-agent-harness.md',
    wikiFile: 'Building-the-OpenCode-Agent-Harness.md',
    title: 'Building the OpenCode Agent Harness',
    description: 'How we built a VS Code–native agent loop on top of the OpenCode CLI',
  },
  {
    src: 'docs/practical-workflow-examples.md',
    wikiFile: 'Practical-Workflow-Examples.md',
    title: 'Practical Workflow Examples',
    description: 'Step-by-step walkthroughs: plan → build handoff, agent chat, session resume',
  },
  {
    src: 'docs/troubleshooting.md',
    wikiFile: 'Troubleshooting.md',
    title: 'Troubleshooting',
    description: 'PATH, env vars, terminal shells, harness errors — diagnosis matrix',
  },
];

function wikiLink(title) {
  return title.replace(/ /g, '-');
}

function adaptWikiContent(content) {
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
      /\(\.\.\/README\.md([^)]*)\)/g,
      (_, fragment) => `(${REPO_BASE}/README.md${fragment})`
    )
    .replace(
      /\(\.\/building-opencode-agent-harness\.md\)/g,
      `(${wikiLink('Building the OpenCode Agent Harness')})`
    )
    .replace(
      /\(\.\/installation\.md\)/g,
      `(${wikiLink('Installation')})`
    )
    .replace(
      /\(\.\/publishing-cicd\.md\)/g,
      `(${wikiLink('Publishing and CI/CD')})`
    )
    .replace(
      /\(\.\/practical-workflow-examples\.md\)/g,
      `(${wikiLink('Practical Workflow Examples')})`
    )
    .replace(
      /\(\.\/troubleshooting\.md\)/g,
      `(${wikiLink('Troubleshooting')})`
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
  const rows = WIKI_ARTICLES.map(
    (a) => `| [${a.title}](${wikiLink(a.title)}) | ${a.description} |`
  ).join('\n');

  return `# OpenCode Walkthrough — Wiki

Documentation for the [OpenCode Walkthrough](https://github.com/${repo}) VS Code extension.

| Article | Description |
|---------|-------------|
${rows}
| [Agent Loop feature plan](${REPO_BASE}/.github/FEATURE_PLAN_opencode-agent-loop.md) | Phased roadmap and architecture |
| [Git workflow](${REPO_BASE}/.github/GIT_WORKFLOW.md) | Branching, commits, and CI for contributors |
| [Repository README](${REPO_BASE}/README.md) | Install, commands, settings, testing |

---

_Synced from \`docs/\` via \`npm run wiki:push\`._
`;
}

function prepareWikiFiles() {
  fs.mkdirSync(wikiDir, { recursive: true });
  fs.writeFileSync(path.join(wikiDir, 'Home.md'), writeHome());

  for (const article of WIKI_ARTICLES) {
    const srcPath = path.join(root, article.src);
    const content = fs.readFileSync(srcPath, 'utf8');
    fs.writeFileSync(
      path.join(wikiDir, article.wikiFile),
      adaptWikiContent(content)
    );
  }
}

function run(cmd, opts = {}) {
  return execSync(cmd, {
    stdio: opts.inherit === false ? 'pipe' : 'inherit',
    cwd: opts.cwd || wikiDir,
    encoding: opts.inherit === false ? 'utf8' : undefined,
    ...opts,
  });
}

function wikiRemoteUrl() {
  const token = process.env.WIKI_PUSH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) {
    return `https://x-access-token:${token}@github.com/${repo}.wiki.git`;
  }
  return wikiRemote;
}

function setupGitAuth() {
  const token = process.env.WIKI_PUSH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) {
    execSync('git config --global user.name "github-actions[bot]"', { stdio: 'inherit' });
    execSync('git config --global user.email "41898282+github-actions[bot]@users.noreply.github.com"', {
      stdio: 'inherit',
    });
    return;
  }
  execSync('gh auth setup-git', { stdio: 'inherit' });
}

function pushWiki() {
  prepareWikiFiles();

  const workDir = path.join(root, '.wiki-push');
  if (fs.existsSync(workDir)) {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
  fs.mkdirSync(workDir, { recursive: true });

  setupGitAuth();
  const remote = wikiRemoteUrl();

  const lsRemote = spawnSync('git', ['ls-remote', remote], { encoding: 'utf8' });
  const wikiExists = lsRemote.status === 0 && lsRemote.stdout.trim().length > 0;

  if (wikiExists) {
    run(`git clone ${remote} .`, { cwd: workDir });
  } else {
    run('git init', { cwd: workDir });
    run('git checkout -b master', { cwd: workDir });
    run(`git remote add origin ${remote}`, { cwd: workDir, inherit: false });
  }

  fs.writeFileSync(path.join(workDir, 'Home.md'), fs.readFileSync(path.join(wikiDir, 'Home.md'), 'utf8'));
  for (const article of WIKI_ARTICLES) {
    fs.writeFileSync(
      path.join(workDir, article.wikiFile),
      fs.readFileSync(path.join(wikiDir, article.wikiFile), 'utf8')
    );
  }

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
  for (const article of WIKI_ARTICLES) {
    console.log(`Article: ${WIKI_URL}/${wikiLink(article.title)}`);
  }
}

prepareWikiFiles();
console.log(`Prepared wiki files in ${wikiDir}`);

if (push) {
  pushWiki();
} else {
  console.log('Run with --push to publish to GitHub Wiki.');
}
