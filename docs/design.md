# Design — muslim mod

Each feature's spec lives in its own file under `docs/features/`. This page is only the index and the shared principles.

| Feature | Command | Spec | Status |
| --- | --- | --- | --- |
| Thikr line | `/thikr` | [features/thikr.md](features/thikr.md) | 0.2.0 |
| Salah | `/salah` | [features/salah.md](features/salah.md) | 0.3.0 |
| Morning and evening athkar | `/athkar` | none yet | planned |

Cross-cutting issues: languages (#1), Arabic in terminals that don't shape (#3).

## Principles

- **Text only.** Claude's own font, size and colors. No drawing, so it works the same on Windows, macOS and Linux, in the terminal and the desktop app, and follows the theme and zoom.
- **Never translate or reword Claude's own text** (timer, token counts, hints). We only replace the words Claude lets a mod replace.
- **Authored religious text** with tashkeel, never generated at runtime.
- **Pure core, thin hooks.** Decisions are pure functions with unit tests; hooks only read `$`, call them, and draw.
- **Settings in `/config`** (`userConfig`); slash commands are shortcuts to the same settings.
