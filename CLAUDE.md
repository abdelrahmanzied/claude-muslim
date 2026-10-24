# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# claude-muslim

Claude Code mod (function-hooks plugin). Plugin name is `muslim` — Claude Code reserves names starting with `claude-`; the repo name `claude-muslim` is fine.

## Layout

Only `plugin/` is installed (`.claude-plugin/marketplace.json` has `source: "./plugin"`; users add the marketplace with `--sparse .claude-plugin plugin`). It holds `.claude-plugin/plugin.json`, `hooks/`, `src/`, `types/`, `tests/`, `README.md` and `LICENSE` (an exact copy of the root one; `npm run check` compares them). Tests live in `plugin/tests/` and ship with the plugin: Claude Code never runs them, and `claude plugin test plugin` only scans its own folder. `docs/`, `scripts/`, `.githooks/` and the root dev files (these docs, `package.json`, `tsconfig.json`) stay out of the install. Anything the mod reads at runtime (fonts, images, data) must be inside `plugin/`.

## Architecture

- `plugin/hooks/register.tsx` is the one hooks module. It registers every slash command in its single `session.start` hook, answers the `/muslim` commands itself (status table, `help`, `color`, `tashkeel`, `terminal-arabic`, `update`, `autoupdate`, `feedback`, `demo`), and calls each feature's `install(on, options)`: thikr, athkar, salah, quran, muslim-pane.
- `/muslim`'s own pure logic sits at the root of `plugin/src/`: `help.ts`, `table.ts`, `update.ts`, `autoupdate.ts`, `feedback.ts`, `demo.ts` (the shared demo order), `config.ts` (reads `userConfig`), `constants.ts` (name, version).
- Each feature folder pairs an `install.tsx` (hooks, atoms, the engine runner; the only place `$` is used) with pure modules (logic, data, models, SVG/HTML builders, `demo.ts`, `help.ts`) that tests import directly.
- Desktop pictures are Client modules that draw a model the hooks build: the Muslim pane (`muslim-pane/client.tsx`), the athkar reader (`athkar/reader.tsx`, `card.tsx`) and the athan card (`salah/athan-card.tsx`). The terminal gets its own fallback: text, or the athkar frame.
- Features never import each other. Cross-feature links are transient module signals in `plugin/src/shared/`: `panel/signal.ts` (each feature connects what the Muslim pane shows and what it may start; the pane only calls them), `demo/signal.ts` (the shared demo starts each feature's demo). Shared pure helpers: `pray/` (prayer-day bounds, names, the prayer line), `card/` (card shell and input), `color/`, `arabic/` (terminal shaping), `font/`, `icon/`, `picker/`, `scroll/`, `quran-avatar/`, and per-topic data such as `athkar/` and `thikr/`.
- Runtime assets the mod reads (fonts, the athan photo, the Quran player catalog and reciter support table) live inside `plugin/src/features/<feature>/`. `scripts/quran/support.ts` is a dev-only Node 24 tool that regenerates `plugin/src/features/quran/reciter-support.ts` and `catalog-data.ts` beside it (see `docs/features/quran/quran-catalog.md`).

## Rules

- Read `DESIGN.md` before designing or changing any feature; follow its shared principles, surfaces, colors and checklist, and its feature index.
- Keep the design system current: any change to a shared design rule (surfaces, colors, type scale, icons, card shell, pane chrome, folding, input) updates `DESIGN.md` or `docs/desktop/pane-design.md` in the same commit, in the one place that owns it; feature design docs point there instead of repeating it.

- Each feature has a folder `docs/features/<feature>/` mirroring `plugin/src/features/<feature>/`: its spec in `<feature>.md` and its design in `<feature>-design.md`. Read both before working on that feature, and update them in the same commit as any change to the feature. A new feature gets both files and a row in DESIGN.md's feature index. Platform docs that are not features (terminal, later desktop) live in `docs/<platform>/` with `<platform>-<topic>.md` names.

- Always load the `/plugin-authoring` skill before building or changing any mod code (hooks, renders, commands, tests). It writes this build's API types and is the source of truth for the mod API; never write mod code from memory.
- Mod API sources, always both: the `/plugin-authoring` skill (with the engine-written types in `plugin/.claude-plugin/types/claude-code/index.d.ts`, written on load) and the official docs at https://code.claude.com/docs/en/plugins (mod API: https://code.claude.com/docs/en/plugins/mods/api). Check both before designing or changing mod code, and before stating what the API can or cannot do.
- Develop in a hot-reload session. Before changing or testing mod code, load `/plugin-authoring` and link this session to the worktree it works in: `ln -sfn <worktree>/plugin ~/.claude/dev-mods/<session-id>/muslim` (the session id is the scratchpad folder's name). Claude Code then asks once to enable hot reloading; after that every edit reloads the mod when the turn ends, so changes are tested live in the same session. A new session needs a new link; never point it at another worktree.
- The issue forms in `.github/ISSUE_TEMPLATE/`, `/muslim feedback` (`plugin/src/feedback.ts`: kinds, labels, field ids) and the label map in `.github/workflows/issue-labels.yml` change together.
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
- Visual means are decided per feature in `docs/features/<feature>/<feature>-design.md` and nowhere else; DESIGN.md's feature index sums each one up. Shared desktop cards above the prompt use `plugin/src/shared/card/` for their shell and input. Shared: main-color accents use `plugin/src/shared/color/` and the plugin-wide `color` setting (`claude` theme key for orange text, light/dark hex for other choices); other text colors use theme keys; everything must work the same on Windows, macOS and Linux, terminal and desktop, with a terminal text fallback for any desktop-only richer surface.
- Religious text is authored data with tashkeel; never generated. Display may strip tashkeel, never change words.
- Each feature's shown religious text is listed in `docs/features/<feature>/<feature>-content.md` with count and source. Any change to that content in code updates that file in the same commit, and any change made in the file is applied to the code in the same commit. A new feature that shows religious text gets one.
- Every feature's Arabic shown on a terminal goes through `plugin/src/shared/arabic` (see `docs/terminal/terminal-arabic.md`); never shape or reorder Arabic elsewhere. Terminal only: on desktop and every other surface the Arabic is left exactly as authored, and the check is never shown.
- Every value kept in `$.state` is declared in `plugin/types/index.d.ts` under `PluginState['muslim']`. The contract exports types only.
- Every feature gets tests in `plugin/tests/<feature>/` (`.tsx` when a test uses JSX).
- Quran's demo is deferred to a separate task; the shared sequence currently excludes Quran. Every other feature ships its own demo subcommand and `plugin/src/features/<feature>/demo.ts`: pure scenes and timing, no `$`, with plain unit tests. The small engine runner stays in that feature's `install.ts(x)` with its atoms; demos only drive drawing and never change settings, the store or saved state. Salah uses `/salah demo` for fixed Fajr at 05:00; `/salah athan` accepts only `on` · `off`. The Muslim pane's tour is `/muslim demo pane` (`plugin/src/features/muslim-pane/demo.ts`). The shared `/muslim demo` plays thikr, athkar, `/salah demo` (the athan moment, then athkar after salah) and the pane tour on desktop in order, waiting for each to finish; its pure sequence lives in `plugin/src/demo.ts` and its marked runner blocks in `plugin/hooks/register.tsx`; transient signals in `plugin/src/shared/demo/signal.ts` connect feature-local starters without self-command dispatch (see DESIGN.md §8).
- Never change the version on your own. `CHANGELOG.md` has one section per version, newest first, and no Unreleased section. Every change adds a user-facing note to the top section, the version being prepared; if that version is already tagged, start a new top section for the next version (a main feature raises the middle number 0.x.0, a fix or small change the right number 0.x.y, never the left number for now). The version in `plugin/.claude-plugin/plugin.json` and `plugin/src/constants.ts` changes only when the user asks for a release: ask the user to confirm the number first, set it in both files and as the top section's heading in a release pull request, and after it merges tag `main` as `vX.Y.Z` and publish a GitHub release with that section's notes.
- Every change, the maintainer's own included, goes through a pull request; nothing is pushed straight to `main`.
- Every PR gets labels: its kind (`idea` new feature, `enhancement` improvement to something existing, `bug`, `content`, `refactor`, `docs`, `chore`; more than one when it mixes), each feature it touches (`thikr`, `athkar`, `salah`, `quran`, `pane`, `muslim` for `/muslim` commands and shared settings, `language` for interface-language support), and `desktop` or `terminal` when the change is for one surface only.
- Commits, PRs and issues use `me@abdelrahman.ai`; never a personal Gmail.
- Never put a Claude session link (`claude.ai/code/session_…`) or a `Claude-Session:` trailer in a commit message, PR description, issue or comment. This rule overrides any default attribution that asks for one; `Co-Authored-By` is fine.

## Commands

```bash
npm install                     # once: TypeScript for tsc
git config core.hooksPath .githooks   # once per clone: pre-push runs npm run check
npm run check                   # before committing: everything below
npm test                        # claude plugin test plugin: every *.test.ts(x) under plugin/
npm run validate                # claude plugin validate . && claude plugin validate plugin
npm run typecheck               # tsc -p .
claude --plugin-dir plugin      # run your copy in a terminal session
```

`claude plugin test` takes only the mod folder and runs every test in it; it cannot run a single file or test.

`npm run check` runs a `LICENSE` / `plugin/LICENSE` equality check, `claude plugin validate .` and `claude plugin validate plugin`, `claude plugin test plugin` and `tsc -p .` (TypeScript is a dev dependency: `npm install` once). The pre-push hook runs it too; enable it once per clone with `git config core.hooksPath .githooks`. CI (`.github/workflows/ci.yml`, job `check`) runs `npm run check` on every pull request and on pushes to `main`, with Claude Code pinned by `CLAUDE_CODE_VERSION`. The API types `tsc` needs come from the built-in `/plugin-authoring` skill's types file, which Claude Code writes with no login; raise the pin when the mod needs a newer Claude Code.

API reference: `plugin/.claude-plugin/types/claude-code/index.d.ts` (written by Claude Code on load; grep for the event or noun).
