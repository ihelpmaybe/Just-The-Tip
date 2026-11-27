/**
 * Save token flow: paste address → decimals → symbol → nickname → Save token.
 * Suggestions only offer native PLS until a token is saved / picked.
 *
 *   SMOKE_URL=http://127.0.0.1:5173/ npx tsx scripts/smoke-save-tokens.mts
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { setWhitelistCoin } from './lib/menuWhitelist.mts'

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'
const KEY = 'pulsefans-tipbuzz-v1'

const SAMPLE = {
  address: '0xcFCFfE432A48dB53F59c301422d2EdD77B2A88d7',
  symbol: 'TEXAN',
  decimals: 18,
  label: 'TEXAN',
}

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(BASE)
await page.evaluate((k) => localStorage.removeItem(k), KEY)
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(400)
await page.evaluate(() => {
  location.hash = '#menu'
})
await page.waitForSelector('#btn-save-token', { timeout: 12_000 })
await page.waitForTimeout(500)

await page.locator('#token').fill(SAMPLE.address)
await page.locator('#token-dec').fill(String(SAMPLE.decimals))
await page.locator('#token-sym').fill(SAMPLE.symbol)
await page.locator('#token-label').fill(SAMPLE.label)
await page.locator('#btn-save-token').click()
await page.waitForTimeout(350)

const chipLabels = (
  await page.locator('.menu-coin-price-chip').allTextContents()
).map((t) => t.split('·')[0]!.trim())
console.log('chips after save:', chipLabels)
assert.ok(chipLabels.includes('TEXAN'), 'saved token should appear on the board')
assert.ok(!chipLabels.includes('PLS'), 'PLS should start in Suggestions')

const suggest = page.locator('#menu-coin-suggest')
assert.ok(await suggest.count(), 'Suggestions dropdown missing')
const optionLabels = await suggest.locator('option').allTextContents()
console.log('suggestions sample:', optionLabels.slice(0, 16))
assert.ok(
  optionLabels.some((t) => t.includes('PLS')),
  'PLS missing from Suggestions',
)
assert.ok(
  !optionLabels.some((t) => t.includes('HEX') || t.includes('PLSX') || t.includes('PUMP')),
  'curated suggestions should be gone',
)

await setWhitelistCoin(page, 'TEXAN', true)
await page.waitForTimeout(300)
await setWhitelistCoin(page, 'TEXAN', false)
await page.waitForTimeout(400)
const afterRemove = (
  await page.locator('.menu-coin-price-chip').allTextContents()
).map((t) => t.split('·')[0]!.trim())
console.log('chips after unpick TEXAN:', afterRemove)
assert.ok(!afterRemove.includes('TEXAN'), 'TEXAN chip should leave the board when unpicked')
assert.ok(
  await page.locator('#menu-coin-suggest option').filter({ hasText: 'TEXAN' }).count(),
  'removed TEXAN should land in Suggestions',
)

const stored = await page.evaluate((k) => {
  const raw = JSON.parse(localStorage.getItem(k) || '{}') as {
    savedTokens?: { address?: string; symbol?: string; label?: string }[]
  }
  return raw.savedTokens || []
}, KEY)
const row = stored.find(
  (t) => t.address?.toLowerCase() === SAMPLE.address.toLowerCase(),
)
assert.ok(row, 'TEXAN missing from savedTokens')
assert.equal(row?.symbol, SAMPLE.symbol)
assert.equal(row?.label, SAMPLE.label)

await browser.close()
console.log('\nsmoke-save-tokens OK')
