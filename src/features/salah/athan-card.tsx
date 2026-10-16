import { cardClient } from '../../shared/card/client.tsx'
import { athanText } from '../../shared/pray/line.ts'
import { athanFrame, athanSvg, startArea, type AthanCardProps } from './card.ts'

// The athan card on the desktop: the shared card, holding the call.
export default cardClient<AthanCardProps>((props, view) => ({
  svg: athanSvg(props, view),
  alt: athanText(props.pray),
  frame: athanFrame(props, view.columns),
  action: props.canStart ? startArea(athanFrame(props, view.columns)) : undefined,
}))
