// A drawn picture's pointer maths, for desktop panes whose Client draws one
// picture and posts cell positions: the pointer is whole cells (about 8 by 19
// px) unless the host reports a finer position.

// Desktop lays a picture into whole rows of about 19.25px, rounded up, so
// `height / rows` is a little short of a real row and a press low in a long
// picture came in a whole row too high. A row is ROW_PX wherever the counts
// allow it (rounded up: height / rows ≤ row < height / (rows - 1)), else
// `height / rows` as before.
export const ROW_PX = 19.25
export const rowPixels = (rows: number, height: number): number => {
  const low = height / rows
  return ROW_PX >= low && (rows <= 1 || ROW_PX < height / (rows - 1)) ? ROW_PX : low
}

export const pointerPixels = (width: number, x: number, y: number, columns: number, rows: number, height: number) =>
  ({ x: (x * width) / columns, y: y * rowPixels(rows, height) })

// Half the pointer cell in pixels, or 0 when the position is exact.
export const pointerSlack = (width: number, columns: number, rows: number, height: number, isCoarse: boolean): { x: number; y: number } =>
  !isCoarse || !(columns > 0) || !(rows > 0) || !Number.isFinite(width) || !Number.isFinite(height) ? { x: 0, y: 0 } : { x: width / columns / 2, y: rowPixels(rows, height) / 2 }
