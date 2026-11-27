/*
 * The pattern tools card (currency + tip range) belongs to the active toy tab.
 * Painting or scaling one tab must never touch another tab's toy.
 *
 *   SMOKE_URL=http://127.0.0.1:5173/ npx tsx scripts/verify-toy-tab-local.mts
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { setWhitelistCoin } from './lib/menuWhitelist.mts'

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'
const KEY = 'pulsefans-tipbuzz-v1'

const browser = await chromium.launch()
const page = await browser.newPage()
const errors: string[] = []
page.on('pageerror', (e) => errors.push(e.message))

function section(name: string) {
  console.log(`\n== ${name} ==`)
}

await page.goto(BASE)
await page.evaluate((k) => localStorage.removeItem(k), KEY)
await page.reload()
await page.waitForTimeout(400)
await page.evaluate(() => {
  location.hash = '#menu'
})
await page.waitForTimeout(700)

for (const name of ['Lush', 'Domi']) {
  await page.locator('#menu-toy-search').fill(name)
  await page.waitForTimeout(350)
  const opt = page.locator('#menu-toy-results [role="option"]').first()
  assert.ok(await opt.count(), `no search result for ${name}`)
  await opt.click()
  await page.waitForTimeout(500)
}

const clickTab = async (label: string) => {
  await page
    .locator('.pattern-toy-tab-select', { hasText: label })
    .first()
    .click()
  await page.waitForTimeout(800)
}

const card = async () => ({
  tab: (
    await page
      .locator('.pattern-toy-tab.is-active .pattern-toy-tab-select')
      .textContent()
  )?.trim(),
  lo: await page.locator('#menu-base-price').inputValue(),
  hi: await page.locator('#menu-top-price').inputValue(),
  skin: await page.evaluate(
    () =>
      [...(document.getElementById('menu-pattern-tools-card')?.classList || [])]
        .find((c) => c.startsWith('coin-skin-')) || '',
  ),
})

const tabPaint = async () =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('.pattern-toy-tab')].map((t) => [
        t.querySelector('.pattern-toy-tab-select')?.textContent?.trim() || '?',
        [...t.classList].find((c) => c.startsWith('coin-skin-')) || '',
      ]),
    ),
  )

const setRange = async (lo: string, hi: string) => {
  await page.locator('#menu-base-price').fill(lo)
  await page.locator('#menu-top-price').fill(hi)
  await page.locator('#menu-top-price').blur()
  await page.waitForTimeout(500)
}

/** Whitelisting a chip auto-splits toys across the selected coins. */
const whitelist = async (want: string) => {
  await setWhitelistCoin(page, want, true, 700)
}

/** Dropdown pick — a manual override for the active tab only. */
const pickCurrency = async (want: string) => {
  await page.selectOption('#menu-tip-currency', { label: want })
  await page.waitForTimeout(900)
}

section('tip range is per toy tab')
await clickTab('Lush')
await setRange('1.11', '9.99')
assert.deepEqual(
  { lo: (await card()).lo, hi: (await card()).hi },
  { lo: '1.11', hi: '9.99' },
  'Lush range did not stick',
)

await clickTab('Domi')
let now = await card()
assert.equal(now.lo, '3.69', 'Domi inherited Lush cheapest tip')
assert.equal(now.hi, '55.55', 'Domi inherited Lush top tip')
await setRange('20.00', '80.00')

await clickTab('Lush')
now = await card()
assert.equal(now.lo, '1.11', 'Lush lost its cheapest tip')
assert.equal(now.hi, '9.99', 'Lush lost its top tip')
console.log('Lush 1.11/9.99 · Domi 20/80 — ranges stay on their own tab')

section('whitelist auto-splits the two tabs')
// 3 coins across 2 toys: two toys get a coin each, the third stays spare
// so the dropdown has something to override with.
for (const coin of ['INC', 'HEX', 'PLSX']) await whitelist(coin)
const split = await tabPaint()
console.log('auto-split:', split)
const splitSkins = Object.values(split)
assert.ok(
  splitSkins.every(Boolean),
  `every tab should be auto-painted: ${JSON.stringify(split)}`,
)
assert.equal(
  new Set(splitSkins).size,
  2,
  `tabs should get different coins: ${JSON.stringify(split)}`,
)

section('dropdown override touches only the active tab')
await clickTab('Lush')
const before = await tabPaint()
const spare = ['INC', 'HEX', 'PLSX'].find(
  (c) =>
    !Object.values(before).includes(
      { INC: 'coin-skin-hue', HEX: 'coin-skin-hex', PLSX: 'coin-skin-plsx' }[c]!,
    ),
)
assert.ok(spare, `expected one unused coin: ${JSON.stringify(before)}`)
await pickCurrency(spare!)
const after = await tabPaint()
console.log(`override Lush with ${spare}:`, after)
const lushKey = Object.keys(after).find((k) => k.startsWith('Lush'))!
const domiKey = Object.keys(after).find((k) => k.startsWith('Domi'))!
assert.equal(
  after[domiKey],
  before[domiKey],
  `overriding Lush leaked onto Domi: ${JSON.stringify(after)}`,
)
assert.notEqual(
  after[lushKey],
  before[lushKey],
  'Lush did not take the override coin',
)
assert.equal((await card()).skin, after[lushKey], 'card missed the tab skin')

const byToy = await page.evaluate((k) => {
  const raw = JSON.parse(localStorage.getItem(k) || '{}')
  const out: Record<string, string[]> = {}
  for (const r of raw.coinRewardRules || []) {
    for (const id of r.toyIds.length ? r.toyIds : ['(shared)']) {
      out[id] = [...new Set([...(out[id] || []), r.coin])]
    }
  }
  return out
}, KEY)
for (const [toyId, coins] of Object.entries(byToy)) {
  assert.equal(coins.length, 1, `${toyId} holds ${coins.join(' + ')}`)
}
console.log('rules by toy:', byToy)

section('clear paint drops one tab only')
// Lush is still the active tab from the override above.
await page.selectOption('#menu-tip-currency', '__clear__')
await page.waitForTimeout(900)
const cleared = await tabPaint()
console.log('after clearing Lush:', cleared)
assert.equal(cleared[lushKey], '', 'Lush should be unpainted after clear')
assert.equal(
  cleared[domiKey],
  after[domiKey],
  'clearing Lush wiped Domi too',
)

assert.deepEqual(errors, [], 'page errors')
await browser.close()
console.log('\nverify-toy-tab-local OK')
