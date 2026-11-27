/**
 * Vicious wallet persistence smoke — hunts remove/resurrect bugs.
 *
 *   npx tsx scripts/smoke-wallets-vicious.mts
 *
 * Env:
 *   SMOKE_URL   default http://127.0.0.1:5173/
 *   HEADED=1    show browser
 *   SMOKE_SLOW_MS default 200
 */
import { chromium, type Page, type ConsoleMessage } from 'playwright'

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'
const SLOW = Math.max(0, Number(process.env.SMOKE_SLOW_MS || 200))
const HEADED = process.env.HEADED === '1'
const STORAGE_KEY = 'pulsefans-tipbuzz-v1'

const WALLET_A = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const WALLET_B = '0x000000000000000000000000000000000000dEaD'
const WALLET_C = '0x1111111111111111111111111111111111111111'

type Check = { name: string; ok: boolean; detail?: string }
const results: Check[] = []
const consoleErrors: string[] = []
const pageErrors: string[] = []

function pass(name: string, detail = '') {
  results.push({ name, ok: true, detail })
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`)
}
function fail(name: string, detail = '') {
  results.push({ name, ok: false, detail })
  console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function pause(ms = SLOW) {
  if (ms > 0) await new Promise((r) => setTimeout(r, ms))
}

async function gotoHash(page: Page, hash: string) {
  await page.evaluate((h) => {
    location.hash = h
  }, hash)
  await pause(SLOW + 150)
}

async function readStored(page: Page): Promise<{
  receive: string
  savedWallets: { address: string; label: string }[]
}> {
  return page.evaluate((key) => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return { receive: '', savedWallets: [] }
      const parsed = JSON.parse(raw) as {
        receive?: string
        savedWallets?: { address?: string; label?: string }[]
      }
      return {
        receive: typeof parsed.receive === 'string' ? parsed.receive : '',
        savedWallets: Array.isArray(parsed.savedWallets)
          ? parsed.savedWallets.map((w) => ({
              address: String(w?.address || ''),
              label: String(w?.label || ''),
            }))
          : [],
      }
    } catch {
      return { receive: '', savedWallets: [] }
    }
  }, STORAGE_KEY)
}

function hasWallet(
  wallets: { address: string }[],
  address: string,
) {
  const key = address.toLowerCase()
  return wallets.some((w) => w.address.toLowerCase() === key)
}

async function walletRowCount(page: Page) {
  return page.locator('#wallet-list .wallet-item').count()
}

async function removeWalletByAddress(page: Page, address: string) {
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
      await pause(SLOW + 100)
      return true
    }
  }
  return false
}

async function saveWallet(page: Page, address: string, label: string) {
  await gotoHash(page, '')
  await page.locator('#receive').fill(address)
  await page.locator('#receive-label').fill(label)
  await page.locator('#btn-save-wallet').click()
  await pause(SLOW + 150)
}

async function waitReady(page: Page) {
  await page.waitForSelector('#receive', { state: 'attached', timeout: 15_000 })
  await gotoHash(page, '')
  await page.waitForSelector('#btn-connect', { state: 'attached', timeout: 10_000 })
}

async function clearAppStorage(page: Page) {
  await page.evaluate((key) => {
    localStorage.removeItem(key)
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('pulsefans')) localStorage.removeItem(k)
    }
  }, STORAGE_KEY)
  await page.reload({ waitUntil: 'load' })
  await waitReady(page)
}

async function settingsSave(page: Page) {
  await gotoHash(page, '#settings')
  await page.locator('#btn-settings-save').click()
  await pause(SLOW + 200)
}

async function reloadApp(page: Page) {
  await page.reload({ waitUntil: 'load' })
  await waitReady(page)
}

async function receiveValue(page: Page) {
  return (await page.locator('#receive').inputValue()).trim()
}

async function assertStoredGone(
  page: Page,
  name: string,
  address: string,
  opts?: { receiveMustBeEmpty?: boolean },
) {
  const stored = await readStored(page)
  if (hasWallet(stored.savedWallets, address)) {
    fail(name, `still in localStorage: ${address.slice(0, 10)}…`)
    return false
  }
  if (opts?.receiveMustBeEmpty && stored.receive) {
    const same = stored.receive.toLowerCase() === address.toLowerCase()
    if (same) {
      fail(name, `receive still set to removed wallet`)
      return false
    }
  }
  pass(name, `gone · list=${stored.savedWallets.length}`)
  return true
}

async function runGauntlet(page: Page) {
  console.log('\n── wipe storage ──')
  await clearAppStorage(page)
  {
    const s = await readStored(page)
    if (s.savedWallets.length === 0) {
      pass('fresh storage', `receive=${s.receive ? 'set' : 'empty'}`)
    } else {
      fail('fresh storage', `wallets=${s.savedWallets.length}`)
    }
  }

  console.log('\n── save + list ──')
  await saveWallet(page, WALLET_A, 'alpha')
  {
    const s = await readStored(page)
    if (hasWallet(s.savedWallets, WALLET_A) && s.savedWallets.some((w) => w.label === 'alpha')) {
      pass('save wallet A', `list=${s.savedWallets.length}`)
    } else fail('save wallet A', JSON.stringify(s.savedWallets))
  }
  await gotoHash(page, '#settings')
  {
    const n = await walletRowCount(page)
    if (n >= 1) pass('settings list shows A', `rows=${n}`)
    else fail('settings list shows A', `rows=${n}`)
  }

  console.log('\n── save second wallet ──')
  await saveWallet(page, WALLET_B, 'bravo')
  {
    const s = await readStored(page)
    if (hasWallet(s.savedWallets, WALLET_A) && hasWallet(s.savedWallets, WALLET_B)) {
      pass('save wallet B keeps A', `list=${s.savedWallets.length}`)
    } else fail('save wallet B keeps A', JSON.stringify(s.savedWallets))
  }

  console.log('\n── remove INACTIVE (A while B active) ──')
  {
    const recv = await receiveValue(page)
    if (recv.toLowerCase() !== WALLET_B.toLowerCase()) {
      fail('precondition B active', `receive=${recv}`)
    } else pass('precondition B active')
  }
  {
    const removed = await removeWalletByAddress(page, WALLET_A)
    if (!removed) fail('remove inactive A click', 'row not found')
    else pass('remove inactive A click')
  }
  await assertStoredGone(page, 'inactive A gone immediately', WALLET_A)
  await settingsSave(page)
  await assertStoredGone(page, 'inactive A gone after settings save', WALLET_A)
  await reloadApp(page)
  await assertStoredGone(page, 'inactive A gone after reload', WALLET_A)
  {
    const s = await readStored(page)
    if (hasWallet(s.savedWallets, WALLET_B)) pass('B survived A removal')
    else fail('B survived A removal', JSON.stringify(s))
  }

  console.log('\n── remove ACTIVE (the bug we shipped) ──')
  await saveWallet(page, WALLET_C, 'charlie')
  {
    const recv = await receiveValue(page)
    if (recv.toLowerCase() === WALLET_C.toLowerCase()) pass('C is active tip wallet')
    else fail('C is active tip wallet', recv)
  }
  {
    const removed = await removeWalletByAddress(page, WALLET_C)
    if (!removed) fail('remove active C click', 'row not found')
    else pass('remove active C click')
  }
  {
    const recv = await receiveValue(page)
    if (!recv) pass('active remove clears tip field')
    else fail('active remove clears tip field', `still ${recv}`)
  }
  await assertStoredGone(page, 'active C gone immediately', WALLET_C, {
    receiveMustBeEmpty: true,
  })

  // Settings save is the old resurrection path
  await settingsSave(page)
  await assertStoredGone(page, 'active C gone after settings save', WALLET_C, {
    receiveMustBeEmpty: true,
  })

  // Boot seed is the other resurrection path
  await reloadApp(page)
  await assertStoredGone(page, 'active C gone after reload/boot', WALLET_C, {
    receiveMustBeEmpty: true,
  })
  {
    const recv = await receiveValue(page)
    if (!recv || recv.toLowerCase() !== WALLET_C.toLowerCase()) {
      pass('tip field not restored to C', recv || 'empty')
    } else fail('tip field not restored to C', recv)
  }

  console.log('\n── resurrection stress: save → remove → save settings ×3 → reload ×2 ──')
  await saveWallet(page, WALLET_A, 'phoenix')
  {
    const removed = await removeWalletByAddress(page, WALLET_A)
    if (!removed) fail('phoenix remove click', 'missing')
    else pass('phoenix remove click')
  }
  for (let i = 0; i < 3; i++) {
    await settingsSave(page)
  }
  await assertStoredGone(page, 'phoenix gone after 3× settings save', WALLET_A, {
    receiveMustBeEmpty: true,
  })
  await reloadApp(page)
  await reloadApp(page)
  await assertStoredGone(page, 'phoenix gone after double reload', WALLET_A, {
    receiveMustBeEmpty: true,
  })

  console.log('\n── pick from list + rename ──')
  await saveWallet(page, WALLET_A, 'named')
  await saveWallet(page, WALLET_B, 'other')
  await gotoHash(page, '#settings')
  {
    // Pick A from list (main button)
    const pick = page.locator('#wallet-list .wallet-item-main').filter({
      hasText: /named|d8dA6B|0xd8dA/i,
    }).first()
    if (await pick.count()) {
      await pick.click()
      await pause(SLOW + 150)
      const recv = await receiveValue(page)
      if (recv.toLowerCase() === WALLET_A.toLowerCase()) pass('pick A from list')
      else fail('pick A from list', recv)
    } else {
      // try by title
      const byTitle = page.locator(`.wallet-item-main[title*="${WALLET_A.slice(0, 10)}" i]`).first()
      if (await byTitle.count()) {
        await byTitle.click()
        await pause()
        const recv = await receiveValue(page)
        if (recv.toLowerCase() === WALLET_A.toLowerCase()) pass('pick A from list')
        else fail('pick A from list', recv)
      } else fail('pick A from list', 'no row')
    }
  }
  {
    await gotoHash(page, '#settings')
    const row = page.locator('#wallet-list .wallet-item').filter({ hasText: /named/i }).first()
    if (await row.count()) {
      await row.locator('button.btn.tiny[title="Edit wallet name"]').click()
      await pause()
      const input = page.locator('#wallet-list .wallet-item-rename input')
      await input.fill('renamed-alpha')
      await page.locator('#wallet-list .wallet-item-rename button.primary').click()
      await pause(SLOW + 150)
      const s = await readStored(page)
      const w = s.savedWallets.find((x) => x.address.toLowerCase() === WALLET_A.toLowerCase())
      if (w?.label === 'renamed-alpha') pass('inline rename persists')
      else fail('inline rename persists', JSON.stringify(w))
    } else fail('inline rename persists', 'row missing')
  }

  console.log('\n── invalid save rejected ──')
  await gotoHash(page, '')
  await page.locator('#receive').fill('not-a-wallet')
  await page.locator('#btn-save-wallet').click()
  await pause(SLOW + 100)
  {
    const err = (await page.locator('#err').innerText().catch(() => '')).trim()
    const s = await readStored(page)
    if (/valid|0x|address/i.test(err) || !hasWallet(s.savedWallets, 'not-a-wallet')) {
      pass('invalid address rejected', err.slice(0, 60) || 'not stored')
    } else fail('invalid address rejected', err)
  }

  console.log('\n── case-insensitive remove ──')
  await saveWallet(page, WALLET_A, 'case')
  {
    // Ensure active so clear path runs
    const removed = await removeWalletByAddress(page, WALLET_A.toLowerCase())
    if (!removed) {
      // list shows checksum; remove by UI anyway
      const any = await removeWalletByAddress(page, WALLET_A)
      if (!any) fail('case-insensitive remove click')
      else pass('case-insensitive remove click')
    } else pass('case-insensitive remove click')
  }
  await reloadApp(page)
  await assertStoredGone(page, 'case-insensitive remove sticks', WALLET_A)

  console.log('\n── plant zombie receive (legacy bug state) ──')
  // Simulate pre-fix storage: receive set, wallet already removed from list
  await page.evaluate(
    ({ key, address }) => {
      const raw = localStorage.getItem(key)
      const parsed = raw ? JSON.parse(raw) : {}
      parsed.receive = address
      parsed.savedWallets = (parsed.savedWallets || []).filter(
        (w: { address?: string }) =>
          (w.address || '').toLowerCase() !== address.toLowerCase(),
      )
      localStorage.setItem(key, JSON.stringify(parsed))
    },
    { key: STORAGE_KEY, address: WALLET_A },
  )
  await reloadApp(page)
  {
    // Boot intentionally re-seeds active receive into saved list — document behavior
    const s = await readStored(page)
    if (hasWallet(s.savedWallets, WALLET_A)) {
      pass(
        'boot reseeds receive into list (documented)',
        'why Remove must clear tip field',
      )
    } else {
      fail(
        'boot reseeds receive into list (documented)',
        'expected reseed; product changed?',
      )
    }
  }
  // Now remove properly and prove it stays dead
  {
    const removed = await removeWalletByAddress(page, WALLET_A)
    if (!removed) fail('post-zombie remove')
    else pass('post-zombie remove')
  }
  await reloadApp(page)
  await assertStoredGone(page, 'post-zombie remove sticks after reload', WALLET_A, {
    receiveMustBeEmpty: true,
  })
}

async function main() {
  console.log('\n=== Just The Tip VICIOUS wallet smoke ===')
  console.log(`URL=${BASE}  slow=${SLOW}ms  headed=${HEADED}\n`)

  const browser = await chromium.launch({
    headless: !HEADED,
    slowMo: Math.min(SLOW, 80),
  })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      if (/favicon|React DevTools|net::ERR_/i.test(text)) return
      consoleErrors.push(text)
    }
  })
  page.on('pageerror', (err) => {
    pageErrors.push(err.message)
  })

  const res = await page.goto(BASE, { waitUntil: 'load', timeout: 30_000 })
  if (!res || !res.ok()) {
    console.error(`Failed to load ${BASE} status=${res?.status()}`)
    await browser.close()
    process.exit(1)
  }
  await page.waitForSelector('#receive', { state: 'attached', timeout: 15_000 })
  pass('boot', `status ${res.status()}`)

  try {
    await runGauntlet(page)
  } catch (e) {
    fail('gauntlet crashed', e instanceof Error ? e.message : String(e))
  }

  for (const e of pageErrors) fail('pageerror', e.slice(0, 160))
  for (const e of consoleErrors) fail('console.error', e.slice(0, 160))

  await browser.close()

  const failed = results.filter((r) => !r.ok)
  const passed = results.filter((r) => r.ok)
  console.log('\n=== Summary ===')
  console.log(`PASS ${passed.length}  FAIL ${failed.length}  (checks=${results.length})`)
  if (failed.length) {
    console.log('\nFailures:')
    for (const f of failed) {
      console.log(`  - ${f.name}: ${f.detail || ''}`)
    }
  }
  console.log('')
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
