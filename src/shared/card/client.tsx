import type { ClientModule, SvgProps } from 'claude-code'

import { closeArea, frameOf, pixelOf, type CardFrame } from './card.ts'

// The desktop card's Client: it draws the card's picture as the region and
// posts every click and key to the hooks module, which decides what each one
// does. The same for every card; a feature's Client module is
// `export default cardClient(build)`, `build` turning its props into the
// picture. It runs on the drawing thread.

// What every card's props carry.
export type CardProps = {
  // Lit (in color, open); faded at rest.
  isActive: boolean
  // When the hooks module drew it, so motion carries on across a redraw made here.
  now: number
}

// How the picture is drawn now, as seen here.
export type CardView = {
  // Lit: by the hooks module, or by a press here ahead of its answer.
  isLit: boolean
  // The pointer is over the ×.
  hoverClose: boolean
  // Milliseconds since the hooks module drew: clocks move on by this.
  gone: number
  // The region's width in cells, 0 before it is known.
  columns: number
}

export type CardPicture = { svg: string; alt: string; frame: CardFrame }

type Local = {
  // The region's size last reported to the hooks module.
  size: string
  // When a press lit the card here, ahead of the hooks module's answer.
  litAt?: number
  hoverClose?: boolean
}

const TICK_MS = 100
// How long a press lights the card here before the hooks module must agree.
const LIT_MS = 3000

export const cardClient = <P extends CardProps>(build: (props: P, view: CardView) => CardPicture): ClientModule<P, Local> => {
  // The last picture's frame, for the pointer.
  let shown: CardFrame | undefined
  // When the hooks module's picture last changed (its own clock reading, and ours then).
  const seen = { now: -1, at: 0 }

  return (props, surface) => {
    const { Box } = surface.elements
    const local: Local = surface.state ?? { size: '' }

    if (surface.state === undefined) {
      surface.setState(local)
      surface.every(TICK_MS, () => {
        const s = surface.state ?? local
        const size = `${surface.columns}x${surface.rows}`
        if (size === s.size || surface.columns <= 0) return
        surface.post({ act: 'size', columns: surface.columns, rows: surface.rows })
        surface.setState({ ...s, size })
      })
    }

    surface.onPointer(event => {
      // Over the ×: it lights, drawn here at once; only a change redraws.
      if (event.type === 'move' || event.type === 'enter' || event.type === 'leave') {
        const s = surface.state ?? local
        let hover = false
        if (shown && event.type !== 'leave' && surface.columns > 0) {
          const { px, py } = pixelOf(shown, event.x, event.y, surface.columns, surface.rows)
          const a = closeArea(shown)
          hover = px >= a.x0 && px <= a.x1 && py >= a.y0 && py <= a.y1
        }
        if (hover !== !!s.hoverClose) surface.setState({ ...s, hoverClose: hover })
      }
      if (event.type === 'enter' || event.type === 'leave') surface.post({ act: event.type })
      if (event.type !== 'down') return
      // Light the picture at once; the hooks module's own redraw follows.
      if (!props.isActive) surface.setState({ ...(surface.state ?? local), litAt: Date.now() })
      surface.post({ act: 'pointer', button: event.button ?? 'left', x: event.x, y: event.y, columns: surface.columns, rows: surface.rows })
    })

    surface.onKey(event => {
      surface.post({ act: 'key', key: event.key })
    })

    // Once the hooks module has lit it too, its word holds: it may fade it again.
    if (props.isActive && local.litAt !== undefined) surface.setState({ ...local, litAt: undefined })
    if (props.now !== seen.now) {
      seen.now = props.now
      seen.at = Date.now()
    }
    const picture = build(props, {
      isLit: props.isActive || (local.litAt !== undefined && Date.now() - local.litAt < LIT_MS),
      hoverClose: !!local.hoverClose,
      gone: Date.now() - seen.at,
      columns: surface.columns,
    })
    shown = picture.frame
    const { width, height } = frameOf(picture.frame)
    // Svg is not in the region's element table, so it is named by its tag.
    const svg: SvgProps = { source: picture.svg, alt: picture.alt, width, height }

    // The picture is the region, so a click anywhere on it reaches here.
    return <Box width="100%">{h('Svg', svg)}</Box>
  }
}
