// DEMO BEGIN: transient signals, no engine API or persistent state.
export type DemoFeature = 'thikr' | 'athkar' | 'salah'
const starters = new Map<DemoFeature, () => string | Promise<string>>()
let failure: (() => void) | undefined

// Each feature captures its own hook's $; the shared bus never receives $.
// The salah starter is shared with `/salah demo`, which previews fixed Fajr.
export const connectDemo = (feature: DemoFeature, start: () => string | Promise<string>) => { starters.set(feature, start) }
export const startDemo = async (feature: DemoFeature) => {
  const start = starters.get(feature)
  if (!start) throw new Error(`Demo not connected: ${feature}`)
  await start()
}
export const onDemoFailure = (failed?: () => void) => { failure = failed }
export const failDemo = () => { failure?.() }
// Each demo started by /muslim demo says when it has ended; the runner never knows their lengths.
let done: ((feature: DemoFeature) => void) | undefined
export const onDemoDone = (ended?: (feature: DemoFeature) => void) => { done = ended }
export const doneDemo = (feature: DemoFeature) => { done?.(feature) }
// DEMO END
