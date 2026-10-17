// How every surface names a segment (a quarter of a hizb, or part of one): one pure formatter.
// `الربع ٥، الآيات ١٥–٢٤`, and ` (١ من ٢)` when one quarter is cut into several consecutive segments.
// The comma is the Arabic «،»: a «·» beside Arabic digits reads as ٠.

import type { Segment } from './segments.ts'

export const arabicDigits = (value: number): string => String(value).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]!)

type Labelled = Pick<Segment, 'quarter' | 'firstAyah' | 'lastAyah'>

// Which piece of its quarter the segment is: null when the quarter is one segment.
export function segmentPiece(segments: readonly Pick<Segment, 'quarter'>[], index: number): { k: number; n: number } | null {
  const quarter = segments[index]?.quarter
  if (quarter === undefined) return null
  let first = index, last = index
  while (first > 0 && segments[first - 1]!.quarter === quarter) first--
  while (last + 1 < segments.length && segments[last + 1]!.quarter === quarter) last++
  return last > first ? { k: index - first + 1, n: last - first + 1 } : null
}

export function segmentLabel(segments: readonly Labelled[], index: number): string {
  const segment = segments[index]
  if (!segment) return ''
  const piece = segmentPiece(segments, index)
  return `الربع ${arabicDigits(segment.quarter)}، الآيات ${arabicDigits(segment.firstAyah)}–${arabicDigits(segment.lastAyah)}${piece ? ` (${arabicDigits(piece.k)} من ${arabicDigits(piece.n)})` : ''}`
}
