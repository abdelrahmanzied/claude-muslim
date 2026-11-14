# Changelog

## 0.1.1

- Athkar now celebrate, then close. When you finish a set (the last count, «نعم، أتممتُها» or the pane's ✓), the finale plays and the band is gone: no done row stays above the prompt for the rest of the period. A finished set never comes back by itself, after a reload, in a new session or in another open session; opening it on purpose (`/athkar morning`, `evening`, `after-salah`, or a set pick in the Muslim pane) shows the done row with how to read again, and it closes when it rests. On a terminal the «تَقَبَّلَ اللَّهُ 🤲» row shows alone, with no reset hint, for the same time as the finale. After salah, the band then returns to the current morning or evening set. The demos end with the finale.
- Athkar progress now follows you between open sessions. Counts, the current thikr, finished and hidden (×) are shared, and for each of morning, evening and after salah the latest change in any session wins, a reset included. A session picks up the others' progress when its band is opened or unfolded, on desktop when you hover it, on every press, from the Muslim pane and with the `/athkar` commands; there is no background timer. A session that was left open no longer overwrites another session's counts. What stays per session: whether the band is open or folded, a set you picked by command, the finish question, the reset undo.
- A faded athkar reading now folds to its set title, with where it stands («٣ مِنْ ٢٤»), × and the thin progress line, instead of the current thikr's text. The thikr shows when you open it.
- Desktop: the athkar and athan cards above the prompt fit the app's own card again after the app's October update, whatever the window width, zoom, font or text size.
- Desktop: the frame of the athkar «frame» look and of the Al-Kahf card is whole again on both sides; on some screens its left and right lines were cut off and only the corners showed.
- Thikr mode `istighfar` (`/thikr mode istighfar`, also a «الاستغفار» pill in the Muslim pane's thikr tab): «أَسْتَغْفِرُ اللَّهَ · ١» renews every few seconds at the usual pace, and the count goes up with each showing: «· ٢», «· ٣»… It is the day's total across turns and sessions and starts again from 0 at midnight (device time); it counts how many times the phrase was shown, not said. Friday salawat still wins on a Friday.
- Friday. On a Friday on your device the Dhuhr slot is called «الجمعة» (Jumu'ah) wherever a prayer name shows: the prayer line, the athan call and card, the salah times and review, the Muslim pane and the thikr call.
- Friday salawat: on a Friday, from Fajr, the thikr line shows the salawat phrases. `/friday salawat on | off`, default on.
- Al-Kahf reminder: on a Friday, from 30 minutes after Jumu'ah until Maghrib (it needs a saved city), a card says «سورة الكهف · يوم الجمعة · بصوت <the reciter you last used>», once per Friday for all your sessions, and hides after 1 minute. On desktop it is a slim one-row card, the size of the folded athkar row, with the small Quran avatar and a «▶ استمع» button that plays Surat al-Kahf; on Windows and Linux, where Claude Code plays no audio, the button reads «↗ افتح في المتصفح» and opens the whole surah in your browser (so does the pane's «سورة الكهف» button there). On the terminal it is a plain text line, «سورة الكهف · يوم الجمعة», with no reciter, since the terminal plays no Quran. It waits while the athan card or the athkar band is showing. `/friday alkahf on | off` switches the automatic reminder; `/friday alkahf` shows it now.
- `/friday` shows the day and both settings, `/friday help` lists the commands and `/friday demo` previews, on any day, the athan card named Jumu'ah and then the Al-Kahf card, each showing and going (also the fourth step of `/muslim demo`, before the pane tour). Without a saved city `/friday` says the automatic reminder needs one.
- Desktop: on Claude Code 2.1.325 and later, the athkar band fades and the athan card folds again when you click outside them.
- Desktop: fixed an empty grey card where Jumu'ah's athan card (with Surat al-Jumu'ah, verse 9) should show: its font made the card too big for the app to draw. It now carries only the letters the verse needs, and a test guards the size of every card.
- Muslim pane: a new «الجمعة» settings tab with both switches, and on Fridays a «سورة الكهف» button in the Quran card.
- On a Friday the athkar after salah are no longer offered after Dhuhr (Jumu'ah), since you go to the prayer: the athan card shows no «ابدأ أذكار بعد الصلاة» button then and the reader does not open by itself; `/athkar after-salah` still opens it. Other prayers are unchanged.
- Jumu'ah's athan card (and `/friday demo`'s) now shows Surat al-Jumu'ah, verse 9 (﴿يَا أَيُّهَا الَّذِينَ آمَنُوا …﴾), with «سورة الجمعة · الآية ٩» under it, where the start button is on the other prayers. On the open card it sits beside the title, or slides slowly when the card is too narrow for it (only the reference stays when your system asks for less motion); the folded card shows no verse and is the plain athan card. On the terminal it follows the athan line, on its own lines when it does not fit. No word is ever cut.

## 0.1.0

The first public release.

- Help and settings tables are English only, so they read the same in every terminal.
- One anonymous install count: the first start on a computer sends the muslim version, terminal or desktop, and the operating system, once. See Privacy in the README.

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
