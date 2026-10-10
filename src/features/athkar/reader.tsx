import type { ClientModule, RenderElement } from 'claude-code'

import type { Circle, ReaderProps } from './look.ts'

// The athkar reader, drawn above the prompt. It runs on the drawing thread:
// it keeps what is only on screen (cover, active, the moving progress head)
// and posts every count, undo and move to the hooks module, which keeps the
// reading. Click, Space or Enter count; right click or Backspace undo (or go
// back a thikr at 0); ← next, → previous (Arabic reads right to left).

type Local = {
  // Past the cover this session.
  isOpen: boolean
  // Lit up by a click; idle for a while, it fades back.
  isActive: boolean
  lastInput: number
  // The progress line as drawn, easing toward the real value.
  shown: number
  // Frames, for the head's slow pulse.
  frame: number
}

const TICK_MS = 100
// Faded again after this long with no count.
const IDLE_MS = 90_000
// One full pulse of the progress head, in frames.
const PULSE = Math.round(2600 / TICK_MS)

const COVER_KEYS = '⎵ ↵ count · ← → move · right click ⌫ undo · esc pause'

const Reader: ClientModule<ReaderProps, Local> = (props, surface) => {
  const { Box, Text, Button } = surface.elements
  const local: Local = surface.state ?? { isOpen: false, isActive: false, lastInput: 0, shown: props.progress, frame: 0 }
  const { look } = props

  if (surface.state === undefined) {
    surface.setState(local)
    surface.every(TICK_MS, () => {
      const now = Date.now()
      const s = surface.state ?? local
      const target = latest.progress
      const shown = Math.abs(target - s.shown) < 0.002 ? target : s.shown + (target - s.shown) * 0.25
      const isActive = s.isActive && now - s.lastInput < IDLE_MS
      // At rest (faded, line in place) nothing moves: no redraw.
      if (!isActive && !s.isActive && shown === s.shown) return
      surface.setState({ ...s, shown, isActive, frame: s.frame + 1 })
    })
  }
  latest = props

  const touch = (s: Local, change: Partial<Local>) => surface.setState({ ...s, ...change, lastInput: Date.now() })

  surface.onPointer(event => {
    if (event.type !== 'down') return
    const s = surface.state ?? local
    if (props.isDone) {
      if (event.button === 'right') surface.post({ act: 'back' })
      else surface.post({ act: 'hide' })

      return
    }
    // The first click opens or wakes the reader; it never counts.
    if (!s.isOpen || !s.isActive) {
      touch(s, { isOpen: true, isActive: true })
      if (event.button === 'right' && s.isOpen) surface.post({ act: 'back' })

      return
    }
    touch(s, {})
    surface.post({ act: event.button === 'right' ? 'back' : 'count' })
  })

  surface.onKey(event => {
    const s = surface.state ?? local
    const isCount = event.key === ' ' || event.key === 'space' || event.key === 'return'
    if (!s.isOpen || !s.isActive) {
      if (isCount) touch(s, { isOpen: true, isActive: true })

      return
    }
    touch(s, {})
    if (isCount) surface.post({ act: 'count' })
    else if (event.key === 'backspace') surface.post({ act: 'back' })
    else if (event.key === 'left') surface.post({ act: 'next' })
    else if (event.key === 'right') surface.post({ act: 'previous' })
  })

  const isLit = local.isActive
  // Skies light up from faded; Sand and Outline breathe.
  const accent = isLit || look.style !== 'sky' ? look.ring : look.dim
  const breathing = look.style !== 'sky' && isLit
  const wave = (1 - Math.cos((local.frame % PULSE) / PULSE * Math.PI * 2)) / 2
  const frame = look.style === 'sky' ? undefined : breathing ? mixHex(look.ring, look.under, 0.55 * (1 - wave)) : look.track

  const close = (
    <Button key="hide" plain label="×" onPress={() => surface.post({ act: 'hide' })} />
  )

  const shell = (children: RenderElement[]) => (
    <Box
      flexDirection="column"
      paddingX={2}
      backgroundColor={look.background}
      borderStyle={frame ? 'round' : undefined}
      borderColor={frame}
      width="100%"
    >
      {children}
    </Box>
  )

  if (props.isDone) {
    return shell([
      <Box key="done" flexDirection="row-reverse" justifyContent="space-between" alignItems="center" paddingY={1}>
        <Text bold color={look.ring}>{props.end}</Text>
        <Text color={look.dim}>{props.endHint}</Text>
      </Box>,
    ])
  }

  if (!local.isOpen) {
    return shell([
      <Box key="cover" flexDirection="row-reverse" justifyContent="space-between" alignItems="center" paddingY={1} gap={2}>
        <Text bold color={look.ring}>{props.title}</Text>
        <Text color={look.dim} wrap="wrap">{`click ${props.hasBegun ? 'continue' : 'start'} · ${COVER_KEYS}`}</Text>
        {close}
      </Box>,
    ])
  }

  return shell([
    <Box key="meta" flexDirection="row-reverse" justifyContent="space-between">
      <Text color={look.dim}>{[props.note, props.position].filter(Boolean).join(' · ')}</Text>
      {close}
    </Box>,
    <Box key="text" flexDirection="column" alignItems="flex-end">
      <Text color={isLit ? look.ink : look.dim} wrap="wrap">{props.text}</Text>
    </Box>,
    <Box key="count" flexDirection="row-reverse" flexWrap="wrap" alignItems="center" columnGap={1}>
      {props.circles.map((c, i) => circle(surface.elements, c, i, accent))}
      {props.choices.length > 0 ? choice(surface.elements, props, accent, surface.post) : null}
    </Box>,
    horizon(surface.elements, surface.columns - 4, local.shown, accent, look, local.frame),
  ])
}

// The props of the last draw, for the frame clock's easing.
let latest: ReaderProps

const circle = (elements: ReaderElements, c: Circle, i: number, accent: string) => {
  const { Box, Text } = elements
  const isFilled = c.state !== 'open'

  return (
    <Box key={`c${i}`} borderStyle="round" borderColor={accent} backgroundColor={c.state === 'done' ? accent : c.fill} paddingX={1}>
      <Text color={isFilled ? '#ffffff' : accent} bold={c.state === 'filling'}>{c.label}</Text>
    </Box>
  )
}

// The 10 | 100 switch: the picked side in the main color, the other in white.
const choice = (elements: ReaderElements, props: ReaderProps, accent: string, post: (data: { act: 'choose'; times: number }) => void) => {
  const { Box, Button, Text } = elements

  return (
    <Box key="choice" flexDirection="row-reverse" borderStyle="round" borderColor={accent}>
      {props.choices.map(c => (
        <Button key={`n${c.times}`} plain label={c.label} onPress={() => post({ act: 'choose', times: c.times })}>
          <Text color={c.isPicked ? '#ffffff' : props.look.style === 'sky' ? '#ffffff' : props.look.ink} backgroundColor={c.isPicked ? accent : undefined}>{` ${c.label} `}</Text>
        </Button>
      ))}
    </Box>
  )
}

// Horizon glow: a soft line along the bottom, filled from the right, its
// head pulsing slowly where the reading stands.
const horizon = (elements: ReaderElements, columns: number, shown: number, accent: string, look: ReaderProps['look'], frame: number) => {
  const { Box, Text } = elements
  const width = Math.max(10, columns)
  const filled = Math.round(width * Math.min(1, Math.max(0, shown)))
  const wave = (1 - Math.cos((frame % PULSE) / PULSE * Math.PI * 2)) / 2
  const head = filled > 0 && filled < width ? mixHex(accent, '#ffffff', 0.15 + 0.5 * wave) : accent

  return (
    <Box key="horizon" flexDirection="row" marginTop={0}>
      <Text color={look.track}>{'─'.repeat(Math.max(0, width - filled - (filled > 0 && filled < width ? 1 : 0)))}</Text>
      {filled > 0 && filled < width ? <Text color={head}>●</Text> : null}
      <Text color={accent}>{'━'.repeat(filled)}</Text>
    </Box>
  )
}

type ReaderElements = Parameters<ClientModule>[1]['elements']

const mixHex = (from: string, to: string, amount: number) => {
  const parse = (v: string) => {
    const n = Number.parseInt(v.slice(1), 16)

    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const a = parse(from)
  const b = parse(to)

  return `#${a.map((v, i) => Math.round(v + ((b[i] ?? 0) - v) * amount).toString(16).padStart(2, '0')).join('')}`
}

export default Reader
