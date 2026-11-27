/**
 * Sample recent UniV2/PulseX Swap logs and suggest buzz triggers
 * from high buy / sell quote sizes.
 */
import {
  createPublicClient,
  fallback,
  formatUnits,
  http,
  parseAbiItem,
  type Address,
  type Chain,
  type PublicClient,
  type Transport,
} from 'viem'
import {
  createPoolBuzzRule,
  decodeSwapData,
  quoteAmount,
  type PoolBuzzRule,
  type WatchedPool,
} from './pools'

const swapEvent = parseAbiItem(
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
)

export type SampledPoolSwap = {
  amount: number
  side: 'buy' | 'sell' | 'swap' | 'unknown'
  symbol: string
  blockNumber: bigint
}

export type PoolTriggerSuggestion = {
  summary: string
  scanMinAmount: number
  overlayMinAmount: number | null
  /** When true, apply with pool.side = all so buy+sell rules can fire. */
  preferPoolSideAll: boolean
  rules: PoolBuzzRule[]
  samples: {
    buys: number
    sells: number
    other: number
    blocks: number
  }
}

function buildTransport(urls: string[]): Transport {
  const list = urls.map((u) => u.trim()).filter(Boolean)
  if (!list.length) return http(undefined, { timeout: 20_000, retryCount: 2 })
  if (list.length === 1) {
    return http(list[0], { timeout: 20_000, retryCount: 2 })
  }
  return fallback(
    list.map((u) => http(u, { timeout: 18_000, retryCount: 1 })),
    { rank: false },
  )
}

export function createPoolSampleClient(opts: {
  chain: Chain
  rpcUrls?: string[]
}): PublicClient {
  let urls = (opts.rpcUrls || []).map((u) => u.trim()).filter(Boolean)
  if (!urls.length) urls = [...(opts.chain.rpcUrls.default.http || [])]
  return createPublicClient({
    chain: opts.chain,
    transport: buildTransport(urls),
  })
}

async function hydratePairTokens(
  client: PublicClient,
  pool: WatchedPool,
): Promise<WatchedPool> {
  const pairAbi = [
    {
      name: 'token0',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'address' }],
    },
    {
      name: 'token1',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'address' }],
    },
  ] as const
  const erc20DecimalsAbi = [
    {
      name: 'decimals',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint8' }],
    },
  ] as const

  const needTokens = !(pool.token0 && pool.token1)
  const [token0, token1] = needTokens
    ? await Promise.all([
        pool.token0
          ? Promise.resolve(pool.token0)
          : client.readContract({
              address: pool.address,
              abi: pairAbi,
              functionName: 'token0',
            }),
        pool.token1
          ? Promise.resolve(pool.token1)
          : client.readContract({
              address: pool.address,
              abi: pairAbi,
              functionName: 'token1',
            }),
      ])
    : [pool.token0!, pool.token1!]

  let decimals = pool.decimals
  try {
    const raw = await client.readContract({
      address: pool.quoteToken,
      abi: erc20DecimalsAbi,
      functionName: 'decimals',
    })
    const n = Number(raw)
    if (Number.isFinite(n) && n >= 0 && n <= 36) decimals = Math.round(n)
  } catch {
    /* keep stored decimals */
  }

  return {
    ...pool,
    token0: token0 as Address,
    token1: token1 as Address,
    decimals,
  }
}

function percentile(sortedAsc: number[], p: number): number {
  if (!sortedAsc.length) return 0
  if (sortedAsc.length === 1) return sortedAsc[0]!
  const rank = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1),
  )
  return sortedAsc[rank]!
}

/** Round thresholds to readable quote sizes. */
export function niceQuoteAmount(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0
  if (n < 10) return Math.max(1, Math.round(n))
  if (n < 100) return Math.round(n / 5) * 5
  if (n < 1000) return Math.round(n / 10) * 10
  if (n < 10_000) return Math.round(n / 50) * 50
  if (n < 100_000) return Math.round(n / 500) * 500
  if (n < 1_000_000) return Math.round(n / 1000) * 1000
  return Math.round(n / 5000) * 5000
}

/** Fetch one block range; on RPC failure, bisect until ≤25 blocks. */
async function getSwapLogsRange(
  client: PublicClient,
  address: Address,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<{
  logs: {
    args?: {
      amount0In?: bigint
      amount1In?: bigint
      amount0Out?: bigint
      amount1Out?: bigint
    }
    data?: `0x${string}` | string
    blockNumber?: bigint | null
  }[]
  warnings: string[]
  hardFails: number
}> {
  const warnings: string[] = []
  let hardFails = 0
  const logs: {
    args?: {
      amount0In?: bigint
      amount1In?: bigint
      amount0Out?: bigint
      amount1Out?: bigint
    }
    data?: `0x${string}` | string
    blockNumber?: bigint | null
  }[] = []
  const stack: [bigint, bigint][] = [[fromBlock, toBlock]]

  while (stack.length) {
    const [from, to] = stack.pop()!
    if (to < from) continue
    try {
      const part = await client.getLogs({
        address,
        event: swapEvent,
        fromBlock: from,
        toBlock: to,
      })
      logs.push(...part)
    } catch {
      if (to - from + 1n <= 25n) {
        hardFails += 1
        warnings.push(`RPC getLogs failed for blocks ${from}–${to}`)
        continue
      }
      const mid = from + (to - from) / 2n
      stack.push([mid + 1n, to], [from, mid])
    }
  }

  return { logs, warnings, hardFails }
}

/**
 * Pull recent Swap logs for a pair (chunked) and size them in quote units.
 */
export async function sampleRecentPoolSwaps(
  client: PublicClient,
  pool: WatchedPool,
  opts?: { lookbackBlocks?: number; maxSwaps?: number },
): Promise<{
  swaps: SampledPoolSwap[]
  blocks: number
  pool: WatchedPool
  warnings: string[]
}> {
  const lookback = Math.min(4_000, Math.max(80, opts?.lookbackBlocks ?? 900))
  const maxSwaps = Math.min(400, Math.max(20, opts?.maxSwaps ?? 120))
  const hydrated = await hydratePairTokens(client, pool)
  const tip = await client.getBlockNumber()
  const oldest = tip > BigInt(lookback) ? tip - BigInt(lookback) : 0n
  const swaps: SampledPoolSwap[] = []
  const warnings: string[] = []
  let hardFails = 0
  const chunk = 200n

  for (
    let to = tip;
    to >= oldest && swaps.length < maxSwaps;
    to = to > chunk ? to - chunk : 0n
  ) {
    const from = to >= chunk - 1n + oldest ? to - (chunk - 1n) : oldest
    const fetched = await getSwapLogsRange(client, hydrated.address, from, to)
    hardFails += fetched.hardFails
    for (const w of fetched.warnings) {
      if (warnings.length < 4) warnings.push(w)
    }
    for (const log of fetched.logs) {
      const args = log.args as {
        amount0In?: bigint
        amount1In?: bigint
        amount0Out?: bigint
        amount1Out?: bigint
      }
      const amts =
        args.amount0In != null &&
        args.amount1In != null &&
        args.amount0Out != null &&
        args.amount1Out != null
          ? {
              amount0In: args.amount0In,
              amount1In: args.amount1In,
              amount0Out: args.amount0Out,
              amount1Out: args.amount1Out,
            }
          : decodeSwapData((log.data || '0x') as `0x${string}`)
      const sized = quoteAmount(hydrated, amts)
      if (sized.amountWei <= 0n) continue
      const amount = Number(formatUnits(sized.amountWei, hydrated.decimals))
      if (!Number.isFinite(amount) || amount <= 0) continue
      swaps.push({
        amount,
        side: sized.side,
        symbol: sized.quoteSymbol || hydrated.quoteSymbol,
        blockNumber: log.blockNumber ?? to,
      })
    }
    if (from === 0n || from === oldest) break
  }

  if (hardFails > 0 && !swaps.length) {
    throw new Error(
      `Could not read recent swaps (${hardFails} RPC range failure${hardFails === 1 ? '' : 's'}). Check RPC and try again.`,
    )
  }

  swaps.sort((a, b) => Number(b.blockNumber - a.blockNumber))
  return {
    swaps: swaps.slice(0, maxSwaps),
    blocks: Number(tip - oldest),
    pool: hydrated,
    warnings,
  }
}

function sideAmounts(swaps: SampledPoolSwap[], side: 'buy' | 'sell'): number[] {
  return swaps
    .filter((s) => s.side === side)
    .map((s) => s.amount)
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b)
}

/**
 * Build buy/sell buzz-rule suggestions from sampled high swaps.
 */
export function suggestPoolTriggersFromSwaps(
  swaps: SampledPoolSwap[],
  opts?: { blocks?: number; symbol?: string; warnings?: string[] },
): PoolTriggerSuggestion {
  const buys = sideAmounts(swaps, 'buy')
  const sells = sideAmounts(swaps, 'sell')
  const other = swaps.filter((s) => s.side !== 'buy' && s.side !== 'sell').length
  const symbol = opts?.symbol || swaps[0]?.symbol || 'WPLS'
  const rules: PoolBuzzRule[] = []
  const bits: string[] = []

  function pushSide(side: 'buy' | 'sell', amounts: number[]) {
    if (amounts.length < 4) {
      bits.push(
        `${side}: only ${amounts.length} sample${amounts.length === 1 ? '' : 's'}`,
      )
      return
    }
    const mid = niceQuoteAmount(percentile(amounts, 70))
    const high = niceQuoteAmount(percentile(amounts, 90))
    const huge = niceQuoteAmount(percentile(amounts, 97))
    if (mid > 0) {
      rules.push(
        createPoolBuzzRule({
          minAmount: mid,
          side,
          multiples: 1,
          patternId: '',
        }),
      )
    }
    if (high > mid) {
      rules.push(
        createPoolBuzzRule({
          minAmount: high,
          side,
          multiples: 2,
          patternId: '',
        }),
      )
    }
    if (huge > high) {
      rules.push(
        createPoolBuzzRule({
          minAmount: huge,
          side,
          multiples: 3,
          patternId: '',
        }),
      )
    }
    bits.push(
      `${side} n=${amounts.length} · ≥${mid} / ≥${high}${huge > high ? ` / ≥${huge}` : ''} ${symbol}`,
    )
  }

  pushSide('buy', buys)
  pushSide('sell', sells)

  const all = [...buys, ...sells].sort((a, b) => a - b)

  // Prefer fewer, clearer rules (max 6).
  rules.sort(
    (a, b) => a.side.localeCompare(b.side) || b.minAmount - a.minAmount,
  )
  const trimmed = rules.slice(0, 6)

  // Scan min must stay ≤ the mildest rule or those swaps never reach tipPipeline.
  const lowestRuleMin = trimmed.reduce(
    (min, rule) => Math.min(min, rule.minAmount),
    Number.POSITIVE_INFINITY,
  )
  let scanMinAmount = niceQuoteAmount(all.length ? percentile(all, 55) : 0)
  if (Number.isFinite(lowestRuleMin) && lowestRuleMin > 0) {
    scanMinAmount =
      scanMinAmount > 0
        ? Math.min(scanMinAmount, lowestRuleMin)
        : lowestRuleMin
  }

  let overlayMinAmount = niceQuoteAmount(all.length ? percentile(all, 85) : 0)
  if (overlayMinAmount > 0 && scanMinAmount > 0) {
    overlayMinAmount = Math.max(overlayMinAmount, scanMinAmount)
  }

  const hasBuy = trimmed.some((r) => r.side === 'buy')
  const hasSell = trimmed.some((r) => r.side === 'sell')
  const preferPoolSideAll = hasBuy && hasSell

  let summary = trimmed.length
    ? `Suggested ${trimmed.length} trigger${trimmed.length === 1 ? '' : 's'} from ${swaps.length} swaps` +
      (opts?.blocks ? ` (~${opts.blocks} blocks)` : '') +
      `: ${bits.join(' · ')}`
    : `Not enough sized buy/sell swaps yet (${swaps.length} total). Try again when the pair is more active.`

  if (opts?.warnings?.length) {
    summary += ` · Note: ${opts.warnings[0]}`
  }

  return {
    summary,
    scanMinAmount,
    overlayMinAmount: overlayMinAmount > 0 ? overlayMinAmount : null,
    preferPoolSideAll,
    rules: trimmed,
    samples: {
      buys: buys.length,
      sells: sells.length,
      other,
      blocks: opts?.blocks || 0,
    },
  }
}

export async function suggestPoolTriggers(
  client: PublicClient,
  pool: WatchedPool,
  opts?: { lookbackBlocks?: number; maxSwaps?: number },
): Promise<PoolTriggerSuggestion & { pool: WatchedPool }> {
  const sampled = await sampleRecentPoolSwaps(client, pool, opts)
  const suggestion = suggestPoolTriggersFromSwaps(sampled.swaps, {
    blocks: sampled.blocks,
    symbol: sampled.pool.quoteSymbol,
    warnings: sampled.warnings,
  })
  return { ...suggestion, pool: sampled.pool }
}
