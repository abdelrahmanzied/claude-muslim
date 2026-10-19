# Changelog

## 0.1.0

The first public release.

- Help and settings tables are English only, so they read the same in every terminal.

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

- Local prayer-time calculation for your city, country-based methods, manual minute adjustments and a review form.
- A next-prayer line with a live countdown, including Isha after midnight, and a quiet fifteen-minute athan moment: a photo card on desktop and a rising minaret in the terminal.
- The athan card always offers a direct after-salah start. City setup can be put off; name lookup has an eight-second timeout and accepts coordinates too.

### Quran (desktop)

- A recitation player with shipped complete Hafs recording and surah lists, Arabic names and Arabic-Indic number picks, play/stop, previous/next and natural advancement.
- Large recordings play in consecutive quarters. Repeat a whole surah or the current quarter; settings changes reset repeat.
- Metadata requests time out after fifteen seconds with one quiet error and Retry. Temporary audio cuts are cleaned up and metadata caches are bounded.
- Plugin setting writes stop active playback before reload and explain why. Terminal `/quran` provides text status.
- The terminal `/muslim` table shows Quran as desktop only.

### Muslim pane (desktop)

- `/muslim` opens today’s prayers, the Quran player, athkar progress and tabbed settings, with a footer toggle.
- Athkar set selection, start/resume, finish and reset with temporary undo. Daily and settings Athan switches show the same immediate feedback and roll back failed saves.
- Unavailable pane opens give a short reply or toast. Quran failures stay in the player, with Retry.

### Shared controls

- Command errors now say why the command failed.
- Setup forms own the space above the prompt. Explicit reader/demo replies explain when answering setup will reveal them; fresh-install reminders begin at the next eligible period or prayer.
- Shared main colors, desktop tashkeel and per-terminal Arabic display modes across status, help and reminders.
- `/muslim help` lists commands. `/muslim demo` previews thikr, athkar, salah and the desktop pane tour; Quran has no demo.
- `/muslim update`, marketplace auto-update controls and feedback drafting that sends only after approval. Missing settings ask for `/reload-plugins` without changing the current form or playback.
