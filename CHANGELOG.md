# Changelog

## 0.4.0

- Prayer line placement (P4a): the prayer line (`☾ العصر ١٥:٥٩`, the live countdown, `حان وقت صلاة العصر`) moves from the status line to its own row in the band above the prompt, right-aligned in Claude orange, in the terminal and the desktop app. The status line is no longer used. Rows stack: the setup and review rows, thikr's usage-limit row and the prayer row each stay. While the minaret plays it takes the prayer row's place.
- The live countdown now starts the second the reminder window opens (a timer for that moment) instead of on the next 30 s tick.
- Shared prayer helpers (names, digits, the prayer line text) moved to `src/prayer/`; thikr no longer imports salah's folder.

## 0.3.0

- Prayer times (`/salah`): calculated on the machine with adhan-js, no location service or API. The first prompt after install offers the city named by the time zone, or any city typed in any language (Claude reads it into coordinates). Each country's official Sunni method, else Muslim World League; Asr by the majority.
- Review form: today's times with − and + per prayer to match the user's mosque.
- Status line: `salah` is `always` (next prayer all day), `reminder` (default: only in the reminder window) or `off`. A live mm:ss countdown (`☾ العصر ١٩:٤٢`, updated every second, 30 s ticks outside the window) in the reminder window (`salahReminder`, 5 to 60 minutes, default 20), and حان وقت صلاة … for 15 minutes once a prayer is in (`salahAdhan`). Sunrise is in today's times only. One in-app toast when the window starts, never an OS notification.
- `/salah` commands: `help` (a table), `always` · `reminder` · `off`, `reminder <5-60>`, `adhan on` · `off`, `city` (replaces `setup`), `method`, `adjust`. `/muslim help [feature]` shows the command tables.
- Adhan moment (terminal and desktop): when a prayer comes in and `salahAdhan` is on, a text minaret rises row by row above the prompt for about 3 seconds beside «حان وقت صلاة العصر», once per prayer, never during a survey; the status line keeps the call for 15 minutes.
- Thikr before a prayer: inside the reminder window the first phrase of each thikr turn is حَيَّ عَلَى الصَّلَاةِ · العصر بعد ١٠ د (prayer and whole minutes left); salah shares the window through `$.state` `salahWindow`. Salawat mode shows it first too.
- Settings in `/config`: `salah`, `salahReminder`, `salahAdhan`, `salahPlace`, `salahMethod`, `salahAdjust`.

## 0.2.0

- Thikr line: tasabih join Claude's working line: starting phrases, then a thinking order through tools, a writing pair while Claude answers, and a long group while compacting, a subagent works, or a tool runs 10 s or more. Starting phrase random per turn. Speed auto (1 s + 0.5 s per word) by default, or fixed seconds. Claude's step text on desktop and any status message stay, with the thikr after them; the terminal's decorative verb is replaced.
- End of turn: تَمَّ بِحَمْدِ اللَّهِ.
- Usage limit: حَسْبِيَ اللَّهُ وَنِعْمَ الْوَكِيلُ above the prompt in Claude orange until the limit resets.
- Salawat mode: `/thikr mode salawat` shows one salawat for each whole turn, a different one each turn.
- `/thikr` command: on/off, speed, tashkeel, end, mode. Settings also in `/config`.

## 0.1.0

- Project scaffold: manifest, marketplace, hooks entry, state contract, tests.
