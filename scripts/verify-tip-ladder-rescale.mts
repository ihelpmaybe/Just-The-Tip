/**
 * Smoke: tip ladders must rescale when tip coin changes.
 * PLSX-sized token counts must never become eDAI tip amounts.
 */
import assert from 'node:assert/strict'
import {
  catalogLongestMs,
  catalogShortestMs,
  durationBoundsForPatterns,
  ladderPricesFromRange,
  menuBaseFromPrices,
  menuTopFromPrices,
  patternDurationMs,
  usdTargetToTokenAmount,
  PATTERNS,
} from '../shared/src/index.ts'

const PLSX_USD = 0.00001 // ≈ dust meme pricing
const EDAI_USD = 1

function scale(usdLo: number, usdHi: number, usdPer: number, decimals = 18) {
  const lo = usdTargetToTokenAmount(usdLo, usdPer, decimals)
  const hi = usdTargetToTokenAmount(usdHi, usdPer, decimals)
  assert.ok(lo != null && hi != null, 'token conversion')
  return ladderPricesFromRange(lo, hi)
}

function usdForDuration(patternId: string, usdLo: number, usdHi: number) {
  const dLo = catalogShortestMs()
  const dHi = catalogLongestMs()
  const span = dHi - dLo
  const ms = patternDurationMs(patternId)
  const t = span <= 0 ? 0 : Math.min(1, Math.max(0, (ms - dLo) / span))
  return Math.round((usdLo + t * (usdHi - usdLo)) * 100) / 100
}

const USD_LO = 3.69
const USD_HI = 55.55

console.log('== duration USD targets ==')
const shortId =
  PATTERNS.map((p) => p.id).sort(
    (a, b) => patternDurationMs(a) - patternDurationMs(b),
  )[0]!
const longId =
  PATTERNS.map((p) => p.id).sort(
    (a, b) => patternDurationMs(b) - patternDurationMs(a),
  )[0]!
const shortUsd = usdForDuration(shortId, USD_LO, USD_HI)
const longUsd = usdForDuration(longId, USD_LO, USD_HI)
assert.equal(shortUsd, USD_LO)
assert.equal(longUsd, USD_HI)
console.log(`  ${shortId} → $${shortUsd}`)
console.log(`  ${longId} → $${longUsd}`)

console.log('== tip-menu span (not full catalog) ==')
{
  const mid = PATTERNS.map((p) => p.id).sort(
    (a, b) => patternDurationMs(a) - patternDurationMs(b),
  )
  // Pretend the tip menu only keeps mid-length patterns (old bug: Low stuck at ~$25).
  const subset = mid.slice(40, 90)
  assert.ok(subset.length >= 2, 'subset')
  const bounds = durationBoundsForPatterns(subset.map((id) => ({ id })))
  const loTok = usdTargetToTokenAmount(USD_LO, EDAI_USD, 18)!
  const hiTok = usdTargetToTokenAmount(USD_HI, EDAI_USD, 18)!
  const ladder = ladderPricesFromRange(loTok, hiTok, bounds)
  const shortMs = Math.min(...subset.map((id) => patternDurationMs(id)))
  const shortOnMenu = subset.find((id) => patternDurationMs(id) === shortMs)!
  assert.ok(
    Math.abs(ladder[shortOnMenu]! - USD_LO) < 1,
    `menu shortest should be near $${USD_LO} (colliding SKUs skip a digit), got ${ladder[shortOnMenu]}`,
  )
  console.log(`  subset shortest ${shortOnMenu} → $${ladder[shortOnMenu]}`)
}

console.log('== PLSX scale (cheap token) ==')
const plsxLadder = scale(USD_LO, USD_HI, PLSX_USD)
const plsxLo = menuBaseFromPrices(plsxLadder)
const plsxHi = menuTopFromPrices(plsxLadder)
console.log(`  ladder ${plsxLo} – ${plsxHi} PLSX`)
assert.ok(plsxLo > 1000, 'PLSX cheapest tip is a large token count')
assert.ok(plsxLo * PLSX_USD < 5, 'but still ~$3.69')
assert.ok(plsxHi * PLSX_USD < 60, 'top still ~$55')

console.log('== eDAI rescale (must NOT keep PLSX counts) ==')
const edaiLadder = scale(USD_LO, USD_HI, EDAI_USD)
const edaiLo = menuBaseFromPrices(edaiLadder)
const edaiHi = menuTopFromPrices(edaiLadder)
console.log(`  ladder ${edaiLo} – ${edaiHi} eDAI`)
assert.ok(edaiLo < 10, 'eDAI cheapest is small token count')
assert.ok(edaiHi < 100, 'eDAI top is small token count')
assert.ok(Math.abs(edaiLo - USD_LO) < 0.05, 'eDAI lo ≈ $3.69')
assert.ok(Math.abs(edaiHi - USD_HI) < 0.05, 'eDAI hi ≈ $55.55')

console.log('== disaster check: PLSX counts as eDAI ==')
const fakeUsd = plsxLo * EDAI_USD
console.log(`  if unrecaled: ${plsxLo} eDAI ≈ $${fakeUsd}`)
assert.ok(fakeUsd > 1000, 'reproduces the bug shape')
assert.ok(edaiLo * EDAI_USD < 10, 'rescale prevents it')

console.log('OK tip ladder coin switch')
