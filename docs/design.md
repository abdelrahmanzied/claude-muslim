# Design — muslim mod

Each feature has a spec (`docs/features/<feature>.md`) and a design (`docs/features/<feature>-design.md`). This page is a short index. [DESIGN.md](../DESIGN.md) is the main entry: shared base, surfaces, colors and checklist.

| Feature | Command | Spec | Design | Status |
| --- | --- | --- | --- | --- |
| Thikr line | `/thikr` | [features/thikr.md](features/thikr.md) | [features/thikr-design.md](features/thikr-design.md) | 0.2.0 |
| Salah | `/salah` | [features/salah.md](features/salah.md) | [features/salah-design.md](features/salah-design.md) | Unreleased |
| Morning and evening athkar | `/athkar` | in progress in another branch | in progress | planned |

Cross-cutting issues: languages (#1), Arabic in terminals that don't shape (#3; see the [terminal Arabic guide](terminal.md)).

## Shared principles (summary)

- **Never translate or reword Claude's own text** (timer, token counts, hints). We only replace the words Claude lets a mod replace.
- **Authored religious text** with tashkeel, never generated at runtime.
- **Pure core, thin hooks.** Decisions are pure functions with unit tests; hooks only read `$`, call them, and draw.
- **Settings in `/config`** (`userConfig`); slash commands are shortcuts to the same settings.
