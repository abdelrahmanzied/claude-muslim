# Changelog

## 0.1.0

The first public release.

- Help and settings tables are English only, so they read the same in every terminal.
- One anonymous install count: the first start on a computer sends the muslim version, terminal or desktop, and the operating system, once; `DO_NOT_TRACK=1` or `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` sends nothing. See Privacy in the README.

### Thikr line

- Authored starting phrases, tasbih, writing phrases and longer supplications join Claude’s working line, preserving its own step text and timing through tools and subagent turns.
- Reading-time or fixed phrase speed, and a salawat mode with one phrase per turn.
- A terminal closing phrase and a quiet usage-limit reminder that lasts until the window resets, including across reloads.

### Athkar

- Morning and evening athkar from Hisn al-Muslim, with a private reader, counts, undo, a finish question and a closing greeting.
- Fajr/Maghrib periods and prayer-based desktop skies with a saved place; 05:00/17:00 periods otherwise. The terminal uses a text frame.
- Per-set reminders in `/config`, the pane and `/athkar <set> on|off`; manual set picks can hold a reading across periods. Bare `/athkar` shows the current period without holding it.
- After-salah readings offered automatically from fifteen to thirty minutes after each prayer. Once begun, they retain progress through midnight and take precedence until finished, hidden or replaced by the next prayer.

### Salah

- Local prayer-time calculation for your city, country-based methods, manual minute adjustments and a review form. The `/salah adjust` form takes each prayer's minutes in a typed box (`3` later, `-3` earlier, `0` none) instead of − / + buttons. A dim line under its title says how to use it: on a terminal, ctrl+x tab or a click reaches a box, `5` later, `-5` earlier, `0` none, Enter applies, then Save.
- `/salah show <minutes>` takes 1 to 60 minutes (was up to 720).
- A next-prayer line with a live countdown, including Isha after midnight, and a quiet fifteen-minute athan moment: a photo card on desktop and a rising minaret in the terminal.
- The athan card always offers a direct after-salah start. City setup can be put off; name lookup has an eight-second timeout and accepts coordinates too.

### Quran (desktop)

- A recitation player with shipped complete Hafs recording and surah lists, Arabic names and Arabic-Indic number picks, play/stop, previous/next and natural advancement.
- Large recordings play in consecutive quarters. Repeat a whole surah or the current quarter; settings changes reset repeat.
- Metadata requests time out after fifteen seconds with one quiet error and Retry. Temporary audio cuts are cleaned up and metadata caches are bounded.
- Plugin setting writes stop active playback before reload and explain why.
- The Muslim pane is the player: `/quran` alone opens it with the Quran card unfolded, and a terminal says Quran is a desktop feature. No `/quran` subcommands for now.
- The terminal `/muslim` table shows Quran as desktop only.
- Claude Code plays audio only on macOS for now. On Windows and Linux the Quran card says the sound is not supported on that system yet and offers «استمع في المتصفح ↗», which opens the surah (or the selected quarter) in your browser. The note goes away by itself once a recitation really plays on your Claude Code version.
- A recitation that ends the moment it starts no longer skips through the surahs in silence: the player stops on it with «تعذّر سماع …» and Retry.

### Muslim pane (desktop)

- `/muslim` opens today’s prayers, the Quran player, athkar progress and tabbed settings, with a footer toggle.
- Athkar set selection, start/resume, finish and reset with temporary undo. Daily and settings Athan switches show the same immediate feedback and roll back failed saves.
- A click low in the pane lands where it was made: Desktop's rows are read at their real height, so the top edge of a lower button no longer misses and its hover no longer lights below it.
- Unavailable pane opens give a short reply or toast. Quran failures stay in the player, with Retry.
- Numbers in settings are typed in a box with their unit, instead of small − / + buttons that a press could miss: the thikr speed is «تلقائي» or a seconds box beside it (1–60 seconds, no «ثوانٍ» button), alongside the minutes before a prayer (1–60) and the six adjustments (any whole minutes). Latin and Arabic-Indic digits both count; Enter saves, and anything else is not saved. The thikr box stays visible as «وقت ثابت» while auto; the prayer box stays 24px under its choices.

### Shared controls

- Command errors now say why the command failed.
- Setup forms own the space above the prompt. Explicit reader/demo replies explain when answering setup will reveal them; fresh-install reminders begin at the next eligible period or prayer.
- Shared main colors, desktop tashkeel and per-terminal Arabic display modes across status, help and reminders.
- `/muslim help` lists commands. `/muslim demo` previews thikr, athkar, salah and the desktop pane tour; Quran has no demo.
- `/muslim update`, marketplace auto-update controls and feedback drafting that sends only after approval. Missing settings ask for `/reload-plugins` without changing the current form or playback; on a fresh install the city setup asks for it before the city question.
- `/muslim` with an unknown word shows the help table.
- Issues sent with `/muslim feedback` end with a `Sent with /muslim feedback` line and get the `via-plugin` label and their kind label, even when the sender cannot set labels.
- The issue forms and `/muslim feedback` take an «interface language» feature for asking the mod in another language, such as English; it adds the `language` label.
