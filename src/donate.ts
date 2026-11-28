import { DONATION_ADDRESS } from './version'

export const DONATE_JSON_URL = 'https://ihelpmaybe.github.io/donate.json'

/** Ed25519 SPKI (base64) — verifies hub donate.json. Public only. */
const DONATE_PUBKEY_SPKI_B64 =
  'MCowBQYDK2VwAyEAL0vlzfs/pP7qrgq3K61S1MisC0YCCSTJuiOrrVXlw2w='

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const SEEN_KEY = 'ihmb-donate-updated'
const MAX_FUTURE_DAYS = 2

function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function dateOk(updated: string): boolean {
  if (!DATE_RE.test(updated)) return false
  const t = Date.parse(`${updated}T00:00:00Z`)
  if (!Number.isFinite(t)) return false
  if (t > Date.now() + MAX_FUTURE_DAYS * 86_400_000) return false
  try {
    const prev = localStorage.getItem(SEEN_KEY)
    if (prev && updated < prev) return false
  } catch {
    /* ignore */
  }
  return true
}

function rememberUpdated(updated: string): void {
  try {
    const prev = localStorage.getItem(SEEN_KEY)
    if (!prev || updated > prev) localStorage.setItem(SEEN_KEY, updated)
  } catch {
    /* ignore */
  }
}

async function verifyDonateSig(
  v: number,
  updated: string,
  address: string,
  label: string,
  sigB64: string,
): Promise<boolean> {
  if (!globalThis.crypto?.subtle) return false
  try {
    const key = await crypto.subtle.importKey(
      'spki',
      b64ToU8(DONATE_PUBKEY_SPKI_B64),
      { name: 'Ed25519' },
      false,
      ['verify'],
    )
    const msg = new TextEncoder().encode(
      `v${v}\n${updated}\n${address.toLowerCase()}\n${label}`,
    )
    return crypto.subtle.verify('Ed25519', key, b64ToU8(sigB64), msg)
  } catch {
    return false
  }
}

export async function resolveDonationAddress(
  fallback: string = DONATION_ADDRESS,
  timeoutMs = 2500,
): Promise<string> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(DONATE_JSON_URL, {
      signal: ctrl.signal,
      cache: 'no-store',
    })
    if (!res.ok) return fallback
    const data = (await res.json()) as {
      v?: number
      updated?: string
      sig?: string
      pulse?: { address?: string; label?: string }
      address?: string
      label?: string
    }
    const v = Number(data.v ?? 0)
    const updated = String(data.updated ?? '')
    const sig = String(data.sig ?? '')
    const address = data.pulse?.address ?? data.address ?? ''
    const label = data.pulse?.label ?? data.label ?? ''
    if (v !== 1 || !sig || !ADDR_RE.test(address) || !dateOk(updated)) {
      return fallback
    }
    const ok = await verifyDonateSig(v, updated, address, label, sig)
    if (!ok) return fallback
    rememberUpdated(updated)
    return address
  } catch {
    return fallback
  } finally {
    window.clearTimeout(timer)
  }
}
