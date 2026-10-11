// Shared terminal Arabic setting; thikr keeps its existing command help.
export const muslimHelp = (feature?: string): string => {
  if (feature && feature !== 'arabic-fix' && feature !== 'thikr') return `No feature "${feature}". Features: thikr, arabic-fix.`
  if (feature === 'thikr') return 'Thikr: /thikr (status and help)'

  return 'Arabic fix: /muslim arabic-fix on | off | auto (on: mod joins and reorders; off: terminal shows Arabic; auto: detect)\n\nThikr: /thikr (status and help)'
}
