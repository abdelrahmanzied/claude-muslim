import { expect, test } from 'claude-code/testing'
import { paneModel } from '../../src/features/muslim-pane/model.ts'
import { CATEGORIES, DEFAULT_SETTINGS } from '../../src/features/muslim-pane/settings.ts'
import { paneSvg } from '../../src/features/muslim-pane/view.ts'
import { avatarSvg } from '../../src/shared/quran-avatar/index.ts'
import { DEMO_DURATION_MS, DEMO_TICK_MS, demoAthkar, demoFolds, demoNow, demoQuran, demoSalah } from '../../src/features/muslim-pane/demo.ts'
import { TITLE } from '../../src/features/athkar/logic.ts'

// The Client's whole tree must serialize under 100,000 characters, or Desktop draws an error
// instead of the pane. The picture is nearly all of it: keep a margin for longer names and data.
const LIMIT = 96_000
const NOW = 1_700_000_000_000
const prays = (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((pray, i) => ({ pray, at: NOW + (i - 2) * 3_600_000, clock: `${10 + i}:3${i}` }))
const feeds = {
  salah: { city: 'القاهرة، مصر', prays, next: prays[3]!, isAthan: true },
  quran: { reciter: 'عبد الرحمن السديس · رواية حفص عن عاصم', surah: 'سورة البقرة', part: 'الربع ٥ - الآيات ١٥–٢٤ (١ من ٢)', segmented: true, status: 'يتلى الآن', isLive: true, elapsed: '13:12', total: '1:24:05', progress: 0.2, isPlaying: true, canPrev: true, canNext: true, repeat: 'segment' as const, avatar: avatarSvg(true, 12_345, 96) },
  athkar: { set: 'evening' as const, canUndo: false, title: 'أَذْكَارُ الْمَسَاءِ', done: 4, total: 12, progress: 0.33, isDone: false },
}
const rows = Array.from({ length: 8 }, (_, i) => ({ value: String(i), label: 'عبد الباسط عبد الصمد · مجود رواية حفص', number: String(i + 1), selected: i === 2 }))

test('the Muslim pane picture stays under the Client tree limit with every card full', () => {
  for (const face of ['main', 'methods', 'city'] as const) for (const [category] of CATEGORIES) for (const picker of [null, { list: 'reciter' as const, query: 'عبد', highlight: 2, scroll: 0, count: 120, rows, dragging: false }]) for (const width of [240, 360, 400, 1200]) {
    const settings = { ...DEFAULT_SETTINGS, state: { open: true, category, face, page: 0 } }
    const svg = paneSvg(paneModel(feeds as Parameters<typeof paneModel>[0], NOW, width, 'orange', undefined, undefined, settings, picker))
    expect(svg.length).toBeLessThan(LIMIT)
  }
})

test('inline maintenance rows stay under the Client tree limit with pending auto-update at 240px and 360px', () => {
  for(const width of [240,360]) for(const autoUpdate of ['on','off','missing','unknown'] as const) for(const pendingAutoUpdate of [null,false,true]){
    const settings={...DEFAULT_SETTINGS,state:{...DEFAULT_SETTINGS.state,open:true},autoUpdate,pendingAutoUpdate}
    const model=paneModel(feeds as Parameters<typeof paneModel>[0],NOW,width,'orange',undefined,undefined,settings)
    expect(paneSvg(model).length).toBeLessThan(LIMIT)
  }
})

test('the open picker leaves the Quran avatar out, since the sheet covers it', () => {
  const picker = { list: 'surah' as const, query: '', highlight: 0, scroll: 0, count: 114, rows, dragging: false }
  expect(paneSvg(paneModel(feeds as Parameters<typeof paneModel>[0], NOW, 400, 'orange')).includes('kbx-root')).toBe(true)
  expect(paneSvg(paneModel(feeds as Parameters<typeof paneModel>[0], NOW, 400, 'orange', undefined, undefined, DEFAULT_SETTINGS, picker)).includes('kbx-root')).toBe(false)
})

test('every frame of the pane demo stays under the Client tree limit', () => {
  for (const width of [240, 360, 400, 1200]) for (let t = 0; t <= DEMO_DURATION_MS; t += DEMO_TICK_MS) {
    const model = paneModel({ salah: demoSalah(), quran: demoQuran(t, avatarSvg(true, t, 96)), athkar: demoAthkar(t, TITLE.morning) }, demoNow(t), width, 'orange', undefined, demoFolds(t))
    expect(paneSvg(model).length).toBeLessThan(LIMIT)
  }
})
