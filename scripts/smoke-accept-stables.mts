/*
 * Bridged stables: Save token, then whitelist like any other coin.
 *   SMOKE_URL=http://127.0.0.1:5173/ npx tsx scripts/smoke-accept-stables.mts
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { setWhitelistCoin } from './lib/menuWhitelist.mts'

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'
const KEY = 'pulsefans-tipbuzz-v1'
const EDAI = '0xefd766ccb38eaf1dfd701853bfce31359239f305'

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(BASE)
await page.evaluate((k) => localStorage.removeItem(k), KEY)
await page.reload()
await page.evaluate(() => {
  location.hash = '#menu'
})
await page.waitForTimeout(900)

assert.equal(
  await page.locator('.menu-accept-stables').count(),
  0,
  'Accept-stables ticks should be gone',
)

const chips = await page.locator('.menu-coin-price-chip').allTextContents()
const labels = chips.map((t) => t.split('·')[0]!.trim())
console.log('chips:', labels)
assert.ok(!labels.includes('eDAI'), 'eDAI should not auto-chip')
assert.ok(!labels.includes('PLS'), 'PLS should start in Suggestions, not a chip')

const suggest = page.locator('#menu-coin-suggest')
assert.ok(await suggest.count(), 'Suggestions dropdown missing')
const optionLabels = await suggest.locator('option').allTextContents()
console.log('suggestions sample:', optionLabels.slice(0, 12))
assert.ok(
  optionLabels.some((t) => t.includes('PLS')),
  'PLS missing from Suggestions',
)
assert.ok(
  !optionLabels.some((t) => t.includes('eDAI') || t.includes('eUSDC') || t.includes('HEX')),
  'curated suggestions should be gone',
)

await setWhitelistCoin(page, 'eDAI', true)
await page.waitForTimeout(500)

const after = (await page.locator('.menu-coin-price-chip').allTextContents()).map(
  (t) => t.split('·')[0]!.trim(),
)
console.log('chips after pick eDAI:', after)
assert.ok(after.includes('eDAI'), 'eDAI should become a whitelist chip')

let stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY)
console.log('paintCoinKeys', stored.paintCoinKeys)
assert.ok(
  (stored.paintCoinKeys || []).map((a: string) => a.toLowerCase()).includes(EDAI),
  'eDAI should be in paintCoinKeys',
)

await setWhitelistCoin(page, 'eDAI', false)
await page.waitForTimeout(400)
stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY)
assert.ok(
  !(stored.paintCoinKeys || []).map((a: string) => a.toLowerCase()).includes(EDAI),
  'eDAI should leave paintCoinKeys',
)

await browser.close()
console.log('\nsmoke-accept-stables OK')
