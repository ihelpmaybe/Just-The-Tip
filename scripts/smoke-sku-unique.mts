/**
 * Live smoke: hard-reload, Scale menu, then prove no matching SKUs
 * on the toy+coin sheet, in saved rules, or in the overlay QR payload.
 *
 *   SMOKE_URL=http://127.0.0.1:5173/ npx tsx scripts/smoke-sku-unique.mts
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { setWhitelistCoin } from './lib/menuWhitelist.mts'

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'
const KEY = 'pulsefans-tipbuzz-v1'

function bucket(n: number): string {
  return String(Math.round(n * 1e9) / 1e9)
}

function assertUnique(
  label: string,
  values: number[],
): void {
  const seen = new Map<string, number>()
  const dups: string[] = []
  for (const n of values) {
    if (!Number.isFinite(n)) continue
    const k = bucket(n)
    if (seen.has(k)) dups.push(`${n}`)
    else seen.set(k, n)
  }
  assert.equal(dups.length, 0, `${label} duplicates: ${dups.join(', ')}`)
}

const browser = await chromium.launch()
const page = await browser.newPage()
page.setDefaultTimeout(20_000)

await page.goto(BASE)
await page.evaluate((k) => localStorage.removeItem(k), KEY)
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(400)
await page.evaluate(() => {
  location.hash = '#menu'
})
await page.waitForTimeout(500)

await page.locator('#menu-toy-search').fill('Nora')
await page.waitForTimeout(350)
await page.locator('#menu-toy-results [role="option"]').first().click()
await page.waitForTimeout(700)

await setWhitelistCoin(page, 'INC', true, 900)

await page.locator('#menu-base-price').fill('3.69')
await page.locator('#menu-top-price').fill('55.55')

let quoted = false
for (let i = 0; i < 30; i++) {
  const sample = await page
    .locator('#pattern-list .pattern-card')
    .filter({ hasNot: page.locator('#menu-pattern-tools-card') })
    .first()
    .locator('input[type="number"], .pattern-price input, .pattern-card-side input')
    .first()
    .inputValue()
    .catch(() => '')
  const n = Number(sample)
  const title = (await page.locator('#menu-base-price').getAttribute('title')) || ''
  if ((Number.isFinite(n) && n > 1) || /≈|tip is ~/i.test(title)) {
    quoted = true
    console.log(`quote ready (${i}): sample=${sample} title=${title.slice(0, 90)}`)
    break
  }
  await page.waitForTimeout(500)
}
assert.ok(quoted, 'never got a USD quote for Scale')

await page.locator('#btn-menu-base-apply').click()
await page.waitForTimeout(1000)
const scaleErr = ((await page.locator('#err').textContent().catch(() => '')) || '').trim()
assert.ok(
  !/Need a USD quote|Could not convert/i.test(scaleErr),
  `Scale menu failed: ${scaleErr || '(empty banner)'}`,
)

const cards = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('#pattern-list .pattern-card')].filter(
    (c) => c.id !== 'menu-pattern-tools-card',
  )
  return rows.map((c) => {
    const name = (
      c.querySelector('.pattern-card-pick')?.textContent ||
      c.querySelector('.pattern-name')?.textContent ||
      ''
    ).trim()
    const priceRaw =
      (
        c.querySelector(
          'input[type="number"], .pattern-price input, .pattern-card-side input',
        ) as HTMLInputElement | null
      )?.value || ''
    return { name, price: Number(priceRaw) }
  })
})
console.log(`cards after Scale: ${cards.length}`)
assert.ok(
  cards.length >= 4,
  `expected a scaled tip menu (Nora filter ships ~4–10 patterns), got ${cards.length} cards`,
)
assertUnique(
  'visible card prices',
  cards.map((c) => c.price),
)
console.log(
  `  unique card prices ${new Set(cards.map((c) => bucket(c.price))).size}/${cards.length}`,
)

const saved = await page.evaluate((k) => {
  const raw = JSON.parse(localStorage.getItem(k) || '{}') as {
    patternPrices?: Record<string, number>
    toyPatternPrices?: Record<string, Record<string, number>>
    coinRewardRules?: Array<{
      coin: string
      tokenAddress: string
      patternId: string
      usdTarget: number
      enabled: boolean
      toyIds: string[]
    }>
  }
  return raw
}, KEY)

const globalPrices = Object.values(saved.patternPrices || {})
if (globalPrices.length) {
  assertUnique('global token ladder', globalPrices)
  console.log(`  global ladder: ${globalPrices.length} unique amounts`)
}
const toySheets = Object.entries(saved.toyPatternPrices || {})
for (const [toyId, prices] of toySheets) {
  assertUnique(`toy ${toyId} token ladder`, Object.values(prices))
  console.log(`  toy ladder ${toyId}: ${Object.keys(prices).length} unique amounts`)
}
assert.ok(
  globalPrices.length || toySheets.length,
  'Scale wrote neither a global nor a toy ladder',
)

const sheets = new Map<string, number[]>()
for (const rule of saved.coinRewardRules || []) {
  if (!rule.enabled) continue
  const toys = rule.toyIds.length ? rule.toyIds : ['(shared)']
  for (const toyId of toys) {
    const key = `${toyId}|${(rule.tokenAddress || '').toLowerCase()}|${rule.coin}`
    const row = sheets.get(key) || []
    row.push(rule.usdTarget)
    sheets.set(key, row)
  }
}
assert.ok(sheets.size, 'INC paint should have written coin reward rules')
for (const [key, usd] of sheets) {
  assertUnique(`coin sheet ${key}`, usd)
  console.log(`  coin sheet ${key}: ${usd.length} unique USD targets`)
}

await page.waitForTimeout(700)
const overlay = await page.evaluate(async () => {
  const res = await fetch('/api/overlay/qr?t=' + Date.now(), { cache: 'no-store' })
  if (!res.ok) return { ok: false, status: res.status, offers: [] as Array<{
    name: string
    amount: number
    note?: string
    amountLabel?: string
  }> }
  const json = (await res.json()) as {
    menuOffers?: Array<{
      name: string
      amount: number
      note?: string
      amountLabel?: string
    }>
  }
  return { ok: true, status: res.status, offers: json.menuOffers || [] }
})
console.log(`overlay offers: ${overlay.offers.length} (http ${overlay.status})`)
if (overlay.offers.length) {
  const bySheet = new Map<string, number[]>()
  for (const offer of overlay.offers) {
    const coin = (offer.amountLabel || '').trim().split(/\s+/).pop() || '?'
    const key = `${offer.note || ''}|${coin}`
    const row = bySheet.get(key) || []
    row.push(offer.amount)
    bySheet.set(key, row)
  }
  for (const [key, amounts] of bySheet) {
    assertUnique(`overlay ${key}`, amounts)
    console.log(`  overlay sheet ${key}: ${amounts.length} unique amounts`)
  }
}

await browser.close()
console.log('OK live Scale unique SKUs')
