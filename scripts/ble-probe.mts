/**
 * Does this Chrome expose the silent-reconnect Web Bluetooth APIs?
 *
 *   npx tsx scripts/ble-probe.mts
 */
import { chromium } from 'playwright'

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: false })
  const page = await browser.newPage()
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })

  const report = await page.evaluate(async () => {
    const nav = navigator as Navigator & {
      bluetooth?: {
        getDevices?: () => Promise<unknown[]>
        requestDevice?: unknown
        getAvailability?: () => Promise<boolean>
      }
    }
    const bt = nav.bluetooth
    let permitted = -1
    let getDevicesError = ''
    if (bt?.getDevices) {
      try {
        const list = await bt.getDevices()
        permitted = list.length
      } catch (e) {
        getDevicesError = e instanceof Error ? e.message : String(e)
      }
    }
    let available: boolean | string = 'unknown'
    try {
      available = bt?.getAvailability ? await bt.getAvailability() : 'no api'
    } catch (e) {
      available = e instanceof Error ? e.message : String(e)
    }
    return {
      ua: navigator.userAgent,
      hasBluetooth: Boolean(bt),
      hasRequestDevice: typeof bt?.requestDevice === 'function',
      hasGetDevices: typeof bt?.getDevices === 'function',
      hasWatchAdvertisements:
        typeof (window as unknown as { BluetoothDevice?: { prototype?: object } })
          .BluetoothDevice?.prototype === 'object' &&
        'watchAdvertisements' in
          ((window as unknown as { BluetoothDevice: { prototype: object } })
            .BluetoothDevice.prototype as object),
      permittedDevices: permitted,
      getDevicesError,
      adapterAvailable: available,
      secureContext: window.isSecureContext,
      origin: location.origin,
    }
  })

  console.log('\n=== Chrome Web Bluetooth probe ===')
  for (const [k, v] of Object.entries(report)) {
    console.log(`  ${k}: ${String(v)}`)
  }
  console.log('')

  if (!report.hasGetDevices) {
    console.log('VERDICT: getDevices() missing → silent reconnect impossible.')
    console.log('Enable chrome://flags/#enable-web-bluetooth-new-permissions-backend')
  } else if (report.permittedDevices === 0) {
    console.log('VERDICT: getDevices() works but this profile granted 0 devices.')
  } else {
    console.log(`VERDICT: getDevices() works, ${report.permittedDevices} granted.`)
  }

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
