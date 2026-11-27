/**
 * Approx USD for tip amounts (hover titles) and coin-reward matching.
 *
 * PulseChain-only pricing. Address identity matters more than symbol: state-fork
 * tokens (pDAI, pHEX) reuse Ethereum addresses, so any price lookup that is not
 * chain-scoped reports the Ethereum asset instead (pDAI would read as $1).
 */

import { isStableTipPreset } from '@pulsefans/domain/state/tokens'

const WPLS = '0xa1077a294dde1b09bb078844df40758a5d0f9a27'

const PULSEX_SUBGRAPH =
  'https://graph.pulsechain.com/subgraphs/name/pulsechain/pulsexv2'

const CACHE_MS = 5 * 60 * 1000

export type TipUsdQuote = {
  usdPerUnit: number | null
  at: number
  source: 'subgraph' | 'dexscreener' | 'stable-fallback' | 'cache' | 'none'
}

type RateCache = TipUsdQuote & { inflight?: Promise<TipUsdQuote> }

const cache = new Map<string, RateCache>()

export type TipCoinForUsd = {
  /** Display / ladder unit (PLS, HEX, USDT, …) */
  symbol: string
  /** ERC-20 tip token, or empty for native PLS */
  tokenAddress?: string | null
}

function normAddr(a: string | null | undefined): string {
  return String(a || '')
    .trim()
    .toLowerCase()
}

/** True only for bridged stables that really track ~$1 on PulseChain. */
export function isApproxUsdStable(tokenAddress?: string | null): boolean {
  return isStableTipPreset(tokenAddress)
}

export function formatUsdApprox(usd: number): string {
  if (!Number.isFinite(usd)) return '—'
  const abs = Math.abs(usd)
  if (abs === 0) return '0'
  if (abs >= 1000) return usd.toLocaleString(undefined, { maximumFractionDigits: 0 })
  if (abs >= 1) return usd.toLocaleString(undefined, { maximumFractionDigits: 2 })
  if (abs >= 0.01) return usd.toLocaleString(undefined, { maximumFractionDigits: 4 })
  if (abs >= 1e-8) return usd.toLocaleString(undefined, { maximumFractionDigits: 8 })
  // Microcaps: 8 dp rounds to "0" — keep a readable magnitude.
  return usd.toExponential(2)
}

export function tipAmountUsdTitle(
  amount: number,
  symbol: string,
  usdPerUnit: number | null | undefined,
): string {
  const unit = (symbol || 'TOKEN').trim() || 'TOKEN'
  const n = Number(amount)
  const amountBit = Number.isFinite(n)
    ? `${n.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${unit}`
    : unit
  if (usdPerUnit == null || !Number.isFinite(n) || !Number.isFinite(usdPerUnit)) {
    return amountBit
  }
  return `${amountBit} ≈ $${formatUsdApprox(n * usdPerUnit)} USD`
}

/** Hover title listing every painted coin’s tip amount (and shared USD). */
export function multiCoinTipTitle(
  rows: Array<{
    label: string
    amount: number | null | undefined
    usdTarget?: number | null
  }>,
  opts?: { toyNote?: string },
): string {
  if (!rows.length) return ''
  const lines: string[] = []
  const usd = rows.find((r) => r.usdTarget != null && Number.isFinite(r.usdTarget))
    ?.usdTarget
  if (usd != null) lines.push(`≈ $${formatUsdApprox(usd)} USD`)
  for (const r of rows) {
    const label = (r.label || 'TOKEN').trim() || 'TOKEN'
    const n = Number(r.amount)
    if (Number.isFinite(n) && n >= 0) {
      lines.push(
        `${n.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${label}`,
      )
    } else {
      lines.push(`${label} · waiting for quote`)
    }
  }
  if (opts?.toyNote) lines.push(opts.toyNote)
  return lines.join('\n')
}

/** Token whose PulseChain price represents 1 tip unit. */
function priceAddress(coin: TipCoinForUsd): string | null {
  const addr = normAddr(coin.tokenAddress)
  if (/^0x[a-f0-9]{40}$/.test(addr)) return addr
  const s = coin.symbol.trim().toUpperCase()
  if (!s || s === 'PLS' || s === 'WPLS') return WPLS
  return null
}

async function fetchSubgraphUsd(address: string): Promise<number | null> {
  try {
    const res = await fetch(PULSEX_SUBGRAPH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: `{ token(id: "${address}") { derivedUSD } }`,
      }),
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      data?: { token?: { derivedUSD?: string } | null }
    }
    const usd = Number(data.data?.token?.derivedUSD)
    return Number.isFinite(usd) && usd > 0 ? usd : null
  } catch {
    return null
  }
}

async function fetchDexscreenerUsd(address: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${address}`,
      { signal: AbortSignal.timeout(8_000) },
    )
    if (!res.ok) return null
    const data = (await res.json()) as {
      pairs?: Array<{ chainId?: string; priceUsd?: string }>
    }
    const pairs = (data.pairs || []).filter(
      (p) => String(p.chainId || '').toLowerCase() === 'pulsechain',
    )
    for (const p of pairs) {
      const usd = Number(p.priceUsd)
      if (Number.isFinite(usd) && usd > 0) return usd
    }
    return null
  } catch {
    return null
  }
}

async function resolveUsd(address: string): Promise<TipUsdQuote> {
  const key = normAddr(address)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS && hit.usdPerUnit != null) {
    return { usdPerUnit: hit.usdPerUnit, at: hit.at, source: 'cache' }
  }
  if (hit?.inflight) return hit.inflight

  const inflight = (async (): Promise<TipUsdQuote> => {
    let usd = await fetchSubgraphUsd(key)
    let source: TipUsdQuote['source'] = 'subgraph'
    if (usd == null) {
      usd = await fetchDexscreenerUsd(key)
      source = 'dexscreener'
    }
    if (usd == null && isApproxUsdStable(key)) {
      usd = 1
      source = 'stable-fallback'
    }
    const quote: TipUsdQuote = {
      usdPerUnit: usd,
      at: Date.now(),
      source: usd == null ? 'none' : source,
    }
    cache.set(key, quote)
    return quote
  })()

  cache.set(key, {
    usdPerUnit: hit?.usdPerUnit ?? null,
    at: hit?.at ?? 0,
    source: hit?.source ?? 'none',
    inflight,
  })
  try {
    return await inflight
  } finally {
    const cur = cache.get(key)
    if (cur) delete cur.inflight
  }
}

export function peekUsdPerTipUnit(coin: TipCoinForUsd): number | null {
  const addr = priceAddress(coin)
  if (!addr) return null
  if (isApproxUsdStable(addr)) {
    const cached = cache.get(addr)
    if (cached?.usdPerUnit != null) return cached.usdPerUnit
    return 1
  }
  const cached = cache.get(addr)
  return cached?.usdPerUnit ?? null
}

export function peekUsdQuoteMap(
  tokenAddresses: Array<string | null | undefined>,
): Record<string, number | null | undefined> {
  const out: Record<string, number | null | undefined> = {}
  for (const raw of tokenAddresses) {
    const key = normAddr(raw)
    if (key === '') {
      const w = cache.get(WPLS)
      out[''] = w?.usdPerUnit ?? null
      continue
    }
    if (isApproxUsdStable(key)) {
      out[key] = cache.get(key)?.usdPerUnit ?? 1
      continue
    }
    out[key] = cache.get(key)?.usdPerUnit ?? null
  }
  return out
}

export async function ensureUsdQuotesForTokens(
  tokenAddresses: Array<string | null | undefined>,
): Promise<Record<string, number | null | undefined>> {
  const addrs = [
    ...new Set(
      tokenAddresses.map((a) => normAddr(a)).filter((a) => a !== undefined),
    ),
  ]
  await Promise.all(
    addrs.map(async (key) => {
      if (!key) {
        await resolveUsd(WPLS)
        return
      }
      await resolveUsd(key)
    }),
  )
  return peekUsdQuoteMap(addrs)
}

export async function ensureUsdPerTipUnit(
  coin: TipCoinForUsd,
): Promise<number | null> {
  const addr = priceAddress(coin)
  if (!addr) return null
  const q = await resolveUsd(addr)
  return q.usdPerUnit
}

/** Alias used by tip menu hover refresh. */
export const resolveUsdPerTipUnit = ensureUsdPerTipUnit
