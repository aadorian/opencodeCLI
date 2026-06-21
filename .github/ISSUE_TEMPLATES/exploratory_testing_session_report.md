---
name: Exploratory Testing Session Report
about: Document findings from an exploratory testing session of the OpenCode Walkthrough extension
title: "Exploratory Testing: [Feature/Functionality Name]"
labels: testing
assignees: ""
---

## Exploratory Testing Session Report

**Session Title:** [Feature/Functionality Name]

**Date:** [DD/MM/YYYY]

**Tester(s):** [Name(s)]

**Test Environment:**
- VS Code version:
- Extension version:
- OpenCode CLI version (if installed):
- OS:
- Device:

**Testing Scope:** [What are you testing?]

Examples for this extension:
- Walkthrough (5 steps: Install, Run Inline, Interactive, Create Agent, Tips)
- Sidebar views (Overview, Agents, Models)
- Panel views (MCP Servers, Sessions)
- Status bar actions (OpenCode, Agents)
- Quick pick menus (Show Actions, CLI Help)
- Terminal command routing and env var exports
- Run on Project Files flow
- Webview panels (Tips, Agents Overview, Models Overview)
- Settings → OpenCode configuration
- Explorer context menu and Help menu integration
- Keyboard shortcuts (`⌘⌥O`, `⌘⌥I`, `⌘⌥P`, `⌘⌥T`, `⌘⌥H`, `⌘⌥S`)

**Test Objectives:** [What do you aim to achieve?]

---

## Observations & Findings

| Step | Action Taken | Expected Result | Actual Result | Notes/Issues |
|------|--------------|-----------------|---------------|--------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

---

## Defects Found

- **Issue #1:** [Short description] ([Link to bug tracker](#))
- **Issue #2:** [Short description] ([Link to bug tracker](#))

_No defects found during this session._

---

## Additional Notes & Suggestions

[General feedback on the functionality, usability, and further areas to explore]

**Suggested follow-up areas:**
- Untrusted / virtual workspace behavior
- Extension behavior when OpenCode CLI is not installed
- Tree view refresh with live CLI data (agents, MCP, models, sessions)
- Multi-root workspace and folder selection flows
- Settings that map to `OPENCODE_*` environment variables
