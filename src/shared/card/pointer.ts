// A drawn picture's pointer maths, for desktop panes whose Client draws one
// picture and posts cell positions: the pointer is whole cells (about 8 by 19
// px) unless the host reports a finer position.

export const pointerPixels = (width: number, x: number, y: number, columns: number, rows: number, height: number) =>
  ({ x: (x * width) / columns, y: (y * height) / rows })

// Half the pointer cell in pixels, or 0 when the position is exact.
export const pointerSlack = (width: number, columns: number, rows: number, height: number, isCoarse: boolean): { x: number; y: number } =>
  !isCoarse || !(columns > 0) || !(rows > 0) || !Number.isFinite(width) || !Number.isFinite(height) ? { x: 0, y: 0 } : { x: width / columns / 2, y: height / rows / 2 }
