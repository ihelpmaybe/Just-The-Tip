/**
 * Verify the Bluetooth relink banner stays quiet and short.
 *
 *   npx tsx scripts/ble-banner-check.mts
 */
import { chromium } from 'playwright'

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write'],
  })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|net::ERR_/i.test(m.text())) {
      errors.push(m.text())
    }
  })

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForSelector('#backend', { state: 'attached' })

  await page.evaluate(() => {
    for (const k of [
      'pulsefans.ble.remembered.v1',
      'pulsefans.ble.remembered.v2',
      'pulsefans.ble.remembered.v3',
      'pulsefans.ble.tipDismissed.v1',
    ]) {
      localStorage.removeItem(k)
    }
  })
  await page.locator('#backend').selectOption('bluetooth')
  await page.waitForTimeout(700)
  let ok = true
  const quietWhenNoHistory = await page
    .locator('#ble-relink')
    .evaluate((el) => (el as HTMLElement).hidden)
  if (quietWhenNoHistory) console.log('  PASS quiet with no link history')
  else {
    console.error('  FAIL banner shown with no link history')
    ok = false
  }

  // Bloated legacy list (the bug the user hit) — must not dump all names.
  await page.evaluate(() => {
    const spam = Array.from({ length: 20 }, (_, i) =>
      i % 3 === 0 ? 'Nora' : i % 3 === 1 ? 'Domi' : 'Lush',
    )
    localStorage.setItem(
      'pulsefans.ble.remembered.v2',
      JSON.stringify(spam.map((name) => ({ name, mac: '', tag: '' }))),
    )
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('#backend', { state: 'attached' })
  await page.locator('#backend').selectOption('bluetooth')
  await page.waitForTimeout(900)

  const hidden = await page
    .locator('#ble-relink')
    .evaluate((el) => (el as HTMLElement).hidden)
  const title = (await page.locator('#ble-relink-title').innerText()).trim()
  const body = (await page.locator('#ble-relink-body').innerText()).trim()

  console.log('\n=== BLE relink banner ===')
  console.log(`  hidden: ${hidden}`)
  console.log(`  title:  ${title}`)
  console.log(`  body:   ${body.slice(0, 160)}`)

  if (hidden) {
    console.error('  FAIL banner hidden with remembered history and 0 linked')
    ok = false
  } else if (/Nora, Nora, Domi|Still missing:/i.test(body)) {
    console.error('  FAIL banner still dumps duplicate inventory')
    ok = false
  } else if (!/refresh|Connect|Add toy/i.test(body)) {
    console.error('  FAIL banner missing short reconnect guidance')
    ok = false
  } else {
    console.log('  PASS short reconnect tip (no inventory dump)')
  }

  // Deduped count should be tiny (one per name).
  const stored = await page.evaluate(() => {
    const raw =
      localStorage.getItem('pulsefans.ble.remembered.v3') ||
      localStorage.getItem('pulsefans.ble.remembered.v2')
    try {
      return raw ? (JSON.parse(raw) as unknown[]).length : -1
    } catch {
      return -1
    }
  })
  if (stored > 0 && stored <= 4) {
    console.log(`  PASS remembered list cleaned (${stored} entries)`)
  } else {
    console.error(`  FAIL remembered list still bloated (${stored})`)
    ok = false
  }

  await page.locator('#btn-ble-dismiss').click()
  await page.waitForTimeout(300)
  const afterDismiss = await page
    .locator('#ble-relink')
    .evaluate((el) => (el as HTMLElement).hidden)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('#backend', { state: 'attached' })
  await page.locator('#backend').selectOption('bluetooth')
  await page.waitForTimeout(900)
  const dismissSticks = await page
    .locator('#ble-relink')
    .evaluate((el) => (el as HTMLElement).hidden)
  if (afterDismiss && dismissSticks) {
    console.log('  PASS dismiss hides and stays hidden after reload')
  } else {
    console.error(`  FAIL dismiss=${afterDismiss} afterReload=${dismissSticks}`)
    ok = false
  }

  if (errors.length) {
    ok = false
    console.error('\n  Page errors:')
    for (const e of errors) console.error(`   - ${e.slice(0, 160)}`)
  } else {
    console.log('  PASS no page errors')
  }

  await browser.close()
  console.log('')
  process.exit(ok ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
