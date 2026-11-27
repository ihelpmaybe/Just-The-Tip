/**
 * Settings persistence across reload — wallet, tip coins, toggles, menu sort.
 *
 *   npx tsx scripts/smoke-settings-persist.mts
 *
 * Env: SMOKE_URL (default http://127.0.0.1:5173/)
 */
import { chromium, type Page } from 'playwright'
import { setWhitelistCoin } from './lib/menuWhitelist.mts'

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'
const KEY = 'pulsefans-tipbuzz-v1'
const WALLET = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const PLSX = '0x95b303987a60c71504d99aa1b13b4da07b0790ab'

const fails: string[] = []
function ok(name: string) {
  console.log(`  PASS  ${name}`)
}
function fail(name: string, detail = '') {
  fails.push(name)
  console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function pause(ms = 250) {
  await new Promise((r) => setTimeout(r, ms))
}

async function gotoHash(page: Page, hash: string) {
  await page.evaluate((h) => {
    location.hash = h
  }, hash)
  await pause(350)
}

async function reload(page: Page) {
  await page.reload({ waitUntil: 'load' })
  await page.waitForSelector('#receive', { state: 'attached', timeout: 15_000 })
  await pause(400)
}

type Stored = {
  receive?: string
  savedWallets?: { address?: string; label?: string }[]
  paintCoinKeys?: string[]
  coinRewardRules?: unknown[]
  nightMode?: boolean
  dryRun?: boolean
  menuSort?: string
  overlayQr?: {
    slides?: {
      qr?: boolean
      menu?: boolean
      pack?: Record<string, boolean>
    }
  }
}

async function readStored(page: Page): Promise<Stored> {
  return page.evaluate((k) => {
    try {
      return JSON.parse(localStorage.getItem(k) || '{}') as Stored
    } catch {
      return {}
    }
  }, KEY)
}

async function chipPressed(page: Page, label: string) {
  const chip = page.locator('.menu-coin-price-chip').filter({ hasText: label }).first()
  return (await chip.getAttribute('aria-pressed')) === 'true'
}

async function main() {
  console.log('\n=== smoke-settings-persist ===')
  console.log(`URL=${BASE}\n`)

  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto(BASE)
  await page.evaluate((k) => localStorage.removeItem(k), KEY)
  await reload(page)

  console.log('── wallet save + reload ──')
  await gotoHash(page, '')
  await page.locator('#receive').fill(WALLET)
  await page.locator('#receive-label').fill('persist-test')
  await page.locator('#btn-save-wallet').click()
  await pause()

  let stored = await readStored(page)
  if (
    stored.receive?.toLowerCase() === WALLET.toLowerCase() &&
    stored.savedWallets?.some(
      (w) => w.address?.toLowerCase() === WALLET.toLowerCase() && w.label === 'persist-test',
    )
  ) {
    ok('wallet in localStorage after save')
  } else fail('wallet in localStorage after save', JSON.stringify(stored.savedWallets))

  await reload(page)
  const recvAfter = (await page.locator('#receive').inputValue()).trim()
  if (recvAfter.toLowerCase() === WALLET.toLowerCase()) ok('receive field after reload')
  else fail('receive field after reload', recvAfter)

  await gotoHash(page, '#settings')
  const rows = await page.locator('#wallet-list .wallet-item').count()
  if (rows >= 1) ok('settings wallet list after reload')
  else fail('settings wallet list after reload', `rows=${rows}`)

  console.log('\n── tip coin whitelist + reload ──')
  await gotoHash(page, '#menu')
  await page.waitForSelector('#menu-coin-suggest', { timeout: 12_000 })
  await setWhitelistCoin(page, 'PLSX', true)
  await pause(500)

  stored = await readStored(page)
  if (stored.paintCoinKeys?.includes(PLSX)) ok('paintCoinKeys after chip click')
  else fail('paintCoinKeys after chip click', JSON.stringify(stored.paintCoinKeys))

  await reload(page)
  await gotoHash(page, '#menu')
  await page.waitForSelector('#menu-coin-suggest', { timeout: 12_000 })
  if (await chipPressed(page, 'PLSX')) ok('PLSX chip selected after reload')
  else fail('PLSX chip selected after reload')

  stored = await readStored(page)
  if (stored.paintCoinKeys?.includes(PLSX)) ok('paintCoinKeys after reload')
  else fail('paintCoinKeys after reload', JSON.stringify(stored.paintCoinKeys))

  console.log('\n── settings toggles + reload ──')
  await gotoHash(page, '#settings')
  const night = page.locator('#set-night')
  const nightWas = await night.isChecked()
  if (nightWas) await night.uncheck()
  else await night.check()
  await page.locator('#btn-settings-save').click()
  await pause()

  stored = await readStored(page)
  if (stored.nightMode === !nightWas) {
    ok('nightMode in localStorage after settings save')
  } else {
    fail(
      'nightMode in localStorage after settings save',
      `night=${stored.nightMode}`,
    )
  }

  await reload(page)
  await gotoHash(page, '#settings')
  if ((await night.isChecked()) === !nightWas) ok('night toggle after reload')
  else fail('night toggle after reload')

  console.log('\n── menu sort + reload ──')
  await gotoHash(page, '#menu')
  const sort = page.locator('#menu-sort')
  await sort.selectOption('price-desc')
  await pause(400)

  stored = await readStored(page)
  if (stored.menuSort === 'price-desc') ok('menuSort in localStorage')
  else fail('menuSort in localStorage', String(stored.menuSort))

  await reload(page)
  await gotoHash(page, '#menu')
  if ((await sort.inputValue()) === 'price-desc') ok('menu sort select after reload')
  else fail('menu sort select after reload', await sort.inputValue())

  console.log('\n── stream alerts ticks survive reload ──')
  await gotoHash(page, '#obs')
  await page.waitForSelector('#obs-qr-pack-pulsechain')
  await page.locator('#obs-qr-pack-pulsechain').check()
  await page.locator('#obs-qr-pack-pulsex').check()
  await page.locator('#obs-qr-slide-qr').uncheck()
  await pause(500)
  stored = await readStored(page)
  if (stored.overlayQr?.slides?.pack?.pulsechain === true) ok('pack PulseChain tick saved')
  else fail('pack PulseChain tick saved', JSON.stringify(stored.overlayQr?.slides?.pack))
  if (stored.overlayQr?.slides?.pack?.pulsex === true) ok('pack PulseX tick saved')
  else fail('pack PulseX tick saved', JSON.stringify(stored.overlayQr?.slides?.pack))
  if (stored.overlayQr?.slides?.qr === false) ok('Tip QR off tick saved')
  else fail('Tip QR off tick saved', String(stored.overlayQr?.slides?.qr))

  await reload(page)
  stored = await readStored(page)
  if (stored.overlayQr?.slides?.pack?.pulsechain === true) ok('pack PulseChain after reload')
  else fail('pack PulseChain after reload', JSON.stringify(stored.overlayQr?.slides?.pack))
  if (stored.overlayQr?.slides?.pack?.pulsex === true) ok('pack PulseX after reload')
  else fail('pack PulseX after reload', JSON.stringify(stored.overlayQr?.slides?.pack))
  if (stored.overlayQr?.slides?.qr === false) ok('Tip QR still off after reload')
  else fail('Tip QR still off after reload', String(stored.overlayQr?.slides?.qr))

  await gotoHash(page, '#obs')
  await page.waitForSelector('#obs-qr-pack-pulsechain')
  if (await page.locator('#obs-qr-pack-pulsechain').isChecked()) ok('PulseChain checkbox after reload')
  else fail('PulseChain checkbox after reload')
  if (await page.locator('#obs-qr-pack-pulsex').isChecked()) ok('PulseX checkbox after reload')
  else fail('PulseX checkbox after reload')
  if (!(await page.locator('#obs-qr-slide-qr').isChecked())) ok('Tip QR checkbox still off')
  else fail('Tip QR checkbox still off')

  console.log('\n── wallet + coins survive second reload ──')
  await reload(page)
  stored = await readStored(page)
  if (stored.receive?.toLowerCase() === WALLET.toLowerCase()) ok('wallet still stored')
  else fail('wallet still stored')
  if (stored.paintCoinKeys?.includes(PLSX)) ok('paintCoinKeys still stored')
  else fail('paintCoinKeys still stored')

  await browser.close()

  console.log(`\n=== Summary: ${fails.length ? 'FAIL' : 'OK'} (${fails.length} failed) ===\n`)
  if (fails.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
