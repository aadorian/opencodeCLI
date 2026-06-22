![Install OpenCode in the terminal](../media/walkthrough/install.svg)

OpenCode is an open source AI coding agent. Install it from [opencode.ai](https://opencode.ai).

## macOS / Linux

**Recommended install script:**

```bash
curl -fsSL https://opencode.ai/install | bash
```

**Or install with npm:**

```bash
npm install -g opencode-ai
```

## Windows

Use npm in PowerShell or Git Bash. Do **not** use `sudo` (it is not available on Windows).

**PowerShell:**

```powershell
npm install -g opencode-ai
```

**Or download the installer** from [opencode.ai/download](https://opencode.ai/download).

The npm package name is `opencode-ai`, not `opencode`. `OPENCODE_SERVER_USERNAME` is only for HTTP auth when running `opencode serve` or `opencode web` — it is not needed to install the CLI.

## Verify installation

```bash
opencode --version
```

See the full install guide at [opencode.ai/docs](https://opencode.ai/docs).
