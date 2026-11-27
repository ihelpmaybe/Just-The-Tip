/*
 * Smoke: whitelist auto-splits tip coins across toy tabs.
 *   1 coin → every toy
 *   2 coins → half / half
 *   6 coins × 6 toys → one coin each (regression: old 400-rule cap dropped last toys)
 *
 *   SMOKE_URL=http://127.0.0.1:5173/ npx tsx scripts/smoke-whitelist-autosplit.mts
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { DEFAULT_SHIP_MENU_PATTERNS } from '../shared/src/utils/pricing.ts'
import { setWhitelistCoin } from './lib/menuWhitelist.mts'

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'
const KEY = 'pulsefans-tipbuzz-v1'
const TOYS = ['Lush', 'Domi', 'Nora', 'Edge', 'Hush', 'Max'] as const
const SPLIT_COINS = ['HEX', 'PLSX', 'INC', 'PUMP', 'ProveX', 'PLS'] as const

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(BASE)
await page.evaluate((k) => localStorage.removeItem(k), KEY)
await page.reload()
await page.waitForTimeout(400)
await page.evaluate(() => {
  location.hash = '#menu'
})
await page.waitForTimeout(600)

for (const name of TOYS) {
  await page.locator('#menu-toy-search').fill(name)
  await page.waitForTimeout(300)
  await page.locator('#menu-toy-results [role="option"]').first().click()
  await page.waitForTimeout(700)
}

async function rulesByToy() {
  return page.evaluate((k) => {
    const raw = JSON.parse(localStorage.getItem(k) || '{}')
    const out: Record<string, string[]> = {}
    for (const r of raw.coinRewardRules || []) {
      for (const id of r.toyIds.length ? r.toyIds : ['(shared)']) {
        out[id] = [...new Set([...(out[id] || []), r.coin])]
      }
    }
    return out
  }, KEY)
}

async function ruleCount() {
  return page.evaluate((k) => {
    const raw = JSON.parse(localStorage.getItem(k) || '{}')
    return (raw.coinRewardRules || []).length as number
  }, KEY)
}

async function selectChip(label: string, on: boolean) {
  await setWhitelistCoin(page, label, on, 900)
}

// 1 coin → every toy
await selectChip('HEX', true)
let byToy = await rulesByToy()
console.log('1 coin:', byToy)
assert.equal(Object.keys(byToy).length, TOYS.length, 'expected all toys painted')
assert.ok(
  Object.values(byToy).every((c) => c.length === 1 && c[0] === 'HEX'),
  `all toys should be HEX: ${JSON.stringify(byToy)}`,
)

// 2 coins → half / half
await selectChip('PLSX', true)
byToy = await rulesByToy()
console.log('2 coins:', byToy)
const flat2 = Object.values(byToy).flat()
assert.equal(new Set(flat2).size, 2, `expected HEX+PLSX split: ${flat2}`)
assert.equal(
  flat2.filter((c) => c === 'HEX').length,
  TOYS.length / 2,
  'HEX should own half',
)
assert.equal(
  flat2.filter((c) => c === 'PLSX').length,
  TOYS.length / 2,
  'PLSX should own half',
)

// Back to 1 → all toys again
await selectChip('PLSX', false)
byToy = await rulesByToy()
console.log('back to 1:', byToy)
assert.ok(
  Object.values(byToy).every((c) => c.length === 1 && c[0] === 'HEX'),
  `should re-unify to HEX: ${JSON.stringify(byToy)}`,
)
await selectChip('HEX', false)

// 6 coins × 6 toys → one each (must not silently drop last tabs)
for (const label of SPLIT_COINS) {
  await selectChip(label, true)
}
byToy = await rulesByToy()
const nRules = await ruleCount()
console.log('6 coins:', byToy, 'rules', nRules)
assert.equal(
  Object.keys(byToy).length,
  TOYS.length,
  `expected ${TOYS.length} toys painted, got ${Object.keys(byToy).length}`,
)
const flat6 = Object.values(byToy).flat()
assert.equal(new Set(flat6).size, SPLIT_COINS.length, `expected 6 coins: ${flat6}`)
for (const coins of Object.values(byToy)) {
  assert.equal(coins.length, 1, `toy should have exactly one coin: ${coins}`)
}
assert.ok(nRules >= TOYS.length, `expected at least one rule per toy, got ${nRules}`)
assert.ok(
  nRules <= DEFAULT_SHIP_MENU_PATTERNS * TOYS.length + 20,
  `expected modest rule count with ship defaults, got ${nRules}`,
)

await browser.close()
console.log('smoke-whitelist-autosplit OK')
