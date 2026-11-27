/**
 * Persist + export the live Payments feed (tips / pool swaps).
 * Pure serialize/summarize lives in @pulsefans/domain.
 */
import { APP_NAME, APP_SLUG, APP_VERSION } from '../version'
import {
  MAX_PAYMENT_LOG,
  PAYMENTS_STORAGE_KEY,
  deserializePaymentLog,
  formatPaymentAmount,
  serializePaymentLog,
  summarizePaymentEarnings,
  type PaymentEarningsSummary,
  type PaymentLogItem,
  type PaymentSymbolTotal,
} from '@pulsefans/domain/state/paymentsCore'

export {
  MAX_PAYMENT_LOG,
  PAYMENTS_STORAGE_KEY,
  deserializePaymentLog,
  formatPaymentAmount,
  serializePaymentLog,
  summarizePaymentEarnings,
  type PaymentEarningsSummary,
  type PaymentLogItem,
  type PaymentSymbolTotal,
}

export function loadPaymentLog(): PaymentLogItem[] {
  try {
    const raw = localStorage.getItem(PAYMENTS_STORAGE_KEY)
    if (!raw) return []
    return deserializePaymentLog(JSON.parse(raw))
  } catch {
    return []
  }
}

export function savePaymentLog(items: PaymentLogItem[]) {
  try {
    localStorage.setItem(
      PAYMENTS_STORAGE_KEY,
      JSON.stringify(serializePaymentLog(items)),
    )
  } catch {
    /* quota / private mode */
  }
}

export function clearPaymentLogStorage() {
  try {
    localStorage.removeItem(PAYMENTS_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function downloadText(filename: string, body: string, mime: string) {
  const blob = new Blob([body], { type: mime })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function exportPaymentsJson(items: PaymentLogItem[]) {
  const day = new Date().toISOString().slice(0, 10)
  const payload = {
    app: APP_NAME,
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    count: items.length,
    ...serializePaymentLog(items),
  }
  downloadText(
    `${APP_SLUG}-payments-${day}.json`,
    JSON.stringify(payload, null, 2),
    'application/json',
  )
}

function csvEscape(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

export function exportPaymentsCsv(items: PaymentLogItem[]) {
  const day = new Date().toISOString().slice(0, 10)
  const header = [
    'time_iso',
    'timestamp_ms',
    'kind',
    'amount',
    'symbol',
    'token',
    'from',
    'to',
    'tx_hash',
    'block',
    'pool',
    'side',
    'dry_run',
    'feel',
    'pattern',
    'toy_id',
  ]
  const lines = [header.join(',')]
  for (const p of items) {
    const kind = p.source === 'pool' ? 'swap' : p.force ? 'sim' : 'tip'
    lines.push(
      [
        new Date(p.timestamp).toISOString(),
        String(p.timestamp),
        kind,
        String(p.amount),
        p.symbol,
        p.token || '',
        String(p.from),
        String(p.to),
        String(p.hash),
        p.blockNumber.toString(),
        p.poolLabel || '',
        p.poolSide || '',
        p.dryRun ? '1' : '0',
        p.feel || '',
        p.force?.pattern || '',
        p.force?.toyId || '',
      ]
        .map((c) => csvEscape(String(c)))
        .join(','),
    )
  }
  downloadText(
    `${APP_SLUG}-payments-${day}.csv`,
    lines.join('\n'),
    'text/csv;charset=utf-8',
  )
}
