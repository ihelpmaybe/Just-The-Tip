/**
 * Live PulseChain smoke: watch OmniBridge + token-tx backup + LP mint/burn
 * with no wallet and no toys.
 *
 *   node node_modules/tsx/dist/cli.mjs scripts/smoke-bridge-watch.mts
 */
import { createPublicClient, fallback, formatUnits, http } from 'viem'
import { pulsechain } from '../shared/src/chain/config.ts'
import {
  BRIDGE_BACKUP_TOKENS,
  BRIDGE_PRESETS,
  bridgeTransferSide,
  erc20TransferEvent,
  normalizeWatchedBridge,
  PULSECHAIN_OMNIBRIDGE_ADDRESS,
  tokensBridgedEvent,
  tokensBridgingInitiatedEvent,
} from '../shared/src/chain/bridges.ts'
import {
  POOL_PRESETS,
  quotePairLeg,
} from '../shared/src/chain/pools.ts'
import { parseChainEventAbi } from '../shared/src/chain/chainLogs.ts'
import { PaymentWatcher, type PaymentEvent } from '../shared/src/chain/watcher.ts'
import { parseAbiItem } from 'viem'

const ZERO = '0x0000000000000000000000000000000000000000' as const
const RPCS = [
  'https://rpc.pulsechain.com',
  'https://pulsechain-rpc.publicnode.com',
  'https://rpc-pulsechain.g4mm4.io',
]

let failed = 0
function pass(name: string, detail = '') {
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`)
}
function fail(name: string, detail = '') {
  failed += 1
  console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
}

const client = createPublicClient({
  chain: pulsechain,
  transport: fallback(
    RPCS.map((url) => http(url, { timeout: 25_000, retryCount: 1 })),
    { rank: false },
  ),
})

async function logsInChunks<T>(
  label: string,
  fn: (
    from: bigint,
    to: bigint,
  ) => Promise<T[]>,
  tip: bigint,
  lookback: bigint,
  chunk: bigint,
): Promise<T[]> {
  const oldest = tip > lookback ? tip - lookback : 0n
  const out: T[] = []
  for (let to = tip; to >= oldest; to = to > chunk ? to - chunk : 0n) {
    const from = to >= chunk - 1n + oldest ? to - (chunk - 1n) : oldest
    try {
      out.push(...(await fn(from, to)))
    } catch (err) {
      console.warn(
        `  warn  ${label} ${from}–${to}:`,
        err instanceof Error ? err.message : err,
      )
    }
    if (from === 0n || from === oldest) break
    if (out.length >= 40) break
  }
  return out
}

async function main() {
  console.log('smoke:bridge-watch — no wallet, no toys\n')

  const abi = parseChainEventAbi(
    'Transfer(address indexed from, address indexed to, uint256 value)',
  )
  if (abi?.name === 'Transfer') pass('custom event ABI parses')
  else fail('custom event ABI parses')

  const bridge = normalizeWatchedBridge({
    ...BRIDGE_PRESETS[0],
    enabled: true,
    minAmount: 0,
    tokenTxBackup: true,
    direction: 'both',
  })
  if (!bridge) {
    fail('normalize OmniBridge preset')
    process.exit(1)
  }
  pass('normalize OmniBridge preset', bridge.address)

  const code = await client.getBytecode({ address: PULSECHAIN_OMNIBRIDGE_ADDRESS })
  if (code && code !== '0x') pass('OmniBridge has contract code', `${code.length} chars`)
  else fail('OmniBridge has contract code')

  const tip = await client.getBlockNumber()
  pass('PulseChain tip', tip.toString())

  const lookback = 1_800n
  const chunk = 150n

  const bridgedIn = await logsInChunks(
    'TokensBridged',
    (from, to) =>
      client.getLogs({
        address: PULSECHAIN_OMNIBRIDGE_ADDRESS,
        event: tokensBridgedEvent,
        fromBlock: from,
        toBlock: to,
      }),
    tip,
    lookback,
    chunk,
  )
  const bridgedOut = await logsInChunks(
    'TokensBridgingInitiated',
    (from, to) =>
      client.getLogs({
        address: PULSECHAIN_OMNIBRIDGE_ADDRESS,
        event: tokensBridgingInitiatedEvent,
        fromBlock: from,
        toBlock: to,
      }),
    tip,
    lookback,
    chunk,
  )

  if (bridgedIn.length) {
    const sample = bridgedIn[0]!
    const value = (sample.args as { value?: bigint }).value ?? 0n
    const token = (sample.args as { token?: string }).token
    pass(
      'TokensBridged (deposit in)',
      `n=${bridgedIn.length} · ${token?.slice(0, 10)}… · ${value.toString()} raw`,
    )
  } else {
    fail('TokensBridged (deposit in)', `none in last ${lookback} blocks`)
  }

  if (bridgedOut.length) {
    pass('TokensBridgingInitiated (withdraw out)', `n=${bridgedOut.length}`)
  } else {
    console.log(
      `  SKIP  TokensBridgingInitiated — none in last ${lookback} blocks (withdrawals can be quiet)`,
    )
  }

  const hex = BRIDGE_BACKUP_TOKENS[0]!
  const hexLogs = await logsInChunks(
    'HEX Transfer',
    (from, to) =>
      client.getLogs({
        address: hex,
        event: erc20TransferEvent,
        fromBlock: from,
        toBlock: to,
      }),
    tip,
    400n,
    100n,
  )
  const hexBridgeTx = hexLogs.filter((log) => {
    const args = log.args as { from?: string; to?: string }
    return Boolean(
      bridgeTransferSide(args.from || '', args.to || '', PULSECHAIN_OMNIBRIDGE_ADDRESS),
    )
  })
  if (hexBridgeTx.length) {
    const args = hexBridgeTx[0]!.args as {
      from?: string
      to?: string
      value?: bigint
    }
    pass(
      'token tx backup (bridged HEX)',
      `${hexBridgeTx.length} mint/burn of ${hexLogs.length} transfers · ${bridgeTransferSide(args.from || '', args.to || '', PULSECHAIN_OMNIBRIDGE_ADDRESS)}`,
    )
  } else {
    console.log(
      `  SKIP  token tx backup HEX — ${hexLogs.length} transfers, none to/from mediator in window`,
    )
  }

  const mintEvent = parseAbiItem(
    'event Mint(address indexed sender, uint amount0, uint amount1)',
  )
  const pair = POOL_PRESETS[0]!
  const mints = await logsInChunks(
    'Mint',
    (from, to) =>
      client.getLogs({
        address: pair.address,
        event: mintEvent,
        fromBlock: from,
        toBlock: to,
      }),
    tip,
    800n,
    200n,
  )
  if (mints.length) {
    const args = mints[0]!.args as { amount0?: bigint; amount1?: bigint }
    const sized = quotePairLeg(pair, args.amount0 ?? 0n, args.amount1 ?? 0n)
    const human = Number(formatUnits(sized.amountWei, pair.decimals))
    if (sized.amountWei > 0n && Number.isFinite(human)) {
      pass(
        'LP Mint sizes in quote',
        `${pair.label} n=${mints.length} · ${human.toFixed(1)} ${sized.quoteSymbol}`,
      )
    } else fail('LP Mint sizes in quote', 'zero quote amount')
  } else {
    console.log(`  SKIP  LP Mint — none on ${pair.label} in lookback`)
  }

  const fired: PaymentEvent[] = []
  const errors: string[] = []
  const watcher = new PaymentWatcher({
    chain: pulsechain,
    receiveAddress: ZERO,
    rpcUrls: RPCS,
    nativeSymbol: 'PLS',
    minAmount: 0,
    pollMs: 4_000,
    poolWatch: true,
    pools: [],
    bridges: [bridge],
    chainLogs: [],
    confirmations: 2,
    maxPoolEventsPerTick: 8,
    onPayment: (p) => fired.push(p),
    onStatus: () => {},
    onError: (e) => errors.push(e),
  })

  try {
    await watcher.start()
    if (watcher.isWatching) pass('watcher start (no wallet, no toys, bridge only)')
    else fail('watcher start (no wallet, no toys, bridge only)', 'not watching')
  } catch (err) {
    fail(
      'watcher start (no wallet, no toys, bridge only)',
      err instanceof Error ? err.message : String(err),
    )
  }

  await new Promise((r) => setTimeout(r, 9_000))
  watcher.stop()
  if (!watcher.isWatching) pass('watcher stop')
  else fail('watcher stop')

  if (errors.length) {
    fail('watcher errors', errors.slice(0, 2).join(' · '))
  } else {
    pass('watcher errors', 'none')
  }
  pass(
    'live poll (forward-only, may be quiet)',
    `events=${fired.length}${
      fired[0]
        ? ` · ${fired[0].eventKind} ${fired[0].amount} ${fired[0].symbol}`
        : ''
    }`,
  )

  if (failed) {
    console.error(`\n${failed} check(s) failed`)
    process.exit(1)
  }
  console.log('\nBridge watch smoke passed (no toys required).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
