# Changelog

## Unreleased

- `/muslim` shows a settings table, the same on every surface: tashkeel, thikr, and terminal Arabic (this terminal's mode, or its default if not chosen yet; `terminal only` on desktop), each with the command that changes it.
- Terminal Arabic has three per-terminal modes: `plain` strips tashkeel, `joined` also applies presentation forms in logical order, and `reversed` also reorders Arabic runs for visual RTL display. Tashkeel is always stripped on terminal because terminals draw marks poorly and partial redraws can garble them.
- Defaults are Apple Terminal `plain`, Warp `joined`, Windows Console `reversed`, and `plain` for every other terminal ID. The first-run survey compares these treatments with hotkeys 1–3; invalid saved modes reopen the survey. `/muslim terminal-arabic` reopens it manually.
- `/muslim tashkeel on | off` controls Arabic diacritics on desktop and non-terminal surfaces only. `/thikr tashkeel` was replaced by `/muslim tashkeel`.
- Thikr spinner, end-of-turn, and usage-limit phrases all use the shared Arabic display path.

- Salah's footer line and minaret label use the per-terminal Arabic setting.
- Restore the desktop athan card’s isolated view; keep its appearance, close action and terminal minaret.

- Fix: after a `/salah show` change the footer kept the last setting's line (still shown with `show 20` far from a pray; missing after `off` then `always`); the line is now worked out from the clock as it is drawn.
- Fix: hiding the pray line hid nothing, because the old line was cleared during drawing (refused); it is now hidden at once and cleared after the draw.
- `/salah show always | <minutes> | off` is the one command for the pray line: all day (counting down its last 20 min), only that many minutes before a pray (default 20, counting down), or hidden. It replaces `/salah always | reminder | off` and `/salah reminder <min>`; the settings `salah` and `salahReminder` become `salahShow`, and saved values carry over. Every `/salah` reply is short markdown saying what changed; `/salah help` and `/muslim help <feature>` open with a title so their table renders.
- `/salah` shows today's times and the settings as two tables; each setting names the command that changes it.
- Code, commands, settings titles and help say "pray", never "prayer" (the vendored athan library is unchanged).
- The prayer line in the footer is bold.
- `/salah adjust` accepts any whole number of minutes; saved settings and the review form no longer cap adjustments at ±60.
- Fix the athan moment being hidden when tested before the prayer display first appears; keep the desktop card and terminal minaret unchanged.
- `/salah athan test` shows the athan moment now for the next prayer without changing settings: the card on the desktop, the minaret in the terminal.
- Desktop athan card: when a prayer comes in (`salahAthan`) the desktop shows a full-width card above the prompt, built like the athkar band, with a photo of the Haram behind «حان وقت صلاة المغرب» and the time in Arabic digits and a × to close; it stays until closed or the call's 15 minutes end. The minaret is terminal only.
- Athan card polish: a sharper photo (a wide strip cut from a larger original), a × on a round dark disc that reads over the photo. No entrance animation: the desktop draws the card as a still picture, so a fade-in froze on its first, invisible frame.
- Prayer times (`/salah`): calculated on the machine with the vendored athan library (from [adhan-js](https://github.com/batoulapps/adhan-js)), no location service or API. The first prompt after install offers the city named by the time zone, or any city typed in any language (Claude reads it into coordinates). Each country's official Sunni method, else Muslim World League; Asr by the majority.
- Review form: today's times with − and + per prayer to match the user's mosque.
- Pray line: `salahShow` is `always` (next prayer all day), minutes (default 20: only that many minutes before a prayer) or `off`. A live mm:ss countdown (`☾ العصر ١٩:٤٢`, updated every second, 30 s ticks outside the window) in the countdown window, and حان وقت صلاة … for 15 minutes once a prayer is in (`salahAthan`). Sunrise is in today's times only. No toast when the window starts and never an OS notification: the footer line is the only notice.
- `/salah` commands: `help` (a table), `show always` · `<minutes>` · `off`, `athan on` · `off`, `city` (replaces `setup`), `method`, `adjust`. `/muslim help [feature]` shows the command tables.
- Athan moment (terminal and desktop): when a prayer comes in and `salahAthan` is on, a text minaret rises row by row above the prompt for about 3 seconds beside «حان وقت صلاة العصر», once per prayer, never during a survey; the status line keeps the call for 15 minutes.
- Thikr before a prayer: inside the countdown window the first phrase of each thikr turn is حَيَّ عَلَى الصَّلَاةِ · العصر بعد ١٠ د (prayer and whole minutes left); salah shares the window through `$.state` `salahWindow`. Salawat mode shows it first too.
- Settings in `/config`: `salahShow`, `salahAthan`, `salahPlace`, `salahMethod`, `salahAdjust`. The call setting is spelled athan (`salahAthan`); a saved `salahAdhan` is still read.
- Prayer line placement: the prayer line (`☾ العصر ١٥:٥٩`, the live countdown, `حان وقت صلاة العصر`) moves from the status line to the prompt footer's mode labels (`SessionMode`), before the model name, as plain text in Claude orange, in the terminal and the desktop app (not an AbovePrompt row: the desktop draws that as a card). The setup and review rows and the minaret moment stay above the prompt.
- The prayer line's timer now starts from the first draw of the footer or the band and a redraw asked at session start, so the countdown no longer freezes after `/salah off` then `/salah reminder 60`.
- The live countdown now starts the second the reminder window opens (a timer for that moment) instead of on the next 30 s tick.
- The mod clears the old status-line entry (`muslim ☾ …`) at session start, so a hot reload no longer leaves it next to the model name.
- Shared prayer helpers (names, digits, the prayer line text) moved to `src/shared/pray/`; thikr no longer imports salah's folder.

- Morning and evening athkar: a reader above the prompt for Hisn al-Muslim 75–98, morning 05:00–17:00 and evening 17:00–05:00. Counts come from the data file only (91 and 92 a hundred, 98 ten); 92 and 93 are one thikr.
- Cover with the title and the keys (two columns, no Esc). Click, Space or Enter counts; right click or Backspace takes one back; ← next, → previous. The first click on a faded band only lights it; the cover's next click opens the reading. Moves on 650 ms after a thikr's last count.
- Quran passages show their name beside the set position (آية الكرسي, سورة الإخلاص, الفلق, الناس), on desktop and in the terminal.
- Progress: a horizon glow along the bottom; the repetitions left ride its head in a small pill; the set position sits at its left end.
- Size: one open height, 77px, for the cover, reading, finale and done row; faded, each folds to one 24px row. Text at a fixed 14px that shrinks only to fit its two-line box, with no floor. No size setting.
- Folds by itself: 1 s after the pointer leaves, 3 s after the last key with the pointer off the band, at once when typing in the prompt, and after 90 s with no input.
- End: on desktop stars fall and ﴿رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ﴾ rises centered with — البقرة ١٢٧ at 18px. Then the done row: the verse at 14px, `/athkar <period> reset → to read again`, and a ✓ on the full line's head. Folded: أَتْمَمْتَ وِرْدَكَ ✓ · مَوْعِدُنَا الْمَسَاءُ (or الصَّبَاحُ). The verse takes the words' color on a sky, the main color on Frame.
- Looks: Sky (default), a sky that follows the time of day on desktop and its plain color in the terminal; Frame, a main-color frame. Main color orange, green, gold or blue.
- Reading saved per day (05:00 to 05:00) and period; × hides the band and keeps it. `/athkar`: status, on/off, style, color, `morning|evening reset`. Settings also in `/config`.
- Thikr line: the usage-limit thikr also shows as soon as a response reports a full usage window.

## 0.2.0

- Thikr line: tasabih join Claude's working line: starting phrases, then a thinking order through tools, a writing pair while Claude answers, and a long group while compacting, a subagent works, or a tool runs 10 s or more. Starting phrase random per turn. Speed auto (1 s + 0.5 s per word) by default, or fixed seconds. Claude's step text on desktop and any status message stay, with the thikr after them; the terminal's decorative verb is replaced.
- End of turn: تَمَّ بِحَمْدِ اللَّهِ.
- Usage limit: حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ above the prompt in Claude orange until the limit resets.
- Salawat mode: `/thikr mode salawat` shows one salawat for each whole turn, a different one each turn.
- `/thikr` command: on/off, speed, tashkeel, end, mode. Settings also in `/config`.

## 0.1.0

- Project scaffold: manifest, marketplace, hooks entry, state contract, tests.
