import type { ClientModule, SvgProps } from 'claude-code'
import { hitOfCells, paneHeight, type Enabled, type PaneAct } from './layout.ts'
import { widthOf, type PaneModel } from './model.ts'
import { paneAlt, paneSvg } from './view.ts'

// The Muslim pane's Client: draws the picture, lights what the pointer is over,
// and posts every click and key to the hooks module, which decides what each
// does. It runs on the drawing thread.
type Local = { hover: PaneAct | null }

const enabledOf = (m: PaneModel): Enabled => ({
  athan: m.prayer.isSet,
  quran: m.quran.isAvailable,
  canPrev: m.quran.isAvailable && m.quran.canPrev,
  canNext: m.quran.isAvailable && m.quran.canNext,
  athkar: m.athkar.isAvailable,
  athkarFinish: m.athkar.isAvailable && !m.athkar.isDone,
})

const client: ClientModule<PaneModel, Local> = (props, surface) => {
  const { Box } = surface.elements
  if (surface.state === undefined) {
    surface.setState({ hover: null })
  }
  const model: PaneModel = { ...props, width: surface.columns > 0 ? widthOf(surface.columns, props.width) : props.width }
  const local: Local = surface.state ?? { hover: null }
  surface.onPointer(e => {
    const current = surface.state ?? local
    const x = e.fine?.x ?? e.x + 0.5, y = e.fine?.y ?? e.y + 0.5
    // Without `fine` the pointer is a whole cell snapped to its center.
    const coarse = e.fine === undefined
    const hit = e.type === 'leave' ? null : hitOfCells(model.width, x, y, surface.columns, surface.rows, coarse, enabledOf(model), model.folds)
    if (hit !== current.hover) surface.setState({ ...current, hover: hit })
    if (e.type !== 'down' || (e.button ?? 'left') !== 'left' || !hit) return
    surface.post({ act: 'pointer', x, y, columns: surface.columns, rows: surface.rows, width: model.width, button: 'left', coarse })
  })
  surface.onKey(e => { surface.post({ act: 'key', key: e.key }) })

  const svg: SvgProps = { source: paneSvg(model, local.hover), width: model.width, height: paneHeight(model.folds), alt: paneAlt(model) }
  return <Box width="100%">{h('Svg', svg)}</Box>
}
export default client
