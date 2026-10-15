import type { UiScrollInput } from 'claude-code'

// Pure: ui.scroll also fires at the edges. Calling next there redraws the
// whole Client picture even though the window cannot move. Keep those ticks
// undrawn; let the host own real overflow, other surfaces and plugin requests.
export const skipPaneScroll = (desktop: boolean, currentOffset: number, e: UiScrollInput): boolean => {
  if (!desktop || e.origin.kind !== 'person') return false
  if (![currentOffset, e.offset, e.bodyRows, e.contentRows].every(Number.isFinite)
    || currentOffset < 0 || e.bodyRows < 0 || e.contentRows < 0) return false
  const offset = Math.max(0, Math.min(e.offset, Math.max(0, e.contentRows - e.bodyRows)))
  return offset === currentOffset
}
