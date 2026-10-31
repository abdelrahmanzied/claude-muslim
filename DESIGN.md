# Design system — muslim mod

The shared base every feature follows, and the index to each feature's own design. Each feature owns its design: its folder `docs/features/<feature>/` holds its spec (`<feature>.md`), its design (`<feature>-design.md`: surfaces, visual means, requirements) and, when it shows religious text, that text (`<feature>-content.md`). Read this before designing a new feature, then the docs of the features you touch.

## Feature index

| Feature | Command | Spec | Design | Content |
| --- | --- | --- | --- | --- |
| Thikr line | `/thikr` | [thikr spec](docs/features/thikr/thikr.md) | [thikr design](docs/features/thikr/thikr-design.md): text only | [thikr content](docs/features/thikr/thikr-content.md) |
| Morning, evening and after-salah athkar | `/athkar` | [athkar spec](docs/features/athkar/athkar.md) | [athkar design](docs/features/athkar/athkar-design.md): a drawn reader (Client module, desktop Svg sky) | [athkar content](docs/features/athkar/athkar-content.md) |
| Salah | `/salah` | [salah spec](docs/features/salah/salah.md) | [salah design](docs/features/salah/salah-design.md): text, richer athan moment | [salah content](docs/features/salah/salah-content.md) |
| Quran | `/quran` | [quran spec](docs/features/quran/quran.md) | [quran design](docs/features/quran/quran-design.md): the player is the Muslim pane's Quran card (no pane of its own, no footer item); `/quran` opens it on desktop and says it is desktop only elsewhere; no subcommands (removed for v0.1.0) | none |
| Muslim pane | `/muslim` | [muslim-pane spec](docs/features/muslim-pane/muslim-pane.md) | [muslim-pane design](docs/features/muslim-pane/muslim-pane-design.md): a docked desktop pane of three daily cards (prayers, Quran player, athkar progress) and one folded settings card with non-scrolling tabs, a Client-drawn picture; text in the terminal | end-of-turn sample from [thikr content](docs/features/thikr/thikr-content.md) |

Platform docs that are not features live in `docs/<platform>/`: terminal Arabic (the shared guide and the `/muslim terminal-arabic` check) is [docs/terminal/terminal-arabic.md](docs/terminal/terminal-arabic.md); the principles of every drawn desktop pane are [docs/desktop/pane-design.md](docs/desktop/pane-design.md).

Everything below is shared by every feature. A feature's doc may add to it, never contradict it.

## 1. Principles

1. **Claude stays Claude.** We add a layer of thikr to Claude's interface; we never redesign it. Claude's own text (timer, token counts, `esc to interrupt`, tool output) is never translated, reworded or hidden.
2. **Quiet by default.** A reminder, never an interruption. Nothing blocks work, steals focus, or appears more than once for the same moment. Animations and reminders are silent; audio plays only when the user starts it (e.g. a recitation they chose), and stops when they ask.
3. **Authentic content.** Every phrase is authored data with tashkeel and, where it has one, a source (Quran ayah or Hisn al-Muslim number). Nothing is generated at runtime. Display may strip tashkeel; it never changes words.
4. **No scores.** We never count the user's worship, show streaks, rewards or guilt. Counting exists only where the user counts themselves (athkar reader), and stays private on their machine.
5. **Each feature controls its automatic behavior.** A feature may have a whole-feature switch, or per-reminder switches in `/config` and its command, as athkar does. Turning a reminder off stops its automatic opening; manual opening remains available. A whole-feature off switch leaves Claude untouched.
6. **Each feature owns its visual means.** Text in Claude's font, size and colors is the default. A feature may use richer means (images, SVG, animation) only where its design doc says so and why. Anything drawn must work on every surface the feature targets, with a text fallback in the terminal when the richer surface is desktop-only, and must follow the theme and zoom.

## 2. Surfaces

Pick the lightest surface that does the job. Each comes from the mod API (`/plugin-authoring` types are the reference). Each feature's design doc states which surfaces and visual means it uses and why.

| Surface | What it is | Use for | Example |
| --- | --- | --- | --- |
| Spinner | Claude's working line | Short phrase while Claude works; rewrite `word`/`message`/`suffix` only | Thikr line |
| TurnDuration | Line closing a turn (terminal) | One short phrase; keep Claude's duration | تَمَّ بِحَمْدِ اللَّهِ |
| AbovePrompt band | Rows above the input | A suggestion, notice or glanceable fact that needs to be seen; at most one line unless it is a reader. Setup forms own the slot while visible; reminder rows may stack only when no setup form is showing | Usage limit, athkar reader |
| SessionMode | Mode labels at the right of the prompt footer (terminal and desktop). The host places the slot: before the model name in the terminal, and in the redesigned Desktop (app 2.37) on a row under the model controls | A glanceable fact as plain text beside the engine's labels; the hook keeps `next(e)` and adds its own. Never rely on it being inline. A native Button there takes the Desktop's own chrome and foreground and is drawn from its `label` alone, so keep it short and make the label the visible text. The API has no size prop, so an item that must narrow with the window sheds words by `e.viewport.columns` | Prayer line, Quran chip |
| Status line | `$.ui.status`, under the prompt | Always-on, glanceable fact; plain text, no color | Not used by a feature yet (the prayer line is in SessionMode) |
| Toast | `$.ui.toast` | One-off confirmation after an action, or a timed reminder inside the app | "speed 3s" (prefer command reply) |

A visible setup form takes priority over every reminder above the prompt on every surface: the terminal Arabic display check, then the salah review or city setup. The pure decision in `plugin/src/shared/setup/visibility.ts` is used by the forms and by athkar, the athan card/minaret and thikr's usage-limit row; each installer reads its own engine values. Claude's `hasSurvey` withholds all these plugin forms and reminders. Hiding skips drawing, without dismissing moments or changing the saved reading. Athkar does not auto-open or run a pending item advance while hidden; closing a form lets reminders draw normally, including an athan still inside its window.
| Notification | `$.ui.notify` | Not used: OS banners show in meetings and screen shares; use a band row or a toast | — |
| Command reply | `command.run` → `{ text }` | Status, help, changing settings | `/thikr` |

Richer surfaces (Pane, Image, Svg, Raster, Client modules) are chosen per feature in its design doc, not here. Passive content does not get a Pane. Every drawn pane follows the [desktop pane design](docs/desktop/pane-design.md): what the Desktop owns, the fixed picture, look, cards, words, settings rows.

Desktop cards above the prompt use `plugin/src/shared/card/` for their size, frame, ×, hover, lighting and input. Each feature supplies its content. Only one of these cards shows at a time: the athan card takes the athkar band's place until it closes or expires. Terminal surfaces are unchanged.

Over the app's own grey card the picture never assumes a cell size: the app measures its band cell live from its font and text-size scale. The Client asks for the widest Svg (4096px, the engine's bound) and the desktop narrows it to the slot; the markup root is `width="100%"` with a height, no `viewBox` and no `preserveAspectRatio`, and the HTML inside lays out on whatever width the slot gives. Features point here instead of repeating it.

The shared card in `plugin/src/shared/card/card.ts` also holds the leave, key-rest, idle and focus-grace timings.

**A framed control is pressed anywhere in its frame.** Every drawn button or box with a visible frame or fill (pane pills, value buttons, number boxes, card buttons such as «أكمل العدّ») takes a press on every pixel inside that frame, its empty padding included, never only on its words or number, plus a small margin outside it for Desktop's whole-cell pointer. Where two margins meet, the nearer control wins. Desktop often reports a click only as its whole cell (about 8px × 20px), so a control stacked under another sits at least 24px below it (`STACK_GAP`, more than one cell): a cell that touches one control is always nearer to it than to its neighbour. Prefer putting a number box beside its choice on the same line, so no control sits right above it. Desktop's rows are about 19.25px, not `height / rows`; the pane design says how a reported row is read. Tests press every pixel of the frame and just outside it, and every whole cell that touches a stacked control. The pane's margins are in the [desktop pane design](docs/desktop/pane-design.md).

## 3. Color

The main color is one plugin-wide setting: `/muslim color orange | green | yellow | blue`, default Claude orange. Every feature takes it from `plugin/src/shared/color/`; features never define their own palette. Orange text keeps the `claude` theme key so every Claude theme stays exact. Other main colors use the shared light/dark hex shade for the current theme (terminal text reads Claude Code's `theme` config). Desktop drawings (cards, the athkar band, the Muslim pane) never read that config: the desktop app's appearance can differ from it, so a drawing emits the dark and the light values as CSS and lets `@media (prefers-color-scheme: light)` pick, as the pane does; drawn surfaces use the shared hex palette. Terminal ink, dim and track lines use theme keys (`text`, `subtle`, `inactive`). Text that is not already in the main color and Claude's own text and spinner keep their colors.

| Role | Theme key | Use |
| --- | --- | --- |
| Thikr / accent | Shared main color (`claude` for orange) | Our phrases in bands; matches the spinner (`rgb(215,119,87)` in the default themes) |
| Body | `text` | Long Arabic text in the athkar reader |
| Secondary | `subtle` / `dimColor` | Sources, counts, hints |
| Done | `success` | Only for "completed" states the user caused (e.g. finished a reader section) |

Never use `error` or `warning` for religious text.

### Icons

One icon per feature, the same everywhere a drawn surface marks it: the Muslim pane's card headers, its settings tabs, and any later desktop surface. A feature never draws a second icon for itself. The standard set lives once in `plugin/src/shared/icon/` as 24×24 line fragments (stroke `currentColor`, the main color where the surface tints it), copied verbatim from the approved catalog. Each fills the 24×24 box (about 3 to 21 on both axes) so the set reads at the same weight at 20px; a drawing that sits low or small is redrawn, not scaled per surface:

| Mark | Icon | Key |
| --- | --- | --- |
| Muslim as a whole | the full avatar, 52px tall and approximately 55.5px wide (desktop pane heading), `☾` on text surfaces | `avatar.ts`, `☾` |
| عام (general settings) | منزلقات | `sliders` |
| الصلاة | سجود واقعي | `sujoodreal` |
| القرآن | مصحف pane القرآن | `qpane` |
| الأذكار | شروق وغروب (both periods) | `horizon` |
| الذكر | حبّات Spinner | `spinbeads` |
| الإعدادات (settings as a whole) | ترس بأسنان | `gearteeth` |

Inside a card, small row icons that describe a row rather than a feature (a bell, a microphone, a check ring) stay free. A new feature adds its row here and to `plugin/src/shared/icon/` before it is drawn anywhere. Text surfaces (terminal, Spinner, SessionMode, band rows) use text glyphs, never these drawings.

## 4. Typography and Arabic

- **Font and size:** Claude's. We cannot and do not change them.
- **Drawn panes:** use the fixed 12/14/16/20/24px type scale, with the plugin name largest.
- **Tashkeel:** desktop-only setting, on by default; terminal display always strips tashkeel regardless of this setting.
- **Direction:** a line that starts with Arabic is read right to left by the surface. When Claude's own Latin text or numbers sit in the same line, keep them as a separate run (e.g. a separator `·`), and never convert Claude's numbers.
- **Our numbers** (counts, times we compute) use Arabic-Indic digits (`١٥:٢٤`, `٢/٣`) inside Arabic lines.
- **Length:** spinner and band phrases fit one line at 80 columns. Longer texts (athkar) live only in the reader, never truncated.
- **Terminal Arabic:** every feature's Arabic on a terminal goes through `plugin/src/shared/arabic`; see the [terminal guide](docs/terminal/terminal-arabic.md) for modes, persistence, survey, and limits.

## 5. Voice

- Arabic for religious content; English for UI chrome (commands, help, settings) until languages land (issue #1). Drawn desktop panes are the exception: their labels, descriptions and buttons are Arabic ([pane design §5](docs/desktop/pane-design.md#5-words)).
- Command failures use `plugin/src/shared/command/failure.ts` to name the command and give a short, single-line reason when known; pass-through hooks preserve the command below.
- Commands answer in one short line: what changed (`speed 3s`), or why not (`Speed is auto, or a whole number of seconds from 1 to 60.`).
- No exclamation marks or praise in UI text. The one allowed emoji is 🤲 in athkar’s closing greeting.

## 6. Commands and settings

- One command per feature, named in Arabic transliteration with the `th` spelling: `/thikr`, `/athkar`, `/salah`, `/quran` (bare only: desktop, no subcommands; the Muslim pane is the player). Shape: `/<feature> <setting> <value>`. Features with a whole-feature switch also use `/<feature> on|off`; athkar instead uses `/<feature> <set> on|off` for each reminder.
- Command reply tables contain no Arabic, including descriptions and state values, so their columns read the same in every terminal Arabic mode. The `/muslim` table shows Quran as desktop only; an Arabic city name uses coordinates in its table cell while its heading stays authored. Arabic outside tables keeps its existing rendering.
- Every reply that shows settings or help has the same shape, built with `plugin/src/table.ts`, the same on every surface:
  - **Status** (`/<feature>`, terminal `/muslim`): the title (`**Muslim › Thikr**`), then one line pointing to help (`To change a setting or see every option: /thikr help`), then a table `| Setting | Description | State |`: what each setting is in a few English words, and its value now. No commands in the status table.
  - **Help** (`/<feature> help`): the title (`**Muslim › Thikr › Help**`), then a table `| Command | Description | Options |`. The command stands alone (`/thikr speed`); Options lists each value and what it does, separated by ` · `, with `(default)` and `DESKTOP ONLY` beside the value they belong to; `—` when there are none.
  - **`/muslim`**: on desktop (a surface list containing `desktop` without `terminal`), opens the Muslim pane and replies in one line; an opening failure falls back to the text table. Every other surface list keeps the existing table: one row per feature (`| Feature | Description | State |`, its main state only), then the shared settings (color, tashkeel, terminal Arabic). Each feature's other settings stay in its own `/<feature>`. `/muslim help` shows the shared commands, then every feature's help table; `/muslim help <feature>` one of them.
- **`/muslim update`** updates the mod itself: it runs only `claude plugin update muslim@claude-muslim --json` (never a bare update), shows a toast while it downloads, then one reply line: `muslim vX → vY. Reloading plugins.` + the CHANGELOG link, `muslim vX is the latest.`, or `Not updated: <reason>` + the shell fallback. After an update it runs `/reload-plugins` from a timer, with a toast as the fallback. Pure parsing and wording: `plugin/src/update.ts`. The version is never invented: if the output does not say it, the reply says `muslim updated (was vX)`.
- **`/muslim autoupdate`** (`on` · `off`, alone shows the state) sets Claude Code's marketplace auto-update for `claude-muslim`, which a plugin cannot declare in its own files. The flag is `extraKnownMarketplaces["claude-muslim"].autoUpdate` in the user `settings.json` (`CLAUDE_CONFIG_DIR`, else `HOME`/`USERPROFILE` + `/.claude`); only that key changes, the entry is never created, and a file that is not valid JSON is never written. The first `session.start` seeds it to on when the user never chose, then records the `autoUpdateSeeded` store key and never seeds again (so a later off stays off; any failure retries next start). Pure parsing and editing: `plugin/src/autoupdate.ts`. It appears as the Auto-update row of the terminal `/muslim` Shared table and the pane’s general settings switch.
- **`/muslim feedback [text]`** replies at once, then starts a model turn with `$.prompt.submit` from a timer (the host refuses a submit made while the command still runs; a refused or dropped submit shows a toast). The prompt (pure, `plugin/src/feedback.ts`) makes Claude ask the kind (bug, improvement, new feature, content correction, feedback) and the feature (thikr, athkar, salah, quran, Muslim pane, /muslim commands and settings, interface language, other or new) with its multiple-choice question tool unless already clear, draft the title and body in the shape of the matching `.github/ISSUE_TEMPLATE/` form (version, surface and OS filled automatically), show the full draft, ask `Send` · `Change it` · `Don't send` as a multiple-choice question, and only on `Send` run `gh issue create --repo abdelrahmanzied/claude-muslim --label <kind> --label <feature> --label <surface>`. With no `gh` or no sign-in it gives an `issues/new?template=<file>` link with the fields (feature included) as URL-encoded field-id parameters (issue forms ignore `body`). It adds no personal data beyond what the person wrote. Kinds, labels and field ids there mirror the forms and the label map in `.github/workflows/issue-labels.yml`; change them together.
- The desktop-only `paneButton` userConfig field (default on, no slash command) controls the `☾ Muslim` footer button, from the pane or `/config`; `/muslim` always remains available. All commands stay registered and visible on desktop and terminal.
- Before every plugin-initiated `$.config.set`, check `$.config.list()` for the exact `ConfigRow.key`, using the pure helpers in `plugin/src/shared/reload/config.ts`. A missing row changes no state or navigation, stops no Quran, and makes no write: reply or toast `Not changed: run /reload-plugins, then try again.` in the action's existing channel. Map a thrown `no /config row` error to that same text if the row disappears later, retaining each writer's rollback. Only after a successful preflight may the writer change its pending UI state and await `plugin/src/shared/reload/signal.ts`. Quran connects a closure over its own engine handle; active playback or preparation stops first with one toast, `Quran stopped: changing a setting reloads the player.` Idle or unconnected Quran resolves without a stop or toast. External `/config` changes cannot be intercepted.
- Shared settings (`color`, `tashkeel`) use their own names; feature settings are `userConfig` fields named `<feature><Setting>` (`thikrSpeed`), so it also appears in `/config`. Commands change it with `$.config.set({ key: 'muslim.<field>' })`.
- Defaults are chosen so a new user needs no setup, except where the feature cannot work without input (prayer location).

## 7. Time-based behavior

- Compute from the local clock and timezone; prayer times are calculated locally, no network.
- A timed moment (before prayer, after prayer, usage limit) appears once, clears itself when its moment passes, and survives `/clear` and reloads through `$.state` / `$.store`.
- Timers run only while needed (e.g. the spinner ticker only during a turn).

## 8. Demo

Quran's demo is deferred to a separate task and is not part of the current shared sequence (the Muslim pane tour is the final `pane` step of `/muslim demo`, and `/muslim demo pane` plays it alone on desktop). Each other feature has its own demo subcommand and `plugin/src/features/<feature>/demo.ts` for pure scenes and timing (no `$`, plain unit tests). Its small engine runner stays in `install.ts(x)` with its atoms. A demo plays the real UI on demand and only drives drawing: no settings, store or saved-state changes. Salah uses `/salah demo`; thikr uses `/thikr demo`, which starts a real turn of its own because the Spinner draws only while Claude works.

`/muslim demo` plays the thikr demo, the no-argument athkar demo, then `/salah demo` (the athan moment followed by athkar after salah), then the Muslim pane tour (the final `pane` step, desktop only, skipped on a terminal; it reports its end after the cards fold back). Its command passes through demo-only setup hooks, which connect transient signals to each feature's own starter and engine handle. Later clock callbacks send those signals; no self-command is dispatched (`$.command.run` skips the caller in this build). `/muslim demo` only knows the order. It never holds, copies or hard-codes a demo's length or values: each demo works on its own, and when `/muslim demo` started it, it reports its own end through the signal (thikr after its usage-limit hold, athkar after its folded scene, salah after its after-salah folded done row). The next demo starts 0.1 s after that report. Started this way, the thikr prompt says `/muslim demo` instead of `/thikr demo`. Athkar uses its default look (sky on desktop, frame in the terminal; a configured desktop frame is respected). No city is needed. Nothing from one demo overlaps the next, and no demo writes real session atoms, settings or saved state. Salah selects its disposable moment through one guard in each existing render path. Closing or expiring it starts the Fajr after-salah scenes through a transient signal to athkar; its real reader builders draw those scenes. The completion callback returns to salah only after the folded done row, then any real athan returns untouched. The reply names the sequence and says thikr uses tokens and leaves a transcript message. A repeat while playing says `Muslim demo: already playing.`; a later request plays again. The order, the start delay and the gap: `plugin/src/demo.ts`; transient signals: `plugin/src/shared/demo/signal.ts`; the runner and module-local lifetime: marked `DEMO` blocks in `plugin/hooks/register.tsx` and each feature's `install.tsx`. Removing demo blocks and the two salah render selectors removes no core behavior.

## 9. Code shape for a new feature

```
plugin/src/features/<feature>/
  install.ts(x)   hooks only: read $, call pure functions, draw
  phrases.ts      authored text (or data.ts)
  *.ts            pure logic, no $
plugin/tests/<feature>/  unit tests for pure logic + engine tests on terminal and desktop
docs/features/<feature>/<feature>.md          the feature's spec
docs/features/<feature>/<feature>-design.md   the feature's design
docs/features/<feature>/<feature>-content.md  the religious text it shows, if any
```

Wire it in `plugin/hooks/register.tsx` (`install<Feature>(on, settings)`), register its command there, add its fields to `plugin.json` `userConfig` and `plugin/src/config.ts`, declare any `$.state` values in `plugin/types/index.d.ts`.

## 10. New feature checklist

- [ ] Fits the shared base above; uses the lightest surface that does the job.
- [ ] `docs/features/<feature>/<feature>-design.md` written: surfaces, visual means, why, and the fallback where a surface is desktop-only; linked from the index above and from the spec's Design section.
- [ ] Spec added to `docs/features/<feature>/<feature>.md` (moments, phrases with sources, settings).
- [ ] Phrases reviewed by a person; sources noted. Religious text shown is listed in `docs/features/<feature>/<feature>-content.md` with count and source.
- [ ] Whole-feature or per-reminder switches in `/config` and the command; off stops the corresponding automatic behavior.
- [ ] One icon from the standard set (§3 Icons), the same on every drawn surface.
- [ ] A drawn desktop pane follows [docs/desktop/pane-design.md](docs/desktop/pane-design.md) and its checks.
- [ ] Main color via the shared module, other colors via theme keys; desktop tashkeel setting respected and terminal tashkeel stripped.
- [ ] Tests on `terminal` and `desktop`; `claude plugin validate`, `claude plugin test`, `tsc` pass.
- [ ] Demo subcommand and pure `demo.ts` for the feature's real UI; no settings, store or saved-state changes.
- [ ] Tried live in a terminal and the desktop app.
- [ ] Change notes added to `CHANGELOG.md` (see CLAUDE.md).
