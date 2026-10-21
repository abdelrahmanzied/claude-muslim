// Which operating systems Claude Code plays audio on, the card's note where it
// does not, and the browser fallback. Pure: install.tsx reads the engine values.

// Claude Code's `$.audio.play` uses `afplay`, so only macOS plays today. Windows
// and Linux get the note; anything else (macOS, unknown) gets none.
export type AudioOs = 'Windows' | 'Linux' | null
export function audioOsOf(envOs: string | undefined, uname: string | undefined): AudioOs {
  if (envOs === 'Windows_NT') return 'Windows'
  return uname?.trim() === 'Linux' ? 'Linux' : null
}

// The Claude Code version (`$.session.version().version`) a clip last really
// played on, on Windows or Linux. A newer version is checked again.
export const AUDIO_WORKS_KEY = 'quran.audioWorks'
export const audioNote = (os: AudioOs, worksOn: unknown, version: string | undefined): string =>
  os && !(version && worksOn === version) ? `الصوت غير مدعوم على ${os} بعد` : ''

// The surah's own MP3; a split surah adds the selected quarter's times as a media fragment.
export function browserUrl(url: string, segment?: { startMs: number; endMs: number }): string {
  if (!segment || !Number.isFinite(segment.startMs) || !Number.isFinite(segment.endMs) || segment.endMs <= segment.startMs || segment.startMs < 0) return url
  return `${url}#t=${Math.floor(segment.startMs / 1000)},${Math.ceil(segment.endMs / 1000)}`
}
// The default browser opens it: `start` on Windows (its empty first argument is the window title), `xdg-open` on Linux.
// Only a plain https URL is passed on: cmd reads `& | < > ^ " %` itself, so a URL holding one is refused.
export function openArgv(os: Exclude<AudioOs, null>, url: string): string[] | null {
  if (!/^https:\/\/[^\s&|<>^"%]+$/.test(url)) return null
  return os === 'Windows' ? ['cmd', '/d', '/c', 'start', '', url] : ['xdg-open', url]
}
