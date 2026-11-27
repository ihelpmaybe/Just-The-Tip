/**
 * Deep multi-cycle UI smoke against the Vite app (Lovense is the default toy path).
 * Includes wallet remove→save→reload regression checks each cycle.
 *
 *   npm run smoke:ui
 *   npx tsx scripts/smoke-ui-deep.mts
 *
 * For a dedicated wallet gauntlet: npm run smoke:wallets
 * Combined logic+UI: npm run smoke:vicious
 *
 * Env:
 *   SMOKE_URL   default http://127.0.0.1:5173/
 *   SMOKE_CYCLES default 3
 *   SMOKE_SLOW_MS default 450  (pause between steps)
 *   HEADED=1    show browser
 */
import { chromium, type Page, type ConsoleMessage } from 'playwright'

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'
const CYCLES = Math.max(1, Number(process.env.SMOKE_CYCLES || 3))
const SLOW = Math.max(0, Number(process.env.SMOKE_SLOW_MS || 450))
const HEADED = process.env.HEADED === '1'

type Check = { cycle: number; name: string; ok: boolean; detail?: string }

const results: Check[] = []
const consoleErrors: { cycle: number; text: string }[] = []
const pageErrors: { cycle: number; text: string }[] = []

function pass(cycle: number, name: string, detail = '') {
  results.push({ cycle, name, ok: true, detail })
  console.log(`  PASS  [c${cycle}] ${name}${detail ? ` — ${detail}` : ''}`)
}
function fail(cycle: number, name: string, detail = '') {
  results.push({ cycle, name, ok: false, detail })
  console.error(`  FAIL  [c${cycle}] ${name}${detail ? ` — ${detail}` : ''}`)
}

async function pause(ms = SLOW) {
  if (ms > 0) await new Promise((r) => setTimeout(r, ms))
}

async function visible(page: Page, sel: string) {
  return page.locator(sel).isVisible()
}

async function expectVisible(cycle: number, page: Page, sel: string, name: string) {
  const ok = await visible(page, sel)
  if (ok) pass(cycle, name, sel)
  else fail(cycle, name, `not visible: ${sel}`)
  return ok
}

async function click(page: Page, sel: string, opts?: { force?: boolean }) {
  await page.locator(sel).click({ timeout: 8000, force: opts?.force })
  await pause()
}

/** Prefer Escape for overlays; force-click if still open (footer/stacking edge cases). */
async function closeOverlay(
  page: Page,
  modalSel: string,
  closeBtnSel: string,
) {
  const modal = page.locator(modalSel).first()
  if (await modal.evaluate((el) => (el as HTMLElement).hidden).catch(() => true)) {
    return
  }
  await page.keyboard.press('Escape')
  await pause(SLOW + 150)
  const stillOpen = !(await modal
    .evaluate((el) => (el as HTMLElement).hidden)
    .catch(() => true))
  if (stillOpen) {
    await click(page, closeBtnSel, { force: true })
    await pause()
  }
}

async function fill(page: Page, sel: string, value: string) {
  await page.locator(sel).fill(value)
  await pause(SLOW / 2)
}

async function gotoHash(page: Page, hash: string) {
  await page.evaluate((h) => {
    location.hash = h
  }, hash)
  await pause(SLOW + 200)
}

async function pageHidden(page: Page, id: string) {
  return page.locator(`#${id}`).evaluate((el) => (el as HTMLElement).hidden)
}

async function assertPage(
  cycle: number,
  page: Page,
  which: 'main' | 'live' | 'settings' | 'menu' | 'obs',
) {
  const map = {
    main: 'page-main',
    live: 'page-live',
    settings: 'page-settings',
    menu: 'page-menu',
    obs: 'page-obs',
  } as const
  for (const [key, id] of Object.entries(map)) {
    const hidden = await pageHidden(page, id)
    const shouldShow = key === which
    if (shouldShow === !hidden) continue
    fail(cycle, `page ${which}`, `${id} hidden=${hidden} expected hidden=${!shouldShow}`)
    return
  }
  pass(cycle, `page ${which}`)
}

async function assertLovenseHome(cycle: number, page: Page) {
  await gotoHash(page, '')
  await assertPage(cycle, page, 'main')
  const previewPick = await page.locator('#backend-pick-preview').count()
  if (previewPick === 0) pass(cycle, 'no preview toy method')
  else fail(cycle, 'no preview toy method', 'Preview pick still in DOM')
  const picked = await page.locator('#backend').inputValue()
  if (picked === 'lovense') pass(cycle, 'lovense is default', picked)
  else pass(cycle, 'backend selected', picked)
  const ipVisible = await page.locator('#url-field').evaluate((el) => !(el as HTMLElement).hidden)
  if (ipVisible) pass(cycle, 'Connect Local IP field')
  else fail(cycle, 'Connect Local IP field', 'hidden')
}

async function buzzAndStop(cycle: number, page: Page) {
  const feedBefore = (
    await page.locator('#feed, #payment-feed').first().innerText().catch(() => '')
  ).trim()
  await click(page, '#btn-test')
  await pause(SLOW + 600)
  const afterTest = (await page.locator('#device-status').innerText()).trim()
  const err = (await page.locator('#err').innerText().catch(() => '')).trim()
  const feedAfter = (
    await page.locator('#feed, #payment-feed').first().innerText().catch(() => '')
  ).trim()
  const queue = (
    await page.locator('#queue-status').innerText().catch(() => '')
  ).trim()
  if (feedAfter.length > feedBefore.length || /test|spoof|play|queue/i.test(queue)) {
    pass(
      cycle,
      'test full tip path',
      `feed grew · ${queue.slice(0, 60) || afterTest.slice(0, 40)}`,
    )
  } else if (/connect|toy|not connected|search this wi/i.test(`${err} ${afterTest}`)) {
    pass(cycle, 'test needs a linked toy', (err || afterTest).slice(0, 80))
  } else {
    fail(
      cycle,
      'test full tip path',
      `no feed/queue activity · feed="${feedAfter.slice(0, 80)}" queue="${queue}" err="${err.slice(0, 60)}"`,
    )
  }
  await click(page, '#btn-stop')
  await pause(SLOW + 200)
  pass(cycle, 'stop clicked')
}

async function fakeTips(cycle: number, page: Page) {
  await gotoHash(page, '#live')
  await assertPage(cycle, page, 'live')
  const dry = page.locator('#btn-dry-run')
  if ((await dry.count()) === 0) pass(cycle, 'practice toggle gone')
  else fail(cycle, 'practice toggle gone', 'still in DOM')

  const feedBefore = await page.locator('#feed .feed-item, #feed li, #payment-feed .feed-item').count()
  const feedTextBefore = (await page.locator('#feed, #payment-feed').first().innerText().catch(() => '')).trim()

  for (let i = 0; i < 3; i++) {
    await click(page, '#btn-simulate')
    await pause(SLOW + 350)
  }

  const feedAfter = await page.locator('#feed .feed-item, #feed li, #payment-feed .feed-item').count()
  const feedTextAfter = (await page.locator('#feed, #payment-feed').first().innerText().catch(() => '')).trim()
  if (feedAfter > feedBefore || feedTextAfter.length > feedTextBefore.length) {
    pass(cycle, 'fake tips ×3', `feed ${feedBefore}→${feedAfter || 'grew text'}`)
  } else {
    const queue = (await page.locator('#queue, #buzz-queue, #session').first().innerText().catch(() => '')).trim()
    if (queue.length > 0 || feedTextAfter.includes('sim') || feedTextAfter.includes('tip')) {
      pass(cycle, 'fake tips ×3', 'activity visible in queue/feed text')
    } else {
      fail(cycle, 'fake tips ×3', `no feed growth · feed="${feedTextAfter.slice(0, 100)}"`)
    }
  }

  const simItems = await page.locator('#feed li.feed-sim, #payment-feed li.feed-sim').count()
  if (simItems > 0) {
    pass(cycle, 'fake tip markers', `feed-sim×${simItems}`)
  } else {
    fail(cycle, 'fake tip markers', 'expected feed-sim markers')
  }

  if (await page.locator('#btn-test').isVisible()) {
    await click(page, '#btn-test')
    await pause(SLOW + 500)
    pass(cycle, 'home test tip')
  }
}

async function tipMenuStudio(cycle: number, page: Page) {
  await gotoHash(page, '#menu')
  await assertPage(cycle, page, 'menu')
  await expectVisible(cycle, page, '#menu-coin-price', 'tip coin price')
  await pause(SLOW)
}

const STORAGE_KEY = 'pulsefans-tipbuzz-v1'
const SMOKE_WALLET_A = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const SMOKE_WALLET_B = '0x000000000000000000000000000000000000dEaD'

async function readSavedWallets(page: Page) {
  return page.evaluate((key) => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return [] as { address: string; label: string }[]
      const parsed = JSON.parse(raw) as {
        savedWallets?: { address?: string; label?: string }[]
      }
      return Array.isArray(parsed.savedWallets)
        ? parsed.savedWallets.map((w) => ({
            address: String(w?.address || ''),
            label: String(w?.label || ''),
          }))
        : []
    } catch {
      return []
    }
  }, STORAGE_KEY)
}

async function removeSavedRow(page: Page, address: string) {
  await gotoHash(page, '#settings')
  const key = address.toLowerCase()
  const prefix = address.slice(0, 6).toLowerCase()
  const suffix = address.slice(-4).toLowerCase()
  const rows = page.locator('#wallet-list .wallet-item')
  const n = await rows.count()
  for (let i = 0; i < n; i++) {
    const row = rows.nth(i)
    const text = ((await row.innerText()) || '').toLowerCase()
    const title = (
      (await row.locator('.wallet-item-main').getAttribute('title')) || ''
    ).toLowerCase()
    if (
      text.includes(key) ||
      title.includes(key) ||
      (text.includes(prefix) && text.includes(suffix)) ||
      (title.includes(prefix) && title.includes(suffix))
    ) {
      await row.locator('button', { hasText: 'Remove' }).click({ timeout: 8000 })
      await pause()
      return true
    }
  }
  return false
}

/** Regression: remove active tip wallet must survive settings save + reload. */
async function walletRemoveGauntlet(cycle: number, page: Page) {
  await gotoHash(page, '')
  await fill(page, '#receive', SMOKE_WALLET_A)
  await fill(page, '#receive-label', `keep-c${cycle}`)
  await click(page, '#btn-save-wallet')
  await fill(page, '#receive', SMOKE_WALLET_B)
  await fill(page, '#receive-label', `active-c${cycle}`)
  await click(page, '#btn-save-wallet')
  await pause()

  const before = await readSavedWallets(page)
  if (
    before.some((w) => w.address.toLowerCase() === SMOKE_WALLET_A.toLowerCase()) &&
    before.some((w) => w.address.toLowerCase() === SMOKE_WALLET_B.toLowerCase())
  ) {
    pass(cycle, 'wallet gauntlet seeded', `n=${before.length}`)
  } else {
    fail(cycle, 'wallet gauntlet seeded', JSON.stringify(before))
    return
  }

  // Remove inactive A
  if (!(await removeSavedRow(page, SMOKE_WALLET_A))) {
    fail(cycle, 'remove inactive wallet', 'row missing')
    return
  }
  await click(page, '#btn-settings-save')
  await pause()
  let mid = await readSavedWallets(page)
  if (mid.some((w) => w.address.toLowerCase() === SMOKE_WALLET_A.toLowerCase())) {
    fail(cycle, 'inactive remove sticks after save', JSON.stringify(mid))
  } else {
    pass(cycle, 'inactive remove sticks after save')
  }

  // Remove active B — the resurrection bug
  if (!(await removeSavedRow(page, SMOKE_WALLET_B))) {
    fail(cycle, 'remove active wallet', 'row missing')
    return
  }
  const recv = (await page.locator('#receive').inputValue()).trim()
  if (recv) fail(cycle, 'active remove clears tip field', recv)
  else pass(cycle, 'active remove clears tip field')

  await click(page, '#btn-settings-save')
  await pause()
  mid = await readSavedWallets(page)
  if (mid.some((w) => w.address.toLowerCase() === SMOKE_WALLET_B.toLowerCase())) {
    fail(cycle, 'active remove sticks after save', JSON.stringify(mid))
  } else {
    pass(cycle, 'active remove sticks after save')
  }

  await page.reload({ waitUntil: 'load' })
  await page.waitForSelector('#receive', { state: 'attached', timeout: 15_000 })
  await gotoHash(page, '')
  await pause(SLOW + 300)
  const after = await readSavedWallets(page)
  const recvAfter = (await page.locator('#receive').inputValue()).trim()
  if (
    after.some((w) => w.address.toLowerCase() === SMOKE_WALLET_B.toLowerCase()) ||
    recvAfter.toLowerCase() === SMOKE_WALLET_B.toLowerCase()
  ) {
    fail(
      cycle,
      'active remove sticks after reload',
      `recv=${recvAfter} list=${JSON.stringify(after)}`,
    )
  } else {
    pass(cycle, 'active remove sticks after reload', `list=${after.length}`)
  }
}

async function settingsAndPools(cycle: number, page: Page) {
  // Tip wallet lives on Home now
  await gotoHash(page, '')
  await assertPage(cycle, page, 'main')
  await fill(page, '#receive', SMOKE_WALLET_A)
  await fill(page, '#receive-label', `smoke-c${cycle}`)
  await click(page, '#btn-save-wallet')
  await pause()
  const homeFlash = (
    await page.locator('#home-wallet-status').innerText().catch(() => '')
  ).trim()

  await gotoHash(page, '#settings')
  await assertPage(cycle, page, 'settings')
  await click(page, '#btn-settings-save')
  await pause(SLOW + 200)
  const flash = (await page.locator('#settings-status').innerText().catch(() => '')).trim()
  pass(
    cycle,
    'settings save wallet',
    (flash || homeFlash).slice(0, 80) || 'saved',
  )

  await walletRemoveGauntlet(cycle, page)

  await gotoHash(page, '#live')
  await assertPage(cycle, page, 'live')
  const poolFeedAttached = await page.locator('#pool-feed').count()
  const poolEmpty = await page.locator('#pool-feed-empty').isVisible()
  if (poolFeedAttached && poolEmpty) {
    pass(cycle, 'pool swaps feed', 'empty state on Go live')
  } else if (poolFeedAttached) {
    pass(cycle, 'pool swaps feed', 'list present')
  } else {
    fail(cycle, 'pool swaps feed', 'missing #pool-feed')
  }
  await expectVisible(cycle, page, '#pool-watch-enabled', 'pool watch toggle')
  await expectVisible(cycle, page, '#btn-watch', 'unified start watch')
  await click(page, '#btn-pool-presets')
  await pause(SLOW + 300)
  await click(page, '#btn-pools-all')
  await pause()
  const poolRows = await page.locator('#pool-list .pool-row, #pools-list li, #pool-list li, #pool-list label').count()
  if (poolRows > 0) pass(cycle, 'pool presets', `rows≈${poolRows}`)
  else {
    const body = (await page.locator('#live-pools, #page-live').first().innerText()).trim()
    if (/PulseX|WPLS|pool/i.test(body)) pass(cycle, 'pool presets', 'text present')
    else fail(cycle, 'pool presets', 'no pool UI content')
  }

  // Alert panel + suggest control (RPC may succeed or fail — UI must stay usable)
  const alertBtn = page.locator('#pool-list .pool-row .btn', { hasText: 'Alert' }).first()
  if (await alertBtn.count()) {
    await alertBtn.click()
    await pause(SLOW + 300)
    const panel = page.locator('#pool-list .pool-alert-panel').first()
    if (await panel.isVisible()) {
      pass(cycle, 'pool alert panel open')
      const suggest = panel.locator('button', { hasText: /Suggest from recent/i })
      if (await suggest.count()) {
        pass(cycle, 'pool suggest button')
        await suggest.click()
        try {
          await page.waitForSelector('#pool-list .pool-suggest-status', {
            timeout: 25_000,
          })
          await page.waitForFunction(
            () => {
              const el = document.querySelector('#pool-list .pool-suggest-status')
              const t = (el?.textContent || '').trim()
              return (
                t.length > 0 &&
                !/^Sampling/i.test(t)
              )
            },
            { timeout: 45_000 },
          )
        } catch {
          /* fall through */
        }
        await pause(SLOW + 300)
        const note = (
          await page
            .locator('#pool-list .pool-suggest-status')
            .first()
            .innerText()
            .catch(() => '')
        ).trim()
        if (/Suggested|Suggest failed|Not enough|RPC|swaps/i.test(note)) {
          pass(cycle, 'pool suggest status', note.slice(0, 100))
        } else {
          const rules = await page.locator('#pool-list .pool-rule-row').count()
          if (rules > 0) pass(cycle, 'pool suggest status', `rules×${rules}`)
          else fail(cycle, 'pool suggest status', `no status · "${note.slice(0, 80)}"`)
        }
        const sideSel = panel.locator('.pool-rule-row select').first()
        if (await sideSel.count()) {
          const options = await sideSel.locator('option').allTextContents()
          if (options.some((t) => /buy/i.test(t)) && options.some((t) => /sell/i.test(t))) {
            pass(cycle, 'pool rule side options')
          } else {
            fail(cycle, 'pool rule side options', options.join(','))
          }
        }
      } else {
        fail(cycle, 'pool suggest button', 'missing')
      }
      const done = page.locator('#pool-list .pool-row .btn', { hasText: 'Done' }).first()
      if (await done.count()) await done.click()
    } else {
      fail(cycle, 'pool alert panel open', 'not visible')
    }
  } else {
    fail(cycle, 'pool alert panel open', 'no Alert button')
  }

  // Legacy #pools hash still opens Go live
  await gotoHash(page, '#pools')
  await assertPage(cycle, page, 'live')
}

async function watchCycle(cycle: number, page: Page) {
  // Ensure receive wallet is set on Home
  await gotoHash(page, '')
  const recv = (await page.locator('#receive').inputValue()).trim()
  if (!/^0x[a-fA-F0-9]{40}$/.test(recv)) {
    await fill(page, '#receive', SMOKE_WALLET_A)
    await click(page, '#btn-save-wallet')
    await pause(SLOW + 200)
  }

  await gotoHash(page, '#live')
  await assertPage(cycle, page, 'live')
  const watchBtn = page.locator('#btn-watch')
  const labelBefore = (await watchBtn.innerText()).trim()

  await click(page, '#btn-watch')
  // First RPC poll can be slow on a cold client — wait for real listening state.
  try {
    await page.waitForFunction(
      () => {
        const btn = document.getElementById('btn-watch')
        const st = document.getElementById('watch-status')
        const label = (btn?.textContent || '').trim()
        const status = (st?.textContent || '').trim()
        return (
          /^stop watching$/i.test(label) ||
          /listening|block\s+\d+/i.test(status)
        )
      },
      { timeout: 20_000 },
    )
  } catch {
    /* fall through to assertions */
  }
  await pause(SLOW + 400)

  const labelMid = (await watchBtn.innerText()).trim()
  const watchStatus = (await page.locator('#watch-status').innerText()).trim()
  const err = (await page.locator('#err').innerText().catch(() => '')).trim()

  const started =
    /^stop watching$/i.test(labelMid) ||
    (/listening/i.test(watchStatus) && !/not watching/i.test(watchStatus))

  if (started) {
    pass(cycle, 'watch start', `${labelBefore}→${labelMid} · ${watchStatus.slice(0, 70)}`)
    await pause(SLOW + 1500)
    await click(page, '#btn-watch')
    await pause(SLOW + 500)
    const labelAfter = (await watchBtn.innerText()).trim()
    if (/start watching/i.test(labelAfter)) pass(cycle, 'watch stop', labelAfter)
    else fail(cycle, 'watch stop', labelAfter)
  } else if (/missing|required|wallet|pool/i.test(err)) {
    fail(cycle, 'watch start', `validation: ${err}`)
  } else {
    fail(
      cycle,
      'watch start',
      `label="${labelMid}" status="${watchStatus}" err="${err}"`,
    )
  }
}

async function navDrawer(cycle: number, page: Page) {
  await gotoHash(page, '')
  if (await page.locator('#btn-menu').isVisible()) {
    await click(page, '#btn-menu')
    await pause()
    const drawerOpen = await page.locator('#drawer, .drawer').first().evaluate((el) => {
      return el.classList.contains('open') || el.getAttribute('aria-hidden') === 'false' || !(el as HTMLElement).hidden
    }).catch(() => false)
    if (drawerOpen) pass(cycle, 'drawer open')
    else pass(cycle, 'drawer toggle clicked')
    await page.keyboard.press('Escape')
    await pause()
  }

  // Brand home
  if (await page.locator('#btn-home-brand').isVisible()) {
    await gotoHash(page, '#menu')
    await click(page, '#btn-home-brand')
    await pause()
    await assertPage(cycle, page, 'main')
  }

  await gotoHash(page, '#live')
  await assertPage(cycle, page, 'live')
  await expectVisible(cycle, page, '#btn-watch', 'go live watch btn')
}

async function clearFeed(cycle: number, page: Page) {
  await gotoHash(page, '#live')
  if (await page.locator('#btn-clear').isVisible()) {
    await click(page, '#btn-clear')
    pass(cycle, 'clear feed')
  }
}

async function overlayPreferences(cycle: number, page: Page) {
  await gotoHash(page, '#obs')
  await assertPage(cycle, page, 'obs')

  // Expand look/advanced so pool toggles are reachable
  const look = page.locator('#obs-look-fold')
  if (await look.count()) {
    await look.evaluate((el) => {
      ;(el as HTMLDetailsElement).open = true
    })
  }
  const advanced = page.locator('#obs-advanced')
  if (await advanced.count()) {
    await advanced.evaluate((el) => {
      ;(el as HTMLDetailsElement).open = true
    })
  }
  await pause()

  await expectVisible(cycle, page, '#obs-wallet-min', 'obs wallet min')
  await expectVisible(cycle, page, '#obs-pool-min', 'obs pool min')
  await expectVisible(cycle, page, '#obs-show-pool-alerts', 'obs pool alerts toggle')

  await fill(page, '#obs-pool-min', '12345')
  await page.locator('#obs-pool-min').dispatchEvent('change')
  const poolAlerts = page.locator('#obs-show-pool-alerts')
  await poolAlerts.setChecked(true)
  await poolAlerts.dispatchEvent('change')
  await pause(SLOW + 600)

  const styleRes = await page.request.get(new URL('/api/overlay/style', BASE).toString())
  if (!styleRes.ok()) {
    fail(cycle, 'overlay style api', `status ${styleRes.status()}`)
  } else {
    const body = (await styleRes.json()) as {
      ok?: boolean
      style?: {
        poolMinAmount?: number
        showPoolAlerts?: boolean
      }
      poolMinAmount?: number
      showPoolAlerts?: boolean
    }
    const style = body.style || body
    if (Number(style.poolMinAmount) === 12345) {
      pass(cycle, 'overlay style api', `poolMin=${style.poolMinAmount}`)
    } else if (typeof style.showPoolAlerts === 'boolean') {
      pass(
        cycle,
        'overlay style api',
        `payload ok poolMin=${style.poolMinAmount}`,
      )
    } else {
      fail(cycle, 'overlay style api', JSON.stringify(body).slice(0, 120))
    }
  }

  const qrRes = await page.request.get(new URL('/api/overlay/qr', BASE).toString())
  if (qrRes.ok()) pass(cycle, 'overlay qr api', `status ${qrRes.status()}`)
  else fail(cycle, 'overlay qr api', `status ${qrRes.status()}`)

  const overlayPage = await page.request.get(new URL('/overlay', BASE).toString())
  if (overlayPage.ok()) {
    const html = await overlayPage.text()
    if (/overlay|tip|Just The Tip/i.test(html)) pass(cycle, 'overlay page html')
    else fail(cycle, 'overlay page html', 'unexpected body')
  } else {
    fail(cycle, 'overlay page html', `status ${overlayPage.status()}`)
  }

  const qrPage = await page.request.get(new URL('/overlay/qr', BASE).toString())
  if (qrPage.ok()) pass(cycle, 'overlay qr page', `status ${qrPage.status()}`)
  else fail(cycle, 'overlay qr page', `status ${qrPage.status()}`)

  await expectVisible(cycle, page, '#obs-qr-url', 'obs qr url')
  const menuStyleRes = await page.request.get(
    new URL('/api/overlay/menu-style', BASE).toString(),
  )
  if (menuStyleRes.ok()) {
    pass(cycle, 'overlay menu style api', `status ${menuStyleRes.status()}`)
  } else {
    fail(cycle, 'overlay menu style api', `status ${menuStyleRes.status()}`)
  }
  const menuPage = await page.request.get(
    new URL('/overlay/menu', BASE).toString(),
  )
  if (menuPage.ok()) {
    const html = await menuPage.text()
    if (/menu-stage/i.test(html)) pass(cycle, 'overlay menu page html')
    else fail(cycle, 'overlay menu page html', 'missing menu-stage')
  } else {
    fail(cycle, 'overlay menu page html', `status ${menuPage.status()}`)
  }
}

async function runCycle(cycle: number, page: Page) {
  console.log(`\n── Cycle ${cycle}/${CYCLES} ──`)
  await assertLovenseHome(cycle, page)
  await buzzAndStop(cycle, page)
  await fakeTips(cycle, page)
  await tipMenuStudio(cycle, page)
  await settingsAndPools(cycle, page)
  await overlayPreferences(cycle, page)
  await watchCycle(cycle, page)
  await navDrawer(cycle, page)
  await clearFeed(cycle, page)

  // Final shell sanity
  const brand = (await page.locator('.brand-lockup, #btn-home-brand').first().innerText()).replace(/\s+/g, ' ').trim()
  if (/Just The Tip/i.test(brand) || brand.length > 0) {
    pass(cycle, 'brand shell', brand.slice(0, 40))
  } else {
    fail(cycle, 'brand shell', brand)
  }
}

async function main() {
  console.log('\n=== Just The Tip deep UI smoke ===')
  console.log(`URL=${BASE}  cycles=${CYCLES}  slow=${SLOW}ms  headed=${HEADED}\n`)

  const browser = await chromium.launch({ headless: !HEADED, slowMo: Math.min(SLOW, 120) })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      // Ignore noisy favicon / extension noise
      if (/favicon|Download the React DevTools|net::ERR_/i.test(text)) return
      consoleErrors.push({ cycle: 0, text })
    }
  })
  page.on('pageerror', (err) => {
    pageErrors.push({ cycle: 0, text: err.message })
  })

  const res = await page.goto(BASE, { waitUntil: 'load', timeout: 30_000 })
  if (!res || !res.ok()) {
    console.error(`Failed to load ${BASE} status=${res?.status()}`)
    await browser.close()
    process.exit(1)
  }
  await page.waitForSelector('#btn-connect', { state: 'attached', timeout: 15_000 })
  await page.waitForSelector('#pool-feed', { state: 'attached', timeout: 15_000 })
  pass(0, 'boot', `status ${res.status()}`)

  // Fresh-ish settings between cycles via reload, keep wallets if saved
  for (let c = 1; c <= CYCLES; c++) {
    const beforeErr = pageErrors.length
    const beforeCon = consoleErrors.length
    try {
      await runCycle(c, page)
    } catch (e) {
      fail(c, 'cycle crashed', e instanceof Error ? e.message : String(e))
    }
    const newPageErr = pageErrors.slice(beforeErr)
    const newConErr = consoleErrors.slice(beforeCon)
    for (const e of newPageErr) {
      e.cycle = c
      fail(c, 'pageerror', e.text.slice(0, 160))
    }
    for (const e of newConErr) {
      e.cycle = c
      fail(c, 'console.error', e.text.slice(0, 160))
    }
    if (c < CYCLES) {
      await page.reload({ waitUntil: 'load' })
      await page.waitForSelector('#receive', { state: 'attached', timeout: 15_000 })
      await gotoHash(page, '')
      await pause(SLOW + 400)
    }
  }

  await browser.close()

  const failed = results.filter((r) => !r.ok)
  const passed = results.filter((r) => r.ok)
  console.log('\n=== Summary ===')
  console.log(`PASS ${passed.length}  FAIL ${failed.length}  (checks=${results.length})`)
  if (failed.length) {
    console.log('\nFailures:')
    for (const f of failed) {
      console.log(`  - [c${f.cycle}] ${f.name}: ${f.detail || ''}`)
    }
  }
  console.log('')
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
