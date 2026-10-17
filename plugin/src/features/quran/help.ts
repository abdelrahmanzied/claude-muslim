import { helpReply, type HelpRow } from '../../table.ts'
export const QURAN_COMMANDS: readonly HelpRow[] = [
  ['/quran', 'Open the Muslim pane at its Quran card; in a terminal, show reciter, surah, time and state', 'pane: DESKTOP ONLY'],
  ['/quran play', 'Play an available surah; whole files advance on natural end; large recordings use quarters', '`<surah>`: number 1–114 or Arabic name; DESKTOP ONLY'],
  ['/quran stop', 'Stop playback or pending preparation', ''],
  ['/quran repeat', 'Toggle repeating the whole surah for this session; a split surah plays every quarter, then starts over', 'off (default) · surah repeat; mutually exclusive with quarter repeat'],
  ['/quran repeat segment', 'Toggle repeating the current quarter; turns surah repeat off, and the other way round', 'split surahs only; off (default)'],
  ['/quran next` · `/quran prev', 'Play the next or previous quarter when split, otherwise the next available surah; stop at the ends', ''],
  ['/quran retry', 'Check the recording size and timing metadata again', ''],
  ['/quran reciter', 'List complete Hafs recordings, or choose one; use the next available surah if needed, restarting if playing', '`<number or name>`: remember a recording; Minshawi murattal (default)'],
  ['/quran help', 'This table', ''],
]
export const quranHelp = (): string => helpReply('Quran', QURAN_COMMANDS)
