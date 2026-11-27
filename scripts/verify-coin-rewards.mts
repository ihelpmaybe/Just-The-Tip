import assert from 'node:assert/strict'
import {
  COIN_COLOR_HUES,
  coinColorHue,
  coinPaintSkin,
  coinRewardRulesForPattern,
  createCoinRewardRule,
  exportCoinRewardCsv,
  matchCoinReward,
  matchCoinRewardByUsd,
  parseCoinRewardCsv,
  removeCoinRewardRules,
  usdTargetToTokenAmount,
  upsertCoinRewardRules,
  toggleCoinRewardAssignment,
  migratePatternPricesToCoinRewards,
} from '../shared/src/state/coinRewards.ts'
import { buildTipMenuHtml } from '../shared/src/utils/exportTipMenuHtml.ts'
import {
  EXTRA_SAVED_TOKEN_PRESETS,
  ensureBuiltinTipTokens,
  hideTipBoardToken,
  isExtraSavedTipToken,
  isFrontTipBoardToken,
  isTipBoardSuggestion,
  PDAI_TIP_ADDRESS,
  EXTRA_TIP_BOARD_SUGGESTIONS,
  TRENDING_TIP_BOARD_SUGGESTIONS,
  TANG_GANG_TOKEN_PRESETS,
  TIP_BOARD_SUGGESTIONS,
} from '../shared/src/state/tokens.ts'

const EDAI = '0xefD766cCb38EaF1dfd701853BFCe31359239F305'
const PHEX = '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39'
const PDAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
const EUSDC = '0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07'

function section(name: string) {
  console.log(`\n== ${name} ==`)
}

section('usdTargetToTokenAmount')
assert.equal(usdTargetToTokenAmount(1, 1, 6), 1)
assert.equal(usdTargetToTokenAmount(1, 0.002, 18), 500)
{
  const n = usdTargetToTokenAmount(4, 0.002795825607, 8)
  assert.ok(n != null && Math.abs(n - 4 / 0.002795825607) < 1e-6)
}
assert.equal(usdTargetToTokenAmount(1, null, 18), null)
assert.equal(usdTargetToTokenAmount(1, 0, 18), null)

section('tip board front vs suggestions')
assert.equal(PDAI_TIP_ADDRESS.toLowerCase(), PDAI.toLowerCase())
assert.ok(isFrontTipBoardToken(''))
assert.equal(isFrontTipBoardToken(PDAI), false)
assert.equal(isTipBoardSuggestion(PDAI), false)
assert.deepEqual(TIP_BOARD_SUGGESTIONS, [])
assert.deepEqual(TANG_GANG_TOKEN_PRESETS, [])
assert.deepEqual(EXTRA_TIP_BOARD_SUGGESTIONS, [])
assert.deepEqual(TRENDING_TIP_BOARD_SUGGESTIONS, [])
assert.deepEqual(EXTRA_SAVED_TOKEN_PRESETS, [])
assert.equal(TIP_BOARD_SUGGESTIONS.length, 0)
assert.equal(isExtraSavedTipToken(PHEX), false)
{
  const list = ensureBuiltinTipTokens([])
  assert.deepEqual(list, [])
  assert.equal(
    list.some((t) => t.address.toLowerCase() === PHEX.toLowerCase()),
    false,
    'majors are not auto-injected into savedTokens',
  )
}

section('extra saved tokens join Suggestions')
assert.equal(EXTRA_SAVED_TOKEN_PRESETS.length, 0)
assert.equal(TANG_GANG_TOKEN_PRESETS.length, 0)
assert.equal(EXTRA_TIP_BOARD_SUGGESTIONS.length, 0)
assert.equal(TRENDING_TIP_BOARD_SUGGESTIONS.length, 0)

section('hide extras; no auto board chips; no auto PornDai chip')
{
  const sample = '0xcFCFfE432A48dB53F59c301422d2EdD77B2A88d7'
  const hidden = hideTipBoardToken([], sample)
  assert.ok(hidden.includes(sample.toLowerCase()))
  const hidePdai = hideTipBoardToken([], PDAI)
  assert.ok(hidePdai.includes(PDAI.toLowerCase()))
  const list = ensureBuiltinTipTokens([], hidden)
  assert.equal(
    list.some((t) => t.address.toLowerCase() === sample.toLowerCase()),
    false,
  )
  assert.equal(
    list.some((t) => t.address.toLowerCase() === PDAI.toLowerCase()),
    false,
    'PornDai stays off savedTokens until Save token',
  )
}

section('parse + export CSV roundtrip')
const sample = `coin,token_address,pattern,usd_target,enabled,toy_ids
eDAI,${EDAI},wave,1.00,true,
pHEX,${PHEX},pulse,4.00,true,nora-1
`
const parsed = parseCoinRewardCsv(sample)
assert.equal(parsed.errors.length, 0, parsed.errors.join('; '))
assert.equal(parsed.rules.length, 2)
assert.equal(parsed.rules[0]!.coin, 'eDAI')
assert.equal(parsed.rules[0]!.patternId, 'wave')
assert.equal(parsed.rules[0]!.usdTarget, 1)
assert.equal(parsed.rules[1]!.toyIds[0], 'nora-1')

const again = parseCoinRewardCsv(exportCoinRewardCsv(parsed.rules))
assert.equal(again.rules.length, 2)
assert.equal(again.rules[1]!.patternId, 'pulse')

section('CSV errors')
const bad = parseCoinRewardCsv(`coin,token_address,pattern,usd_target
x,not-an-address,wave,1
x,${EDAI},nope-pattern,1
x,${EDAI},wave,-3
`)
assert.ok(bad.errors.length >= 3)

section('pDAI rows')
const pdaiCsv = parseCoinRewardCsv(`coin,token_address,pattern,usd_target,enabled,toy_ids
pDAI,${PDAI},wave,1.00,true,
pHEX,${PHEX},pulse,4.00,true,nora-1
`)
assert.equal(pdaiCsv.errors.length, 0, pdaiCsv.errors.join('; '))
assert.equal(pdaiCsv.rules.length, 2)
assert.equal(pdaiCsv.rules[0]!.coin, 'pDAI')
assert.equal(pdaiCsv.rules[1]!.coin, 'pHEX')

section('duplicate rows')
const dup = parseCoinRewardCsv(`coin,token_address,pattern,usd_target
A,${EDAI},wave,1
B,${EDAI},wave,2
`)
assert.equal(dup.rules.length, 1)
assert.equal(dup.rules[0]!.usdTarget, 1)
assert.ok(dup.warnings.length >= 1)

section('matchCoinReward')
const rules = [
  createCoinRewardRule({
    coin: 'eDAI',
    tokenAddress: EDAI,
    patternId: 'wave',
    usdTarget: 1,
  })!,
  createCoinRewardRule({
    coin: 'eDAI',
    tokenAddress: EDAI,
    patternId: 'pulse',
    usdTarget: 4,
  })!,
]
const quotes = { [EDAI.toLowerCase()]: 0.002 }
const hit = matchCoinReward(
  rules,
  { amount: 500, tokenAddress: EDAI },
  quotes,
  { [EDAI.toLowerCase()]: 18 },
)
assert.ok(hit)
assert.equal(hit!.rule.patternId, 'wave')

const hitHigh = matchCoinReward(
  rules,
  { amount: 2500, tokenAddress: EDAI },
  quotes,
  { [EDAI.toLowerCase()]: 18 },
)
assert.equal(hitHigh, null, '2500 mid/over between SKUs → null')

const hitExactPulse = matchCoinReward(
  rules,
  { amount: 2000, tokenAddress: EDAI },
  quotes,
  { [EDAI.toLowerCase()]: 18 },
)
assert.equal(hitExactPulse!.rule.patternId, 'pulse')

const hitTrunc = matchCoinReward(
  rules,
  { amount: 1999, tokenAddress: EDAI },
  quotes,
  { [EDAI.toLowerCase()]: 18 },
)
assert.equal(hitTrunc!.rule.patternId, 'pulse', '1999 truncated 2000 still pulse')

const missNative = matchCoinReward(
  rules,
  { amount: 500, tokenAddress: '' },
  { '': 0.00001 },
  {},
)
assert.equal(missNative, null)

const missQuote = matchCoinReward(
  rules,
  { amount: 500, tokenAddress: EDAI },
  { [EDAI.toLowerCase()]: null },
  {},
)
assert.equal(missQuote, null)

section('matchCoinRewardByUsd')
{
  const painted = [
    createCoinRewardRule({
      coin: 'HEX',
      tokenAddress: PHEX,
      patternId: 'wave',
      usdTarget: 3.69,
    })!,
    createCoinRewardRule({
      coin: 'HEX',
      tokenAddress: PHEX,
      patternId: 'pulse',
      usdTarget: 12,
    })!,
  ]
  assert.equal(matchCoinRewardByUsd(painted, 5), null, '$5 mid-interval → null')
  const byUsdHi = matchCoinRewardByUsd(painted, 12)
  assert.equal(byUsdHi!.rule.patternId, 'pulse')
  assert.equal(matchCoinRewardByUsd(painted, 1), null)
  const truncated = matchCoinRewardByUsd(painted, 11.99)
  assert.equal(truncated?.rule.patternId, 'pulse', '11.99 snaps to $12 SKU')
  const snapUnder = matchCoinRewardByUsd(painted, 3.68)
  assert.equal(snapUnder?.rule.patternId, 'wave', '$3.68 truncation snap-up to $3.69')
}

section('toggleCoinRewardAssignment')
{
  let rules = toggleCoinRewardAssignment([], {
    coin: 'eDAI',
    tokenAddress: EDAI,
    patternId: 'wave',
    usdTarget: 1,
    toyId: 'nora-1',
  })
  assert.equal(rules.assigned, true)
  assert.equal(rules.rules.length, 1)
  assert.deepEqual(rules.rules[0]!.toyIds, ['nora-1'])

  rules = toggleCoinRewardAssignment(rules.rules, {
    coin: 'eDAI',
    tokenAddress: EDAI,
    patternId: 'wave',
    usdTarget: 1,
    toyId: 'lush-1',
  })
  assert.equal(rules.assigned, true)
  assert.deepEqual([...rules.rules[0]!.toyIds].sort(), ['lush-1', 'nora-1'])

  rules = toggleCoinRewardAssignment(rules.rules, {
    coin: 'eDAI',
    tokenAddress: EDAI,
    patternId: 'wave',
    usdTarget: 1,
    toyId: 'nora-1',
  })
  assert.equal(rules.assigned, false)
  assert.deepEqual(rules.rules[0]!.toyIds, ['lush-1'])

  rules = toggleCoinRewardAssignment(rules.rules, {
    coin: 'eDAI',
    tokenAddress: EDAI,
    patternId: 'wave',
    usdTarget: 1,
    toyId: 'lush-1',
  })
  assert.equal(rules.assigned, false)
  assert.equal(rules.rules.length, 0)

  // Pattern-wide rule must turn off when toggling a specific toy (not get stuck).
  rules = toggleCoinRewardAssignment([], {
    coin: 'PLS',
    tokenAddress: '',
    patternId: 'wave',
    usdTarget: 1,
    toyId: null,
  })
  assert.equal(rules.assigned, true)
  assert.deepEqual(rules.rules[0]!.toyIds, [])
  rules = toggleCoinRewardAssignment(rules.rules, {
    coin: 'PLS',
    tokenAddress: '',
    patternId: 'wave',
    usdTarget: 1,
    toyId: 'nora-1',
  })
  assert.equal(rules.assigned, false)
  assert.equal(rules.rules.length, 0)
}

section('upsert merge + exact coin-pattern-toy')
const multi = upsertCoinRewardRules([], [
  {
    coin: 'eDAI',
    tokenAddress: EDAI,
    patternId: 'wave',
    usdTarget: 1,
    toyIds: ['nora-1'],
  },
  {
    coin: 'pHEX',
    tokenAddress: PHEX,
    patternId: 'pulse',
    usdTarget: 4,
    toyIds: ['lush-1'],
  },
])
assert.equal(multi.length, 2)

const merged = upsertCoinRewardRules(multi, [
  {
    coin: 'eDAI',
    tokenAddress: EDAI,
    patternId: 'wave',
    usdTarget: 2,
    toyIds: ['lush-1'],
  },
])
assert.equal(merged.length, 2)
const edaiWave = merged.find((r) => r.patternId === 'wave')
assert.ok(edaiWave)
assert.equal(edaiWave!.usdTarget, 2)
assert.deepEqual([...edaiWave!.toyIds].sort(), ['lush-1', 'nora-1'])

const exact = upsertCoinRewardRules([], [
  {
    coin: 'eDAI',
    tokenAddress: EDAI,
    patternId: 'wave',
    usdTarget: 1,
    toyIds: ['nora-1'],
  },
  {
    coin: 'pHEX',
    tokenAddress: PHEX,
    patternId: 'pulse',
    usdTarget: 4,
    toyIds: ['lush-1'],
  },
])
const noraWave = coinRewardRulesForPattern(exact, 'wave', 'nora-1')
assert.equal(noraWave.length, 1)
assert.equal(noraWave[0]!.coin, 'eDAI')
assert.deepEqual(noraWave[0]!.toyIds, ['nora-1'])

const lushWave = coinRewardRulesForPattern(exact, 'wave', 'lush-1')
assert.equal(lushWave.length, 0, 'wave/eDAI is nora-only; lush must not match')

const noraPulse = coinRewardRulesForPattern(exact, 'pulse', 'nora-1')
assert.equal(noraPulse.length, 0, 'pulse/pHEX is lush-only; nora must not match')

const lushPulse = coinRewardRulesForPattern(exact, 'pulse', 'lush-1')
assert.equal(lushPulse.length, 1)
assert.equal(lushPulse[0]!.coin, 'pHEX')

section('removeCoinRewardRules')
const removed = removeCoinRewardRules(exact, {
  tokenAddresses: [EDAI],
  patternIds: ['wave'],
})
assert.equal(removed.length, 1)
assert.equal(removed[0]!.coin, 'pHEX')

const removedAllEdai = removeCoinRewardRules(merged, {
  tokenAddresses: [EDAI],
})
assert.ok(removedAllEdai.every((r) => r.tokenAddress.toLowerCase() !== EDAI.toLowerCase()))
assert.equal(removedAllEdai.length, 1)

section('coinColorHue')
assert.equal(coinColorHue(EDAI), coinColorHue(EDAI.toLowerCase()))
assert.equal(coinColorHue(''), coinColorHue(null))
assert.equal(coinColorHue(''), 188, 'PLS should be PulseChain cyan')
assert.equal(coinPaintSkin(EDAI), 'stable', 'eDAI should be white stable')
assert.equal(coinPaintSkin(EUSDC), 'stable', 'eUSDC should be white stable')
assert.equal(coinPaintSkin(PHEX), 'hex', 'HEX should use HEX gradient')
assert.equal(coinPaintSkin(''), 'pls', 'native PLS should use PulseChain gradient')
assert.equal(
  coinPaintSkin('0x0Cb6F5a34ad42ec934882A05265A7d5F59b51A2f'),
  'stable',
  'eUSDT should be white stable',
)
assert.equal(
  coinPaintSkin('0x95B303987A60C71504D99Aa1b13B4DA07b0790ab'),
  'plsx',
  'PLSX should be red/green',
)
const hues = [
  coinColorHue(''),
  coinColorHue('0xF6f8Db0aBa00007681F8fAF16A0FDa1c9B030b11'),
  coinColorHue('0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d'),
]
assert.equal(new Set(hues).size, hues.length, `expected distinct hues, got ${hues.join(',')}`)
// Unknown addresses still land in the fallback palette.
assert.ok(COIN_COLOR_HUES.includes(coinColorHue('0x1111111111111111111111111111111111111111') as (typeof COIN_COLOR_HUES)[number]))

section('migrate ladder')
const migrated = migratePatternPricesToCoinRewards({
  patternPrices: { wave: 50, pulse: 100 },
  tokenAddress: EDAI,
  tokenSymbol: 'eDAI',
})
assert.equal(migrated.length, 2)
assert.ok(migrated.every((r) => r.coin === 'eDAI'))

section('HTML export per-coin payment links')
const RECEIVE = '0x1111111111111111111111111111111111111111'
const html = buildTipMenuHtml({
  displayName: 'Coin matrix',
  receive: RECEIVE,
  chainId: 369,
  chainLabel: 'PulseChain',
  symbol: 'TOKEN',
  items: [
    {
      name: 'Wave',
      blurb: '',
      price: 100,
      timeSec: 30,
      tag: 'wave',
      family: 'Wave',
      strengths: [2, 4, 2],
      coin: 'eDAI',
      tokenAddress: EDAI,
      tokenDecimals: 18,
      usdTarget: 1,
    },
    {
      name: 'Pulse',
      blurb: '',
      price: 200,
      timeSec: 45,
      tag: 'pulse',
      family: 'Pulse',
      strengths: [3, 6, 3],
      coin: 'pHEX',
      tokenAddress: PHEX,
      tokenDecimals: 8,
      usdTarget: 4,
    },
  ],
})
assert.ok(html.includes(EDAI.toLowerCase()) || html.includes(EDAI))
assert.ok(html.includes(PHEX.toLowerCase()) || html.includes(PHEX))
assert.ok(html.includes('eDAI') || html.includes('EDAI'))
assert.ok(html.includes('pHEX') || html.includes('HEX'))
assert.ok(html.includes('href="ethereum:'))
assert.ok(html.includes('data-payment-uri="ethereum:'))
assert.ok(html.includes('card-qr'))
assert.ok(html.includes('btn-pay-now'))
assert.ok(!html.includes('qrserver.com'))
assert.ok(html.includes('/transfer?') || html.includes('?value='))
assert.ok(!html.includes('Internet Money'))

console.log('\nOK coin rewards')
