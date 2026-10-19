export const withSetupHint = (text: string, showing: boolean): string => {
  if (!showing) return text
  const trimmed = text.trimEnd()
  return `${trimmed}${/[.!?:]$/.test(trimmed) ? '' : '.'} It shows once the setup above is answered.`
}
