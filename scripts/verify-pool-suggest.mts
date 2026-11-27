/**
 * Deterministic pool buzz-rule / suggestion checks (no RPC).
 *
 *   npm run verify:pools
 */
import assert from 'node:assert/strict'
import {
  createPoolBuzzRule,
  matchPoolBuzzRule,
  chainEventEyebrow,
  normalizePoolListen,
  quotePairLeg,
  WPLS_ADDRESS,
  type WatchedPool,
} from '../shared/src/chain/pools.ts'
import {
  niceQuoteAmount,
  suggestPoolTriggersFromSwaps,
  type SampledPoolSwap,
} from '../shared/src/chain/poolSuggest.ts'
import {
  mergeBridgePresets,
  normalizeWatchedBridge,
  PULSECHAIN_OMNIBRIDGE_ADDRESS,
  bridgeBackupTokens,
  bridgeClaimKey,
  bridgeTransferSide,
} from '../shared/src/chain/bridges.ts'
import {
  chainLogAmountFromArgs,
  parseChainEventAbi,
} from '../shared/src/chain/chainLogs.ts'

function sample(
  amount: number,
  side: SampledPoolSwap['side'],
  block = 1n,
): SampledPoolSwap {
  return { amount, side, symbol: 'WPLS', blockNumber: block }
}

function poolWithRules(
  rules: ReturnType<typeof createPoolBuzzRule>[],
): Pick<WatchedPool, 'buzzRules'> {
  return { buzzRules: rules }
}

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

console.log('verify:pools — match + suggest\n')

check('niceQuoteAmount rounds large values', () => {
  assert.equal(niceQuoteAmount(123456), 123000)
  assert.equal(niceQuoteAmount(0), 0)
  assert.equal(niceQuoteAmount(7.2), 7)
  assert.equal(niceQuoteAmount(1_250_000), 1_250_000)
})

check('matchPoolBuzzRule prefers highest min for matching side', () => {
  const pool = poolWithRules([
    createPoolBuzzRule({ minAmount: 100, side: 'buy', multiples: 1 }),
    createPoolBuzzRule({ minAmount: 500, side: 'buy', multiples: 2 }),
    createPoolBuzzRule({ minAmount: 200, side: 'sell', multiples: 1 }),
  ])
  const buy = matchPoolBuzzRule(pool, 600, 'buy')
  assert.ok(buy)
  assert.equal(buy.minAmount, 500)
  assert.equal(buy.multiples, 2)
  const sell = matchPoolBuzzRule(pool, 250, 'sell')
  assert.ok(sell)
  assert.equal(sell.side, 'sell')
  assert.equal(sell.minAmount, 200)
})

check('matchPoolBuzzRule skips opposite side (does not pick buy for sell)', () => {
  const pool = poolWithRules([
    createPoolBuzzRule({ minAmount: 100, side: 'buy', multiples: 3 }),
  ])
  assert.equal(matchPoolBuzzRule(pool, 999, 'sell'), null)
  assert.ok(matchPoolBuzzRule(pool, 999, 'buy'))
})

check('matchPoolBuzzRule all-side rules match any buy/sell', () => {
  const pool = poolWithRules([
    createPoolBuzzRule({ minAmount: 50, side: 'all', multiples: 1 }),
  ])
  assert.ok(matchPoolBuzzRule(pool, 50, 'buy'))
  assert.ok(matchPoolBuzzRule(pool, 50, 'sell'))
})

check('suggest caps scan min at mildest rule', () => {
  // Many large buys + a few modest sells → combined p55 can exceed sell p70.
  const buys = Array.from({ length: 20 }, (_, i) =>
    sample(1_000_000 + i * 50_000, 'buy', BigInt(i + 1)),
  )
  const sells = [
    sample(10_000, 'sell', 100n),
    sample(12_000, 'sell', 101n),
    sample(15_000, 'sell', 102n),
    sample(20_000, 'sell', 103n),
    sample(40_000, 'sell', 104n),
    sample(80_000, 'sell', 105n),
  ]
  const suggestion = suggestPoolTriggersFromSwaps([...buys, ...sells], {
    blocks: 200,
    symbol: 'WPLS',
  })
  assert.ok(suggestion.rules.length >= 2, 'expected buy and sell rules')
  const lowest = Math.min(...suggestion.rules.map((r) => r.minAmount))
  assert.ok(
    suggestion.scanMinAmount <= lowest,
    `scan ${suggestion.scanMinAmount} must be ≤ lowest rule ${lowest}`,
  )
  assert.equal(suggestion.preferPoolSideAll, true)
})

check('suggest needs enough samples per side', () => {
  const suggestion = suggestPoolTriggersFromSwaps(
    [sample(100, 'buy'), sample(200, 'sell'), sample(300, 'buy')],
    { blocks: 10 },
  )
  assert.equal(suggestion.rules.length, 0)
  assert.match(suggestion.summary, /not enough/i)
})

check('listen defaults to swap; empty stays empty', () => {
  assert.deepEqual(normalizePoolListen(undefined), ['swap'])
  assert.deepEqual(normalizePoolListen([]), [])
  assert.deepEqual(normalizePoolListen(['mint', 'swap', 'mint']), [
    'mint',
    'swap',
  ])
})

check('quotePairLeg uses the quote token leg', () => {
  const pool = {
    quoteToken: WPLS_ADDRESS,
    token0: WPLS_ADDRESS,
    token1: '0xefd766ccb38eaf1dfd701853bfce31359239f305' as const,
    quoteSymbol: 'WPLS',
  }
  const sized = quotePairLeg(pool, 5n * 10n ** 18n, 9n)
  assert.equal(sized.amountWei, 5n * 10n ** 18n)
})

check('matchPoolBuzzRule accepts add / in sides', () => {
  const pool = poolWithRules([
    createPoolBuzzRule({ minAmount: 10, side: 'add', multiples: 2 }),
    createPoolBuzzRule({ minAmount: 5, side: 'in', multiples: 1 }),
  ])
  const add = matchPoolBuzzRule(pool, 50, 'add')
  assert.equal(add?.side, 'add')
  assert.equal(add?.multiples, 2)
  assert.equal(matchPoolBuzzRule(pool, 50, 'out'), null)
  assert.equal(matchPoolBuzzRule(pool, 50, 'in')?.side, 'in')
})

check('chainEventEyebrow labels extra kinds', () => {
  assert.equal(chainEventEyebrow('mint'), 'LP add')
  assert.equal(chainEventEyebrow('bridge-in'), 'Bridge in')
  assert.equal(chainEventEyebrow('custom'), 'Chain event')
  assert.equal(chainEventEyebrow('swap'), 'Pool swap')
})

check('token tx backup classifies mint/burn vs user transfer', () => {
  const mediator = PULSECHAIN_OMNIBRIDGE_ADDRESS
  const zero = '0x0000000000000000000000000000000000000000'
  const user = '0x1111111111111111111111111111111111111111'
  const other = '0x2222222222222222222222222222222222222222'
  assert.equal(bridgeTransferSide(zero, user, mediator), 'in')
  assert.equal(bridgeTransferSide(mediator, user, mediator), 'in')
  assert.equal(bridgeTransferSide(user, zero, mediator), 'out')
  assert.equal(bridgeTransferSide(user, mediator, mediator), 'out')
  assert.equal(bridgeTransferSide(user, other, mediator), null)
  const row = normalizeWatchedBridge({
    address: mediator,
    label: 'Omni',
  })
  assert.equal(row?.tokenTxBackup, true)
  assert.equal(bridgeBackupTokens({ token: null }).length, 5)
  assert.equal(
    bridgeBackupTokens({
      token: '0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07',
    }).length,
    1,
  )
  assert.equal(
    bridgeClaimKey('0xAb', 'bridge-in', '0xCD'),
    '0xab:bridge-in:0xcd',
  )
})

check('OmniBridge preset + parse Transfer ABI', () => {
  const { bridges, added } = mergeBridgePresets([])
  assert.equal(added, 1)
  assert.equal(
    bridges[0]?.address.toLowerCase(),
    PULSECHAIN_OMNIBRIDGE_ADDRESS.toLowerCase(),
  )
  const parsed = parseChainEventAbi(
    'Transfer(address indexed from, address indexed to, uint256 value)',
  )
  assert.ok(parsed)
  assert.equal(parsed?.name, 'Transfer')
  const amt = chainLogAmountFromArgs({ value: 123n }, 'value')
  assert.equal(amt, 123n)
  const bad = normalizeWatchedBridge({ address: '0x0', label: 'x' })
  assert.equal(bad, null)
})


if (failed) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nAll pool verify checks passed.')
