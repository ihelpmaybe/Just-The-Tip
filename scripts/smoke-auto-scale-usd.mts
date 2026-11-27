/*
 * Smoke: USD placeholders auto-scale catalog dust tips; default sort is Shortest.
 *
 *   SMOKE_URL=http://127.0.0.1:5173/ npx tsx scripts/smoke-auto-scale-usd.mts
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'
const KEY = 'pulsefans-tipbuzz-v1'

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(BASE)
await page.evaluate((k) => {
  localStorage.removeItem(k)
}, KEY)
await page.reload()
await page.waitForTimeout(400)
await page.evaluate(() => {
  location.hash = '#menu'
})
await page.waitForTimeout(500)

await page.locator('#menu-toy-search').fill('Nora')
await page.waitForTimeout(350)
await page.locator('#menu-toy-results [role="option"]').first().click()
await page.waitForTimeout(500)

// Wait for a USD quote + auto-scale (catalog 500 PLS is dust vs $3.69).
let tip = ''
for (let i = 0; i < 20; i++) {
  tip =
    (await page
      .locator('.pattern-card')
      .filter({ hasText: 'Soft contact' })
      .locator('input[type="number"], .pattern-price input')
      .first()
      .inputValue()
      .catch(() => '')) || ''
  const n = Number(tip)
  if (Number.isFinite(n) && n > 10_000) break
  await page.waitForTimeout(500)
}
console.log('Soft contact tip after auto-scale:', tip)
const tipN = Number(tip)
assert.ok(
  Number.isFinite(tipN) && tipN > 10_000,
  `expected Soft contact >> 500 PLS after auto-scale, got ${tip}`,
)

const sort = await page.locator('#menu-sort').inputValue()
console.log('default sort:', sort)
assert.equal(sort, 'duration-asc', 'default sort should be Shortest')

const durations = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('#pattern-list .pattern-card')].filter(
    (c) => c.id !== 'menu-pattern-tools-card',
  )
  return cards.slice(0, 8).map((c) => {
    const dur = (c.querySelector('.pattern-duration')?.textContent || '').trim()
    const name = (c.querySelector('.pattern-card-pick')?.textContent || '').trim()
    return `${name}|${dur}`
  })
})
console.log('leading patterns:', durations)
assert.ok(durations.length >= 2, 'expected pattern cards')
const secs = durations.map((row) => {
  const m = /\|(\d+(?:\.\d+)?)s/.exec(row)
  return m ? Number(m[1]) : NaN
})
for (let i = 1; i < secs.length; i++) {
  if (!Number.isFinite(secs[i - 1]!) || !Number.isFinite(secs[i]!)) continue
  assert.ok(
    secs[i]! >= secs[i - 1]!,
    `duration-asc broken at ${durations[i - 1]} → ${durations[i]}`,
  )
}

await browser.close()
console.log('smoke-auto-scale-usd OK')
