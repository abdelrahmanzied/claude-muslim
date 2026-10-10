# Changelog

## 0.3.0

- Prayer times (`/salah`): calculated on the machine with adhan-js, no location service or API. The first prompt after install offers the city named by the time zone, or any city typed in any language (Claude reads it into coordinates). Each country's official Sunni method, else Muslim World League; Asr by the majority.
- Review form: today's times with − and + per prayer to match the user's mosque.
- Status line: `salah` is `always` (next prayer all day), `reminder` (default: only in the reminder window) or `off`. A countdown in the reminder window (`salahReminder`, 5 to 60 minutes, default 20), and حان وقت صلاة … for 15 minutes once a prayer is in (`salahAdhan`). Sunrise is in today's times only. One in-app toast when the window starts, never an OS notification.
- Settings in `/config`: `salah`, `salahReminder`, `salahAdhan`, `salahPlace`, `salahMethod`, `salahAdjust`.

## 0.2.0

- Thikr line: tasabih join Claude's working line: starting phrases, then a thinking order through tools, a writing pair while Claude answers, and a long group while compacting, a subagent works, or a tool runs 10 s or more. Starting phrase random per turn. Speed auto (1 s + 0.5 s per word) by default, or fixed seconds. Claude's step text on desktop and any status message stay, with the thikr after them; the terminal's decorative verb is replaced.
- End of turn: تَمَّ بِحَمْدِ اللَّهِ.
- Usage limit: حَسْبِيَ اللَّهُ وَنِعْمَ الْوَكِيلُ above the prompt in Claude orange until the limit resets.
- Salawat mode: `/thikr mode salawat` shows one salawat for each whole turn, a different one each turn.
- `/thikr` command: on/off, speed, tashkeel, end, mode. Settings also in `/config`.

## 0.1.0

- Project scaffold: manifest, marketplace, hooks entry, state contract, tests.
