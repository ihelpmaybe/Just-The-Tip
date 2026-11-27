/**
 * Fan-facing QR payloads — two kinds only:
 *
 * 1. **Creator payment** — native `ethereum:<receive>@chain?value=` or
 *    ERC-20 `ethereum:<token>@chain/transfer?address=<receive>&uint256=`.
 *    Funds always land on the streamer wallet.
 * 2. **Website link** — https URL only (PulseChain pack slides); no 0x addresses.
 */

import { getAddress, isAddress } from 'viem'
import { isFanSafeTipUri, parseEip681Erc20Transfer } from './eip681'

const ETH_ADDR_RE = /0x[a-fA-F0-9]{40}/gi

export type FanQrKind = 'creator-wallet' | 'website-link'

/** Every 0x address embedded in a QR payload (deduped, lowercase). */
export function extractEthAddresses(payload: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const re = new RegExp(ETH_ADDR_RE.source, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(payload)) !== null) {
    const key = m[0].toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      out.push(key)
    }
  }
  return out
}

export function isWebsiteLinkQrPayload(payload: string): boolean {
  return /^https?:\/\//i.test(String(payload || '').trim())
}

/**
 * True when the payload pays only `receiveAddress` (native or ERC-20 transfer).
 */
export function isCreatorWalletQrPayload(
  payload: string,
  receiveAddress: string,
): boolean {
  const receive = String(receiveAddress || '').trim()
  if (!isAddress(receive)) return false
  const receiveKey = getAddress(receive).toLowerCase()
  const t = String(payload || '').trim()
  if (!t || isWebsiteLinkQrPayload(t)) return false

  if (t.startsWith('ethereum:')) {
    return isFanSafeTipUri(t, receive)
  }
  const addrs = extractEthAddresses(t)
  return addrs.length === 1 && addrs[0] === receiveKey && t.toLowerCase() === receiveKey
}

export function classifyFanQrPayload(
  payload: string,
  receiveAddress?: string,
): FanQrKind | null {
  const t = String(payload || '').trim()
  if (!t) return null
  if (isWebsiteLinkQrPayload(t)) {
    return extractEthAddresses(t).length === 0 ? 'website-link' : null
  }
  if (receiveAddress && isCreatorWalletQrPayload(t, receiveAddress)) {
    return 'creator-wallet'
  }
  return null
}

export function sanitizeWebsiteLinkQrPayload(payload: string): string | null {
  const t = String(payload || '').trim()
  if (!isWebsiteLinkQrPayload(t)) return null
  if (extractEthAddresses(t).length > 0) return null
  try {
    new URL(t)
    return t
  } catch {
    return null
  }
}

export function sanitizeCreatorWalletQrPayload(
  payload: string,
  receiveAddress: string,
): string | null {
  const t = String(payload || '').trim()
  if (!t) return null
  return isCreatorWalletQrPayload(t, receiveAddress) ? t : null
}

/** Safe payment URI for creator-wallet QRs (drops legacy contract-first payloads). */
export function fanSafeCreatorWalletUri(
  uri: string,
  receiveAddress: string,
): string | undefined {
  return sanitizeCreatorWalletQrPayload(uri, receiveAddress) ?? undefined
}

/** True when a cached overlay payload is not a valid payment to the receive wallet. */
export function overlayQrPayloadLooksUnsafe(
  menuOffers: Array<{ paymentUri?: string }> | undefined,
  receiveAddress?: string,
): boolean {
  if (!Array.isArray(menuOffers)) return false
  return menuOffers.some((o) => {
    const uri = String(o.paymentUri || '').trim()
    if (!uri) return false
    if (receiveAddress && isAddress(receiveAddress)) {
      return !isFanSafeTipUri(uri, receiveAddress)
    }
    if (parseEip681Erc20Transfer(uri)) return false
    return /\/transfer\b/i.test(uri) || extractEthAddresses(uri).length > 1
  })
}
