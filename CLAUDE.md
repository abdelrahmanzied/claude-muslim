# claude-muslim

Claude Code mod (function-hooks plugin). Plugin name is `muslim` — Claude Code reserves names starting with `claude-`; the repo name `claude-muslim` is fine.

## Rules

- Read `DESIGN.md` before designing or changing any feature; follow its shared principles, surfaces, colors and checklist, and its feature index.

- Each feature's spec lives in `docs/features/<feature>.md` and its design in `docs/features/<feature>-design.md`. Read both before working on that feature, and update them in the same commit as any change to the feature. A new feature gets both files and a row in DESIGN.md's feature index.

- Always load the `/plugin-authoring` skill before building or changing any mod code (hooks, renders, commands, tests). It writes this build's API types and is the source of truth for the mod API; never write mod code from memory.
- Hooks module runs with no DOM and no Node. Reach everything through `$`. No `import()`, no `require`.
- `hooks/register.tsx` is the only entry. Each feature goes in `src/features/<feature>/`, exports `install(on, options)` from `install.ts(x)`, and is imported by name and called in `register`. The engine only allows passing `on` to functions imported from the mod's own files — no arrays/registries of features.
- Code used by more than one feature lives in `src/shared/<topic>/` (tests in `tests/shared/<topic>/`), never imported from another feature's folder.
- One `session.start` hook per module: all slash commands are registered in `register.tsx`; each feature answers its own `command.run`.
- `$` may only be passed to functions declared at the top level of the same file.
- Pure logic (no `$`) lives beside `install` in the feature folder and gets plain unit tests.
- Use string literals (not constants) for command names in `$.command.register` and `command.run` matchers, so `claude plugin validate` recognises the hook as answering its own command.
- Settings are `userConfig` fields in `plugin.json` (shown in `/config`); commands change them with `$.config.set({ key: 'muslim.<field>' })`, which reloads the module. Read them through `src/config.ts`.
- Visual means are decided per feature in `docs/features/<feature>-design.md` and nowhere else (thikr: text only, see `thikr-design.md`; athkar: a drawn reader, see `athkar-design.md`; salah: text plus a richer athan moment, see `salah-design.md`). Shared desktop cards above the prompt use `src/shared/card/` for their shell and input. Shared: main-color accents use `src/shared/color/` and the plugin-wide `color` setting (`claude` theme key for orange text, light/dark hex for other choices); other text colors use theme keys; everything must work the same on Windows, macOS and Linux, terminal and desktop, with a terminal text fallback for any desktop-only richer surface.
- Religious text is authored data with tashkeel; never generated. Display may strip tashkeel, never change words.
- Every feature's Arabic shown on a terminal goes through `src/shared/arabic` (see `docs/terminal.md`); never shape or reorder Arabic elsewhere. Terminal only: on desktop and every other surface the Arabic is left exactly as authored, and the check is never shown.
- Every value kept in `$.state` is declared in `types/index.d.ts` under `PluginState['muslim']`. The contract exports types only.
- Every feature gets tests in `tests/<feature>/` (`.tsx` when a test uses JSX).
- Every feature ships its own demo subcommand and `src/features/<feature>/demo.ts`: pure scenes and timing, no `$`, with plain unit tests. The small engine runner stays in that feature's `install.ts(x)` with its atoms; demos only drive drawing and never change settings, the store or saved state. Salah uses `/salah demo` for fixed Fajr at 05:00; `/salah athan` accepts only `on` · `off`. The shared `/muslim demo` plays thikr, athkar and `/salah demo` (the athan moment) in order, waiting for each to finish; its pure sequence lives in `src/demo.ts` and its marked runner blocks in `hooks/register.tsx`; transient signals in `src/shared/demo/signal.ts` connect feature-local starters without self-command dispatch (see DESIGN.md §8).
- Never change the version on your own. Every change adds a note under `## Unreleased` in `CHANGELOG.md`; branches never bump. The version changes only when the user asks for a release, on main: ask the user to confirm the number first (a main feature raises the middle number 0.x.0, a fix or small change the right number 0.x.y, never the left number for now), then update `.claude-plugin/plugin.json` and `src/constants.ts`, rename `## Unreleased` to the version, tag `vX.Y.Z` and publish a GitHub release with those notes.
- Commits, PRs and issues use `me@abdelrahman.ai`; never a personal Gmail.

## Before committing

```bash
npm run check
```

It runs `claude plugin validate .`, `claude plugin test .` and `tsc -p .` (TypeScript is a dev dependency: `npm install` once). The pre-push hook runs it too; enable it once per clone with `git config core.hooksPath .githooks`. No CI: the API types `tsc` needs are written only when Claude Code loads the mod.

API reference: `.claude-plugin/types/claude-code/index.d.ts` (written by Claude Code on load; grep for the event or noun).
