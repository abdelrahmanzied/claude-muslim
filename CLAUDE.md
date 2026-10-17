# claude-muslim

Claude Code mod (function-hooks plugin). Plugin name is `muslim` — Claude Code reserves names starting with `claude-`; the repo name `claude-muslim` is fine.

## Layout

Only `plugin/` is installed (`.claude-plugin/marketplace.json` has `source: "./plugin"`; users add the marketplace with `--sparse .claude-plugin plugin`). It holds `.claude-plugin/plugin.json`, `hooks/`, `src/`, `types/`, `tests/`, `README.md` and `LICENSE` (an exact copy of the root one; `npm run check` compares them). Tests live in `plugin/tests/` and ship with the plugin: Claude Code never runs them, and `claude plugin test plugin` only scans its own folder. `docs/`, `scripts/`, `.githooks/` and the root dev files (these docs, `package.json`, `tsconfig.json`) stay out of the install. Anything the mod reads at runtime (fonts, images, data) must be inside `plugin/`.

## Rules

- Read `DESIGN.md` before designing or changing any feature; follow its shared principles, surfaces, colors and checklist, and its feature index.
- Keep the design system current: any change to a shared design rule (surfaces, colors, type scale, icons, card shell, pane chrome, folding, input) updates `DESIGN.md` or `docs/desktop/pane-design.md` in the same commit, in the one place that owns it; feature design docs point there instead of repeating it.

- Each feature has a folder `docs/features/<feature>/` mirroring `plugin/src/features/<feature>/`: its spec in `<feature>.md` and its design in `<feature>-design.md`. Read both before working on that feature, and update them in the same commit as any change to the feature. A new feature gets both files and a row in DESIGN.md's feature index. Platform docs that are not features (terminal, later desktop) live in `docs/<platform>/` with `<platform>-<topic>.md` names.

- Always load the `/plugin-authoring` skill before building or changing any mod code (hooks, renders, commands, tests). It writes this build's API types and is the source of truth for the mod API; never write mod code from memory.
- Mod API sources, always both: the `/plugin-authoring` skill (with the engine-written types in `plugin/.claude-plugin/types/claude-code/index.d.ts`, written on load) and the official docs at https://code.claude.com/docs/en/plugins (mod API: https://code.claude.com/docs/en/plugins/mods/api). Check both before designing or changing mod code, and before stating what the API can or cannot do.
- Develop in a hot-reload session: the session's dev-mods link (`~/.claude/dev-mods/<session-id>/muslim`) points at this repo's `plugin/` folder, so edits reload the mod when a turn ends.
- To test a real install: `claude plugin marketplace add <owner/repo#branch> --sparse .claude-plugin plugin`, then `claude plugin install muslim@claude-muslim`, and check the plugin cache holds only `plugin/` contents. (`--sparse` is Claude Code's own flag, git sparse checkout, github/git sources only.) See `CONTRIBUTING.md`.
- Hooks module runs with no DOM and no Node. Reach everything through `$`. No `import()`, no `require`.
- `plugin/hooks/register.tsx` is the only entry. Each feature goes in `plugin/src/features/<feature>/`, exports `install(on, options)` from `install.ts(x)`, and is imported by name and called in `register`. The engine only allows passing `on` to functions imported from the mod's own files — no arrays/registries of features.
- Code used by more than one feature lives in `plugin/src/shared/<topic>/` (tests in `plugin/tests/shared/<topic>/`), never imported from another feature's folder.
- One `session.start` hook per module: all slash commands are registered in `register.tsx`; each feature answers its own `command.run`.
- `$` may only be passed to functions declared at the top level of the same file.
- Pure logic (no `$`) lives beside `install` in the feature folder and gets plain unit tests.
- Every command, subcommand and option a user can type is listed in its feature's `/<feature> help` table (`plugin/src/features/<feature>/help.ts`, and `plugin/src/help.ts` for `/muslim`), with its help test, in the same commit that adds or changes it. A name is the same everywhere: command word, code key and docs (e.g. `after-salah` / `afterSalah`).
- Use string literals (not constants) for command names in `$.command.register` and `command.run` matchers, so `claude plugin validate` recognises the hook as answering its own command.
- Settings are `userConfig` fields in `plugin.json` (shown in `/config`); commands change them with `$.config.set({ key: 'muslim.<field>' })`, which reloads the module. Read them through `plugin/src/config.ts`.
- Visual means are decided per feature in `docs/features/<feature>/<feature>-design.md` and nowhere else (thikr: text only, see `docs/features/thikr/thikr-design.md`; athkar: a drawn reader, see `docs/features/athkar/athkar-design.md`; salah: text plus a richer athan moment, see `docs/features/salah/salah-design.md`). Shared desktop cards above the prompt use `plugin/src/shared/card/` for their shell and input. Shared: main-color accents use `plugin/src/shared/color/` and the plugin-wide `color` setting (`claude` theme key for orange text, light/dark hex for other choices); other text colors use theme keys; everything must work the same on Windows, macOS and Linux, terminal and desktop, with a terminal text fallback for any desktop-only richer surface.
- Religious text is authored data with tashkeel; never generated. Display may strip tashkeel, never change words.
- Each feature's shown religious text is listed in `docs/features/<feature>/<feature>-content.md` with count and source. Any change to that content in code updates that file in the same commit, and any change made in the file is applied to the code in the same commit. A new feature that shows religious text gets one.
- Every feature's Arabic shown on a terminal goes through `plugin/src/shared/arabic` (see `docs/terminal/terminal-arabic.md`); never shape or reorder Arabic elsewhere. Terminal only: on desktop and every other surface the Arabic is left exactly as authored, and the check is never shown.
- Every value kept in `$.state` is declared in `plugin/types/index.d.ts` under `PluginState['muslim']`. The contract exports types only.
- Every feature gets tests in `plugin/tests/<feature>/` (`.tsx` when a test uses JSX).
- Quran's demo is deferred to a separate task; the shared sequence currently excludes Quran. Every other feature ships its own demo subcommand and `plugin/src/features/<feature>/demo.ts`: pure scenes and timing, no `$`, with plain unit tests. The small engine runner stays in that feature's `install.ts(x)` with its atoms; demos only drive drawing and never change settings, the store or saved state. Salah uses `/salah demo` for fixed Fajr at 05:00; `/salah athan` accepts only `on` · `off`. The shared `/muslim demo` plays thikr, athkar and `/salah demo` (the athan moment) in order, waiting for each to finish; its pure sequence lives in `plugin/src/demo.ts` and its marked runner blocks in `plugin/hooks/register.tsx`; transient signals in `plugin/src/shared/demo/signal.ts` connect feature-local starters without self-command dispatch (see DESIGN.md §8).
- Never change the version on your own. Every change adds a note under `## Unreleased` in `CHANGELOG.md`; branches never bump. The version changes only when the user asks for a release, on main: ask the user to confirm the number first (a main feature raises the middle number 0.x.0, a fix or small change the right number 0.x.y, never the left number for now), then update `plugin/.claude-plugin/plugin.json` and `plugin/src/constants.ts`, rename `## Unreleased` to the version, tag `vX.Y.Z` and publish a GitHub release with those notes.
- Commits, PRs and issues use `me@abdelrahman.ai`; never a personal Gmail.

## Before committing

```bash
npm run check
```

It runs a `LICENSE` / `plugin/LICENSE` equality check, `claude plugin validate .` and `claude plugin validate plugin`, `claude plugin test plugin` and `tsc -p .` (TypeScript is a dev dependency: `npm install` once). The pre-push hook runs it too; enable it once per clone with `git config core.hooksPath .githooks`. No CI: the API types `tsc` needs are written only when Claude Code loads the mod.

API reference: `plugin/.claude-plugin/types/claude-code/index.d.ts` (written by Claude Code on load; grep for the event or noun).
