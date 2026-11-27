/**
 * Generic PulseChain log watches (operator-supplied event ABI).
 * Always bound to one contract address — never chain-wide getLogs.
 */

import {
  isAddress,
  parseAbiItem,
  type AbiEvent,
  type Address,
} from 'viem'
import {
  normalizePoolBuzzRules,
  newTriggerId,
  type PoolBuzzRule,
} from './pools'

export type WatchedChainLog = {
  id: string
  address: Address
  label: string
  /**
   * Event ABI fragment, with or without the `event ` prefix.
   * Example: `Transfer(address indexed from, address indexed to, uint256 value)`
   */
  eventAbi: string
  /** Arg name (or decimal index) used as the amount. Empty = fire at amount 0. */
  amountArg: string
  minAmount: number
  quoteSymbol: string
  decimals: number
  enabled: boolean
  overlayAlert: boolean
  overlayMinAmount: number | null
  buzzRules: PoolBuzzRule[]
}

const ZERO = '0x0000000000000000000000000000000000000000'

function asAddress(v: unknown): Address | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!isAddress(t) || t.toLowerCase() === ZERO) return null
  return t as Address
}

export function parseChainEventAbi(raw: string): AbiEvent | null {
  const t = String(raw || '').trim()
  if (!t || t.length > 400) return null
  try {
    const sig = (/^event\s/i.test(t) ? t : `event ${t}`) as 'event Foo()'
    const item = parseAbiItem(sig)
    if (!item || item.type !== 'event') return null
    return item
  } catch {
    return null
  }
}

export function normalizeWatchedChainLog(
  raw: unknown,
): WatchedChainLog | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const address = asAddress(o.address)
  if (!address) return null
  const eventAbi = String(o.eventAbi || o.signature || '')
    .trim()
    .slice(0, 400)
  if (!parseChainEventAbi(eventAbi)) return null
  const minN = Number(o.minAmount)
  const overlayMinN = Number(o.overlayMinAmount)
  const decimals = Math.min(
    36,
    Math.max(0, Math.round(Number(o.decimals) || 18)),
  )
  return {
    id:
      String(o.id || '')
        .trim()
        .slice(0, 48) || newTriggerId('log'),
    address,
    label: String(o.label || 'event').trim().slice(0, 48) || 'event',
    eventAbi,
    amountArg: String(o.amountArg || '').trim().slice(0, 64),
    minAmount: Number.isFinite(minN) && minN >= 0 ? minN : 0,
    quoteSymbol:
      String(o.quoteSymbol || 'TOKEN').trim().slice(0, 16) || 'TOKEN',
    decimals,
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
  }
}

export function normalizeWatchedChainLogs(raw: unknown): WatchedChainLog[] {
  if (!Array.isArray(raw)) return []
  const out: WatchedChainLog[] = []
  const seen = new Set<string>()
  for (const row of raw.slice(0, 16)) {
    const log = normalizeWatchedChainLog(row)
    if (!log) continue
    const key = `${log.address.toLowerCase()}:${log.eventAbi.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(log)
  }
  return out
}

export function activeChainLogs(
  logs: WatchedChainLog[] | undefined,
): WatchedChainLog[] {
  return (logs || []).filter(
    (row) => row.enabled !== false && isAddress(row.address),
  )
}

export function chainLogAmountFromArgs(
  args: Record<string, unknown> | undefined,
  amountArg: string,
): bigint | null {
  if (!args) return null
  const key = String(amountArg || '').trim()
  if (!key) return 0n
  const byName = args[key]
  const byIndex = /^\d+$/.test(key) ? args[key] : undefined
  const raw = byName !== undefined ? byName : byIndex
  if (typeof raw === 'bigint') return raw
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return BigInt(Math.trunc(raw))
  }
  if (typeof raw === 'string' && /^(0x)?[0-9a-f]+$/i.test(raw.trim())) {
    try {
      return BigInt(raw)
    } catch {
      return null
    }
  }
  return null
}
