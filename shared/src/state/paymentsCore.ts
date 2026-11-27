/**
 * Pure payments log serialize / summarize — no storage I/O.
 */
import type { Address, Hash } from 'viem'
import type { PaymentEvent } from '../chain/watcher'
import { isChainEventKind } from '../chain/pools'

export const PAYMENTS_STORAGE_KEY = 'pulsefans.payments.v1'
export const MAX_PAYMENT_LOG = 200

export type PaymentLogItem = PaymentEvent & {
  dryRun?: boolean
  /** Enriched label when we had a plan at the time */
  feel?: string
}

type StoredRow = {
  id: string
  hash: string
  from: string
  to: string
  amount: number
  amountRaw: string
  symbol: string
  token: string | null
  blockNumber: string
  timestamp: number
  source?: 'wallet' | 'pool'
  poolLabel?: string
  poolAddress?: string
  poolSide?: string
  eventKind?: string
  triggerId?: string
  dryRun?: boolean
  feel?: string
  force?: PaymentEvent['force']
}

export type StoredPaymentBlob = {
  v: 1
  savedAt: number
  items: StoredRow[]
}

function clampAmount(n: number): number {
  return Number.isFinite(n) ? n : 0
}

export function serializePaymentLog(items: PaymentLogItem[]): StoredPaymentBlob {
  return {
    v: 1,
    savedAt: Date.now(),
    items: items.slice(0, MAX_PAYMENT_LOG).map((p) => ({
      id: p.id,
      hash: String(p.hash),
      from: String(p.from),
      to: String(p.to),
      amount: clampAmount(p.amount),
      amountRaw: p.amountRaw.toString(),
      symbol: p.symbol || '',
      token: p.token ? String(p.token) : null,
      blockNumber: p.blockNumber.toString(),
      timestamp: p.timestamp || Date.now(),
      source: p.source,
      poolLabel: p.poolLabel,
      poolAddress: p.poolAddress ? String(p.poolAddress) : undefined,
      poolSide: p.poolSide,
      eventKind: p.eventKind,
      triggerId: p.triggerId,
      dryRun: p.dryRun,
      feel: p.feel,
      force: p.force,
    })),
  }
}

export function deserializePaymentLog(raw: unknown): PaymentLogItem[] {
  if (!raw || typeof raw !== 'object') return []
  const blob = raw as Partial<StoredPaymentBlob>
  if (!Array.isArray(blob.items)) return []
  const out: PaymentLogItem[] = []
  const seen = new Set<string>()
  for (const row of blob.items) {
    if (!row || typeof row !== 'object') continue
    const r = row as StoredRow
    if (typeof r.id !== 'string' || !r.id) continue
    if (seen.has(r.id)) continue
    seen.add(r.id)
    let amountRaw: bigint
    try {
      amountRaw = BigInt(String(r.amountRaw || '0'))
    } catch {
      amountRaw = 0n
    }
    let blockNumber: bigint
    try {
      blockNumber = BigInt(String(r.blockNumber || '0'))
    } catch {
      blockNumber = 0n
    }
    out.push({
      id: r.id.slice(0, 80),
      hash: String(r.hash || '0x') as Hash,
      from: String(r.from || '0x') as Address,
      to: String(r.to || '0x') as Address,
      amount: clampAmount(Number(r.amount)),
      amountRaw,
      symbol: String(r.symbol || '').slice(0, 24) || 'TOKEN',
      token: r.token ? (String(r.token) as Address) : null,
      blockNumber,
      timestamp: Number(r.timestamp) || Date.now(),
      source:
        r.source === 'pool' ? 'pool' : r.source === 'wallet' ? 'wallet' : undefined,
      poolLabel: r.poolLabel ? String(r.poolLabel).slice(0, 64) : undefined,
      poolAddress: r.poolAddress
        ? (String(r.poolAddress).slice(0, 64) as Address)
        : undefined,
      poolSide: r.poolSide ? String(r.poolSide).slice(0, 32) : undefined,
      eventKind: isChainEventKind(r.eventKind) ? r.eventKind : undefined,
      triggerId: r.triggerId ? String(r.triggerId).slice(0, 48) : undefined,
      dryRun: Boolean(r.dryRun),
      feel: r.feel ? String(r.feel).slice(0, 160) : undefined,
      force: r.force,
    })
    if (out.length >= MAX_PAYMENT_LOG) break
  }
  return out
}

export type PaymentSymbolTotal = {
  symbol: string
  amount: number
  count: number
}

export type PaymentEarningsSummary = {
  tips: PaymentSymbolTotal[]
  tipCount: number
  pools: PaymentSymbolTotal[]
  poolCount: number
  excludedCount: number
  totalLogged: number
}

function bumpSymbol(
  map: Map<string, PaymentSymbolTotal>,
  symbol: string,
  amount: number,
) {
  const key = (symbol || 'TOKEN').trim() || 'TOKEN'
  const prev = map.get(key)
  if (prev) {
    prev.amount += amount
    prev.count += 1
    return
  }
  map.set(key, { symbol: key, amount, count: 1 })
}

function sortTotals(map: Map<string, PaymentSymbolTotal>): PaymentSymbolTotal[] {
  return [...map.values()].sort(
    (a, b) => b.amount - a.amount || a.symbol.localeCompare(b.symbol),
  )
}

export function summarizePaymentEarnings(
  items: PaymentLogItem[],
): PaymentEarningsSummary {
  const tips = new Map<string, PaymentSymbolTotal>()
  const pools = new Map<string, PaymentSymbolTotal>()
  let tipCount = 0
  let poolCount = 0
  let excludedCount = 0

  for (const p of items) {
    const amount = clampAmount(p.amount)
    if (p.dryRun || p.force) {
      excludedCount += 1
      continue
    }
    if (p.source === 'pool') {
      bumpSymbol(pools, p.symbol, amount)
      poolCount += 1
      continue
    }
    bumpSymbol(tips, p.symbol, amount)
    tipCount += 1
  }

  return {
    tips: sortTotals(tips),
    tipCount,
    pools: sortTotals(pools),
    poolCount,
    excludedCount,
    totalLogged: items.length,
  }
}

export function formatPaymentAmount(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  if (abs >= 1000) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  if (abs >= 1) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 4 })
  }
  return n.toLocaleString(undefined, {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  })
}

/** Build export JSON payload (caller writes file / shares). */
export function paymentsExportJsonPayload(
  items: PaymentLogItem[],
  meta: { app: string; version: string },
): unknown {
  return {
    app: meta.app,
    version: meta.version,
    kind: 'payments',
    ...serializePaymentLog(items),
  }
}

export function paymentsExportCsvText(items: PaymentLogItem[]): string {
  const header = [
    'id',
    'hash',
    'from',
    'to',
    'amount',
    'symbol',
    'token',
    'blockNumber',
    'timestamp',
    'source',
    'eventKind',
    'poolLabel',
    'poolSide',
    'dryRun',
    'feel',
  ].join(',')
  const rows = items.map((p) =>
    [
      csv(p.id),
      csv(String(p.hash)),
      csv(String(p.from)),
      csv(String(p.to)),
      csv(String(clampAmount(p.amount))),
      csv(p.symbol || ''),
      csv(p.token ? String(p.token) : ''),
      csv(p.blockNumber.toString()),
      csv(String(p.timestamp || '')),
      csv(p.source || ''),
      csv(p.eventKind || ''),
      csv(p.poolLabel || ''),
      csv(p.poolSide || ''),
      csv(p.dryRun ? '1' : '0'),
      csv(p.feel || ''),
    ].join(','),
  )
  return [header, ...rows].join('\n')
}

function csv(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}
