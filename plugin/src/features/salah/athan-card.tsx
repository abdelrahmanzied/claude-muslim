import { cardClient } from '../../shared/card/client.tsx'
import { athanText } from '../../shared/pray/line.ts'
import { athanFrame, athanSvg, shownVerse, startHitArea, type AthanCardProps } from './card.ts'

// The athan card on the desktop: the shared card, holding the call.
export default cardClient<AthanCardProps>((props, view) => {
  const verse = shownVerse(props)

  return {
    svg: athanSvg(props, view),
    alt: verse ? `${athanText(props.pray, props.at)}. ${verse.text} ${verse.ref}` : athanText(props.pray, props.at),
    frame: athanFrame(props, view.columns),
    action: props.canStart ? startHitArea(athanFrame(props, view.columns)) : undefined,
  }
})
