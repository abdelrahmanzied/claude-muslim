# Terminal Arabic check — feature design

Shared mode behavior and persistence are defined in the [terminal Arabic guide](../../terminal.md). This spec covers the feature's visible surface only.

- **Surface:** terminal `AbovePrompt`; return existing prompt rows alongside the survey.
- **Header:** `muslim` in the shared main color (`/muslim color`, default Claude orange), followed by ` · Terminal Arabic Setup · Which word is written correctly?`, then a dim hint line `Some terminals break Arabic letters apart or reverse them — pick the one you can read.`.
- **Rows:** one vertical plain Button per choice, with its digit hotkey; Arabic samples are `Text` children. The choices follow the fixed three-mode order in the shared guide.
- **Hint:** dim `Press 1–3`.
- **Desktop:** no survey; `/muslim terminal-arabic` replies that the check is terminal-only.

Visual and command checks live in [arabic-fix spec](spec.md). Shared terminal behavior lives only in [docs/terminal.md](../../terminal.md).
