/**
 * Systematic page/route audit — writes NDJSON to debug-a77e79.log
 *
 *   npx tsx scripts/audit-pages.mts
 */
import { appendFileSync } from 'node:fs'
import { chromium, type Page } from 'playwright'

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'
const LOG = 'debug-a77e79.log'
const SESSION = 'a77e79'

type Finding = {
  sessionId: string
  runId: string
  hypothesisId: string
  location: string
  message: string
  data: Record<string, unknown>
  timestamp: number
}

const findings: Finding[] = []

function log(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {},
  ok = true,
) {
  const entry: Finding = {
    sessionId: SESSION,
    runId: 'audit',
    hypothesisId,
    location,
    message,
    data: { ok, ...data },
    timestamp: Date.now(),
  }
  findings.push(entry)
  appendFileSync(LOG, `${JSON.stringify(entry)}\n`)
  const tag = ok ? 'PASS' : 'FAIL'
  console.log(`  ${tag}  [${hypothesisId}] ${message}${data.detail ? ` — ${data.detail}` : ''}`)
}

const PAGES: { hash: string; id: string; title: string; keySelectors: string[] }[] = [
  { hash: '', id: 'page-main', title: 'Home', keySelectors: ['#btn-connect', '#btn-test', '#btn-watch', '#wallet-list'] },
  { hash: '#menu', id: 'page-menu', title: 'Tip menu', keySelectors: ['#menu-editor', '#btn-publish-menu'] },
  { hash: '#obs', id: 'page-obs', title: 'Stream alerts', keySelectors: ['#overlay-url', '#btn-copy-overlay'] },
  { hash: '#live', id: 'page-live', title: 'Go live', keySelectors: ['#btn-practice', '#btn-fake-tip'] },
  { hash: '#settings', id: 'page-settings', title: 'Settings', keySelectors: ['#backend', '#btn-save-settings'] },
]

const HASH_ALIASES: { hash: string; expectPage: string }[] = [
  { hash: '#go-live', expectPage: 'page-live' },
  { hash: '#pools', expectPage: 'page-live' },
  { hash: '#menu2', expectPage: 'page-menu' },
  { hash: '#menu-3', expectPage: 'page-menu' },
]

const ROUTES: { path: string; name: string; mustContain?: RegExp }[] = [
  { path: '/overlay', name: 'OBS overlay', mustContain: /overlay|tip/i },
  { path: '/overlay/qr', name: 'QR overlay', mustContain: /qr|tip|wallet/i },
  { path: '/overlay/menu', name: 'Tip menu overlay', mustContain: /menu-stage|tip menu/i },
  { path: '/tip-menu', name: 'Published tip menu', mustContain: /tip|menu|html/i },
]

const ASSETS = [
  '/brand/pulsechain-mark.svg',
  '/brand/pulsex-mark.svg',
  '/brand/hex-mark.svg',
  '/brand/plsx-mark.png',
]

async function pageHidden(page: Page, id: string) {
  return page.locator(`#${id}`).evaluate((el) => (el as HTMLElement).hidden)
}

async function auditAppPages(page: Page) {
  await page.goto(BASE, { waitUntil: 'load', timeout: 30_000 })

  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => pageErrors.push(String(err)))

  for (const p of PAGES) {
    await page.evaluate((h) => {
      location.hash = h
    }, p.hash)
    await page.waitForTimeout(400)

    const hidden = await pageHidden(page, p.id)
    if (hidden) {
      log('PAGE', `navigation.ts:${p.id}`, `${p.title} not visible`, { hash: p.hash }, false)
      continue
    }
    log('PAGE', `navigation.ts:${p.id}`, `${p.title} visible`, { hash: p.hash })

    const tag = (await page.locator('#page-tag').innerText()).trim()
    if (tag !== p.title) {
      log('PAGE', '#page-tag', `title mismatch on ${p.title}`, { expected: p.title, actual: tag }, false)
    }

    for (const sel of p.keySelectors) {
      const count = await page.locator(sel).count()
      if (count === 0) {
        log('DOM', sel, `missing on ${p.title}`, { page: p.id }, false)
      } else {
        const vis = await page.locator(sel).first().isVisible().catch(() => false)
        log('DOM', sel, `present on ${p.title}`, { visible: vis })
      }
    }
  }

  // Header watch button placement (moved from Go live)
  await page.evaluate(() => {
    location.hash = ''
  })
  await page.waitForTimeout(300)
  const watchInHeader = await page.locator('.header-tools #btn-watch').count()
  const watchInLive = await page.locator('#page-live #btn-watch').count()
  if (watchInHeader > 0 && watchInLive === 0) {
    log('HEADER', '.header-tools', 'Start watching in header', { watchInHeader, watchInLive })
  } else {
    log(
      'HEADER',
      '.header-tools',
      'Start watching placement wrong',
      { watchInHeader, watchInLive },
      false,
    )
  }

  const watchBox = await page.locator('.header-tools #btn-watch').boundingBox().catch(() => null)
  if (watchBox && watchBox.height > 48) {
    log('HEADER', '#btn-watch', 'watch button too tall', { height: watchBox.height }, false)
  } else if (watchBox) {
    log('HEADER', '#btn-watch', 'watch button size ok', { height: watchBox.height })
  }

  for (const alias of HASH_ALIASES) {
    await page.evaluate((h) => {
      location.hash = h
    }, alias.hash)
    await page.waitForTimeout(300)
    const hidden = await pageHidden(page, alias.expectPage)
    log(
      'ALIAS',
      alias.hash,
      hidden ? 'alias did not resolve' : 'alias resolved',
      { expectPage: alias.expectPage },
      !hidden,
    )
  }

  if (consoleErrors.length) {
    log('JS', 'console', 'console errors during audit', { errors: consoleErrors.slice(0, 8) }, false)
  } else {
    log('JS', 'console', 'no console errors')
  }

  if (pageErrors.length) {
    log('JS', 'pageerror', 'uncaught page errors', { errors: pageErrors }, false)
  } else {
    log('JS', 'pageerror', 'no uncaught errors')
  }
}

async function auditRoutes(page: Page) {
  for (const route of ROUTES) {
    const url = new URL(route.path, BASE).href
    const res = await page.goto(url, { waitUntil: 'load', timeout: 20_000 }).catch(() => null)
    const status = res?.status() ?? 0
    const body = (await page.content()).slice(0, 4000)
    const ok = status >= 200 && status < 400 && (!route.mustContain || route.mustContain.test(body))
    log(
      'ROUTE',
      route.path,
      ok ? `${route.name} loads` : `${route.name} failed`,
      { status, bodyLen: body.length },
      ok,
    )
  }
}

async function auditAssets(page: Page) {
  for (const asset of ASSETS) {
    const url = new URL(asset, BASE).href
    const res = await page.request.get(url).catch(() => null)
    const status = res?.status() ?? 0
    const ok = status === 200
    log('ASSET', asset, ok ? 'asset found' : 'asset missing', { status }, ok)
  }
}

async function auditOverlayApi(page: Page) {
  const base = BASE.replace(/\/$/, '')
  for (const path of ['/api/overlay/status', '/api/overlay/stream']) {
    const res = await page.request.get(`${base}${path}`).catch(() => null)
    const status = res?.status() ?? 0
    log('API', path, status < 500 ? 'API reachable' : 'API error', { status }, status > 0 && status < 500)
  }
}

async function main() {
  console.log(`\n=== Page audit → ${LOG} ===\n`)
  console.log(`Base: ${BASE}\n`)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  try {
    await auditAppPages(page)
    await auditRoutes(page)
    await auditAssets(page)
    await auditOverlayApi(page)
  } finally {
    await browser.close()
  }

  const failed = findings.filter((f) => f.data.ok === false)
  console.log(`\n=== Audit complete: ${findings.length - failed.length} pass, ${failed.length} fail ===\n`)
  if (failed.length) {
    console.log('Failures:')
    for (const f of failed) console.log(`  - [${f.hypothesisId}] ${f.message}`, f.data)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
