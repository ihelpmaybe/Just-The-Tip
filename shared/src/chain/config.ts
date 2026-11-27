import { defineChain, type Chain } from 'viem'

/** PulseChain mainnet — only supported chain */
export const pulsechain = defineChain({
  id: 369,
  name: 'PulseChain',
  nativeCurrency: {
    name: 'Pulse',
    symbol: 'PLS',
    /** 18 decimals — smallest unit is the beat (1 PLS = 10^18 beats). */
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        'https://rpc.pulsechain.com',
        'https://pulsechain-rpc.publicnode.com',
        'https://rpc-pulsechain.g4mm4.io',
      ],
    },
  },
  blockExplorers: {
    default: { name: 'PulseScan', url: 'https://scan.pulsechain.com' },
  },
})

export type ChainKey = 'pulsechain'

export type ChainMeta = {
  chain: Chain
  label: string
  symbol: string
  /** Public HTTP RPC list (order = failover priority) */
  rpcs: string[]
}

export const CHAINS: Record<ChainKey, ChainMeta> = {
  pulsechain: {
    chain: pulsechain,
    label: 'PulseChain',
    symbol: 'PLS',
    rpcs: [
      'https://rpc.pulsechain.com',
      'https://pulsechain-rpc.publicnode.com',
      'https://pulsechain.publicnode.com',
      'https://rpc-pulsechain.g4mm4.io',
      'https://pulsechain.rpc.thirdweb.com',
      'https://rpc.pulsechainrpc.com',
      'https://rpc.pulsechainstats.com',
      'https://rpc.hairylabs.io/rpc',
    ],
  },
}

/** Coerce legacy ethereum/base/bsc (or anything else) to PulseChain. */
export function normalizeChainKey(_raw?: unknown): ChainKey {
  return 'pulsechain'
}

export const STORAGE_KEY = 'pulsefans-tipbuzz-v1'

/** Default RPC list for a chain (copy). */
export function defaultRpcs(chainKey: ChainKey = 'pulsechain'): string[] {
  return [...CHAINS[chainKey].rpcs]
}

/**
 * Parse a pasted/imported RPC list.
 * Accepts one URL per line, commas, spaces; ignores blanks and # comments.
 */
export function parseRpcList(raw: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const chunks = raw
    .split(/[\n\r,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  for (let line of chunks) {
    if (line.startsWith('#')) continue
    // "1. https://..." or "- https://..."
    line = line.replace(/^[-\d.)\s]+/, '').trim()
    if (!line) continue
    try {
      const u = new URL(line)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue
      const href = u.toString().replace(/\/$/, '')
      if (seen.has(href)) continue
      seen.add(href)
      out.push(href)
    } catch {
      /* skip invalid */
    }
  }
  return out
}

export function formatRpcList(urls: string[]): string {
  return urls.join('\n')
}

/** Previous built-in PulseChain HTTP list (including the dead evex host). */
const LEGACY_STOCK_RPCS = new Set([
  'https://rpc.pulsechain.com',
  'https://pulsechain-rpc.publicnode.com',
  'https://rpc-pulsechain.g4mm4.io',
  'https://evex.cloud/pulserpc',
])

/**
 * Saved Settings still hold the old four until this runs. Stock lists
 * (legacy defaults, empty) become the current built-in failover set.
 * Custom extra URLs are left alone.
 */
export function adoptCurrentDefaultRpcsIfStock(raw: string): string {
  const current = defaultRpcs('pulsechain')
  const parsed = parseRpcList(raw)
  if (!parsed.length) return formatRpcList(current)
  if (parsed.every((u) => LEGACY_STOCK_RPCS.has(u))) {
    return formatRpcList(current)
  }
  return formatRpcList(parsed)
}
