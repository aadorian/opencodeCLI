# Troubleshooting & FAQ

Common issues when using the OpenCode Walkthrough extension with the integrated terminal, environment variables, and the agent harness.

---

## On this page

- [Quick diagnosis](#quick-diagnosis)
- [Troubleshooting matrix](#troubleshooting-matrix)
- [Environment variables](#environment-variables)
- [Terminal & shell issues](#terminal--shell-issues)
- [Agent harness](#agent-harness)
- [Install & PATH](#install--path)
- [Wiki & CI sync](#wiki--ci-sync)
- [Still stuck?](#still-stuck)

---

## Quick diagnosis

Run these in order:

1. **Command Palette** → **OpenCode: Show Actions** — confirms the extension activated.
2. Open a terminal in VS Code and run:

   ```bash
   opencode --version
   opencode auth ls
   ```

3. Open **Agent** sidebar — read the header line (health message).
4. **View → Output** → select **OpenCode Agent** for harness errors.

| Header / symptom | Likely cause | Jump to |
|------------------|--------------|---------|
| `OpenCode CLI is not installed` | `opencode` not on PATH | [Install & PATH](#install--path) |
| `no providers configured` | Auth not set up | [Matrix: Auth](#troubleshooting-matrix) |
| Command runs but env ignored | Manual terminal vs extension dispatch | [Environment variables](#environment-variables) |
| `curl \| bash` fails on Windows | Wrong install method | [Install & PATH](#install--path) |
| Agent stuck on `running` | CLI hang or spawn error | [Agent harness](#agent-harness) |
| Untrusted workspace warning | Workspace trust off | [Matrix: Trust](#troubleshooting-matrix) |

---

## Troubleshooting matrix

| Symptom | Probable cause | Fix |
|---------|----------------|-----|
| `opencode: command not found` in VS Code terminal | Install dir not on PATH; terminal started before install | Add install dir to PATH; restart VS Code; see [PATH](#install--path) |
| Extension health OK but terminal says not found | Different shell profile (Git Bash vs PowerShell) | Set **Terminal › Integrated › Default Profile**; open new terminal |
| `curl -fsSL … \| bash` fails on Windows | Bash pipe not available in default shell | Use `npm install -g opencode-ai` or [opencode.ai/download](https://opencode.ai/download) |
| Installed with npm but `opencode` missing | Global npm bin not on PATH | `npm config get prefix` → add `\bin` (Windows) or `/bin` (Unix) to PATH |
| `$OPENCODE_INSTALL_DIR` / custom install path | CLI installed outside default location | Export `OPENCODE_INSTALL_DIR` or add `$OPENCODE_INSTALL_DIR/bin` to PATH in shell profile |
| Settings `opencode.serverUsername` ignored in manual terminal | Env only prefixed by extension | Run via extension command, or export var yourself |
| PowerShell shows `export: term not recognized` | Unix syntax in PowerShell | Use extension commands (auto `$env:VAR=`) or set `$env:OPENCODE_*` manually |
| Semicolon command chain fails in cmd.exe | cmd ≠ PowerShell | Set default profile to PowerShell or Git Bash |
| `no providers configured` | No `opencode auth login` | **OpenCode: Auth Login** or `opencode auth login` |
| Agent panel empty / webview error | Untrusted workspace | Trust the folder: **Manage Workspace Trust** |
| Port 4096 already in use | Another `opencode serve` running | Kill old server or set `opencode.harness.serverUrl` to a free port |
| Sessions tree empty | No sessions yet or stale cache | Run a prompt; **Refresh** on Sessions toolbar |
| Hybrid tool never runs | Workspace untrusted or confirmation denied | Trust workspace; set `opencode.harness.toolConfirmation` to `smart` or `always` |
| Wiki push: repository not found | Wiki never initialized in browser | `npm run wiki:init` then `npm run wiki:push` |

---

## Environment variables

The extension maps VS Code settings under `opencode.*` to `OPENCODE_*` variables (see `lib/env.js`). They are applied in two ways:

| Mechanism | When it applies |
|-----------|-----------------|
| `buildTerminalCommand()` | **OpenCode: Install**, **Run Inline**, **Start Interactive**, **serve**, etc. — prepends `$env:VAR="…";` (Windows) or `export VAR="…" &&` (Unix) |
| `buildEnvObject()` | Harness `spawnCli()` / health checks — child process `env` |

### Mapped settings (reference)

| VS Code setting | Environment variable |
|-----------------|----------------------|
| `opencode.configPath` | `OPENCODE_CONFIG` |
| `opencode.configDir` | `OPENCODE_CONFIG_DIR` |
| `opencode.tuiConfigPath` | `OPENCODE_TUI_CONFIG` |
| `opencode.autoShare` | `OPENCODE_AUTO_SHARE` |
| `opencode.experimental.planMode` | `OPENCODE_EXPERIMENTAL_PLAN_MODE` |
| `opencode.experimental.backgroundSubagents` | `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS` |
| `opencode.serverUsername` / `serverPassword` | `OPENCODE_SERVER_USERNAME` / `OPENCODE_SERVER_PASSWORD` |
| *(full list)* | See `package.json` → `configuration.properties` |

### FAQ: Why is my env var missing?

**Q: I set `opencode.configPath` but `echo $OPENCODE_CONFIG` is empty in a terminal I opened myself.**

A: Extension-injected env applies only to commands sent through `sendToTerminal()` or harness spawns. For a manual terminal session, add the export to your shell profile or run the extension command again in that terminal.

**Q: Does the extension set `OPENCODE_INSTALL_DIR`?**

A: No. That variable comes from the [OpenCode install script](https://opencode.ai/install) when it installs outside standard paths. If the CLI works in a login shell but not in VS Code, add the install `bin` directory to PATH in your user environment and restart VS Code.

**Q: Boolean settings show as `"true"` / `"false"` strings.**

A: Expected — the CLI reads string env values.

**Q: Values with quotes break my PowerShell command.**

A: The extension escapes embedded `"` in values. Avoid unescaped quotes in settings.

---

## Terminal & shell issues

### How the extension builds terminal lines

```
Windows (PowerShell):  $env:OPENCODE_FOO="bar"; opencode run "prompt"
Unix (bash/zsh):       export OPENCODE_FOO="bar" && opencode run "prompt"
```

Platform is detected at extension runtime (`process.platform`), not from your terminal profile. If VS Code's **default profile** is PowerShell but you switched a tab to Git Bash, env syntax from a *previous* extension command may not match the active shell — open a fresh terminal or align your default profile.

### Recommended terminal profiles

| OS | Recommended default | Install command |
|----|---------------------|-----------------|
| Windows | PowerShell | `npm install -g opencode-ai` |
| macOS / Linux | bash or zsh | `curl -fsSL https://opencode.ai/install \| bash` |

### Reusing the `OpenCode` terminal

`sendToTerminal()` reuses `vscode.window.activeTerminal` or creates one named `OpenCode`. Stale env from an old session is rare because each send prepends fresh exports; if commands behave oddly, kill the terminal tab and rerun the extension command.

### `OpenCode Server` terminal

When `opencode.harness.autoStartServer` is true, the harness may create a separate **OpenCode Server** terminal. Do not close it mid-session if Agent chat uses `--attach`. Run **OpenCode: Start Server** manually if auto-start is off.

---

## Agent harness

| Issue | What to check |
|-------|----------------|
| No streaming text | Output channel for spawn errors; CLI supports `--format json` |
| Immediate `error` bubble | Auth, install, or untrusted workspace |
| `Agent loop is already running` | Wait for completion or **OpenCode: Cancel Agent** |
| Tool confirmation loop | `opencode.harness.toolConfirmation`: try `never` for read-only tasks (use with care) |
| Wrong context in replies | Toggle `opencode.harness.context.*`; enable `includeFileContents` only when needed |
| Session id not sticking | Resume via Sessions tree; confirm `--session` in Output log |

### Disable auto-start server (debugging)

```json
{
  "opencode.harness.autoStartServer": false
}
```

Run **OpenCode: Start Server** when you need `--attach`.

---

## Install & PATH

### Windows

1. `npm install -g opencode-ai` (no `sudo`).
2. Verify: `opencode --version` in the **same** terminal profile VS Code uses.
3. If not found: add `%APPDATA%\npm` (or `npm config get prefix`\`\bin`) to user PATH.
4. Reload VS Code window.

### macOS / Linux

1. Install script or `npm install -g opencode-ai`.
2. Install script may print a path — add to `~/.bashrc`, `~/.zshrc`, or `~/.profile`.
3. If using `OPENCODE_INSTALL_DIR`, ensure `$OPENCODE_INSTALL_DIR/bin` is on PATH.

### Extension install command

**OpenCode: Install CLI** runs the platform-appropriate command with env prefixes. On Windows it runs `npm install -g opencode-ai`, not `curl | bash`.

---

## Wiki & CI sync

| Error | Fix |
|-------|-----|
| `Wiki git repository is not provisioned yet` | Open [wiki _new](https://github.com/aadorian/opencodeCLI/wiki/_new), save **Home** once, retry `npm run wiki:push` |
| `wiki:init` needed | `npm run wiki:init` (browser sign-in) |
| CI Sync Wiki failed | Ensure `docs/**` committed; workflow runs on push to `master` |

---

## Still stuck?

1. [Open an issue](https://github.com/aadorian/opencodeCLI/issues) with:
   - OS and VS Code version
   - Default terminal profile
   - Output of `opencode --version` and `opencode auth ls` (redact secrets)
   - **OpenCode Agent** output channel excerpt
2. See [Practical Workflow Examples](./practical-workflow-examples.md) for expected UI behavior.
3. CLI reference: [opencode.ai/docs](https://opencode.ai/docs)
