import { cardClient } from '../../shared/card/client.tsx'
import { alkahfFrame, alkahfSvg, playHitArea, type AlkahfCardProps } from './card.ts'
import { ALKAHF_TITLE } from './logic.ts'

// The Al-Kahf card on the desktop: the shared card, holding the reminder, the avatar and the pill.
export default cardClient<AlkahfCardProps>((props, view) => ({
  svg: alkahfSvg(props, view),
  alt: ALKAHF_TITLE,
  frame: alkahfFrame(props, view.columns),
  action: playHitArea(alkahfFrame(props, view.columns), props.inBrowser),
}))
