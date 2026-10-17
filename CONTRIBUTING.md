# Contributing

## Setup

```bash
npm install
git config core.hooksPath .githooks
npm run check
```

Rules for the code, docs and tests are in [CLAUDE.md](CLAUDE.md) and [DESIGN.md](DESIGN.md). The installed plugin lives in `plugin/`; everything else here is for development only.

- Load the `/plugin-authoring` skill before building or changing any mod code. It writes this build's API types.
- Check the mod API in `plugin/.claude-plugin/types/claude-code/index.d.ts` (written on load) and in the docs: https://code.claude.com/docs/en/plugins
- Commits, PRs and issues use `me@abdelrahman.ai`.
- Every change adds a note under `## Unreleased` in [CHANGELOG.md](CHANGELOG.md). Never bump the version in a branch; versions change only for a release on main, after confirming the number.

## Issues

Issues use the forms in `.github/ISSUE_TEMPLATE/`: bug report (`bug`), feature request (`enhancement`), idea (`idea`), content correction for Quran, athkar, thikr and translations (`content`) and general feedback (`feedback`). Blank issues are off. The labels `idea`, `content` and `feedback` must exist in the repository's labels.

## Run your copy

A dev copy replaces the installed `muslim@claude-muslim` in that session only. It can be any of these:

- `--plugin-dir`
- `CLAUDE_CODE_PLUGIN_DIRS`
- a session's `~/.claude/dev-mods/<session-id>/muslim` link

The debug log then says `Plugin "muslim" from --plugin-dir overrides installed version`, and only `muslim@inline` loads. There is no conflict and no double hooks. Every other session keeps running the installed copy.

In a terminal, from the worktree:

```bash
claude --plugin-dir plugin
```

In the desktop app, link the worktree into the session's dev-mods folder:

```bash
ln -s <worktree>/plugin ~/.claude/dev-mods/<session-id>/muslim
```

Or ask Claude in that session to load `/plugin-authoring` and link it. Edits load after the turn ends, or on `/reload-plugins`.

Tested on Claude Code 2.1.296.

## Check

Install the dev dependency (TypeScript) once:

```bash
npm install
```

Then validate, test and type-check in one go:

```bash
npm run check
```

`plugin/.claude-plugin/types/` is written by Claude Code when it loads the mod. `tsc` needs it, so load the mod once first.

The pre-push hook runs the same check. Enable it once per clone:

```bash
git config core.hooksPath .githooks
```

## Work on several features at once

Use one worktree and one session per feature. Sessions don't load each other's code.

- The link belongs to that session ID. It survives restarting or resuming that session. A new session needs a new link.
- Old `dev-mods/<id>` folders stay behind. You can delete them.
- The installed copy is at user scope, so it is active in every session with no dev copy. Usually you don't need to disable it, because the dev copy already overrides it.
- To disable it for one folder only, run this from that folder:

```bash
claude plugin disable muslim@claude-muslim --scope local
```

Disabling it at user scope affects all sessions.

What dev sessions share:

- Options. They live in `~/.claude/settings.json` under `pluginConfigs["muslim@inline"]`. All dev copies share them. The installed copy has its own entry.
- `$.store`, such as the athkar daily progress. It is kept across sessions, so it is likely shared by all copies named `muslim`.

Don't put `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json` for this. It applies to every session, so all sessions would run that one worktree.

## Try it as a user

Open a session with no dev link, for example in the main worktree. It runs the installed copy.

```bash
claude plugin list
```

That shows the installed version. `/muslim` shows the running version. Keep feature branches unversioned; use the debug log to confirm which copy loaded.

Updates arrive only after the version changes on GitHub `main` and the user runs `claude plugin update`.

## Test a real install

The installed form downloads only `plugin/`. Test it from a branch before pushing to main (remove the GitHub marketplace first if you have it, the name `claude-muslim` is shared):

```bash
claude plugin marketplace remove claude-muslim
claude plugin marketplace add abdelrahmanzied/claude-muslim#<branch> --sparse .claude-plugin plugin
claude plugin install muslim@claude-muslim
```

`--sparse` is Claude Code's own flag (git sparse checkout, GitHub and git sources only). Check that the plugin cache (`~/.claude/plugins/cache/claude-muslim/muslim/<version>/`) holds only the contents of `plugin/`: no `docs/`, `scripts/`. Afterwards, remove it and add the main one back.

## Release

Users get an update only when the version changes. For each release:

1. Bump `version` in `plugin/.claude-plugin/plugin.json` and `VERSION` in `plugin/src/constants.ts`.
2. Add an entry to `CHANGELOG.md`.
3. Merge to `main`.
4. Tag it:

```bash
claude plugin tag plugin
```

5. Push `main`. This is the step that makes it reach users.
6. Check that it arrives:

```bash
claude plugin update muslim@claude-muslim
```

Then run `/reload-plugins`.

## When the wrong code loads

Nothing warns you about these:

- No dev link in the session. The installed copy runs, with the same commands.
- A link points at the wrong worktree. Check with `ls -l ~/.claude/dev-mods/*/muslim`.
- A dev-mods folder holds a copied folder instead of a link. The code is stale.
- `CLAUDE_CODE_PLUGIN_DIRS` is set in global settings.
- An old marketplace has the same plugin name (`muslim-mod-dev`). Remove it:

```bash
claude plugin marketplace remove muslim-mod-dev
```

- You forgot the version bump. Users never get the update.

