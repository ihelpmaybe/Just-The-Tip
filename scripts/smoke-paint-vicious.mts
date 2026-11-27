/*
 * Vicious paint smoke: hammer every "uncheck" path and prove nothing sticks.
 *
 * Invariant under test, after ANY unchecking action:
 *   no chips picked  ->  zero coin rules, zero painted tabs, zero badges,
 *                        and still zero after a reload.
 *
 *   SMOKE_URL=http://127.0.0.1:5173/ npx tsx scripts/smoke-paint-vicious.mts
 */
import assert from 'node:assert/strict'
import { chromium, type Page } from 'playwright'
import { setWhitelistCoin } from './lib/menuWhitelist.mts'

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'
const KEY = 'pulsefans-tipbuzz-v1'
const TOYS = ['Lush', 'Domi', 'Nora', 'Edge'] as const

let step = 0
function section(name: string) {
  step++
  console.log(`\n== ${step}. ${name} ==`)
}

const browser = await chromium.launch()
const page = await browser.newPage()
const pageErrors: string[] = []
page.on('pageerror', (e) => pageErrors.push(e.message))

async function openMenu() {
  await page.evaluate(() => {
    location.hash = '#menu'
  })
  await page.waitForTimeout(700)
}

async function reload() {
  await page.reload()
  await page.waitForTimeout(500)
  await openMenu()
  await page.waitForTimeout(400)
}

async function chips() {
  return page.evaluate(() =>
    [...document.querySelectorAll('.menu-coin-price-chip')].map((el) => ({
      label: (el.textContent || '').split('·')[0]!.trim(),
      picked: el.getAttribute('aria-pressed') === 'true',
    })),
  )
}

async function picked(): Promise<string[]> {
  return (await chips()).filter((c) => c.picked).map((c) => c.label)
}

async function setChip(label: string, on: boolean) {
  await setWhitelistCoin(page, label, on, 650)
}

/** Rules straight out of localStorage — the source of truth, not the DOM. */
async function storedRules() {
  return page.evaluate((k) => {
    const raw = JSON.parse(localStorage.getItem(k) || '{}')
    return {
      count: (raw.coinRewardRules || []).length,
      coins: [
        ...new Set((raw.coinRewardRules || []).map((r: { coin: string }) => r.coin)),
      ].sort(),
      paintCoinKeys: raw.paintCoinKeys || [],
      byToy: (() => {
        const out: Record<string, string[]> = {}
        for (const r of raw.coinRewardRules || []) {
          for (const id of r.toyIds.length ? r.toyIds : ['(shared)']) {
            out[id] = [...new Set([...(out[id] || []), r.coin])]
          }
        }
        return out
      })(),
    }
  }, KEY)
}

async function paintedTabs() {
  return page.evaluate(
    () =>
      [...document.querySelectorAll('.pattern-toy-tab.is-coin-painted')].length,
  )
}

async function badgeCount() {
  return page.evaluate(
    () => document.querySelectorAll('.pattern-coin-badge').length,
  )
}

/** The whole point of this file. */
async function assertFullyClean(what: string, opts?: { reload?: boolean }) {
  const p = await picked()
  const rules = await storedRules()
  const tabs = await paintedTabs()
  const badges = await badgeCount()
  console.log(
    `  clean? ${what} → picked=${JSON.stringify(p)} rules=${rules.count} tabs=${tabs} badges=${badges}`,
  )
  assert.deepEqual(p, [], `${what}: chips still picked`)
  assert.equal(rules.count, 0, `${what}: coin rules survived ${JSON.stringify(rules.byToy)}`)
  assert.deepEqual(rules.paintCoinKeys, [], `${what}: paintCoinKeys survived`)
  assert.equal(tabs, 0, `${what}: toy tabs still painted`)
  assert.equal(badges, 0, `${what}: pattern badges still shown`)

  if (opts?.reload !== false) {
    await reload()
    const p2 = await picked()
    const r2 = await storedRules()
    const t2 = await paintedTabs()
    const b2 = await badgeCount()
    console.log(
      `  after reload → picked=${JSON.stringify(p2)} rules=${r2.count} tabs=${t2} badges=${b2}`,
    )
    assert.deepEqual(p2, [], `${what}: chips came back after reload`)
    assert.equal(r2.count, 0, `${what}: rules came back after reload`)
    assert.equal(t2, 0, `${what}: tabs repainted after reload`)
    assert.equal(b2, 0, `${what}: badges came back after reload`)
  }
}

await page.goto(BASE)
await page.evaluate((k) => localStorage.removeItem(k), KEY)
await page.reload()
await page.waitForTimeout(400)
await openMenu()

section('add 4 toys')
for (const name of TOYS) {
  await page.locator('#menu-toy-search').fill(name)
  await page.waitForTimeout(300)
  const opt = page.locator('#menu-toy-results [role="option"]').first()
  assert.ok(await opt.count(), `no search result for ${name}`)
  await opt.click()
  await page.waitForTimeout(450)
}
const tabNames = await page.locator('.pattern-toy-tab-select').allTextContents()
assert.equal(tabNames.length, 4, `expected 4 tabs, got ${tabNames.length}`)
console.log('tabs:', tabNames.map((t) => t.trim()))
await assertFullyClean('fresh board', { reload: false })

section('select 1 → unselect 1')
await setChip('HEX', true)
let r = await storedRules()
console.log('  after select:', r.byToy)
assert.equal(Object.keys(r.byToy).length, 4, 'HEX should paint all 4 toys')
// Auto-assign must be visible in the dropdown, not left on the placeholder.
const shownCoin = await page.evaluate(() => {
  const sel = document.getElementById('menu-tip-currency') as HTMLSelectElement
  return sel.options[sel.selectedIndex]?.textContent?.trim() || ''
})
console.log('  currency dropdown shows:', shownCoin)
assert.equal(shownCoin, 'HEX', 'dropdown should show the auto-assigned coin')
await setChip('HEX', false)
const clearedCoin = await page.evaluate(() => {
  const sel = document.getElementById('menu-tip-currency') as HTMLSelectElement
  return sel.options[sel.selectedIndex]?.textContent?.trim() || ''
})
assert.match(
  clearedCoin,
  /Select coins? above|Select coin/,
  `dropdown should reset when nothing is painted, got ${clearedCoin}`,
)
await assertFullyClean('single select/unselect')

section('select 3 → unselect all one by one')
for (const c of ['HEX', 'PLSX', 'PUMP']) await setChip(c, true)
r = await storedRules()
console.log('  3 coins:', r.byToy)
assert.equal(r.coins.length, 3, `expected 3 coins split, got ${r.coins}`)
for (const c of ['PLSX', 'PUMP', 'HEX']) {
  await setChip(c, false)
  const after = await storedRules()
  assert.ok(
    !after.coins.includes(c),
    `${c} still assigned after unselect: ${JSON.stringify(after.byToy)}`,
  )
}
await assertFullyClean('unselect three, one at a time')

section('dropdown override then unselect (orphan trap)')
await setChip('HEX', true)
await setChip('PLSX', true)
// Force one tab onto HEX via the dropdown, then drop HEX from the whitelist.
await page.locator('.pattern-toy-tab-select').first().click()
await page.waitForTimeout(500)
await page.selectOption('#menu-tip-currency', { label: 'HEX' })
await page.waitForTimeout(800)
r = await storedRules()
console.log('  after dropdown:', r.byToy, 'picked:', await picked())
assert.ok(
  (await picked()).includes('PLSX'),
  'dropdown must not silently drop other chips from the whitelist',
)
await setChip('HEX', false)
r = await storedRules()
assert.ok(!r.coins.includes('HEX'), `HEX orphaned after unselect: ${r.coins}`)
await setChip('PLSX', false)
await assertFullyClean('dropdown override then unselect')

section('badge cycle then unselect')
await setChip('HEX', true)
await setChip('INC', true)
const badge = page.locator('.pattern-coin-badge').first()
assert.ok(await badge.count(), 'expected a coin badge to cycle')
await badge.click()
await page.waitForTimeout(500)
await badge.click()
await page.waitForTimeout(500)
await setChip('HEX', false)
await setChip('INC', false)
await assertFullyClean('badge cycle then unselect')

section('pattern click paint then unselect')
await setChip('PUMP', true)
const card = page
  .locator('#pattern-list .pattern-card')
  .filter({ hasNot: page.locator('#menu-pattern-tools-card') })
  .nth(1)
await card.click()
await page.waitForTimeout(500)
await setChip('PUMP', false)
await assertFullyClean('pattern click then unselect')

section('unselect every picked chip')
for (const c of ['HEX', 'PLSX', 'PUMP', 'INC']) await setChip(c, true)
r = await storedRules()
assert.ok(r.count > 0, 'expected paint before clearing chips')
for (const label of await picked()) await setChip(label, false)
await assertFullyClean('unselect every picked chip')

section('rapid toggle storm')
for (let i = 0; i < 6; i++) {
  await setChip('HEX', true)
  await setChip('PLSX', true)
  await setChip('HEX', false)
  await setChip('PLSX', false)
}
await assertFullyClean('rapid toggle storm')

section('close a painted tab, then unselect')
await setChip('HEX', true)
await setChip('PLSX', true)
await page.locator('.pattern-toy-tab-x').first().click()
await page.waitForTimeout(700)
await setChip('HEX', false)
await setChip('PLSX', false)
await assertFullyClean('closed tab then unselect')

section('load a session that was saved painted with an empty whitelist')
/*
 * The state real users were stuck in: rules on disk, paintCoinKeys empty.
 * No chip is pressed, so there is nothing left to click to turn paint off.
 * Loading must sweep it rather than render unremovable paint.
 */
await setChip('HEX', true)
await setChip('PLSX', true)
let seeded = await storedRules()
assert.ok(seeded.count > 0, 'expected paint to seed the broken state from')
await page.evaluate((k) => {
  const raw = JSON.parse(localStorage.getItem(k) || '{}')
  raw.paintCoinKeys = [] // chips off, rules left behind
  localStorage.setItem(k, JSON.stringify(raw))
}, KEY)
await reload()
await assertFullyClean('painted session with empty whitelist')

section('load a session painted by a coin that is no longer whitelisted')
await setChip('HEX', true)
await setChip('PLSX', true)
seeded = await storedRules()
assert.equal(seeded.coins.length, 2, `expected 2 coins, got ${seeded.coins}`)
await page.evaluate((k) => {
  const raw = JSON.parse(localStorage.getItem(k) || '{}')
  const hex = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39'
  raw.paintCoinKeys = (raw.paintCoinKeys || []).filter(
    (a: string) => a.toLowerCase() !== hex,
  )
  localStorage.setItem(k, JSON.stringify(raw))
}, KEY)
await reload()
const healed = await storedRules()
console.log('  after load:', healed.coins, healed.byToy)
assert.ok(
  !healed.coins.includes('HEX'),
  `unwhitelisted HEX survived the load: ${JSON.stringify(healed.byToy)}`,
)
assert.deepEqual(await picked(), ['PLSX'], 'PLSX should stay whitelisted')
await setChip('PLSX', false)
await assertFullyClean('unwhitelisted coin swept on load')

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('; ')}`)
await browser.close()
console.log('\nsmoke-paint-vicious OK — paint always unchecks')
