// Shared terminal Arabic picker; thikr keeps its existing command help.
export const muslimHelp = (feature?: string): string => {
  if (feature && feature !== 'terminal-arabic' && feature !== 'thikr' && feature !== 'tashkeel') return `No feature "${feature}". Features: thikr, terminal-arabic, tashkeel.`
  if (feature === 'tashkeel') return '/muslim tashkeel on | off — show or hide Arabic diacritics everywhere'
  if (feature === 'terminal-arabic') return '/muslim terminal-arabic — choose how Arabic shows in this terminal (applies to all features)'
  if (feature === 'thikr') return 'Thikr: /thikr (status and help)'

  return '/muslim tashkeel on | off — show or hide Arabic diacritics everywhere\n/muslim terminal-arabic — choose how Arabic shows in this terminal (applies to all features)\n\nThikr: /thikr (status and help)'
}
