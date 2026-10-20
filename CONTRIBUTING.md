# Contributing

Thank you for helping.

## How to start

- **Found a problem or have an idea?** Open an issue with one of the forms.
- **Want to work on an issue?** Comment that you are interested, and wait until it is assigned to you before you start. Every change, even a small fix, starts from an assigned issue.
- **Security problem?** Never report it in an issue; see [SECURITY.md](SECURITY.md).

## Rules

- **Religious text** (Quran, athkar, thikr, translations) comes from a named, trusted source, with its tashkeel. Never generated or reworded. Name the source in the pull request.
- **Design:** follow [DESIGN.md](DESIGN.md) and the feature's docs in `docs/features/<feature>/`, and update them with your change.
- **Commits:** `feat:`, `fix:`, `content:` (religious text), `refactor:`, `docs:`, `chore:`.
- **Pull request:** `npm run check` passes, a user-facing note in the top version section of [CHANGELOG.md](CHANGELOG.md), and the version in `plugin.json` unchanged.
- Contributions are released under the [MIT License](LICENSE).

## Setup

```bash
npm install
git config core.hooksPath .githooks
npm run check
```

The plugin is in `plugin/`; everything else is for development. `npm run check` needs `plugin/.claude-plugin/types/`, which Claude Code writes when it loads the mod, so load it once first. CI runs the same `npm run check` on every pull request.

## Run your copy

Terminal, from the repo:

```bash
claude --plugin-dir plugin
```

Desktop app: link the session to your copy, and edits reload when a turn ends:

```bash
ln -s <repo>/plugin ~/.claude/dev-mods/<session-id>/muslim
```

## Test a real install

```bash
claude plugin marketplace remove claude-muslim
claude plugin marketplace add abdelrahmanzied/claude-muslim#<branch> --sparse .claude-plugin plugin
claude plugin install muslim@claude-muslim
```

The plugin cache (`~/.claude/plugins/cache/claude-muslim/`) should hold only what is in `plugin/`.

## Versions

`MAJOR.MINOR.PATCH`: the middle number for a new feature, the right one for a fix. Only the maintainer changes it, when releasing.
