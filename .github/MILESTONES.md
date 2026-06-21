# Extension milestones

GitHub milestones for the OpenCode Walkthrough release train. View progress: **[Issues → Milestones](https://github.com/aadorian/opencodeCLI/milestones)**.

Full context: [ROADMAP.md](./ROADMAP.md)

---

## [v0.0.2 — Bug fix release](https://github.com/aadorian/opencodeCLI/milestone/1)

**Due:** 2026-07-15 · **Open issues:** 12

Ship fixes from exploratory testing before the next Marketplace publish.

| Issue | Title |
| --- | --- |
| [#1](https://github.com/aadorian/opencodeCLI/issues/1) | Run Inline Prompt runs diagnostics |
| [#3](https://github.com/aadorian/opencodeCLI/issues/3) | Webview codicons |
| [#4](https://github.com/aadorian/opencodeCLI/issues/4) | Install instructions inconsistent |
| [#5](https://github.com/aadorian/opencodeCLI/issues/5) | `opcode.enableExa` prefix |
| [#7](https://github.com/aadorian/opencodeCLI/issues/7) | Dead help activation event |
| [#11](https://github.com/aadorian/opencodeCLI/issues/11) | Sessions empty-state click |
| [#12](https://github.com/aadorian/opencodeCLI/issues/12) | Agents empty-state CTA |
| [#14](https://github.com/aadorian/opencodeCLI/issues/14) | Models Refresh command |
| [#15](https://github.com/aadorian/opencodeCLI/issues/15) | MCP list command mismatch |
| [#16](https://github.com/aadorian/opencodeCLI/issues/16) | Version sync package.json ↔ README |

**Open PRs:** [#35](https://github.com/aadorian/opencodeCLI/pull/35) (#14), [#39](https://github.com/aadorian/opencodeCLI/pull/39) (release)

---

## [v0.1.0 — UX & usage dashboard](https://github.com/aadorian/opencodeCLI/milestone/2)

**Due:** 2026-08-31 · **Open issues:** 13

Keyboard shortcuts, context menus, overview/help, and native **`opencode stats`** usage view ([#37](https://github.com/aadorian/opencodeCLI/issues/37)).

| Issue | Title |
| --- | --- |
| [#2](https://github.com/aadorian/opencodeCLI/issues/2) | Register keyboard shortcuts |
| [#6](https://github.com/aadorian/opencodeCLI/issues/6) | Panel rename (MCP + Sessions) |
| [#9](https://github.com/aadorian/opencodeCLI/issues/9) | Overview tree without provider |
| [#10](https://github.com/aadorian/opencodeCLI/issues/10) | Overview toolbar overcrowded |
| [#17](https://github.com/aadorian/opencodeCLI/issues/17) | Good first issues roadmap (living doc) |
| [#18](https://github.com/aadorian/opencodeCLI/issues/18) | Quick pick descriptions |
| [#19](https://github.com/aadorian/opencodeCLI/issues/19) | Explorer context menu |
| [#22](https://github.com/aadorian/opencodeCLI/issues/22) | Overview tree with CLI status |
| [#23](https://github.com/aadorian/opencodeCLI/issues/23) | Run selection with OpenCode |
| [#37](https://github.com/aadorian/opencodeCLI/issues/37) | **Usage & spend sidebar** |

**Open PRs:** [#38](https://github.com/aadorian/opencodeCLI/pull/38) (roadmap), [#36](https://github.com/aadorian/opencodeCLI/pull/36) (PR metadata), [#29](https://github.com/aadorian/opencodeCLI/pull/29) (CI)

---

## [v0.2.0 — Onboarding & sessions](https://github.com/aadorian/opencodeCLI/milestone/3)

**Due:** 2026-10-31 · **Open issues:** 7

Walkthrough expansion, config scaffolding, session resume.

| Issue | Title |
| --- | --- |
| [#8](https://github.com/aadorian/opencodeCLI/issues/8) | Session tree resume |
| [#20](https://github.com/aadorian/opencodeCLI/issues/20) | Walkthrough: Authentication |
| [#21](https://github.com/aadorian/opencodeCLI/issues/21) | Walkthrough: MCP servers |
| [#24](https://github.com/aadorian/opencodeCLI/issues/24) | Create `opencode.json` template |
| [#25](https://github.com/aadorian/opencodeCLI/issues/25) | Help sidebar view |
| [#26](https://github.com/aadorian/opencodeCLI/issues/26) | Windows/Linux shortcut hints |

**Open PRs:** [#34](https://github.com/aadorian/opencodeCLI/pull/34) (#21)

---

## [v0.3.0 — Harness foundations](https://github.com/aadorian/opencodeCLI/milestone/4)

**Due:** 2026-12-31 · **Open issues:** 4

Agent loop Phase 0–1 ([#31](https://github.com/aadorian/opencodeCLI/issues/31)) plus quality hardening.

| Issue | Title |
| --- | --- |
| [#13](https://github.com/aadorian/opencodeCLI/issues/13) | Tree loading / error states |
| [#27](https://github.com/aadorian/opencodeCLI/issues/27) | Integration tests |
| [#28](https://github.com/aadorian/opencodeCLI/issues/28) | Hide status bar when CLI missing |
| [#31](https://github.com/aadorian/opencodeCLI/issues/31) | Epic: Agent Loop harness |

---

## [v1.0.0 — Agent harness GA](https://github.com/aadorian/opencodeCLI/milestone/5)

**Due:** 2027-06-30 · **Target:** epic [#31](https://github.com/aadorian/opencodeCLI/issues/31) Phases 2–4

Stable in-editor agent loop: context assembler, tool adapter, chat UI, eval tests. Child issues will be filed under this milestone as Phase 2+ work begins.

---

## Closing a milestone

When all issues in a milestone are closed:

1. Tag and publish: `git tag v0.0.2 && git push origin v0.0.2`
2. Close the milestone in GitHub (**Issues → Milestones → Close**)
3. Update [ROADMAP.md](./ROADMAP.md) and [#17](https://github.com/aadorian/opencodeCLI/issues/17)
