/**
 * Overlay style normalize / migration checks (no browser).
 *
 *   npm run verify:overlay
 */
import assert from 'node:assert/strict'
import { normalizeOverlayStyle } from '../src/overlay/style.ts'
import {
  applyOverlayQrUpdate,
  defaultOverlayQr,
  overlayQrEnabled,
} from '../src/overlay/qrState.ts'
import { buildOverlayQrPayload } from '../src/overlay/qrRender.ts'
import { hexagonQrSvg } from '../src/overlay/qrHexSvg.ts'
import { tryBuildTipPaymentUri } from '../shared/src/utils/eip681.ts'
import {
  overlayHitFromUsd,
  overlayHoldMs,
  slimOverlayLadder,
} from '../src/overlay/stage.ts'
import { overlayPageHtml } from '../src/overlay/browserHtml.ts'
import { overlayMenuPageHtml } from '../src/overlay/menuPageHtml.ts'
import { normalizeOverlayMenuStyle } from '../src/overlay/menuStyle.ts'

let failed = 0
function check(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  PASS  ${name}`)
  } catch (e) {
    failed += 1
    console.error(`  FAIL  ${name}`)
    console.error(e instanceof Error ? e.message : e)
  }
}

console.log('verify:overlay — style migration\n')

check('defaults enable pool alerts', () => {
  const s = normalizeOverlayStyle({})
  assert.equal(s.showPoolAlerts, true)
  assert.equal(s.showPoolLabel, true)
})

check('legacy showPoolLabel:false keeps pool alerts on', () => {
  const s = normalizeOverlayStyle({ showPoolLabel: false })
  assert.equal(s.showPoolAlerts, true)
  assert.equal(s.showPoolLabel, false)
})

check('explicit showPoolAlerts wins over legacy label', () => {
  const s = normalizeOverlayStyle({
    showPoolLabel: false,
    showPoolAlerts: true,
  })
  assert.equal(s.showPoolAlerts, true)
  assert.equal(s.showPoolLabel, false)
})

check('legacy minAmount becomes walletMinAmount', () => {
  const s = normalizeOverlayStyle({ minAmount: 42 })
  assert.equal(s.walletMinAmount, 42)
  assert.equal(s.minAmount, 42)
})

console.log('\nverify:overlay — always-on board\n')

check('slim ladder drops QR SVGs, featured first, keeps note/blurb', () => {
  const rows = slimOverlayLadder([
    {
      name: 'Wave',
      amountLabel: '10 PLS',
      amount: 10,
      note: 'Lush',
      blurb: 'soft pulse',
      qrSvg: '<svg></svg>',
    },
    {
      name: 'Spark',
      amountLabel: '25 PLS',
      amount: 25,
      featured: true,
      note: 'Lush',
      blurb: 'sharp',
      qrSvg: '<svg></svg>',
    },
    { name: 'Wave', amountLabel: '10 PLS', amount: 10, note: 'Lush' },
  ])
  assert.equal(rows.length, 2)
  assert.equal(rows[0]?.name, 'Spark')
  assert.equal(rows[0]?.featured, true)
  assert.equal(rows[0]?.note, 'Lush')
  assert.equal(rows[0]?.blurb, 'sharp')
  assert.equal(rows[1]?.name, 'Wave')
  assert.equal('qrSvg' in rows[0]!, false)
})

check('slim ladder cap is 32', () => {
  const raw = Array.from({ length: 40 }, (_, i) => ({
    name: `P${i}`,
    amountLabel: `${i + 1} PLS`,
    amount: i + 1,
  }))
  assert.equal(slimOverlayLadder(raw).length, 32)
})

check('USD hit size and hold', () => {
  assert.equal(overlayHitFromUsd(0.4), 's')
  assert.equal(overlayHitFromUsd(3), 'm')
  assert.equal(overlayHitFromUsd(12), 'l')
  assert.equal(overlayHitFromUsd(40), 'xl')
  assert.equal(overlayHitFromUsd(undefined), 'm')
  assert.ok(overlayHoldMs(7, 's') < overlayHoldMs(7, 'm'))
  assert.ok(overlayHoldMs(7, 'xl') > overlayHoldMs(7, 'l'))
  assert.ok(overlayHoldMs(7, 'xl') <= 20_000)
})

check('tip-alert overlay is pop-up only (no ladder board)', () => {
  const html = overlayPageHtml()
  assert.doesNotMatch(html, /id="ladder"/)
  assert.doesNotMatch(html, /id="board"/)
  assert.match(html, /id="stage"/)
  assert.match(html, /EventSource/)
  assert.doesNotMatch(html, /qrSvg/)
})

check('menu overlay HTML includes stage + layouts', () => {
  const html = overlayMenuPageHtml()
  assert.match(html, /id="menu-stage"/)
  assert.match(html, /layout-waves/)
  assert.match(html, /layout-cols/)
  assert.match(html, /layout-cards/)
  assert.match(html, /layout-grouped/)
  assert.match(html, /addEventListener\('menuStyle'/)
  assert.doesNotMatch(html, /qrSvg/)
})

check('menu style defaults', () => {
  const s = normalizeOverlayMenuStyle({})
  assert.equal(s.layout, 'waves')
  assert.equal(s.position, 'top-left')
  assert.equal(s.maxRows, 16)
  assert.equal(s.featuredFirst, false)
  assert.equal(s.theme, 'cyan')
  assert.ok(s.opacity >= 0.4 && s.opacity <= 0.95)
})

if (failed) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}

console.log('\nverify:overlay — QR hub merge\n')

check('omitted menuOffers keeps previous snapshot', () => {
  const current = applyOverlayQrUpdate(defaultOverlayQr, {
    address: '0x1111111111111111111111111111111111111111',
    menuOffers: [
      { name: 'Wave', amountLabel: '10 PLS', amount: 10 },
    ],
  })
  assert.equal(current.menuOffers.length, 1)
  const next = applyOverlayQrUpdate(current, {
    address: '0x2222222222222222222222222222222222222222',
    label: 'Tip QR',
  })
  assert.equal(next.address.toLowerCase(), '0x2222222222222222222222222222222222222222')
  assert.equal(next.menuOffers.length, 1)
  assert.equal(next.menuOffers[0]?.name, 'Wave')
})

check('explicit empty menuOffers clears snapshot', () => {
  const current = applyOverlayQrUpdate(defaultOverlayQr, {
    menuOffers: [{ name: 'Wave', amountLabel: '10 PLS', amount: 10 }],
  })
  const next = applyOverlayQrUpdate(current, { menuOffers: [] })
  assert.equal(next.menuOffers.length, 0)
})

check('carousel off disables QR overlay even with slides ticked', () => {
  assert.equal(
    overlayQrEnabled(false, {
      ...defaultOverlayQr.slides,
      pack: {},
    }),
    false,
  )
})

if (failed) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}

console.log('\nverify:overlay — QR payload size\n')

const ADDR = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const TOKEN = '0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07'
const sampleUri = tryBuildTipPaymentUri({
  receiveAddress: ADDR,
  amountHuman: 50,
  chainId: 369,
  decimals: 6,
  tokenAddress: TOKEN,
})

await (async () => {
  check('compact hex QR stays under 160k', () => {
    assert.ok(sampleUri)
    const svg = hexagonQrSvg(sampleUri!, 240)
    assert.ok(svg.startsWith('<svg'))
    assert.ok(svg.endsWith('</svg>'))
    assert.ok(svg.length < 160_000, `svg ${svg.length} >= 160000`)
    assert.ok(svg.includes('<path '), 'uses compact path modules')
  })

  const payload = await buildOverlayQrPayload({
    ...defaultOverlayQr,
    address: ADDR,
    carousel: false,
    slides: {
      ...defaultOverlayQr.slides,
      qr: false,
      brand: false,
      eco: false,
      how: false,
      menu: true,
      pack: {},
    },
    menuOffers: [
      { name: 'A', amount: 50, amountLabel: '50 TOKEN', paymentUri: sampleUri || undefined, featured: true },
      { name: 'B', amount: 50, amountLabel: '50 TOKEN', paymentUri: sampleUri || undefined, featured: true },
      { name: 'C', amount: 75, amountLabel: '75 TOKEN', paymentUri: sampleUri || undefined },
    ],
  })

  check('carousel off hides QR overlay instead of rotating featured slides', () => {
    assert.equal(payload.enabled, false)
    assert.deepEqual(payload.slideIds, [])
    assert.equal(payload.menuOffers[0]?.qrSvg, undefined)
    assert.equal(payload.menuOffers[1]?.qrSvg, undefined)
    assert.equal(payload.menuOffers[2]?.qrSvg, undefined)
    assert.equal(Object.keys(payload.packQrs).length, 0)
  })

  check('overlay JSON stays small enough for OBS', () => {
    const bytes = JSON.stringify({ ok: true, qr: payload }).length
    assert.ok(bytes < 700_000, `payload ${bytes} bytes`)
  })
})()

if (failed) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nAll overlay verify checks passed.')
