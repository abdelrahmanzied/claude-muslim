# muslim

A Claude Code mod for Muslim developers. While Claude works, its working line carries a short thikr, in Claude's own font and colors, in the terminal and the desktop app. It also brings morning, evening and after-salah athkar, prayer times with an athan moment, a Quran recitation player and the Muslim pane.

## Install

```
/plugin marketplace add abdelrahmanzied/claude-muslim --sparse .claude-plugin plugin
/plugin install muslim@claude-muslim
```

More ways to install and update: the [repository README](https://github.com/abdelrahmanzied/claude-muslim#readme).

## Features

### Thikr line (`/thikr`)

A thikr phrase joins Claude's working line (the spinner). Claude's step, timer and hints stay as they are.

| Moment | Phrases |
| --- | --- |
| Starting a request | بسم الله · توكلت على الله · رب اشرح لي صدري ويسر لي أمري · رب يسر ولا تعسر |
| Thinking and tools | سبحان الله · الحمد لله · لا إله إلا الله · الله أكبر · … · اللهم صل على محمد |
| Writing the answer | رب زدني علما · اللهم علمنا ما ينفعنا |
| Long waits (compacting, subagents, long commands) | لا إله إلا أنت سبحانك إني كنت من الظالمين · … |
| End of a turn | تَمَّ بِحَمْدِ اللَّهِ |
| Usage limit reached | حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ |

**Salawat mode:** `/thikr mode salawat` shows one salawat on the Prophet ﷺ for each whole request, a different one each request.

### Morning and evening athkar (`/athkar`)

A reader above the prompt for the morning athkar (05:00–17:00) and the evening athkar (17:00–05:00), from Hisn al-Muslim. Click, Space or Enter to count; right click or Backspace to take one back; ← → to move. It moves on by itself after each thikr, and your reading is saved for the day. After each prayer's athan the reader offers the athkar after salah by itself (when prayer times are set), and waits if you are still counting the morning or evening set. On desktop it sits on a sky that follows the time of day. Details: [docs/features/athkar/athkar.md](https://github.com/abdelrahmanzied/claude-muslim/blob/main/docs/features/athkar/athkar.md).

### Prayer times (`/salah`)

The next prayer under the prompt (`☾ العصر ١٥:٥٩`) all day, or only the minutes before it (20 by default), with a live mm:ss countdown (`☾ العصر ١٩:٤٢`) and, when it comes in, a small minaret that rises above the prompt for about 3 seconds, then folds to one line with a × (on the desktop app, a photo card that folds to a slim row after a minute); it closes by itself after 15 minutes, and the footer shows `حان وقت صلاة …` (no toast, no OS notification). Calculated on your machine; on first use the mod offers the city of your time zone, or any city you type in any language, then shows today's times so you can match them to your mosque. While Claude works inside that window, the thikr turn opens with `حَيَّ عَلَى الصَّلَاةِ · العصر بعد ١٠ د`. Details: [docs/features/salah/salah.md](https://github.com/abdelrahmanzied/claude-muslim/blob/main/docs/features/salah/salah.md).

### Quran recitation (`/quran`)

A desktop pane player with searchable Hafs recordings, available surahs and quarters for large recordings. Playback is explicit, with stop, previous/next and mutually exclusive surah or quarter repeat. The footer button toggles the pane; your recording choice is remembered. Details: [docs/features/quran/quran.md](https://github.com/abdelrahmanzied/claude-muslim/blob/main/docs/features/quran/quran.md).

## Install

Pick whichever fits where you are. All three install the same mod, at the user scope, so it runs in every project, in the terminal and in the Claude desktop app.

**From your shell** (outside Claude):

```bash
claude plugin marketplace add abdelrahmanzied/claude-muslim
```

```bash
claude plugin install muslim@claude-muslim
```

Then start Claude Code, or run `/reload-plugins` in a session that is already open.

**Inside a Claude Code session in the terminal:**

```
/plugin install muslim --marketplace abdelrahmanzied/claude-muslim
```

Answer `y` to add the marketplace, then pick the user scope.

**Inside any session, desktop app or terminal:** paste this prompt to Claude. It installs the mod, or updates it if it is already installed.

```text
Set up the Claude Code plugin "muslim" for all my sessions (user scope):
1. Run `claude plugin marketplace list`. If `claude-muslim` is not listed, run `claude plugin marketplace add abdelrahmanzied/claude-muslim`; otherwise run `claude plugin marketplace update claude-muslim`.
2. Run `claude plugin list`. If `muslim@claude-muslim` is not installed, run `claude plugin install muslim@claude-muslim --scope user`; otherwise run `claude plugin update muslim@claude-muslim`.
3. Show me what each step printed, then tell me to run /reload-plugins.
```

Run `/reload-plugins` when Claude asks, and the mod is active. `/muslim` shows the installed version and your settings.

### Muslim pane (`/muslim pane`)

A docked «☾ Muslim» pane on the desktop app that gathers today's prayers, the Quran player and the athkar progress in three cards; a `☾ Muslim` button in the prompt footer toggles it. In a terminal, `/muslim pane` prints the same as plain text. Details: [docs/features/muslim-pane/muslim-pane.md](https://github.com/abdelrahmanzied/claude-muslim/blob/main/docs/features/muslim-pane/muslim-pane.md).

## Use

| Command | What it does |
| --- | --- |
| `/thikr` | Show the current settings |
| `/thikr help` | Table of every `/thikr` command |
| `/thikr on` · `off` | Turn the thikr line on or off |
| `/thikr speed auto` | Each phrase stays for its reading time: 1 s + 0.5 s per word (default) |
| `/thikr speed <1-60>` | Every phrase stays the same number of seconds |
| `/thikr end on` · `off` | تَمَّ بِحَمْدِ اللَّهِ at the end of a turn |
| `/thikr mode all` · `salawat` | Every group in turn, or one salawat per request |
| `/thikr demo` | Play every moment by itself in a real 30 s turn (it uses tokens and leaves a message in the transcript): a phrase every 1.5 s, then the end-of-turn word and the usage-limit line for 3 s; no setting or saved state changes |
| `/athkar` | Show today's athkar status and help, and show the athkar again if hidden |
| `/athkar help` | Table of every `/athkar` command |
| `/athkar on` · `off` | Turn the athkar on or off |
| `/athkar morning` · `evening` · `after-salah` | Open that reader, even outside its hours; after-salah is also offered by itself after the athan card |
| `/athkar <set> reset` | Read that set again from the start (`morning reset`, `evening reset`, `after-salah reset`) |
| `/athkar style sky` · `frame` | The look on desktop: a sky that follows the time of day (default), or plain. The terminal always shows the frame |
| `/athkar demo` · `demo sky` · `demo frame` | Play the looks in motion, for videos or to preview them (sky 33.2 s on desktop; frame 24.2 s on either surface); nothing is saved |
| `/muslim color` · `color orange` · `green` · `yellow` · `blue` | Show or change the main color of the whole mod (default: Claude orange) |
| `/salah` | Place, method and mode, then today's prayer times |
| `/salah help` | Table of every `/salah` command |
| `/salah city` · `city <name or lat, lng>` | Pick your city by question, or by name in any language |
| `/salah adjust` | Match today's times to your mosque, a minute at a time |
| `/salah method <name>` | `auto` (your country's own) or a named method |
| `/salah show always` · `<minutes>` · `off` | Show the next pray all day, only that many minutes before it (e.g. `show 20`), or hide it |
| `/salah athan on` · `off` | `حان وقت صلاة …` when a prayer comes in |
| `/salah demo` | Preview Fajr at 05:00 without a city: desktop 5 s open, 3 s folded; terminal 3.01 s rise, 3 s folded; real athan state stays untouched, nothing is saved |
| `/quran` | Open the Muslim pane at the Quran player (desktop); on a terminal, show the status |
| `/quran help` | Table of every `/quran` command |
| `/quran play <surah>` | Play an available surah by number or Arabic name |
| `/quran stop` | Stop playback or pending preparation |
| `/quran next` · `/quran prev` | Adjacent quarter when split, otherwise the next or previous available surah |
| `/quran repeat` · `/quran repeat segment` | Toggle surah or current-quarter repeat; mutually exclusive |
| `/quran retry` | Refresh recording size and timing metadata |
| `/quran reciter` · `/quran reciter <number or name>` | List recordings or remember a choice |
| `/muslim` | Version, each feature's main state and the shared settings; a hint points to help |
| `/muslim tashkeel on` · `off` | Show or hide Arabic diacritics on desktop (the terminal never shows them) |
| `/muslim update` | Update muslim from GitHub (only this plugin) and reload plugins; says the new version, or that you have the latest |
| `/muslim pane` | Open the Muslim pane on desktop; a plain text summary in the terminal |
| `/muslim terminal-arabic` | Choose how Arabic shows in this terminal |
| `/muslim help` · `help <feature>` | Command tables of every feature, or one (`thikr`, `athkar`, `salah`, `quran`) or one shared command (`color`, `tashkeel`, `terminal-arabic`) |
| `/muslim pane demo` | Desktop: a 10 s tour of the Muslim pane (cards unfold, the Quran card plays without sound, athkar fill to done, then everything folds back and the pane returns to how it was); nothing is saved; a terminal says it is desktop only |
| `/muslim demo` | Play the thikr, athkar, salah (athan, then athkar after salah) and Muslim pane (desktop) demos in order: thikr in a real turn (about 30 s; it uses tokens and leaves a message in the transcript), its 3 s usage-limit hold, athkar (desktop sky 33.2 s; terminal frame 24.2 s), then the salah athan moment (`/salah demo`), then the Muslim pane tour on desktop; 0.1 s between demos, no setting or saved state changes; no city needed; another request while playing says so |

Shared and feature settings are also in `/config`; Quran remembers its recording in the local store to avoid reloading playback. The shared `color` setting changes existing main-color accents across athkar, salah, Quran, thikr's usage-limit line and the terminal Arabic survey label. Orange text follows Claude's theme; other choices use light/dark shades.

## Known issues

- Some terminals don't join Arabic letters or show them right to left. The desktop app and most modern terminals do.

## License

MIT
