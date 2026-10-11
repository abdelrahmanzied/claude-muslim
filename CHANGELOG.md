# Changelog

## Unreleased

- `/salah athan test` shows the athan moment now for the next prayer without changing settings: the card on the desktop, the minaret in the terminal.
- Desktop athan card: when a prayer comes in (`salahAthan`) the desktop shows a full-width card above the prompt, built like the athkar band, with a photo of the Haram behind «حان وقت صلاة المغرب» and the time in Arabic digits and a × to close; it stays until closed or the call's 15 minutes end. The minaret is terminal only.
- Prayer times (`/salah`): calculated on the machine with the vendored athan library (from [adhan-js](https://github.com/batoulapps/adhan-js)), no location service or API. The first prompt after install offers the city named by the time zone, or any city typed in any language (Claude reads it into coordinates). Each country's official Sunni method, else Muslim World League; Asr by the majority.
- Review form: today's times with − and + per prayer to match the user's mosque.
- Status line: `salah` is `always` (next prayer all day), `reminder` (default: only in the reminder window) or `off`. A live mm:ss countdown (`☾ العصر ١٩:٤٢`, updated every second, 30 s ticks outside the window) in the reminder window (`salahReminder`, 5 to 60 minutes, default 20), and حان وقت صلاة … for 15 minutes once a prayer is in (`salahAthan`). Sunrise is in today's times only. No toast when the window starts and never an OS notification: the footer line is the only reminder.
- `/salah` commands: `help` (a table), `always` · `reminder` · `off`, `reminder <5-60>`, `athan on` · `off`, `city` (replaces `setup`), `method`, `adjust`. `/muslim help [feature]` shows the command tables.
- Athan moment (terminal and desktop): when a prayer comes in and `salahAthan` is on, a text minaret rises row by row above the prompt for about 3 seconds beside «حان وقت صلاة العصر», once per prayer, never during a survey; the status line keeps the call for 15 minutes.
- Thikr before a prayer: inside the reminder window the first phrase of each thikr turn is حَيَّ عَلَى الصَّلَاةِ · العصر بعد ١٠ د (prayer and whole minutes left); salah shares the window through `$.state` `salahWindow`. Salawat mode shows it first too.
- Settings in `/config`: `salah`, `salahReminder`, `salahAthan`, `salahPlace`, `salahMethod`, `salahAdjust`. The call setting is spelled athan (`salahAthan`); a saved `salahAdhan` is still read.
- Prayer line placement: the prayer line (`☾ العصر ١٥:٥٩`, the live countdown, `حان وقت صلاة العصر`) moves from the status line to the prompt footer's mode labels (`SessionMode`), before the model name, as plain text in Claude orange, in the terminal and the desktop app (not an AbovePrompt row: the desktop draws that as a card). The setup and review rows and the minaret moment stay above the prompt.
- The prayer line's timer now starts from the first draw of the footer or the band and a redraw asked at session start, so the countdown no longer freezes after `/salah off` then `/salah reminder 60`.
- The live countdown now starts the second the reminder window opens (a timer for that moment) instead of on the next 30 s tick.
- The mod clears the old status-line entry (`muslim ☾ …`) at session start, so a hot reload no longer leaves it next to the model name.
- Shared prayer helpers (names, digits, the prayer line text) moved to `src/shared/pray/`; thikr no longer imports salah's folder.

## 0.2.0

- Thikr line: tasabih join Claude's working line: starting phrases, then a thinking order through tools, a writing pair while Claude answers, and a long group while compacting, a subagent works, or a tool runs 10 s or more. Starting phrase random per turn. Speed auto (1 s + 0.5 s per word) by default, or fixed seconds. Claude's step text on desktop and any status message stay, with the thikr after them; the terminal's decorative verb is replaced.
- End of turn: تَمَّ بِحَمْدِ اللَّهِ.
- Usage limit: حَسْبِيَ اللَّهُ وَنِعْمَ الْوَكِيلُ above the prompt in Claude orange until the limit resets.
- Salawat mode: `/thikr mode salawat` shows one salawat for each whole turn, a different one each turn.
- `/thikr` command: on/off, speed, tashkeel, end, mode. Settings also in `/config`.

## 0.1.0

- Project scaffold: manifest, marketplace, hooks entry, state contract, tests.
