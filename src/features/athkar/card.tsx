import { drawWidthOf } from '../../shared/card/card.ts'
import { cardClient } from '../../shared/card/client.tsx'
import { bandSvg, cardFrameOf } from './band.ts'
import type { BandModel } from './band.ts'

// The athkar band on the desktop: the shared card, holding the band's picture.
// Motion carries on across a redraw made here: the clocks move on by what has
// passed since the hooks module drew.
export default cardClient<BandModel>((model, view) => {
  const band: BandModel = {
    ...model,
    isActive: view.isLit,
    hoverClose: view.hoverClose,
    now: model.now + view.gone,
    glowMs: model.glowMs === undefined ? undefined : model.glowMs + view.gone,
    finaleMs: model.finaleMs === undefined ? undefined : model.finaleMs + view.gone,
    drawWidth: drawWidthOf(model.card, view.columns) ?? model.drawWidth,
  }

  return { svg: bandSvg(band), alt: band.phase === 'question' && band.question ? `${band.question.title} · ${band.question.remaining} · ${band.question.confirm} · ${band.question.resume}` : band.phase === 'cover' ? band.title : band.text, frame: cardFrameOf(band) }
})
