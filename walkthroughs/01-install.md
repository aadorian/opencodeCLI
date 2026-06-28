![Install OpenCode in the terminal](../media/walkthrough/install.svg)

OpenCode is an open source AI coding agent. Install it from [opencode.ai](https://opencode.ai).

## macOS / Linux

**Recommended — official install script:**

```bash
curl -fsSL https://opencode.ai/install | bash
```

**Homebrew (macOS):**

```bash
brew install opencode
```

**npm (any platform with Node.js):**

```bash
npm install -g opencode-ai
```

## Windows

Use npm in PowerShell or Git Bash:

```powershell
npm install -g opencode-ai
```

Or download the installer from [opencode.ai/download](https://opencode.ai/download).

The npm package name is `opencode-ai` (not `opencode`).

## Verify installation

```bash
opencode --version
```

## Next steps

After installing, authenticate with a provider:

```bash
opencode auth login
```

See the full install guide at [opencode.ai/docs](https://opencode.ai/docs).
