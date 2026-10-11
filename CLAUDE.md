# claude-muslim

Claude Code mod (function-hooks plugin). Plugin name is `muslim` — Claude Code reserves names starting with `claude-`; the repo name `claude-muslim` is fine.

## Rules

- Read `DESIGN.md` before designing or changing any feature; follow its principles, surfaces, colors and checklist.

- Always load the `/plugin-authoring` skill before building or changing any mod code (hooks, renders, commands, tests). It writes this build's API types and is the source of truth for the mod API; never write mod code from memory.
- Hooks module runs with no DOM and no Node. Reach everything through `$`. No `import()`, no `require`.
- `hooks/register.tsx` is the only entry. Each feature goes in `src/features/<feature>/`, exports `install(on, options)` from `install.ts(x)`, and is imported by name and called in `register`. The engine only allows passing `on` to functions imported from the mod's own files — no arrays/registries of features.
- One `session.start` hook per module: all slash commands are registered in `register.tsx`; each feature answers its own `command.run`.
- `$` may only be passed to functions declared at the top level of the same file.
- Pure logic (no `$`) lives beside `install` in the feature folder and gets plain unit tests.
- Use string literals (not constants) for command names in `$.command.register` and `command.run` matchers, so `claude plugin validate` recognises the hook as answering its own command.
- Settings are `userConfig` fields in `plugin.json` (shown in `/config`); commands change them with `$.config.set({ key: 'muslim.<field>' })`, which reloads the module. Read them through `src/config.ts`.
- Text only: use Claude's own font, size and colors (theme keys like `color="claude"`). No drawing (SVG/images) — it must work the same on Windows, macOS and Linux, terminal and desktop.
- Religious text is authored data with tashkeel; never generated. Display may strip tashkeel, never change words.
- Every feature's Arabic shown on a terminal goes through `src/shared/arabic` (see `docs/terminal.md`); never shape or reorder Arabic elsewhere.
- Every value kept in `$.state` is declared in `types/index.d.ts` under `PluginState['muslim']`. The contract exports types only.
- Every feature gets tests in `tests/<feature>/` (`.tsx` when a test uses JSX).
- Bump `version` in both `.claude-plugin/plugin.json` and `src/constants.ts`, and note it in `CHANGELOG.md`.
- Commits, PRs and issues use `me@abdelrahman.ai`; never a personal Gmail.

## Before committing

```bash
claude plugin validate .
claude plugin test .
npx tsc -p .
```

API reference: `.claude-plugin/types/claude-code/index.d.ts` (written by Claude Code on load; grep for the event or noun).
