# Installing OpenCode

Install the [OpenCode](https://opencode.ai) CLI so the **OpenCode Walkthrough** VS Code extension can dispatch commands, run the agent harness, and open interactive sessions.

Official reference: [opencode.ai/docs](https://opencode.ai/docs) · [opencode.ai/download](https://opencode.ai/download)

---

## On this page

- [Prerequisites](#prerequisites)
- [Quick install](#quick-install)
- [Install by platform](#install-by-platform)
- [Verify installation](#verify-installation)
- [Configure providers](#configure-providers)
- [Initialize a project](#initialize-a-project)
- [Use with this extension](#use-with-this-extension)
- [Related articles](#related-articles)

---

## Prerequisites

1. A modern terminal (WezTerm, Alacritty, Ghostty, Kitty, or VS Code’s integrated terminal).
2. API keys or accounts for the LLM providers you plan to use (or [OpenCode Zen](https://opencode.ai/docs) via `/connect`).

On **Windows**, the OpenCode team [recommends WSL](https://opencode.ai/docs) for the best terminal experience. Native Windows installs work via npm, Scoop, Chocolatey, or the [Windows x64 installer](https://opencode.ai/download).

---

## Quick install

### macOS / Linux (recommended)

```bash
curl -fsSL https://opencode.ai/install | bash
```

### All platforms (Node.js)

```bash
npm install -g opencode-ai
```

> The npm package name is **`opencode-ai`**, not `opencode`.

Then verify:

```bash
opencode --version
```

---

## Install by platform

| Platform | Command / link |
|----------|----------------|
| **Install script** (macOS / Linux) | `curl -fsSL https://opencode.ai/install \| bash` |
| **npm** | `npm install -g opencode-ai` |
| **Bun** | `bun install -g opencode-ai` |
| **pnpm** | `pnpm install -g opencode-ai` |
| **Yarn** | `yarn global add opencode-ai` |
| **Homebrew** (macOS / Linux) | `brew install anomalyco/tap/opencode` |
| **Arch Linux** | `sudo pacman -S opencode` or `paru -S opencode-bin` |
| **Windows — npm** | `npm install -g opencode-ai` |
| **Windows — Scoop** | `scoop install opencode` |
| **Windows — Chocolatey** | `choco install opencode` |
| **Windows — Mise** | `mise use -g github:anomalyco/opencode` |
| **Windows — installer** | [Download x64](https://opencode.ai/download) |
| **Docker** | `docker run -it --rm ghcr.io/anomalyco/opencode` |
| **GitHub Releases** | [github.com/anomalyco/opencode/releases](https://github.com/anomalyco/opencode/releases) |

### Windows notes

- Do **not** use `sudo` in PowerShell — it is not available on Windows.
- If `opencode` is not found after `npm install -g opencode-ai`, add your global npm `bin` folder to PATH (often `%APPDATA%\npm`).
- From the extension: run **OpenCode: Install CLI** — on Windows it runs `npm install -g opencode-ai` with your `opencode.*` env settings prefixed.

See [Troubleshooting](./troubleshooting.md) for PATH, shell, and env-var issues.

---

## Verify installation

```bash
opencode --version
```

Expected: a version string (e.g. `1.17.9`).

Check configured providers:

```bash
opencode auth ls
```

If you see **0 credentials**, continue to [Configure providers](#configure-providers).

---

## Configure providers

OpenCode supports many LLM providers. You need at least one before running prompts.

### Option A — OpenCode Zen (recommended for new users)

1. Start interactive mode: `opencode`
2. Run `/connect`, select **opencode**, and open [opencode.ai/auth](https://opencode.ai/auth)
3. Sign in, add billing, copy your API key, and paste it in the TUI

### Option B — CLI auth

```bash
opencode auth login
```

Or from VS Code: **OpenCode: Auth Login** (Command Palette).

Full provider list: [opencode.ai/docs — Providers](https://opencode.ai/docs)

---

## Initialize a project

In your project directory:

```bash
cd /path/to/your/project
opencode
```

Inside the TUI:

```
/init
```

OpenCode analyzes the repo and creates `AGENTS.md` at the project root. Commit that file to Git so agents understand your project structure and conventions.

---

## Use with this extension

After the CLI is installed and authenticated:

| Step | Action |
|------|--------|
| 1 | Install the [OpenCode Walkthrough](https://marketplace.visualstudio.com/items?itemName=AlejandroAdorjan.opencode-walkthrough) extension (or run `npm run run` from this repo) |
| 2 | Open a **trusted** workspace folder |
| 3 | Open the **OpenCode** activity bar → run **Show Walkthrough** or **Start Agent Session** |
| 4 | Optional: set `opencode.*` settings in VS Code — they map to `OPENCODE_*` env vars when commands run in the terminal |

Local development of this extension:

```bash
git clone https://github.com/aadorian/opencodeCLI.git
cd opencodeCLI
npm install
npm run run
```

---

## Related articles

- [Troubleshooting & FAQ](./troubleshooting.md) — PATH, env vars, terminal shells
- [Practical Workflow Examples](./practical-workflow-examples.md) — agent sidebar, sessions, plan → build
- [Building the OpenCode Agent Harness](./building-opencode-agent-harness.md) — architecture
- [OpenCode docs — Intro](https://opencode.ai/docs)
- [OpenCode docs — Windows](https://opencode.ai/docs/windows/)
- [OpenCode download page](https://opencode.ai/download)
