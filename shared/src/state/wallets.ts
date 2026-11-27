import { getAddress, isAddress } from 'viem'

export const MAX_SAVED_WALLETS = 24

/** Receive address the operator can pick again later. */
export type SavedWallet = {
  /** Checksummed 0x address */
  address: string
  /** Optional nickname */
  label: string
  /** ms since epoch — most-recent first in list */
  lastUsed: number
}

export function normalizeSavedWallets(raw: unknown): SavedWallet[] {
  if (!Array.isArray(raw)) return []
  const out: SavedWallet[] = []
  const seen = new Set<string>()
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const addrRaw = typeof r.address === 'string' ? r.address.trim() : ''
    if (!isAddress(addrRaw)) continue
    let address: string
    try {
      address = getAddress(addrRaw)
    } catch {
      continue
    }
    const key = address.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const label =
      typeof r.label === 'string' ? r.label.trim().slice(0, 48) : ''
    const lastUsed = Number(r.lastUsed)
    out.push({
      address,
      label,
      lastUsed: Number.isFinite(lastUsed) ? lastUsed : 0,
    })
  }
  out.sort((a, b) => b.lastUsed - a.lastUsed)
  return out.slice(0, MAX_SAVED_WALLETS)
}

/** Move/insert a valid address to front; keeps existing label unless provided. */
export function rememberWallet(
  list: SavedWallet[],
  address: string,
  opts?: { label?: string },
): SavedWallet[] {
  if (!isAddress(address)) return list
  let checksum: string
  try {
    checksum = getAddress(address)
  } catch {
    return list
  }
  const key = checksum.toLowerCase()
  const prev = list.find((w) => w.address.toLowerCase() === key)
  const label =
    opts?.label !== undefined
      ? opts.label.trim().slice(0, 48)
      : prev?.label || ''
  const rest = list.filter((w) => w.address.toLowerCase() !== key)
  return normalizeSavedWallets([
    {
      address: checksum,
      label,
      lastUsed: Date.now(),
    },
    ...rest,
  ])
}

export function removeSavedWallet(
  list: SavedWallet[],
  address: string,
): SavedWallet[] {
  if (!isAddress(address)) return list
  const key = address.toLowerCase()
  return list.filter((w) => w.address.toLowerCase() !== key)
}

export function walletDisplayLabel(w: SavedWallet): string {
  return w.label || shortAddress(w.address)
}

export function shortAddress(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a
}
