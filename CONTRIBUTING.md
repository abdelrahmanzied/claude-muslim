# Contributing

Thank you for helping.

## How to start

- **Found a problem or have an idea?** Open an issue with one of the forms. Issues sent with `/muslim feedback` end with a `Sent with /muslim feedback (kind: <kind>)` line, which the issue-labels workflow turns into the `via-plugin` label and the kind label.
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

## Picture tests

Unit tests cannot see a cut mark, so the desktop pictures are also drawn in a real Chrome and compared with committed images (`scripts/visual/`). The Chrome versions and the Playwright version are in `scripts/visual/versions.json`.

```bash
npm install
npm run visual                    # compare every scene with its baseline
npm run visual -- --channel app   # one channel: app (Chrome matching the Claude desktop app) or beta
npm run visual -- --update        # rewrite the baselines after a change you meant to make
npm run visual -- --keep          # also save every drawn image in scripts/visual/out/
npm run fonts                     # regenerate plugin/src/shared/font/coverage.ts after a font changes
```

- Baselines live in `scripts/visual/baselines/<os>/<channel>/`. Commit the ones from your computer; look at every changed image before committing.
- Windows and Linux draw text a little differently, so each has its own baselines. The first CI run (`.github/workflows/visual.yml`) of a new operating system uploads its pictures as the artifact `pictures-<os>-<channel>`: download it into the baselines folder and commit.
- On a failure the workflow uploads the expected, actual and diff images.
- When the Claude desktop app updates its Chrome (About box), raise `channels.app` in `versions.json` to the matching Chrome for Testing build, update the baselines and look at what changed. The `beta` channel follows Chrome's beta and runs weekly, to warn before an update.
- A new language adds its sample strings to `scripts/visual/scenes.ts` and its font to `plugin/tests/shared/font/coverage.test.ts`.

## Versions

`MAJOR.MINOR.PATCH`: the middle number for a new feature, the right one for a fix. Only the maintainer changes it, when releasing.
