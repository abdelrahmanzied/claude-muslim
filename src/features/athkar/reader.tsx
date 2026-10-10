import type { ClientModule, RenderElement, SvgProps } from 'claude-code'

import { bandSvg, frameOf } from './band.ts'
import type { Circle, ReaderProps } from './look.ts'

// The athkar reader's input, and its drawing in the terminal. It runs on the
// drawing thread and posts every click and key to the hooks module, which
// keeps the reading and decides what each one does. On the desktop it draws
// the band as one picture and its clicks land on it; in the terminal it draws
// the band as text.

type Local = {
  // The progress line as drawn, easing toward the real value.
  shown: number
  // Frames, for the head's slow pulse.
  frame: number
  // The region's size last reported to the hooks module.
  size: string
}

const TICK_MS = 100
// One full pulse of the progress head, in frames.
const PULSE = Math.round(2600 / TICK_MS)

const COVER_KEYS = '⎵ ↵ count · ← → move · right click ⌫ undo · esc pause'

// The props of the last draw, for the frame clock.
let latest: ReaderProps

const Reader: ClientModule<ReaderProps, Local> = (props, surface) => {
  const { Box, Text, Button } = surface.elements
  const local: Local = surface.state ?? { shown: props.progress, frame: 0, size: '' }
  latest = props

  if (surface.state === undefined) {
    surface.setState(local)
    surface.every(TICK_MS, () => {
      const s = surface.state ?? local
      // The hooks module hit-tests clicks on the picture, so it needs the region's size.
      const size = `${surface.columns}x${surface.rows}`
      if (size !== s.size && surface.columns > 0) surface.post({ act: 'size', columns: surface.columns, rows: surface.rows })
      if (latest.isPicture) {
        if (size !== s.size) surface.setState({ ...s, size })

        return
      }
      const target = latest.progress
      const shown = Math.abs(target - s.shown) < 0.002 ? target : s.shown + (target - s.shown) * 0.25
      // At rest (faded, line in place) nothing moves: no redraw.
      if (!latest.isActive && shown === s.shown && size === s.size) return
      surface.setState({ ...s, shown, size, frame: s.frame + 1 })
    })
  }

  surface.onPointer(event => {
    if (event.type === 'enter' || event.type === 'leave') surface.post({ act: event.type })
    if (event.type !== 'down') return
    surface.post({ act: 'pointer', button: event.button ?? 'left', x: event.x, y: event.y, columns: surface.columns, rows: surface.rows })
  })

  surface.onKey(event => {
    surface.post({ act: 'key', key: event.key })
  })

  // Desktop: the picture is the region, so a click anywhere on it reaches here.
  // Svg is not in the region's element table, so it is named by its tag.
  if (props.band) {
    // Over the card the picture is drawn a cell past the region, which the
    // desktop narrows to the region: it fills it, whatever its pixels.
    const band = props.band.card && surface.columns > 0 ? { ...props.band, drawWidth: (surface.columns + 1) * props.band.card.ch } : props.band
    const { width, height } = frameOf(band)
    const alt = band.phase === 'cover' ? band.title : band.text
    const picture: SvgProps = { source: bandSvg(band), alt, width, height }

    return <Box width="100%">{h('Svg', picture)}</Box>
  }

  const { look } = props
  const isLit = props.isActive
  // Skies light up from faded; Sand and Outline breathe.
  const accent = isLit || look.style !== 'sky' ? look.ring : look.dim
  const wave = (1 - Math.cos(((local.frame % PULSE) / PULSE) * Math.PI * 2)) / 2
  const frame = look.style === 'sky' ? undefined : isLit ? mixHex(look.ring, look.under, 0.55 * (1 - wave)) : look.track

  const close = <Button key="hide" plain label="×" onPress={() => surface.post({ act: 'hide' })} />

  const shell = (children: RenderElement[]) => (
    <Box flexDirection="column" paddingX={2} backgroundColor={look.background} borderStyle={frame ? 'round' : undefined} borderColor={frame} width="100%">
      {children}
    </Box>
  )

  if (props.phase === 'done') {
    return shell([
      <Box key="done" flexDirection="row-reverse" justifyContent="space-between" alignItems="center" paddingY={1}>
        <Text bold color={look.ring}>{props.end}</Text>
        <Text color={look.dim}>{props.endHint}</Text>
      </Box>,
    ])
  }

  if (props.phase === 'cover') {
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

const circle = (elements: ReaderElements, c: Circle, i: number, accent: string) => {
  const { Box, Text } = elements

  return (
    <Box key={`c${i}`} borderStyle="round" borderColor={accent} backgroundColor={c.state === 'done' ? accent : c.fill} paddingX={1}>
      <Text color={c.state !== 'open' ? '#ffffff' : accent} bold={c.state === 'filling'}>{c.label}</Text>
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
          <Text color={c.isPicked || props.look.style === 'sky' ? '#ffffff' : props.look.ink} backgroundColor={c.isPicked ? accent : undefined}>{` ${c.label} `}</Text>
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
  const hasHead = filled > 0 && filled < width
  const wave = (1 - Math.cos(((frame % PULSE) / PULSE) * Math.PI * 2)) / 2

  return (
    <Box key="horizon" flexDirection="row">
      <Text color={look.track}>{'─'.repeat(Math.max(0, width - filled - (hasHead ? 1 : 0)))}</Text>
      {hasHead ? <Text color={mixHex(accent, '#ffffff', 0.15 + 0.5 * wave)}>●</Text> : null}
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
