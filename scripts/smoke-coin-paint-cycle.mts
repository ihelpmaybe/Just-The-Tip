/*
 * Smoke: pick 4 coins, paint one per toy, reassign, unify, then clear.
 *
 *   SMOKE_URL=http://127.0.0.1:5173/ npx tsx scripts/smoke-coin-paint-cycle.mts
 */
import assert from 'node:assert/strict'
import { chromium, type Page } from 'playwright'
import { setWhitelistCoin } from './lib/menuWhitelist.mts'

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'
const KEY = 'pulsefans-tipbuzz-v1'

const TOYS = ['Lush', 'Domi', 'Nora', 'Edge'] as const
/** First paint pass — one distinct coin per toy, one distinct skin each. */
const PASS_A = ['HEX', 'PLSX', 'PUMP', 'PLS'] as const
/** Second paint pass — swap every tab. */
const PASS_B = ['INC', 'ProveX', 'MOST', 'PornDai'] as const
/** Unify — every tab gets the same coin. */
const SAME = 'INC'

function section(name: string) {
  console.log(`\n== ${name} ==`)
}

async function clickTab(page: Page, label: string) {
  await page
    .locator('.pattern-toy-tab-select', { hasText: label })
    .first()
    .click()
  await page.waitForTimeout(700)
}

async function selectChip(page: Page, label: string, on: boolean) {
  await setWhitelistCoin(page, label, on, 250)
}

async function paintActiveTab(page: Page, coin: string) {
  // Currency dropdown only lists selected chips — ensure this one is on.
  await selectChip(page, coin, true)
  const opts = await page.locator('#menu-tip-currency option').allTextContents()
  assert.ok(
    opts.some((o) => o.trim() === coin),
    `${coin} missing from currency dropdown: ${opts.join(' | ')}`,
  )
  await page.selectOption('#menu-tip-currency', { label: coin })
  await page.waitForTimeout(900)
}

async function clearActiveTab(page: Page) {
  const opts = await page.locator('#menu-tip-currency option').allTextContents()
  if (!opts.some((o) => /Clear tip coins/.test(o))) {
    console.log('  (no tip coins to clear on active tab)')
    return
  }
  await page.selectOption('#menu-tip-currency', '__clear__')
  await page.waitForTimeout(900)
}

async function tabPaint(page: Page) {
  return page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('.pattern-toy-tab')].map((t) => [
        t.querySelector('.pattern-toy-tab-select')?.textContent?.trim() || '?',
        [...t.classList].find((c) => c.startsWith('coin-skin-')) || '',
      ]),
    ),
  )
}

async function rulesByToy(page: Page) {
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

async function pickedChips(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('.menu-coin-price-chip.is-picked')].map((el) =>
      (el.textContent || '').split('·')[0]!.trim(),
    ),
  )
}

async function cardSkin(page: Page) {
  return page.evaluate(
    () =>
      [...(document.getElementById('menu-pattern-tools-card')?.classList || [])]
        .find((c) => c.startsWith('coin-skin-')) || '',
  )
}

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

section('add 4 toys')
for (const name of TOYS) {
  await page.locator('#menu-toy-search').fill(name)
  await page.waitForTimeout(350)
  const opt = page.locator('#menu-toy-results [role="option"]').first()
  assert.ok(await opt.count(), `no search result for ${name}`)
  await opt.click()
  await page.waitForTimeout(500)
}
const tabNames = await page.locator('.pattern-toy-tab-select').allTextContents()
console.log('tabs:', tabNames.map((t) => t.trim()))
assert.equal(tabNames.length, 4, `expected 4 tabs, got ${tabNames.length}`)

section('select 4 coins')
for (const coin of PASS_A) {
  await selectChip(page, coin, true)
}
let picked = await pickedChips(page)
console.log('picked:', picked)
assert.deepEqual(
  [...picked].sort(),
  [...PASS_A].sort(),
  'expected exactly the 4 pass-A coins selected',
)

section('apply each coin to each toy (1:1)')
for (let i = 0; i < TOYS.length; i++) {
  await clickTab(page, TOYS[i]!)
  await paintActiveTab(page, PASS_A[i]!)
  console.log(`  ${TOYS[i]} ← ${PASS_A[i]}  card=${await cardSkin(page)}`)
}
let paint = await tabPaint(page)
console.log('tab paint:', paint)
let byToy = await rulesByToy(page)
console.log('rules:', byToy)
const coinsA = Object.values(byToy).flat()
assert.equal(new Set(coinsA).size, 4, `pass A should use 4 coins, got ${coinsA}`)
for (const coins of Object.values(byToy)) {
  assert.equal(coins.length, 1, `toy holds multiple coins: ${coins.join('+')}`)
}
// Skins must differ across the four tabs.
const skinsA = Object.values(paint).filter(Boolean)
assert.equal(new Set(skinsA).size, 4, `expected 4 distinct skins, got ${paint}`)

section('change them all again')
for (const coin of PASS_B) {
  await selectChip(page, coin, true)
}
for (let i = 0; i < TOYS.length; i++) {
  await clickTab(page, TOYS[i]!)
  await paintActiveTab(page, PASS_B[i]!)
  console.log(`  ${TOYS[i]} ← ${PASS_B[i]}  card=${await cardSkin(page)}`)
}
paint = await tabPaint(page)
console.log('tab paint:', paint)
byToy = await rulesByToy(page)
console.log('rules:', byToy)
const coinsB = Object.values(byToy).flat()
assert.equal(new Set(coinsB).size, 4, `pass B should use 4 coins, got ${coinsB}`)
for (const c of PASS_A) {
  assert.ok(!coinsB.includes(c), `pass-A coin ${c} still assigned after swap`)
}
for (const coins of Object.values(byToy)) {
  assert.equal(coins.length, 1, `toy holds multiple coins after swap: ${coins.join('+')}`)
}

section('make them all the same')
await selectChip(page, SAME, true)
for (const toy of TOYS) {
  await clickTab(page, toy)
  await paintActiveTab(page, SAME)
  console.log(`  ${toy} ← ${SAME}  card=${await cardSkin(page)}`)
}
paint = await tabPaint(page)
console.log('tab paint:', paint)
byToy = await rulesByToy(page)
console.log('rules:', byToy)
const allSame = Object.values(byToy).flat()
assert.ok(allSame.length >= 4, 'expected a rule on every toy')
assert.ok(
  allSame.every((c) => c === SAME),
  `not unified to ${SAME}: ${JSON.stringify(byToy)}`,
)
const skinsSame = new Set(Object.values(paint).filter(Boolean))
assert.equal(skinsSame.size, 1, `expected one shared skin, got ${paint}`)

section('deselect them all')
// Clear paint on every tab, then unselect every picked chip.
for (const toy of TOYS) {
  await clickTab(page, toy)
  await clearActiveTab(page)
}
paint = await tabPaint(page)
console.log('tab paint after clear:', paint)
byToy = await rulesByToy(page)
console.log('rules after clear:', byToy)
assert.deepEqual(byToy, {}, 'coin rules should be empty after clear')
assert.ok(
  Object.values(paint).every((s) => !s),
  `tabs still painted: ${JSON.stringify(paint)}`,
)
assert.equal(await cardSkin(page), '', 'tools card still painted')

picked = await pickedChips(page)
console.log('picked before chip clear:', picked)
for (const label of picked) {
  await selectChip(page, label, false)
}
picked = await pickedChips(page)
console.log('picked after chip clear:', picked)
assert.deepEqual(picked, [], 'chips still selected')

const currencyHint = await page.locator('#menu-tip-currency option').first().textContent()
console.log('currency placeholder:', currencyHint?.trim())
assert.match(
  currencyHint || '',
  /Select coins above/i,
  'currency dropdown should ask to select coins',
)

assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`)
await browser.close()
console.log('\nsmoke-coin-paint-cycle OK')
