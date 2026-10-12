// Desktop-only artwork. Native controls remain separate, since Button accepts Text only.
export const CARD = { background: '#1f2b25', border: '#2f4a3c', accent: '#7fc3a0', secondary: '#b9d8c7', title: '#f1efe9', ink: '#13201a' } as const
const escapeXml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export function titleSvg(title: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="48" viewBox="0 0 320 48"><text x="316" y="33" text-anchor="end" font-family="sans-serif" font-size="26" font-weight="600" fill="${CARD.title}">${escapeXml(title)}</text></svg>`
}
export function progressSvg(elapsed: number, total: number | null): string {
  const fraction = total !== null && total > 0 && Number.isFinite(total) && Number.isFinite(elapsed) ? Math.max(0, Math.min(1, elapsed / total)) : 0
  const width = Math.round(fraction * 32000) / 100
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="6" viewBox="0 0 320 6"><rect width="320" height="6" rx="3" fill="${CARD.border}"/><rect x="${320 - width}" width="${width}" height="6" rx="3" fill="${CARD.accent}"/></svg>`
}
export function controlSvg(kind: 'prev' | 'next' | 'play' | 'stop'): string {
  const primary = kind === 'play' || kind === 'stop'
  const size = primary ? 56 : 46
  const color = primary ? CARD.ink : '#cfe6d9'
  const shape = kind === 'stop' ? `<rect x="5" y="5" width="14" height="14" rx="2" fill="${color}"/>`
    : kind === 'play' ? `<path d="M7 4l13 8-13 8z" fill="${color}"/>`
    : `<path d="${kind === 'prev' ? 'M5 5l9 7-9 7z M19 5v14' : 'M19 5l-9 7 9 7z M5 5v14'}" fill="none" stroke="${color}" stroke-width="2"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="${primary ? CARD.accent : CARD.background}" stroke="${CARD.border}"/><svg x="${(size - 20) / 2}" y="${(size - 20) / 2}" width="20" height="20" viewBox="0 0 24 24">${shape}</svg></svg>`
}
// Isolate each numeric run from surrounding Arabic without modifying authored words.
export const ltrTime = (time: string): string => `\u2066${time}\u2069`

export function bookSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${CARD.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/></svg>`
}
