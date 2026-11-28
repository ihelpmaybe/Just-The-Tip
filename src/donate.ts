import { DONATION_ADDRESS } from './version'

export const DONATE_JSON_URL = 'https://ihelpmaybe.github.io/donate.json'

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/

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
      pulse?: { address?: string }
      address?: string
    }
    const address = data.pulse?.address ?? data.address ?? ''
    return ADDR_RE.test(address) ? address : fallback
  } catch {
    return fallback
  } finally {
    window.clearTimeout(timer)
  }
}
