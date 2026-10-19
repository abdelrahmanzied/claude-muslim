// Quran supplies a closure over its own engine handle; settings writers await it.
let stop: (() => Promise<void>) | undefined
let queue: Promise<unknown> = Promise.resolve()
export const connectBeforeReload = (run: () => Promise<void>): void => { stop = run }
export const stopBeforeReload = (): Promise<void> => {
  const task = queue.then(() => stop?.())
  queue = task.catch(() => undefined)
  return task
}
