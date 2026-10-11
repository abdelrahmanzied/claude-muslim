# Terminal Arabic feature checks

The shared terminal Arabic behavior, storage, defaults, reset steps, and limitations are documented in the [terminal Arabic guide](../terminal.md). This page keeps checks specific to the `/muslim terminal-arabic` feature.

## AbovePrompt check

- The label reads `muslim · Which line reads correctly in this terminal?`.
- Five vertical plain Button rows use hotkeys 1–5; each Arabic sample is a `Text` child, and the hint reads `Press 1–5`.
- The picker preserves the rest of the AbovePrompt band and waits while another survey is active.
- Selecting a row hides the picker; `/muslim terminal-arabic` opens it again for the active terminal.
- Desktop shows no picker and replies that the check is terminal-only.

The sample strings, mode order, terminal defaults, and persistence rules belong to [docs/terminal.md](../terminal.md), the single cross-feature reference.
