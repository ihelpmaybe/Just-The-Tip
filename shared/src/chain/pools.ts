/**
 * PulseX / Uniswap V2 pair watches (ported from chain-haptic pool feature).
 * Swap / LP size is priced in quote token units (usually WPLS) for the tip ladder.
 */

import { isAddress, type Address } from 'viem'

/** Wrapped PLS on PulseChain */
export const WPLS_ADDRESS =
  '0xA1077a294dDE1B09bB078844df40758a5D0f9a27' as Address

/** Official PulseX V1 and V2 Uniswap V2-style factories on PulseChain. */
export const PULSEX_FACTORY_ADDRESSES = [
  '0x1715a3E4A142d8b698131108995174F37aEBA10D',
  '0x29eA7545DEf87022BAdc76323F373EA1e707C523',
] as const satisfies readonly Address[]

/** Swap buy/sell, LP add/remove, or OmniBridge in/out. `all` matches any. */
export type PoolSide =
  | 'all'
  | 'buy'
  | 'sell'
  | 'add'
  | 'remove'
  | 'in'
  | 'out'

export type PoolListenKind = 'swap' | 'mint' | 'burn'

/** Extra chain-event kinds that share the pool overlay / feed path. */
export type ChainEventKind =
  | 'swap'
  | 'mint'
  | 'burn'
  | 'bridge-in'
  | 'bridge-out'
  | 'custom'

export const POOL_LISTEN_KINDS: readonly PoolListenKind[] = [
  'swap',
  'mint',
  'burn',
]

export const POOL_SIDES: readonly PoolSide[] = [
  'all',
  'buy',
  'sell',
  'add',
  'remove',
  'in',
  'out',
]

/** Per-pool buzz targeting: amount gate → toy(s) + pattern + repeats. */
export type PoolBuzzRule = {
  id: string
  /** Min quote amount (human units). Highest matching rule wins. */
  minAmount: number
  /**
   * Tip-menu pattern id. Empty = use the normal tip ladder for this amount.
   */
  patternId: string
  /** Linked toy ids. Empty = any tip-ready toy. */
  toyIds: string[]
  /** How many times to play (1–8). Applied per selected toy. */
  multiples: number
  /** Optional side filter. Default all. */
  side: PoolSide
}

export type WatchedPool = {
  address: Address
  label: string
  token0?: Address
  token1?: Address
  quoteToken: Address
  quoteSymbol: string
  decimals: number
  side: PoolSide
  /** Min quote amount (human units) for buzz / tip ladder */
  minAmount: number
  /**
   * When false, pool stays listed but is not scanned.
   * Default true for existing saves; new presets load Off.
   */
  enabled: boolean
  /**
   * Show this pool’s swaps on the stream tip overlay.
   * Default true (missing field → On).
   */
  overlayAlert: boolean
  /**
   * Overlay-only minimum (human quote units).
   * null/undefined → use Stream tip alert “Pool / chain event alert minimum”.
   */
  overlayMinAmount: number | null
  /** Optional targeted buzz rules (amount → toy / pattern / multiples). */
  buzzRules: PoolBuzzRule[]
  /**
   * Which pair logs to scan. Missing → `['swap']` (legacy).
   * Empty array = listed but no logs from this pair.
   */
  listen: PoolListenKind[]
}

export type PoolSwapDecoded = {
  amount0In: bigint
  amount1In: bigint
  amount0Out: bigint
  amount1Out: bigint
}

const ZERO = '0x0000000000000000000000000000000000000000'

export function isPoolSide(v: unknown): v is PoolSide {
  return (
    v === 'all' ||
    v === 'buy' ||
    v === 'sell' ||
    v === 'add' ||
    v === 'remove' ||
    v === 'in' ||
    v === 'out'
  )
}

export function isPoolListenKind(v: unknown): v is PoolListenKind {
  return v === 'swap' || v === 'mint' || v === 'burn'
}

export function isChainEventKind(v: unknown): v is ChainEventKind {
  return (
    v === 'swap' ||
    v === 'mint' ||
    v === 'burn' ||
    v === 'bridge-in' ||
    v === 'bridge-out' ||
    v === 'custom'
  )
}

/** Overlay / feed eyebrow for extra chain events (source stays `pool`). */
export function chainEventEyebrow(kind?: string | null): string {
  switch (kind) {
    case 'mint':
      return 'LP add'
    case 'burn':
      return 'LP remove'
    case 'bridge-in':
      return 'Bridge in'
    case 'bridge-out':
      return 'Bridge out'
    case 'custom':
      return 'Chain event'
    default:
      return 'Pool swap'
  }
}

export function chainEventFeedKind(kind?: string | null): string {
  switch (kind) {
    case 'mint':
      return 'LP ADD'
    case 'burn':
      return 'LP REMOVE'
    case 'bridge-in':
      return 'BRIDGE IN'
    case 'bridge-out':
      return 'BRIDGE OUT'
    case 'custom':
      return 'EVENT'
    default:
      return 'SWAP'
  }
}

export function normalizePoolListen(raw: unknown): PoolListenKind[] {
  if (raw === undefined || raw === null) return ['swap']
  if (!Array.isArray(raw)) return ['swap']
  const out: PoolListenKind[] = []
  const seen = new Set<string>()
  for (const row of raw.slice(0, 8)) {
    if (!isPoolListenKind(row) || seen.has(row)) continue
    seen.add(row)
    out.push(row)
  }
  return out
}

export function poolListensFor(
  pool: Pick<WatchedPool, 'listen'> | null | undefined,
  kind: PoolListenKind,
): boolean {
  const listen = pool?.listen
  if (!listen) return kind === 'swap'
  return listen.includes(kind)
}

function asAddress(v: unknown): Address | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!isAddress(t) || t.toLowerCase() === ZERO) return null
  return t as Address
}

function newRuleId(): string {
  return `pbr-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

export function newTriggerId(prefix: string): string {
  const p = String(prefix || 'trg')
    .trim()
    .replace(/[^a-z0-9-]/gi, '')
    .slice(0, 8) || 'trg'
  return `${p}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

export function normalizePoolBuzzRule(raw: unknown): PoolBuzzRule | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const minN = Number(o.minAmount)
  const multN = Math.round(Number(o.multiples))
  const toyIds = Array.isArray(o.toyIds)
    ? [
        ...new Set(
          o.toyIds
            .map((id) => String(id || '').trim())
            .filter(Boolean)
            .slice(0, 24),
        ),
      ]
    : []
  return {
    id: String(o.id || '').trim().slice(0, 48) || newRuleId(),
    minAmount: Number.isFinite(minN) && minN >= 0 ? minN : 0,
    patternId: String(o.patternId || '').trim().slice(0, 64),
    toyIds,
    multiples: Number.isFinite(multN) ? Math.min(8, Math.max(1, multN)) : 1,
    side: isPoolSide(o.side) ? o.side : 'all',
  }
}

export function normalizePoolBuzzRules(raw: unknown): PoolBuzzRule[] {
  if (!Array.isArray(raw)) return []
  const out: PoolBuzzRule[] = []
  const seen = new Set<string>()
  for (const row of raw.slice(0, 24)) {
    const rule = normalizePoolBuzzRule(row)
    if (!rule) continue
    if (seen.has(rule.id)) {
      rule.id = newRuleId()
    }
    seen.add(rule.id)
    out.push(rule)
  }
  return out
}

/** Highest minAmount rule that the swap amount (+ optional side) satisfies. */
export function matchPoolBuzzRule(
  pool: Pick<WatchedPool, 'buzzRules'> | null | undefined,
  amount: number,
  side?: string | null,
): PoolBuzzRule | null {
  const tip = Number(amount)
  if (!Number.isFinite(tip) || tip < 0) return null
  const swapSide = String(side || '').toLowerCase()
  const rules = [...(pool?.buzzRules || [])].sort(
    (a, b) =>
      b.minAmount - a.minAmount ||
      a.side.localeCompare(b.side) ||
      a.id.localeCompare(b.id),
  )
  for (const rule of rules) {
    if (tip < rule.minAmount) continue
    const want = rule.side || 'all'
    if (want !== 'all') {
      if (!isPoolSide(swapSide) || swapSide === 'all') continue
      if (want !== swapSide) continue
    }
    return rule
  }
  return null
}

export function createPoolBuzzRule(
  partial?: Partial<PoolBuzzRule>,
): PoolBuzzRule {
  return (
    normalizePoolBuzzRule({
      id: newRuleId(),
      minAmount: 0,
      patternId: '',
      toyIds: [],
      multiples: 1,
      side: 'all',
      ...partial,
    }) || {
      id: newRuleId(),
      minAmount: 0,
      patternId: '',
      toyIds: [],
      multiples: 1,
      side: 'all',
    }
  )
}

export function decodeSwapData(data: `0x${string}` | string): PoolSwapDecoded {
  const h = String(data || '0x')
    .replace(/^0x/i, '')
    .padStart(256, '0')
  return {
    amount0In: BigInt('0x' + h.slice(0, 64)),
    amount1In: BigInt('0x' + h.slice(64, 128)),
    amount0Out: BigInt('0x' + h.slice(128, 192)),
    amount1Out: BigInt('0x' + h.slice(192, 256)),
  }
}

/**
 * Size swap in quote atomic units + side (buy = spent quote, sell = received quote).
 */
export function quoteAmount(
  pool: Pick<
    WatchedPool,
    'quoteToken' | 'token0' | 'token1' | 'quoteSymbol'
  >,
  amts: PoolSwapDecoded,
): { amountWei: bigint; side: 'buy' | 'sell' | 'swap' | 'unknown'; quoteSymbol: string } {
  const q = pool.quoteToken.toLowerCase()
  const t0 = (pool.token0 || '').toLowerCase()
  const t1 = (pool.token1 || '').toLowerCase()
  let qIn = 0n
  let qOut = 0n
  if (t0 && t0 === q) {
    qIn = amts.amount0In
    qOut = amts.amount0Out
  } else if (t1 && t1 === q) {
    qIn = amts.amount1In
    qOut = amts.amount1Out
  } else {
    // A quote token outside the pair means we cannot safely size this event.
    // Never substitute an arbitrary event leg: that lets a misconfigured or
    // malicious pair turn an unrelated token amount into a pool trigger.
    return {
      amountWei: 0n,
      side: 'unknown',
      quoteSymbol: pool.quoteSymbol || 'TOK',
    }
  }
  let side: 'buy' | 'sell' | 'swap' = 'swap'
  let amountWei = 0n
  if (qIn > 0n && qOut === 0n) {
    side = 'buy'
    amountWei = qIn
  } else if (qOut > 0n && qIn === 0n) {
    side = 'sell'
    amountWei = qOut
  } else {
    amountWei = qIn > qOut ? qIn : qOut
    side = qIn >= qOut ? 'buy' : 'sell'
  }
  return {
    amountWei,
    side,
    quoteSymbol: pool.quoteSymbol || 'WPLS',
  }
}

/**
 * Size Mint/Burn in quote atomic units (the quote token's leg only).
 */
export function quotePairLeg(
  pool: Pick<WatchedPool, 'quoteToken' | 'token0' | 'token1' | 'quoteSymbol'>,
  amount0: bigint,
  amount1: bigint,
): { amountWei: bigint; quoteSymbol: string } {
  const q = pool.quoteToken.toLowerCase()
  const t0 = (pool.token0 || '').toLowerCase()
  const t1 = (pool.token1 || '').toLowerCase()
  if (t0 && t0 === q) {
    return {
      amountWei: amount0 > 0n ? amount0 : 0n,
      quoteSymbol: pool.quoteSymbol || 'WPLS',
    }
  }
  if (t1 && t1 === q) {
    return {
      amountWei: amount1 > 0n ? amount1 : 0n,
      quoteSymbol: pool.quoteSymbol || 'WPLS',
    }
  }
  return { amountWei: 0n, quoteSymbol: pool.quoteSymbol || 'TOK' }
}

export function normalizeWatchedPool(raw: unknown): WatchedPool | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const address = asAddress(o.address)
  if (!address) return null
  const quoteToken = asAddress(o.quoteToken) || WPLS_ADDRESS
  const decimals = Math.min(
    36,
    Math.max(0, Math.round(Number(o.decimals) || 18)),
  )
  const minN = Number(o.minAmount)
  const overlayMinN = Number(o.overlayMinAmount)
  return {
    address,
    label: String(o.label || 'pool').trim().slice(0, 48) || 'pool',
    token0: asAddress(o.token0) || undefined,
    token1: asAddress(o.token1) || undefined,
    quoteToken,
    quoteSymbol: String(o.quoteSymbol || 'WPLS')
      .trim()
      .slice(0, 16) || 'WPLS',
    decimals,
    side: isPoolSide(o.side) ? o.side : 'all',
    minAmount: Number.isFinite(minN) && minN >= 0 ? minN : 0,
    // Missing field → On (legacy). Explicit false keeps Off.
    enabled: o.enabled !== false,
    overlayAlert: o.overlayAlert === undefined ? true : Boolean(o.overlayAlert),
    overlayMinAmount:
      o.overlayMinAmount === null ||
      o.overlayMinAmount === undefined ||
      o.overlayMinAmount === ''
        ? null
        : Number.isFinite(overlayMinN) && overlayMinN >= 0
          ? overlayMinN
          : null,
    buzzRules: normalizePoolBuzzRules(o.buzzRules),
    listen: normalizePoolListen(
      o.listen !== undefined ? o.listen : o.events,
    ),
  }
}

/** Pools that are scanned when poolWatch is on. */
export function activePools(pools: WatchedPool[] | undefined): WatchedPool[] {
  return (pools || []).filter((p) => p.enabled !== false && isAddress(p.address))
}

export function normalizeWatchedPools(raw: unknown): WatchedPool[] {
  if (!Array.isArray(raw)) return []
  const out: WatchedPool[] = []
  const seen = new Set<string>()
  for (const row of raw) {
    const p = normalizeWatchedPool(row)
    if (!p) continue
    const key = p.address.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}

/** Popular PulseX pairs (same set as chain-haptic pools.presets.json). */
export const POOL_PRESETS: WatchedPool[] = normalizeWatchedPools([
  {
    address: '0xE56043671df55dE5CDf8459710433C10324DE0aE',
    label: 'WPLS/DAI (liquid)',
    token0: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    token1: '0xefd766ccb38eaf1dfd701853bfce31359239f305',
    quoteToken: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    quoteSymbol: 'WPLS',
    decimals: 18,
    side: 'all',
    minAmount: '50000',
  },
  {
    address: '0x6753560538ECa67617A9Ce605178F788bE7E524E',
    label: 'WPLS/USDC',
    token0: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    token1: '0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07',
    quoteToken: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    quoteSymbol: 'WPLS',
    decimals: 18,
    side: 'all',
    minAmount: '50000',
  },
  {
    address: '0x322Df7921F28F1146Cdf62aFdaC0D6bC0Ab80711',
    label: 'WPLS/USDT',
    token0: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    token1: '0x0cb6f5a34ad42ec934882a05265a7d5f59b51a2f',
    quoteToken: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    quoteSymbol: 'WPLS',
    decimals: 18,
    side: 'all',
    minAmount: '50000',
  },
  {
    address: '0x1b45b9148791d3a104184Cd5DFE5CE57193a3ee9',
    label: 'PLSX/WPLS (deep)',
    token0: '0x95b303987a60c71504d99aa1b13b4da07b0790ab',
    token1: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    quoteToken: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    quoteSymbol: 'WPLS',
    decimals: 18,
    side: 'all',
    minAmount: '100000',
  },
  {
    address: '0x149B2C629e652f2E89E11cd57e5d4D77ee166f9F',
    label: 'PLSX/WPLS',
    token0: '0x95b303987a60c71504d99aa1b13b4da07b0790ab',
    token1: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    quoteToken: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    quoteSymbol: 'WPLS',
    decimals: 18,
    side: 'all',
    minAmount: '50000',
  },
  {
    address: '0x19BB45a7270177e303DEe6eAA6F5Ad700812bA98',
    label: 'HEX/WPLS',
    token0: '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39',
    token1: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    quoteToken: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    quoteSymbol: 'WPLS',
    decimals: 18,
    side: 'all',
    minAmount: '50000',
  },
  {
    address: '0xf1F4ee610b2bAbB05C635F726eF8B0C568c8dc65',
    label: 'HEX/WPLS (alt)',
    token0: '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39',
    token1: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    quoteToken: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    quoteSymbol: 'WPLS',
    decimals: 18,
    side: 'all',
    minAmount: '50000',
  },
  {
    address: '0xC475332e92561CD58f278E4e2eD76c17D5b50f05',
    label: 'HEX/USDC',
    token0: '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39',
    token1: '0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07',
    quoteToken: '0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07',
    quoteSymbol: 'USDC',
    decimals: 6,
    side: 'all',
    minAmount: '50',
  },
  {
    address: '0x8268De0B539d1C03Fa693CA7EE47EAF70c8CD57D',
    label: 'HEX/PLSX',
    token0: '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39',
    token1: '0x95b303987a60c71504d99aa1b13b4da07b0790ab',
    quoteToken: '0x95b303987a60c71504d99aa1b13b4da07b0790ab',
    quoteSymbol: 'PLSX',
    decimals: 18,
    side: 'all',
    minAmount: '100000',
  },
  {
    address: '0xf808Bb6265e9Ca27002c0A04562Bf50d4FE37EAA',
    label: 'INC/WPLS',
    token0: '0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d',
    token1: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    quoteToken: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    quoteSymbol: 'WPLS',
    decimals: 18,
    side: 'all',
    minAmount: '30000',
  },
  {
    address: '0x7Dbeca4c74d01cd8782D4EF5C05C0769723fb0ea',
    label: 'INC/PLSX',
    token0: '0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d',
    token1: '0x95b303987a60c71504d99aa1b13b4da07b0790ab',
    quoteToken: '0x95b303987a60c71504d99aa1b13b4da07b0790ab',
    quoteSymbol: 'PLSX',
    decimals: 18,
    side: 'all',
    minAmount: '50000',
  },
  {
    address: '0xB2893ceA8080bF43b7b60B589EDaAb5211D98F23',
    label: 'PLSX/DAI',
    token0: '0x95b303987a60c71504d99aa1b13b4da07b0790ab',
    token1: '0xefd766ccb38eaf1dfd701853bfce31359239f305',
    quoteToken: '0xefd766ccb38eaf1dfd701853bfce31359239f305',
    quoteSymbol: 'DAI',
    decimals: 18,
    side: 'all',
    minAmount: '100',
  },
  {
    address: '0x146e1f1e060e5b5016db0d118d2c5a11a240ae32',
    label: 'WPLS/eDAI',
    token0: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    token1: '0xefd766ccb38eaf1dfd701853bfce31359239f305',
    quoteToken: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    quoteSymbol: 'WPLS',
    decimals: 18,
    side: 'all',
    minAmount: '20000',
  },
])

/** Merge presets that aren’t already in the list. New presets default Off. */
export function mergePoolPresets(current: WatchedPool[]): {
  pools: WatchedPool[]
  added: number
} {
  const have = new Set(current.map((p) => p.address.toLowerCase()))
  const next = [...current]
  let added = 0
  for (const p of POOL_PRESETS) {
    const key = p.address.toLowerCase()
    if (have.has(key)) continue
    have.add(key)
    // Don't flood: tick the ones you want after load
    next.push({ ...p, enabled: false })
    added++
  }
  return { pools: next, added }
}
