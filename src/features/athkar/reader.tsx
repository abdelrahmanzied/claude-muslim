import type { ClientModule, RenderElement, SvgProps } from 'claude-code'

import { bandSvg, closeArea, coverHint, frameOf, pixelOf } from './band.ts'
import type { ReaderProps } from './look.ts'

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
  // When a press lit the band here, ahead of the hooks module's answer.
  litAt?: number
  // The pointer is over the ×.
  hoverClose?: boolean
}

const TICK_MS = 100
// One full pulse of the progress head, in frames.
const PULSE = Math.round(2600 / TICK_MS)

const COVER_KEYS = '⎵ ↵ count · ← → move · right click ⌫ undo'

// How long a press lights the band here before the hooks module must agree.
const LIT_MS = 3000

// The props of the last draw, for the frame clock.
let latest: ReaderProps
// When the hooks module's picture last changed (its own clock reading, and ours then):
// a redraw made here for the pointer carries the motion on from there.
const seen = { now: -1, at: 0 }

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
    // Over the ×: it lights, drawn here at once; only a change redraws.
    if (event.type === 'move' || event.type === 'enter' || event.type === 'leave') {
      const s = surface.state ?? local
      const b = latest.band
      let hover = false
      if (b && event.type !== 'leave' && surface.columns > 0) {
        const { px, py } = pixelOf(b, event.x, event.y, surface.columns, surface.rows)
        const a = closeArea({ ...b, isActive: b.isActive || (s.litAt !== undefined && Date.now() - s.litAt < LIT_MS) })
        hover = px >= a.x0 && px <= a.x1 && py >= a.y0 && py <= a.y1
      }
      if (hover !== !!s.hoverClose) surface.setState({ ...s, hoverClose: hover })
    }
    if (event.type === 'enter' || event.type === 'leave') surface.post({ act: event.type })
    if (event.type !== 'down') return
    // Light the picture at once; the hooks module's own redraw follows.
    if (latest.band && !latest.band.isActive) surface.setState({ ...(surface.state ?? local), litAt: Date.now() })
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
    // Once the hooks module has lit it too, its word holds: it may fade it again.
    if (props.band.isActive && local.litAt !== undefined) surface.setState({ ...local, litAt: undefined })
    const isLit = props.band.isActive || (local.litAt !== undefined && Date.now() - local.litAt < LIT_MS)
    // Motion carries on across a redraw made here: the clocks move on by what has passed since the hooks module drew.
    if (props.band.now !== seen.now) {
      seen.now = props.band.now
      seen.at = Date.now()
    }
    const gone = Date.now() - seen.at
    const lit = {
      ...props.band,
      isActive: isLit,
      hoverClose: !!local.hoverClose,
      now: props.band.now + gone,
      glowMs: props.band.glowMs === undefined ? undefined : props.band.glowMs + gone,
      finaleMs: props.band.finaleMs === undefined ? undefined : props.band.finaleMs + gone,
    }
    const band = lit.card && surface.columns > 0 ? { ...lit, drawWidth: (surface.columns + 1) * lit.card.ch } : lit
    const { width, height } = frameOf(band)
    const alt = band.phase === 'cover' ? band.title : band.text
    const picture: SvgProps = { source: bandSvg(band), alt, width, height }

    return <Box width="100%">{h('Svg', picture)}</Box>
  }

  const { look } = props
  const isLit = props.isActive
  // Skies light up from faded; Frame breathes.
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
      // Faded, it folds to one line.
      <Box key="done" flexDirection="row-reverse" justifyContent="space-between" alignItems="center" paddingY={isLit ? 1 : 0} gap={2}>
        <Text bold color={look.style === 'sky' ? look.ink : look.ring} wrap={isLit ? 'wrap' : 'truncate-end'}>{props.end}</Text>
        <Text color={look.dim} wrap="truncate-end">{isLit ? props.endHint : props.endNote}</Text>
      </Box>,
    ])
  }

  if (props.phase === 'cover') {
    // Faded, the cover folds to one line; a press opens it.
    if (!isLit) {
      return shell([
        <Box key="rest" flexDirection="row-reverse" justifyContent="space-between" gap={2}>
          <Text bold color={look.ring}>{props.title}</Text>
          <Text color={look.dim} wrap="truncate-end">{coverHint(props.hasBegun)}</Text>
        </Box>,
      ])
    }

    return shell([
      <Box key="cover" flexDirection="row-reverse" justifyContent="space-between" alignItems="center" paddingY={1} gap={2}>
        <Text bold color={look.ring}>{props.title}</Text>
        <Text color={look.dim} wrap="wrap">{`click ${props.hasBegun ? 'continue' : 'start'} · ${COVER_KEYS}`}</Text>
        {close}
      </Box>,
    ])
  }

  // Faded, the reading folds to one row; a press opens it.
  if (!isLit) {
    return shell([
      <Box key="rest" flexDirection="row-reverse" gap={2}>
        <Box flexGrow={1} flexShrink={1}>
          <Text color={look.dim} wrap="truncate-end">{props.text.replace(/\s+/g, ' ')}</Text>
        </Box>
        <Text color={look.dim}>{props.position}</Text>
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
    horizon(surface.elements, surface.columns - 4, local.shown, accent, look, local.frame, props.left),
  ])
}

// Horizon glow: a soft line along the bottom, filled from the right. Its head
// carries the repetitions left on this thikr, " ٢ " on the main color, and
// stays whole at either end of the line.
const horizon = (elements: ReaderElements, columns: number, shown: number, accent: string, look: ReaderProps['look'], frame: number, left: string) => {
  const { Box, Text } = elements
  const width = Math.max(10, columns)
  const label = ` ${left} `
  const filled = Math.min(width - label.length, Math.max(0, Math.round(width * Math.min(1, Math.max(0, shown)))))
  const wave = (1 - Math.cos(((frame % PULSE) / PULSE) * Math.PI * 2)) / 2

  return (
    <Box key="horizon" flexDirection="row">
      <Text color={look.track}>{'─'.repeat(Math.max(0, width - filled - label.length))}</Text>
      <Text bold color="#ffffff" backgroundColor={mixHex(accent, '#ffffff', 0.15 * wave)}>{label}</Text>
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
