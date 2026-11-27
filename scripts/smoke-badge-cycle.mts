/*
 * Badge click turns that coin off (gray) on the pattern. Switch coins via
 * Currency dropdown or pattern title with whitelist chips selected.
 *
 *   SMOKE_URL=http://127.0.0.1:5173/ npx tsx scripts/smoke-badge-cycle.mts
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { setWhitelistCoin } from './lib/menuWhitelist.mts'

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'
const KEY = 'pulsefans-tipbuzz-v1'
const COINS = ['HEX', 'PLSX', 'INC'] as const

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

await page.locator('#menu-toy-search').fill('Lush')
await page.waitForTimeout(350)
await page.locator('#menu-toy-results [role="option"]').first().click()
await page.waitForTimeout(600)

for (const coin of COINS) {
  await setWhitelistCoin(page, coin, true, 200)
}

await page.selectOption('#menu-tip-currency', { label: 'HEX' })
await page.waitForTimeout(1500)

for (const coin of COINS) {
  await setWhitelistCoin(page, coin, true, 200)
}

const card = page.locator('.pattern-card:not(#menu-pattern-tools-card)').first()
assert.ok(await card.locator('.pattern-coin-badge').count(), 'no coin badges after paint')
assert.equal(
  await card.locator('.pattern-coin-badge').count(),
  COINS.length,
  'whitelist coins stay on every pattern as toggles',
)
const hexBadge = card.locator('.pattern-coin-badge').filter({ hasText: 'HEX' })
assert.equal(await hexBadge.getAttribute('aria-pressed'), 'true', 'HEX should be on after dropdown')

await hexBadge.click()
await page.waitForTimeout(500)
assert.equal(
  await card.locator('.pattern-coin-badge').count(),
  COINS.length,
  'badge click should keep the coin selectors on the card',
)
assert.equal(await hexBadge.getAttribute('aria-pressed'), 'false', 'HEX should gray off')
console.log('badge click turns HEX off')

await page.selectOption('#menu-tip-currency', { label: 'PLSX' })
await page.waitForTimeout(900)
const plsxBadge = card.locator('.pattern-coin-badge').filter({ hasText: 'PLSX' })
assert.equal(
  await plsxBadge.getAttribute('aria-pressed'),
  'true',
  'currency dropdown turns PLSX on',
)
console.log('currency dropdown switches to PLSX')

// Solo whitelist: badge still turns off, never invents another coin.
for (const coin of COINS) {
  await setWhitelistCoin(page, coin, coin === 'PLSX', 200)
}
await page.selectOption('#menu-tip-currency', { label: 'PLSX' })
await page.waitForTimeout(900)
await card.locator('.pattern-coin-badge').first().click()
await page.waitForTimeout(500)
assert.equal(
  await card.locator('.pattern-coin-badge').count(),
  1,
  'solo badge should stay on the card',
)
assert.equal(
  await card.locator('.pattern-coin-badge.is-off').count(),
  1,
  'solo badge should gray off on click',
)
console.log('solo whitelist badge turns PLSX off')

/*
 * Off-whitelist leftover: settle on a HEX-only whitelist, then inject a stray
 * PUMP rule and reload. A badge for a coin with no selected chip cannot be
 * turned off, so loading must sweep it — never render it.
 */
await setWhitelistCoin(page, 'HEX', true, 600)
for (const label of await page.locator('.menu-coin-price-chip.is-picked').allTextContents()) {
  const name = label.split('·')[0]!.trim()
  if (name === 'HEX') continue
  await setWhitelistCoin(page, name, false, 400)
}
await page.evaluate((k) => {
  const raw = JSON.parse(localStorage.getItem(k) || '{}')
  const pump = '0xec4252e62c6de3d655ca9ce3afc12e553ebba274'
  const toyId = (raw.menuFilterToyIds || [])[0]
  for (const r of raw.coinRewardRules || []) {
    if (r.patternId === 'crypto-flash-loan') {
      r.coin = 'PUMP'
      r.tokenAddress = pump
      r.toyIds = toyId ? [toyId] : r.toyIds
    }
  }
  localStorage.setItem(k, JSON.stringify(raw))
}, KEY)
await page.reload()
await page.waitForTimeout(900)
await page.evaluate(() => {
  location.hash = '#menu'
})
await page.waitForTimeout(700)
const liveBadges = [
  ...new Set(
    (await page.locator('.pattern-coin-badge').allTextContents()).map((t) =>
      t.trim(),
    ),
  ),
]
console.log('badges after loading a stray PUMP rule:', liveBadges)
assert.ok(
  !liveBadges.includes('PUMP'),
  `swept coin still on a badge: ${liveBadges.join(', ')}`,
)
assert.ok(
  liveBadges.every((b) => b === 'HEX'),
  `badge outside the whitelist survived load: ${liveBadges.join(', ')}`,
)
const storedCoins = await page.evaluate((k) => {
  const raw = JSON.parse(localStorage.getItem(k) || '{}')
  return [
    ...new Set((raw.coinRewardRules || []).map((r: { coin: string }) => r.coin)),
  ]
}, KEY)
assert.ok(
  !storedCoins.includes('PUMP'),
  `stray PUMP rule survived in storage: ${storedCoins.join(', ')}`,
)
console.log('stray off-whitelist PUMP swept on load')

assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`)
await browser.close()
console.log('\nsmoke-badge-cycle OK')
