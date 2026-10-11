# Terminal Arabic check — feature design

Shared mode behavior and persistence are defined in the [terminal Arabic guide](../terminal.md). This spec covers the feature's visible surface only.

- **Surface:** terminal `AbovePrompt`; return existing prompt rows alongside the survey.
- **Header:** `muslim` in Claude color, followed by the dim question ` · Which line reads correctly in this terminal?`.
- **Rows:** one vertical plain Button per choice, with its digit hotkey; Arabic samples are `Text` children. The choices follow the fixed order in the shared guide.
- **Hint:** dim `Press 1–5`.
- **Desktop:** no survey; `/muslim terminal-arabic` replies that the check is terminal-only.

Visual and command checks live in [arabic-fix.md](arabic-fix.md). Shared terminal behavior lives only in [docs/terminal.md](../terminal.md).
