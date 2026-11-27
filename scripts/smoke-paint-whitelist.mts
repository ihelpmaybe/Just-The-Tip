/*
 * Paint whitelist persists; Save token then pick / unpick survives reload.
 *   SMOKE_URL=http://127.0.0.1:5173/ npx tsx scripts/smoke-paint-whitelist.mts
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { setWhitelistCoin } from './lib/menuWhitelist.mts'

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'
const KEY = 'pulsefans-tipbuzz-v1'

const browser = await chromium.launch()
const page = await browser.newPage()

await page.goto(BASE)
await page.evaluate((k) => localStorage.removeItem(k), KEY)
await page.reload()
await page.evaluate(() => {
  location.hash = '#menu'
})
await page.waitForTimeout(900)

const chip = (label: string) =>
  page.locator('.menu-coin-price-chip').filter({ hasText: label }).first()

const pressed = async (label: string) =>
  (await chip(label).count()) > 0 &&
  (await chip(label).getAttribute('aria-pressed')) === 'true'

assert.equal(await chip('PLS').count(), 0, 'PLS should start in Suggestions')
assert.equal(await chip('PLSX').count(), 0, 'PLSX should not auto-chip')
assert.ok(await page.locator('#menu-coin-suggest').count(), 'Suggestions dropdown missing')
assert.ok(
  await page.locator('#menu-coin-suggest option').filter({ hasText: 'PLS' }).count(),
  'PLS missing from Suggestions',
)
assert.equal(
  await page.locator('#menu-coin-suggest option').filter({ hasText: 'HOA' }).count(),
  0,
  'curated HOA suggestion should be gone',
)

await setWhitelistCoin(page, 'PLSX', true)
await page.waitForTimeout(800)
const afterSelect = await page.evaluate((k) => {
  const raw = JSON.parse(localStorage.getItem(k) || '{}')
  return {
    paintCoinKeys: raw.paintCoinKeys,
    pressed: document.querySelector('.menu-coin-price-chip.is-picked')?.textContent,
    hasKey: Object.prototype.hasOwnProperty.call(raw, 'paintCoinKeys'),
  }
}, KEY)
console.log('after select', afterSelect)
assert.equal(await pressed('PLSX'), true)
assert.ok(afterSelect.hasKey, 'paintCoinKeys missing from storage')
assert.deepEqual(afterSelect.paintCoinKeys, [
  '0x95b303987a60c71504d99aa1b13b4da07b0790ab',
])

await page.reload()
await page.waitForTimeout(800)
await page.evaluate(() => {
  location.hash = '#menu'
})
await page.waitForTimeout(700)
assert.equal(await pressed('PLSX'), true, 'PLSX selection must survive reload')

await setWhitelistCoin(page, 'PLSX', false)
await page.waitForTimeout(800)
const afterUnselect = await page.evaluate((k) => {
  const raw = JSON.parse(localStorage.getItem(k) || '{}')
  return {
    paintCoinKeys: raw.paintCoinKeys,
    hasKey: Object.prototype.hasOwnProperty.call(raw, 'paintCoinKeys'),
  }
}, KEY)
console.log('after unselect', afterUnselect)
assert.equal(await chip('PLSX').count(), 0, 'PLSX should leave the board when unpicked')
assert.ok(afterUnselect.hasKey, 'paintCoinKeys key missing after unselect')
assert.deepEqual(afterUnselect.paintCoinKeys, [])

await page.reload()
await page.waitForTimeout(800)
await page.evaluate(() => {
  location.hash = '#menu'
})
await page.waitForTimeout(700)
assert.equal(await chip('PLSX').count(), 0, 'unselect must stick after reload')

await browser.close()
console.log('smoke-paint-whitelist OK')
