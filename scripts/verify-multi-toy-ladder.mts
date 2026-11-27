/**
 * Smoke: multi-toy exact (+ truncation snap-up) tip ladder scales to N devices.
 * Run: npx tsx scripts/verify-multi-toy-ladder.mts
 */
import {
  planBuzz,
  planBuzzEachToy,
  patternsForToyMenu,
  resetTipPlanRr,
  resolveSkuPrice,
  type PatternPrices,
} from '../src/utils/pricing'
import {
  PATTERNS,
  patternNeeds,
  type PatternId,
} from '../src/utils/patterns'
import { toyFamily, type CapabilitySource } from '../src/utils/patternFit'

function fail(msg: string): never {
  console.error('FAIL:', msg)
  process.exit(1)
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) fail(msg)
}

function pickPattern(
  family: 'vibe' | 'multi',
  notId?: string,
): { id: PatternId; name: string } {
  const sample =
    family === 'multi'
      ? { id: 'g', name: 'G', motors: 2, connected: true, toyType: 'Gemini' }
      : { id: 'a', name: 'A', motors: 1, connected: true }
  // Live matching uses the per-toy top-N menu, not raw catalog order.
  const pool = patternsForToyMenu(sample, { includeDisabled: false })
  for (const p of pool) {
    if (notId && p.id === notId) continue
    const needs = patternNeeds(p)
    if (family === 'vibe' && !needs.length) {
      return { id: p.id, name: p.name }
    }
    if (family === 'multi' && needs.includes('multi') && needs.length === 1) {
      return { id: p.id, name: p.name }
    }
  }
  fail(`No ${family} pattern on the toy menu`)
}

const vibeA = pickPattern('vibe')
const vibeB = pickPattern('vibe', vibeA.id)
const multi = pickPattern('multi')

/** Prices so only our ladder rungs exist; everything else out of reach. */
function sheet(map: Record<string, number>): PatternPrices {
  const out: PatternPrices = {}
  for (const p of PATTERNS) out[p.id] = 1_000_000_000
  for (const [id, n] of Object.entries(map)) out[id] = n
  return out
}

function vibeToy(id: string, name: string): CapabilitySource {
  return { id, name, motors: 1, connected: true }
}

function multiToy(id: string, name: string): CapabilitySource {
  return { id, name, motors: 2, connected: true, toyType: 'Gemini' }
}

// --- identities
assert(toyFamily(vibeToy('a', 'A')) === 'vibe', 'vibe family')
assert(toyFamily(multiToy('g', 'G')) === 'multi', 'multi family')

// --- exact only (mid / overpay miss), single toy
{
  resetTipPlanRr()
  const prices = sheet({ [vibeA.id]: 10, [vibeB.id]: 25 })
  const toys = [vibeToy('lush-1', 'Lush1')]
  const under = planBuzz(5, prices, [], { toys })
  assert(under === null, 'below cheapest → null')

  const mid = planBuzz(20, prices, [], { toys })
  assert(mid === null, '20 mid-interval → null (no next-lower)')

  const exact = planBuzz(25, prices, [], { toys })
  assert(exact?.price === 25 && exact.pattern === vibeB.id, '25 → exact 25')

  const over = planBuzz(100, prices, [], { toys })
  assert(over === null, '100 overpay → null (no floor unlock)')
}

// --- N identical vibe toys RR on exact rung
{
  resetTipPlanRr()
  const N = 12
  const toys = Array.from({ length: N }, (_, i) =>
    vibeToy(`toy-${String(i).padStart(2, '0')}`, `Toy ${i}`),
  )
  const prices = sheet({ [vibeA.id]: 50 })
  const hits = new Map<string, number>()
  for (let i = 0; i < N * 3; i++) {
    const plan = planBuzz(50, prices, [], { toys })
    assert(plan?.price === 50 && plan.toyId, `tip ${i} has toy`)
    hits.set(plan!.toyId!, (hits.get(plan!.toyId!) || 0) + 1)
  }
  assert(hits.size === N, `all ${N} toys got tips (got ${hits.size})`)
  for (const [id, n] of hits) {
    assert(n === 3, `${id} got 3 turns (got ${n})`)
  }
}

// --- mix families: shared exact price RR only among capable toys
{
  resetTipPlanRr()
  const prices = sheet({
    [vibeA.id]: 100,
    [multi.id]: 100,
  })
  const toys = [
    vibeToy('lush', 'Lush'),
    multiToy('gemini', 'Gemini'),
    vibeToy('edge-vibe-only', 'Solo'), // motors:1 vibe
  ]
  // 100 exact: lush + solo (vibe) + gemini (multi) — all three if each has 100
  const ids: string[] = []
  for (let i = 0; i < 9; i++) {
    const p = planBuzz(100, prices, [], { toys })
    assert(p?.price === 100 && p.toyId, 'exact 100')
    ids.push(p!.toyId!)
  }
  const set = new Set(ids)
  assert(set.has('lush') && set.has('gemini') && set.has('edge-vibe-only'),
    `exact 100 RR all families that list 100 (${[...set]})`)
  assert(set.size === 3, 'only three toys in pool')
}

// --- mid-interval tips miss across multi-toy sheets (exact SKUs only)
{
  resetTipPlanRr()
  const prices = sheet({
    [vibeA.id]: 10,
    [vibeB.id]: 40,
    [multi.id]: 90,
  })
  const toys = [
    vibeToy('lush', 'Lush'),
    multiToy('gemini', 'Gemini'),
  ]
  const p70 = planBuzz(70, prices, [], { toys })
  assert(p70 === null, '70 mid-interval → null')

  const p95 = planBuzz(95, prices, [], { toys })
  assert(p95 === null, '95 mid-interval → null')

  const p90 = planBuzz(90, prices, [], { toys })
  assert(
    p90?.price === 90 && p90.toyId === 'gemini',
    '90 exact → Gemini @90',
  )
}

// --- per-toy overrides
{
  resetTipPlanRr()
  const prices = sheet({ [vibeA.id]: 20 })
  const toys = [
    vibeToy('a', 'A'),
    vibeToy('b', 'B'),
  ]
  const toyPrices = {
    a: { [vibeA.id]: 20 },
    b: { [vibeA.id]: 30 },
  }
  const exact20 = planBuzz(20, prices, [], { toys, toyPrices })
  assert(exact20?.toyId === 'a' && exact20.price === 20, 'exact 20 only toy A')

  const mid = planBuzz(25, prices, [], { toys, toyPrices })
  assert(mid === null, '25 mid between A@20 and B@30 → null')

  const exact30 = planBuzz(30, prices, [], { toys, toyPrices })
  assert(
    exact30?.price === 30 && exact30.toyId === 'b',
    'exact 30 → B',
  )
}

// --- disabled + disconnected excluded
{
  resetTipPlanRr()
  const prices = sheet({ [vibeA.id]: 10 })
  const toys = [
    vibeToy('on', 'On'),
    vibeToy('off-list', 'Off'),
    { ...vibeToy('ghost', 'Ghost'), connected: false },
  ]
  const p = planBuzz(10, prices, [], {
    toys,
    disabledToys: ['off-list'],
  })
  assert(p?.toyId === 'on', 'only buzz-on connected toy')
}

// --- float noise near exact
{
  resetTipPlanRr()
  const prices = sheet({ [vibeA.id]: 50 })
  const toys = [vibeToy('x', 'X')]
  const p = planBuzz(50 - 1e-12, prices, [], { toys })
  assert(p?.price === 50, 'float dust still exact/ladder')
}

// --- wallet truncation: last digit dropped, still the intended SKU
{
  resetTipPlanRr()
  const prices = sheet({ [vibeA.id]: 10, [vibeB.id]: 25 })
  const toys = [vibeToy('lush-1', 'Lush1')]
  const snap = planBuzz(24.99, prices, [], { toys })
  assert(
    snap?.price === 25 && snap.pattern === vibeB.id,
    '24.99 truncated 25 still SKU 25',
  )
  const mid = planBuzz(20, prices, [], { toys })
  assert(mid === null, '20 mid-interval → null (not snap to 25)')
  const snapFloor = planBuzz(9.99, prices, [], { toys })
  assert(snapFloor?.price === 10, '9.99 truncated still SKU 10')
  const miss = planBuzz(9.90, prices, [], { toys })
  assert(miss === null, 'well under cheapest still miss')
  assert(resolveSkuPrice(11.99, [10, 12]) === 12, 'resolveSku snap-up')
  assert(resolveSkuPrice(11, [10, 12]) === null, 'resolveSku mid → null')
  assert(resolveSkuPrice(10, [10, 12]) === 10, 'resolveSku exact')
}

{
  // One tip fans out to every buzz-on toy that has a rung for the amount.
  const prices = sheet({ [vibeA.id]: 50, [multi.id]: 50 })
  const toys = [
    vibeToy('lush', 'Lush'),
    vibeToy('lush-2', 'Lush2'),
    multiToy('gemini', 'Gemini'),
  ]
  const plans = planBuzzEachToy(50, prices, [], { toys })
  assert(plans.length === 3, `fan-out 3 toys (got ${plans.length})`)
  const ids = new Set(plans.map((p) => p.toyId))
  assert(ids.size === 3, 'fan-out unique toys')
  const onlyOn = planBuzzEachToy(50, prices, [], {
    toys: [vibeToy('on', 'On'), vibeToy('off-list', 'Off')],
    disabledToys: ['off-list'],
  })
  assert(onlyOn.length === 1 && onlyOn[0]!.toyId === 'on', 'fan-out skips buzz-off')
}

console.log('OK multi-toy tip ladder')
console.log(`  vibe patterns: ${vibeA.id}, ${vibeB.id}`)
console.log(`  multi pattern: ${multi.id}`)
console.log('  covered: exact, snap-up truncation, mid-miss, N=12 RR, families, overrides, filters, per-toy fan-out')
