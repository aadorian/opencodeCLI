# Changelog

## 0.0.5

- Add custom OpenCode agent definition with docs
- Redesign agent chat panel with Copilot-style welcome UI
- Add agent/model selectors and context file support to panel
- Add run-inline-dialog promo screenshot and screenshots CI job
- Fix shell escaping in run inline prompt and add uninstall command
- Fix error detection in auth ls health check output
- Fix missing uninstall walkthrough step and update test assertion

## 0.0.4

- Add full install flow with platform-specific method picker (curl script, Homebrew on macOS, npm)
- Enhance Install CLI command: shows upgrade/health-check options when already installed
- Remove sudo references from all install help text and commands
- Add `Check Version` command (`opencode --version`)
- Add `Check Health` command — surfaces auth status and actionable prompts
- Add `Auth Logout` command (`opencode auth logout`)
- Add `Remove MCP Server` command (`opencode mcp remove`)
- Add all new commands to Actions quick pick, CLI Help picker, view menus, and Help submenu
- Update install walkthrough with Homebrew section and auth next-steps
- Expand install tests: Homebrew constant, `getInstallOptions()` on all platforms

## 0.0.3

- Align install and setup with [opencode.ai](https://opencode.ai) (install script, `opencode-ai` npm package)
- Fix Run Inline Prompt to prompt for input and run `opencode run`
- Add Configure Providers walkthrough step with auth login
- Register documented keyboard shortcuts (`⌘⌥O/I/P/T/H/S`)
- Point install fallbacks to opencode.ai docs instead of GitHub
- Add manifest-synced integration tests for extension commands (thanks [@JhansiOruganti-43](https://github.com/JhansiOruganti-43), [#53](https://github.com/aadorian/opencodeCLI/pull/53))
- Add agents empty-state regression test ensuring Create Agent CTA (thanks [@kingrubic](https://github.com/kingrubic), [#52](https://github.com/aadorian/opencodeCLI/pull/52))

## 0.0.2

- Marketplace release under publisher `AlejandroAdorjan`
- Agent loop harness, sidebar views, and session resume
- Models tree refresh command

## 0.0.1

- Initial OpenCode Walkthrough extension with 5-step getting started walkthrough
