// Developer tool only: Node 24. Picture tests for the desktop drawings.
//
//   npm run visual                  compare every scene with its baseline
//   npm run visual -- --update      rewrite the baselines
//   npm run visual -- --channel app (or beta) to run one channel
//   npm run visual -- --keep        also save every drawn image in scripts/visual/out/
//
// Each scene (scenes.ts) is built from the plugin's real builders, drawn at device
// scale 2 in Chrome for Testing, and compared with
// scripts/visual/baselines/<os>/<channel>/<scene>.png. A scene with no baseline is
// written there, reported as new and does not fail. A change fails and leaves
// actual, baseline and diff images in scripts/visual/out/<os>/<channel>/.
// The channels and the Playwright version are in versions.json.
// @ts-nocheck (a developer script run by Node 24; the repo's tsc does not cover it)
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Browser, computeExecutablePath, detectBrowserPlatform, install, resolveBuildId } from '@puppeteer/browsers'
import { chromium } from 'playwright-core'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { scenes } from './scenes.ts'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')
const versions = JSON.parse(await readFile(resolve(here, 'versions.json'), 'utf8'))
const args = process.argv.slice(2)
const update = args.includes('--update')
const keep = args.includes('--keep')
const only =args.includes('--channel') ? args[args.indexOf('--channel') + 1] : undefined
const os = { darwin: 'macos', win32: 'windows', linux: 'linux' }[process.platform] ?? process.platform

// Per-pixel color tolerance, and the share of differing pixels that still passes.
const PIXEL_THRESHOLD = 0.1
const MAX_DIFF_SHARE = 0.001

const channels = Object.entries(versions.channels).filter(([name]) => !only || name === only)
const platform = detectBrowserPlatform()
const cacheDir = resolve(root, '.visual-browsers')

const executable = async (spec) => {
  const buildId = /^\d/.test(spec) ? spec : await resolveBuildId(Browser.CHROME, platform, spec)
  await install({ browser: Browser.CHROME, buildId, cacheDir, platform })

  return { buildId, path: computeExecutablePath({ browser: Browser.CHROME, buildId, cacheDir }) }
}

const page = (svg, scheme) => `<!doctype html><meta charset="utf-8"><body style="margin:0;background:${scheme === 'dark' ? '#1f1e1c' : '#ffffff'}"><div id="s" style="display:inline-block;line-height:0">${svg}</div>`

let failed = 0
for (const [channel, spec] of channels) {
  const exe = await executable(spec)
  const dir = (kind) => resolve(here, kind, os, channel)
  const browser = await chromium.launch({ executablePath: exe.path })
  console.log(`${os} / ${channel}: Chrome ${exe.buildId}`)
  for (const scene of scenes()) {
    const context = await browser.newContext({ deviceScaleFactor: 2, colorScheme: scene.scheme, viewport: { width: Math.ceil(scene.width), height: Math.ceil(scene.height) } })
    const tab = await context.newPage()
    await tab.setContent(page(scene.svg, scene.scheme))
    await tab.evaluate(() => document.fonts.ready)
    await tab.waitForTimeout(150)
    const actual = await tab.locator('#s').screenshot({ animations: 'disabled' })
    await context.close()
    const base = resolve(dir('baselines'), `${scene.name}.png`)
    if (update || !existsSync(base)) {
      await mkdir(dirname(base), { recursive: true })
      await writeFile(base, actual)
      console.log(`  ${update ? 'updated' : 'NEW    '} ${scene.name}`)
      continue
    }
    if (keep) {
      await mkdir(dir('out'), { recursive: true })
      await writeFile(resolve(dir('out'), `${scene.name}.actual.png`), actual)
    }
    const a = PNG.sync.read(actual)
    const b = PNG.sync.read(await readFile(base))
    if (a.width !== b.width || a.height !== b.height) {
      failed++
      await mkdir(dir('out'), { recursive: true })
      await writeFile(resolve(dir('out'), `${scene.name}.actual.png`), actual)
      console.log(`  FAIL    ${scene.name}: size ${a.width}x${a.height}, baseline ${b.width}x${b.height}`)
      continue
    }
    const diff = new PNG({ width: a.width, height: a.height })
    const count = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: PIXEL_THRESHOLD })
    const share = count / (a.width * a.height)
    if (share > MAX_DIFF_SHARE) {
      failed++
      await mkdir(dir('out'), { recursive: true })
      await writeFile(resolve(dir('out'), `${scene.name}.actual.png`), actual)
      await writeFile(resolve(dir('out'), `${scene.name}.diff.png`), PNG.sync.write(diff))
      console.log(`  FAIL    ${scene.name}: ${count} pixels differ (${(share * 100).toFixed(3)}%)`)
    } else console.log(`  ok      ${scene.name}${count ? ` (${count} px)` : ''}`)
  }
  await browser.close()
}
if (failed) { console.log(`${failed} scene(s) differ from their baselines; see scripts/visual/out/`); process.exitCode = 1 }
