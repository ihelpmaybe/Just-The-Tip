/*
 * All-currencies card: each badge click turns that coin off (gray), not gone.
 *
 *   SMOKE_URL=http://127.0.0.1:5173/ npx tsx scripts/smoke-badge-deselect.mts
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { setWhitelistCoin } from './lib/menuWhitelist.mts'

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'
const KEY = 'pulsefans-tipbuzz-v1'
const COINS = ['PLS', 'PornDai', 'PUMP', 'MOST', 'INC', 'HEX', 'PLSX'] as const

const browser = await chromium.launch()
const page = await browser.newPage()
const errors: string[] = []
page.on('pageerror', (e) => errors.push(e.message))

await page.goto(BASE)
await page.evaluate((k) => localStorage.removeItem(k), KEY)
await page.reload()
await page.waitForTimeout(400)
await page.evaluate(() => {
  location.hash = '#menu'
})
await page.waitForTimeout(700)

await page.locator('#menu-toy-search').fill('Domi')
await page.waitForTimeout(350)
await page.locator('#menu-toy-results [role="option"]').first().click()
await page.waitForTimeout(600)

for (const coin of COINS) {
  await setWhitelistCoin(page, coin, true, 150)
}

await page.selectOption('#menu-tip-currency', { label: 'All currencies' })
await page.waitForTimeout(1200)

const card = page.locator('.pattern-card').filter({ hasText: 'Long Wick' }).first()
assert.ok(await card.count(), 'Long Wick card missing')
let badges = await card.locator('.pattern-coin-badge').allTextContents()
badges = badges.map((t) => t.trim()).filter(Boolean)
console.log('badges after All currencies:', badges)
assert.equal(badges.length, COINS.length, `expected ${COINS.length} badges`)

// One click per on-badge should gray it — badges stay so they can be turned back on.
for (let i = 0; i < COINS.length; i++) {
  const onBadge = card.locator('.pattern-coin-badge[aria-pressed="true"]').first()
  assert.ok(await onBadge.count(), `no on badges left at step ${i}`)
  await onBadge.click()
  await page.waitForTimeout(400)
  const remainingOn = await card.locator('.pattern-coin-badge[aria-pressed="true"]').count()
  const total = await card.locator('.pattern-coin-badge').count()
  console.log(`  click ${i + 1}: ${remainingOn} on / ${total} total`)
  assert.equal(total, COINS.length, 'badges must stay on the card')
  assert.equal(remainingOn, COINS.length - i - 1, `expected one more badge off`)
}

assert.equal(
  await card.locator('.pattern-coin-badge').count(),
  COINS.length,
  'all selector badges should still be on the card',
)
assert.equal(
  await card.locator('.pattern-coin-badge.is-off').count(),
  COINS.length,
  'all badges should be gray/off',
)

// Click an off badge — it comes back on without a reset.
await card.locator('.pattern-coin-badge.is-off').first().click()
await page.waitForTimeout(400)
assert.equal(
  await card.locator('.pattern-coin-badge[aria-pressed="true"]').count(),
  1,
  'off badge should turn back on',
)

assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`)
await browser.close()
console.log('\nsmoke-badge-deselect OK')
