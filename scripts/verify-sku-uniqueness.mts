/**
 * Regression: each toy+coin sheet must have unique SKU amounts.
 */
import assert from 'node:assert/strict'
import {
  countDuplicateSheetPrices,
  ensureUniqueCoinRewardRules,
  ensureUniqueEffectiveToySheet,
  ensureUniquePatternPriceMap,
  ladderPricesFromRange,
  patternDurationMs,
  patternToyPrice,
  PATTERNS,
  roundUsdTarget,
  uniqueUsdTargetsForPatterns,
  usdTargetToTokenAmount,
} from '../shared/src/index.ts'
import { buildTipMenuHtml } from '../shared/src/utils/exportTipMenuHtml.ts'

const USD_LO = 3.69
const USD_HI = 55.55
const EDAI_USD = 1

function section(name: string) {
  console.log(`\n== ${name} ==`)
}

section('ladder scale produces unique catalog prices')
{
  const lo = usdTargetToTokenAmount(USD_LO, EDAI_USD, 18)!
  const hi = usdTargetToTokenAmount(USD_HI, EDAI_USD, 18)!
  const ladder = ladderPricesFromRange(lo, hi)
  const entries = PATTERNS.map((p) => ({
    id: p.id,
    price: ladder[p.id]!,
  }))
  assert.equal(countDuplicateSheetPrices(entries), 0, 'catalog ladder has duplicates')

  const byDuration = new Map<number, string[]>()
  for (const p of PATTERNS) {
    const ms = patternDurationMs(p.id)
    const row = byDuration.get(ms) || []
    row.push(p.id)
    byDuration.set(ms, row)
  }
  const colliding = [...byDuration.values()].find((ids) => ids.length > 1)
  assert.ok(colliding, 'expected duration collisions in catalog')
  const [a, b] = colliding!
  assert.notEqual(ladder[a]!, ladder[b]!, 'same-duration patterns must diverge')
  const gap = Math.abs(ladder[a]! - ladder[b]!)
  assert.ok(
    gap >= 0.02 - 1e-9,
    `colliding SKUs must skip a truncation unit, gap=${gap}`,
  )
  console.log(`  ${colliding!.length} patterns @ ${patternDurationMs(colliding![0]!)}ms → unique amounts`)
}

section('toy override sheet stays unique')
{
  const base = ladderPricesFromRange(3.69, 55.55)
  const toyId = 'nora-1'
  const menuIds = PATTERNS.slice(0, 24).map((p) => p.id)
  const dupPrice = base[menuIds[0]!]!
  const overrides = {
    [toyId]: Object.fromEntries(menuIds.map((id) => [id, dupPrice])),
  }
  const repaired = ensureUniqueEffectiveToySheet(base, overrides, toyId, menuIds)
  const entries = menuIds.map((id) => ({
    id,
    price: patternToyPrice(id, base, repaired.toyPrices, toyId),
  }))
  assert.equal(countDuplicateSheetPrices(entries), 0)
  assert.ok(repaired.changed.length > 0, 'forced duplicate sheet should repair')
  console.log(`  repaired ${repaired.changed.length} colliding toy overrides`)
}

section('coin reward sheets keep unique USD targets')
{
  const token = '0xefD766cCb38EaF1dfd701853BFCe31359239F305'
  const patterns = PATTERNS.slice(0, 20)
  const rules = patterns.map((p, i) => ({
    id: `cr_${i}`,
    coin: 'eDAI',
    tokenAddress: token,
    patternId: p.id,
    usdTarget: roundUsdTarget(USD_LO + (i % 3) * 0.01),
    enabled: true,
    toyIds: i % 2 === 0 ? ['nora-1'] : [],
  }))
  const unique = ensureUniqueCoinRewardRules(rules, ['nora-1'])
  const noraSheet = unique.filter(
    (r) =>
      r.tokenAddress.toLowerCase() === token.toLowerCase() &&
      (!r.toyIds.length || r.toyIds.includes('nora-1')),
  )
  const noraEntries = noraSheet.map((r) => ({
    id: r.patternId,
    price: r.usdTarget,
  }))
  assert.equal(
    countDuplicateSheetPrices(noraEntries, roundUsdTarget),
    0,
    'nora INC sheet has duplicate USD targets',
  )
  console.log(`  nora sheet ${noraSheet.length} rows, all unique`)
}

section('menu export sorts unique painted amounts')
{
  const token = '0xefD766cCb38EaF1dfd701853BFCe31359239F305'
  const patterns = PATTERNS.slice(0, 8)
  const rules = ensureUniqueCoinRewardRules(
    patterns.map((p, i) => ({
      id: `cr_${i}`,
      coin: 'eDAI',
      tokenAddress: token,
      patternId: p.id,
      usdTarget: USD_LO + i * 0.5,
      enabled: true,
      toyIds: [],
    })),
  )
  const ladder = ensureUniquePatternPriceMap(
    Object.fromEntries(patterns.map((p) => [p.id, USD_LO])),
    patterns.map((p) => p.id),
  )
  const html = buildTipMenuHtml({
    displayName: 'SKU test',
    chainLabel: 'PulseChain',
    symbol: 'eDAI',
    tokenSymbol: 'eDAI',
    // Export cards still render names without a wallet; wallet unlocks QR/pay links.
    receiveAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    tokenAddress: token,
    tokenDecimals: 18,
    items: patterns.map((p) => ({
      name: p.name,
      blurb: '',
      price: ladder[p.id]!,
      timeSec: 1,
      tag: '',
      family: '',
      strengths: [1],
      featured: false,
      coin: 'eDAI',
      tokenAddress: token,
      tokenDecimals: 18,
    })),
  })
  const prices = patterns.map((p) => ladder[p.id]!)
  assert.equal(new Set(prices).size, prices.length, 'menu row prices are unique')
  const escName = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  assert.ok(html.includes(escName(patterns[0]!.name)), 'export renders pattern names')
  for (const p of patterns) {
    assert.ok(
      html.includes(escName(p.name)),
      `export missing pattern name: ${p.name}`,
    )
  }
  void rules
  console.log(`  export prices ${prices.length}, all unique`)
}

section('unique USD targets for menu paint')
{
  const menuIds = PATTERNS.slice(0, 30).map((p) => p.id)
  const sheet = uniqueUsdTargetsForPatterns(menuIds, USD_LO, USD_HI)
  const entries = menuIds.map((id) => ({ id, price: sheet[id]! }))
  assert.equal(
    countDuplicateSheetPrices(entries, roundUsdTarget),
    0,
    'duration paint sheet has duplicate USD targets',
  )
  console.log(`  ${menuIds.length} menu rows, all unique USD`)
}

section('scale ladder + painted rules stay unique')
{
  const lo = usdTargetToTokenAmount(USD_LO, EDAI_USD, 18)!
  const hi = usdTargetToTokenAmount(USD_HI, EDAI_USD, 18)!
  const ladder = ladderPricesFromRange(lo, hi)
  const menuIds = PATTERNS.slice(0, 20).map((p) => p.id)
  const usdSheet = uniqueUsdTargetsForPatterns(menuIds, USD_LO, USD_HI)
  const token = '0xefD766cCb38EaF1dfd701853BFCe31359239F305'
  const rules = ensureUniqueCoinRewardRules(
    menuIds.map((id, i) => ({
      id: `cr_${i}`,
      coin: 'eDAI',
      tokenAddress: token,
      patternId: id,
      usdTarget: usdSheet[id]!,
      enabled: true,
      toyIds: ['nora-1'],
    })),
    {
      extraToyIds: ['nora-1'],
      quotes: { [token.toLowerCase()]: EDAI_USD },
      decimalsByToken: { [token.toLowerCase()]: 18 },
    },
  )
  const amounts = rules.map(
    (r) => usdTargetToTokenAmount(r.usdTarget, EDAI_USD, 18)!,
  )
  assert.equal(new Set(amounts).size, amounts.length, 'painted token amounts collide')
  void ladder
  console.log(`  ${rules.length} painted rows, unique token SKUs`)
}

console.log('\nOK unique SKU prices')
