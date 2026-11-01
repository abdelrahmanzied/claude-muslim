import { cardClient } from '../../shared/card/client.tsx'
import { kahfFrame, kahfSvg, playHitArea, type KahfCardProps } from './card.ts'
import { KAHF_TITLE } from './logic.ts'

// The Al-Kahf card on the desktop: the shared card, holding the reminder and ▶.
export default cardClient<KahfCardProps>((props, view) => ({
  svg: kahfSvg(props, view),
  alt: KAHF_TITLE,
  frame: kahfFrame(props, view.columns),
  action: props.canPlay ? playHitArea(kahfFrame(props, view.columns)) : undefined,
}))
