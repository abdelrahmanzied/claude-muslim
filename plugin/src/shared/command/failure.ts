export const commandFailure = (command: string, args: string, error: { kind: string; message?: string } | undefined): string => {
  const typed = args.trim()
  const name = `/${command}${typed ? ` ${typed}` : ''}`
  let reason = error?.kind === 'timeout' ? 'it took too long'
    : error?.kind === 'throw' ? (error.message ?? '').replace(/\s+/g, ' ').trim().replace(/\.+$/, '') : ''
  if (reason.length > 160) reason = `${reason.slice(0, 159).trimEnd().replace(/\.+$/, '')}…`
  return `Could not complete ${name}${reason ? `: ${reason}` : ''}. Try again.`
}
