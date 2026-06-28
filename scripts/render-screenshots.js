#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT_DIR = path.join(__dirname, '..', 'media', 'screenshots');

const baseStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    color: #cccccc;
    background: #1e1e1e;
    overflow: hidden;
  }
  .window {
    display: flex;
    height: 100vh;
    border: 1px solid #454545;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.45);
  }
  .activity-bar {
    width: 48px;
    background: #333333;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0;
    gap: 16px;
  }
  .activity-icon {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.6;
    font-size: 16px;
  }
  .activity-icon.active {
    opacity: 1;
    box-shadow: inset 3px 0 0 #ffffff;
  }
  .sidebar {
    width: 280px;
    background: #252526;
    border-right: 1px solid #454545;
    display: flex;
    flex-direction: column;
  }
  .sidebar-header {
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #bbbbbb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .toolbar { display: flex; gap: 2px; }
  .toolbar span {
    width: 22px; height: 22px;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 4px; font-size: 14px; opacity: 0.85;
  }
  .sidebar-body { padding: 12px 16px; line-height: 1.55; flex: 1; }
  .sidebar-body p { margin-bottom: 12px; color: #cccccc; }
  .link {
    display: block;
    color: #3794ff;
    text-decoration: none;
    margin-bottom: 6px;
    cursor: default;
  }
  .link:hover { text-decoration: underline; }
  .editor {
    flex: 1;
    background: #1e1e1e;
    display: flex;
    flex-direction: column;
  }
  .tab-bar {
    background: #252526;
    border-bottom: 1px solid #454545;
    padding: 0 12px;
    height: 35px;
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 13px;
  }
  .tab { color: #969696; }
  .tab.active { color: #ffffff; border-bottom: 2px solid #007acc; padding-bottom: 6px; }
  .editor-area {
    flex: 1;
    padding: 24px;
    color: #858585;
    font-family: 'SF Mono', Menlo, monospace;
    font-size: 13px;
  }
  .status-bar {
    height: 22px;
    background: #007acc;
    color: #ffffff;
    display: flex;
    align-items: center;
    padding: 0 8px;
    gap: 16px;
    font-size: 12px;
  }
  .status-item { display: flex; align-items: center; gap: 4px; }
  .tree-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 4px;
    margin-bottom: 2px;
  }
  .tree-item:hover { background: #2a2d2e; }
  .tree-desc { color: #858585; margin-left: auto; font-size: 12px; }
  .panel {
    height: 180px;
    background: #252526;
    border-top: 1px solid #454545;
  }
  .panel-tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid #454545;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .panel-tab {
    padding: 8px 12px;
    color: #969696;
    border-bottom: 2px solid transparent;
  }
  .panel-tab.active {
    color: #ffffff;
    border-bottom-color: #007acc;
  }
  .panel-body { padding: 12px 16px; }
  .quickpick-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 80px;
  }
  .quickpick {
    width: 600px;
    background: #252526;
    border: 1px solid #454545;
    border-radius: 6px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    overflow: hidden;
  }
  .quickpick-input {
    padding: 12px 16px;
    border-bottom: 1px solid #454545;
    color: #858585;
  }
  .quickpick-item {
    padding: 6px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .quickpick-item.selected { background: #04395e; }
  .quickpick-item .desc { color: #858585; margin-left: auto; font-size: 12px; }
  .walkthrough {
    flex: 1;
    display: flex;
    background: #1e1e1e;
  }
  .walkthrough-steps {
    width: 220px;
    background: #252526;
    border-right: 1px solid #454545;
    padding: 16px 0;
  }
  .step {
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #969696;
  }
  .step.active { color: #ffffff; background: #37373d; }
  .step.done { color: #89d185; }
  .walkthrough-content {
    flex: 1;
    padding: 32px 40px;
  }
  .walkthrough-content h1 { font-size: 26px; font-weight: 400; margin-bottom: 12px; }
  .walkthrough-content p { color: #cccccc; line-height: 1.6; margin-bottom: 16px; max-width: 520px; }
  .btn {
    display: inline-block;
    background: #0e639c;
    color: #ffffff;
    padding: 6px 14px;
    border-radius: 2px;
    font-size: 13px;
    margin-right: 8px;
  }
  .webview {
    flex: 1;
    padding: 32px 48px;
    overflow: auto;
  }
  .webview h1 { font-size: 28px; font-weight: 600; margin-bottom: 8px; }
  .webview .subtitle { color: #858585; margin-bottom: 24px; }
  .details {
    background: #252526;
    border: 1px solid #454545;
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 8px;
  }
  .details summary { cursor: default; font-weight: 600; margin-bottom: 8px; }
  .details ul { padding-left: 20px; color: #cccccc; line-height: 1.7; }
  .details code {
    background: #1e1e1e;
    padding: 1px 6px;
    border-radius: 3px;
    font-family: 'SF Mono', Menlo, monospace;
    font-size: 12px;
  }
  .logo { width: 24px; height: 24px; background: #0a0a0a; border-radius: 4px; }
`;

const screens = {
  'sidebar-overview': `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${baseStyles}</style></head><body>
  <div class="window" style="height:520px">
    <div class="activity-bar">
      <div class="activity-icon">📁</div>
      <div class="activity-icon">🔍</div>
      <div class="activity-icon active"><div class="logo"></div></div>
    </div>
    <div class="sidebar">
      <div class="sidebar-header">
        <span>OpenCode</span>
        <div class="toolbar"><span>📖</span><span>⬇</span><span>▶</span><span>📁</span><span>⌘</span></div>
      </div>
      <div class="sidebar-body">
        <p>OpenCode is a CLI for AI-assisted software engineering tasks.</p>
        <a class="link">Show Walkthrough</a>
        <a class="link">Install CLI</a>
        <a class="link">Run Inline Prompt</a>
        <a class="link">Run on Project Files</a>
        <a class="link">Start Interactive Session</a>
        <a class="link">Create Agent</a>
        <a class="link">Agents Overview</a>
        <a class="link">Models Overview</a>
        <a class="link">CLI Help</a>
        <a class="link">Tips & Tricks</a>
      </div>
    </div>
    <div class="editor">
      <div class="tab-bar"><span class="tab active">extension.js</span><span class="tab">package.json</span></div>
      <div class="editor-area">// OpenCode Walkthrough extension</div>
      <div class="status-bar">
        <span class="status-item">⌘ OpenCode</span>
        <span class="status-item">🤖 Agents</span>
        <span style="margin-left:auto">main</span>
      </div>
    </div>
  </div></body></html>`,

  'sidebar-trees': `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${baseStyles}</style></head><body>
  <div class="window" style="height:520px">
    <div class="activity-bar"><div class="activity-icon active"><div class="logo"></div></div></div>
    <div class="sidebar">
      <div class="sidebar-header"><span>Agents</span><div class="toolbar"><span>↻</span><span>+</span></div></div>
      <div class="sidebar-body" style="padding-top:8px">
        <div class="tree-item"><span>🤖</span> code-reviewer <span class="tree-desc">subagent</span></div>
        <div class="tree-item"><span>🤖</span> test-writer <span class="tree-desc">primary</span></div>
        <div class="tree-item"><span>+</span> Create New Agent</div>
      </div>
      <div class="sidebar-header" style="border-top:1px solid #454545"><span>Models</span><div class="toolbar"><span>↻</span></div></div>
      <div class="sidebar-body" style="padding-top:8px">
        <div class="tree-item"><span>▸</span> anthropic</div>
        <div class="tree-item" style="padding-left:24px"><span>◇</span> claude-sonnet-4</div>
        <div class="tree-item" style="padding-left:24px"><span>◇</span> claude-haiku-4</div>
        <div class="tree-item"><span>▸</span> openai</div>
      </div>
    </div>
    <div class="editor"><div class="tab-bar"><span class="tab active">README.md</span></div><div class="editor-area"></div></div>
  </div></body></html>`,

  'panel-mcp-sessions': `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${baseStyles}</style></head><body>
  <div class="window" style="height:520px;flex-direction:column;display:flex">
    <div class="editor" style="flex:1"><div class="tab-bar"><span class="tab active">opencode.json</span></div><div class="editor-area">{ "model": "anthropic/claude-sonnet-4" }</div></div>
    <div class="panel">
      <div class="panel-tabs">
        <span class="panel-tab active">MCP Servers</span>
        <span class="panel-tab">Sessions</span>
      </div>
      <div class="panel-body">
        <div class="tree-item"><span>🔌</span> filesystem <span class="tree-desc">local tools</span></div>
        <div class="tree-item"><span>🔌</span> github <span class="tree-desc">API access</span></div>
        <div class="tree-item"><span>+</span> Add MCP Server</div>
      </div>
    </div>
  </div></body></html>`,

  'quick-pick': `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${baseStyles}</style></head><body>
  <div class="window" style="height:520px;position:relative">
    <div class="editor" style="filter:brightness(0.7)"><div class="tab-bar"><span class="tab active">extension.js</span></div><div class="editor-area"></div></div>
    <div class="quickpick-overlay">
      <div class="quickpick">
        <div class="quickpick-input">&gt; OpenCode actions…</div>
        <div class="quickpick-item selected"><span>📖</span> Show Walkthrough</div>
        <div class="quickpick-item"><span>💡</span> Tips & Tricks</div>
        <div class="quickpick-item"><span>▶</span> Run Inline Prompt</div>
        <div class="quickpick-item"><span>📁</span> Run on Project Files</div>
        <div class="quickpick-item"><span>⌘</span> Start Interactive</div>
        <div class="quickpick-item"><span>🤖</span> Create Agent</div>
        <div class="quickpick-item"><span>📊</span> Stats</div>
      </div>
    </div>
  </div></body></html>`,

  'walkthrough': `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${baseStyles}</style></head><body>
  <div class="window" style="height:520px">
    <div class="walkthrough">
      <div class="walkthrough-steps">
        <div class="step done">✓ Install OpenCode</div>
        <div class="step active">2 Run a Prompt</div>
        <div class="step">3 Start Interactive Mode</div>
        <div class="step">4 Create an Agent</div>
        <div class="step">5 Tips & Best Practices</div>
      </div>
      <div class="walkthrough-content">
        <h1>Run a Prompt</h1>
        <p>Pass a prompt directly to OpenCode without interactive mode — generate code, save output to a file, or run one-off tasks.</p>
        <span class="btn">Run Inline Prompt</span>
        <div style="margin-top:24px;padding:16px;background:#252526;border-radius:6px;font-family:monospace;font-size:12px;color:#ce9178">
          opencode run "write a hello world script in Python"
        </div>
      </div>
    </div>
  </div></body></html>`,

  'tips-webview': `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${baseStyles}</style></head><body>
  <div class="window" style="height:520px">
    <div class="webview">
      <h1>OpenCode Tips & Tricks</h1>
      <p class="subtitle">Use these tips to be productive with the OpenCode CLI.</p>
      <div class="details"><summary>Getting Started</summary>
        <ul><li>Install: <code>curl -fsSL https://opencode.ai/install | bash</code></li><li>Or npm: <code>npm install -g opencode-ai</code></li><li>Verify: <code>opencode --version</code></li></ul>
      </div>
      <div class="details"><summary>Keyboard Shortcuts</summary>
        <ul><li><code>⌘⌥O</code> — Show Actions</li><li><code>⌘⌥P</code> — Run on Project Files</li><li><code>⌘⌥T</code> — Start Interactive</li></ul>
      </div>
      <div class="details"><summary>Agents & MCP</summary>
        <ul><li>Create agents: <code>opencode agent create</code></li><li>Add MCP: <code>opencode mcp add</code></li></ul>
      </div>
    </div>
  </div></body></html>`,

  'run-on-project': `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${baseStyles}</style></head><body>
  <div class="window" style="height:520px;position:relative">
    <div class="editor" style="filter:brightness(0.7)"><div class="tab-bar"><span class="tab active">src/app.ts</span></div></div>
    <div class="quickpick-overlay">
      <div class="quickpick" style="width:480px">
        <div class="quickpick-input" style="color:#cccccc">What do you want OpenCode to do?</div>
        <div style="padding:8px 16px;color:#858585;font-size:12px">Running in opencodeCLI · main · 3 files selected</div>
        <div style="padding:12px 16px;border-top:1px solid #454545;color:#cccccc">Refactor these files to use async/await</div>
      </div>
    </div>
  </div></body></html>`,

  'run-inline-dialog': `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  ${baseStyles}
  .dialog-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: #1e1e1e;
  }
  .inline-dialog {
    width: 680px;
    background: #252526;
    border: 1px solid #454545;
    border-radius: 10px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.55);
    overflow: hidden;
  }
  .dialog-title {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 18px 12px;
    font-size: 13px;
    color: #cccccc;
    border-bottom: 1px solid #3a3a3a;
  }
  .dialog-title .breadcrumb { color: #858585; }
  .dialog-title .breadcrumb span { color: #cccccc; font-weight: 500; }
  .dialog-title .provider-badge {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    background: #1e1e1e;
    border: 1px solid #454545;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 12px;
    color: #cccccc;
  }
  .dialog-textarea {
    padding: 18px 18px 12px;
    min-height: 80px;
    color: #858585;
    font-size: 14px;
    line-height: 1.6;
  }
  .dialog-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-top: 1px solid #3a3a3a;
    font-size: 12px;
    color: #858585;
  }
  .footer-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 5px;
    border: 1px solid #454545;
    background: transparent;
    color: #cccccc;
    font-size: 12px;
    cursor: default;
  }
  .footer-btn .icon { font-size: 14px; opacity: 0.8; }
  .footer-right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 14px;
    color: #858585;
    font-size: 12px;
  }
  .footer-right span { display: flex; align-items: center; gap: 4px; }
  .submit-btn {
    width: 24px; height: 24px;
    background: #0e639c;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 14px;
    margin-left: 4px;
  }
  </style></head><body>
  <div class="dialog-wrapper">
    <div class="inline-dialog">
      <div class="dialog-title">
        <span class="breadcrumb">New session in <span>opencodeCLI</span> with</span>
        <div class="provider-badge">
          <span>🤖</span>
          <span>claude-sonnet-4</span>
          <span style="color:#858585">▾</span>
        </div>
      </div>
      <div class="dialog-textarea">Describe what you want to build…</div>
      <div class="dialog-footer">
        <div class="footer-btn"><span class="icon">＋</span></div>
        <div class="footer-btn"><span class="icon">⊙</span> Agent</div>
        <div class="footer-btn">Auto</div>
        <div class="footer-right">
          <span>⊘ Default Approvals</span>
          <span>⎇ Worktree</span>
          <span>⑂ master</span>
          <div class="submit-btn">↵</div>
        </div>
      </div>
    </div>
  </div></body></html>`,
};

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const [name, html] of Object.entries(screens)) {
    await page.setViewportSize({ width: 920, height: 540 });
    await page.setContent(html, { waitUntil: 'networkidle' });
    const outPath = path.join(OUT_DIR, `${name}.png`);
    await page.screenshot({ path: outPath, type: 'png' });
    console.log(`Wrote ${outPath}`);
  }

  await browser.close();
  console.log(`\nGenerated ${Object.keys(screens).length} screenshots in media/screenshots/`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
