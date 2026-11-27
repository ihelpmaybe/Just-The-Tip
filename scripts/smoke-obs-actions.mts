/*
 * Smoke: Copy OBS URL + Open dark preview wiring.
 *
 *   npx tsx scripts/smoke-obs-actions.mts
 *   SMOKE_URL=http://127.0.0.1:5173/ npx tsx scripts/smoke-obs-actions.mts
 *
 * Unit checks run with no server. Browser checks need a live host with a
 * fresh build (npm run build && npm start, or vite dev).
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'

function overlayBrowserUrl(origin = 'http://127.0.0.1:5173') {
  return `${origin}/overlay`
}
function overlayPreviewUrl(origin = 'http://127.0.0.1:5173') {
  return `${origin}/overlay?preview=1`
}

/** Mirror of publish.openOverlayPreview for unit coverage without DOM imports. */
function openOverlayPreviewForUa(ua: string, url: string, hooks: {
  open: (u: string) => void
  fetch: (u: string) => void
}) {
  if (/\bCursor\//i.test(ua)) {
    hooks.fetch('/api/open-chrome')
    return
  }
  hooks.open(url)
}

{
  const obs = overlayBrowserUrl()
  const preview = overlayPreviewUrl()
  assert.equal(obs, 'http://127.0.0.1:5173/overlay')
  assert.equal(preview, 'http://127.0.0.1:5173/overlay?preview=1')
  console.log('PASS url helpers')
}

{
  const opens: string[] = []
  const fetches: string[] = []
  openOverlayPreviewForUa('Mozilla/5.0 Electron/39.0.0', overlayPreviewUrl(), {
    open: (u) => opens.push(u),
    fetch: (u) => fetches.push(u),
  })
  assert.deepEqual(opens, [overlayPreviewUrl()])
  assert.equal(fetches.length, 0)
  console.log('PASS electron preview uses window.open (not open-chrome)')

  opens.length = 0
  openOverlayPreviewForUa('Mozilla/5.0 Cursor/1.0', overlayPreviewUrl(), {
    open: (u) => opens.push(u),
    fetch: (u) => fetches.push(u),
  })
  assert.ok(fetches.includes('/api/open-chrome'))
  assert.equal(opens.length, 0)
  console.log('PASS cursor preview uses open-chrome')
}

const browser = await chromium.launch()
const context = await browser.newContext({
  permissions: ['clipboard-read', 'clipboard-write'],
})
const page = await context.newPage()
const opened: string[] = []
await page.exposeFunction('__smokeRecordOpen', (url: string) => {
  opened.push(url)
})
await page.addInitScript(() => {
  const w = window as Window & { __smokeRecordOpen?: (u: string) => void }
  const orig = window.open.bind(window)
  window.open = ((url?: string | URL, target?: string, features?: string) => {
    void w.__smokeRecordOpen?.(String(url || ''))
    return orig(url as string, target, features)
  }) as typeof window.open
})

try {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15_000 })
} catch (e) {
  await browser.close()
  console.error('FAIL host not reachable at', BASE)
  console.error(e)
  process.exit(1)
}

await page.evaluate(() => {
  location.hash = '#obs'
})
await page.waitForTimeout(900)

const copy = page.locator('#btn-obs-copy')
const openBtn = page.locator('#btn-obs-open')
assert.ok(await copy.count(), 'Copy OBS URL button missing — open Stream alerts / #obs')
assert.ok(await openBtn.count(), 'Open dark preview button missing')
await page.locator('#page-obs').waitFor({ state: 'visible', timeout: 10_000 })
await copy.click({ force: false })
await page.waitForTimeout(400)
const status = await page.locator('#obs-status').textContent()
assert.match(
  String(status || ''),
  /Copied OBS URL/i,
  `copy status was: ${status}`,
)
const clip = await page.evaluate(async () => navigator.clipboard.readText())
assert.equal(
  clip.replace(/\/$/, ''),
  'http://127.0.0.1:5173/overlay',
  `clipboard was: ${clip}`,
)
console.log('PASS copy OBS URL')

opened.length = 0
await openBtn.click()
await page.waitForTimeout(500)
assert.ok(
  opened.some((u) => u.includes('/overlay') && u.includes('preview=1')),
  `open dark preview did not call window.open; got ${JSON.stringify(opened)}`,
)
const openStatus = await page.locator('#obs-status').textContent()
assert.match(String(openStatus || ''), /Dark preview opened/i)
console.log('PASS open dark preview')

// Tip broadcast — force must not be filtered by high mins / pool toggle.
{
  const styleRes = await page.request.put(new URL('/api/overlay/style', BASE).href, {
    data: {
      style: {
        showPoolAlerts: false,
        poolMinAmount: 999_999,
        walletMinAmount: 999_999,
        showDryRun: false,
      },
    },
  })
  assert.equal(styleRes.ok(), true, `style HTTP ${styleRes.status()}`)

  const blocked = await page.request.post(new URL('/api/overlay/tip', BASE).href, {
    data: {
      id: `smoke-block-${Date.now()}`,
      amount: 1,
      symbol: 'WPLS',
      title: '1 WPLS',
      source: 'pool',
      force: false,
      dryRun: false,
    },
  })
  assert.equal(blocked.ok(), true)
  const blockedJson = (await blocked.json()) as { filtered?: boolean; event?: unknown }
  assert.equal(blockedJson.filtered, true, 'pool tip should filter when alerts off')
  assert.equal(blockedJson.event, null)

  const tipRes = await page.request.post(new URL('/api/overlay/tip', BASE).href, {
    data: {
      id: `smoke-tip-${Date.now()}`,
      amount: 1,
      symbol: 'WPLS',
      title: '1 WPLS',
      source: 'pool',
      force: true,
      dryRun: false,
    },
  })
  assert.equal(tipRes.ok(), true, `tip HTTP ${tipRes.status()}`)
  const tipJson = (await tipRes.json()) as {
    ok?: boolean
    filtered?: boolean
    event?: unknown
  }
  assert.equal(tipJson.ok, true)
  assert.equal(tipJson.filtered, false, 'forced tip must not be filtered')
  assert.ok(tipJson.event, 'forced tip must return event')
  console.log('PASS force tip bypasses filters')
}

await browser.close()
console.log('\nsmoke-obs-actions OK')
