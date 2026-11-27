/**
 * Payment URIs for tip QRs (EIP-681).
 *
 * Native PLS:
 *   ethereum:<receive>@<chainId>?value=<beats>&symbol=PLS&network=PulseChain
 *
 * ERC-20:
 *   ethereum:<token>@<chainId>/transfer?address=<wallet>&uint256=<raw>&symbol=HEX&network=PulseChain
 *   Spec puts the token contract first (the contract you call). Funds go to
 *   `address=` — that MUST be the streamer wallet. Do not encode value= on
 *   token tips (that would send native PLS).
 *
 * value / uint256 are decimal integer strings (no scientific notation).
 * symbol= and network= are EIP-681 hints so a wallet can inject token name + chain.
 */

import { getAddress, isAddress } from 'viem'

/** Native PLS uses 18 decimals — one beat is 10^-18 PLS. */
export const PLS_DECIMALS = 18

export type TipPaymentUriInput = {
  receiveAddress: string
  amountHuman: number | string
  chainId: number
  /** Native tip decimals (PLS = 18 beats). */
  decimals: number
  /**
   * When set, this tip is an ERC-20. URI is a spec `/transfer` to
   * `receiveAddress` (token contract is the call target, not the payee).
   */
  tokenAddress?: string | null
  /** Token ticker for wallets that read `symbol=` (EIP-681 inject). */
  tokenSymbol?: string | null
  /** Network label for wallets that read `network=` (e.g. PulseChain). */
  networkName?: string | null
}

function assertPositiveChainId(chainId: number) {
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error('Invalid chain id')
  }
}

function assertAddress(raw: string, label = 'address'): `0x${string}` {
  const t = String(raw || '').trim()
  if (!isAddress(t)) throw new Error(`Invalid ${label}`)
  return getAddress(t)
}

/** Safe EIP-681 query token for symbol=/network= inject. */
function hintParam(raw: string | null | undefined, max = 48): string {
  const t = String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, max)
  if (!t || /[\u0000-\u001f]/.test(t)) return ''
  return t
}

function withPaymentHints(
  uri: string,
  hints?: { tokenSymbol?: string | null; networkName?: string | null },
): string {
  const params: string[] = []
  const symbol = hintParam(hints?.tokenSymbol, 24)
  const network = hintParam(hints?.networkName, 48)
  if (symbol) params.push(`symbol=${encodeURIComponent(symbol)}`)
  if (network) params.push(`network=${encodeURIComponent(network)}`)
  if (!params.length) return uri
  return `${uri}${uri.includes('?') ? '&' : '?'}${params.join('&')}`
}

function roundHumanAmount(raw: string, decimals: number): string {
  const [wholePart, fracPart = ''] = raw.split('.')
  if (fracPart.length <= decimals) return raw
  const keep = fracPart.slice(0, decimals)
  const roundUp = fracPart.charCodeAt(decimals) >= 53
  if (!roundUp) {
    const trimmed = keep.replace(/0+$/, '')
    return trimmed ? `${wholePart}.${trimmed}` : wholePart || '0'
  }
  const unpadded = `${wholePart.replace(/^0+/, '') || '0'}${keep}`
  const bumped = (BigInt(unpadded) + 1n).toString().padStart(decimals + 1, '0')
  if (decimals === 0) return bumped
  const whole = bumped.slice(0, bumped.length - decimals) || '0'
  const frac = bumped.slice(bumped.length - decimals).replace(/0+$/, '')
  return frac ? `${whole}.${frac}` : whole
}

/**
 * Convert a human amount string/number to smallest units with BigInt math.
 * For native PLS that unit is the **beat** (1 PLS = 10^18 beats).
 * Extra fractional digits are rounded (USD quotes); zero/negative rejected.
 */
export function toSmallestUnits(
  human: number | string,
  decimals: number,
): bigint {
  if (
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 36
  ) {
    throw new Error('Invalid decimals')
  }

  let raw: string
  if (typeof human === 'number') {
    if (!Number.isFinite(human)) throw new Error('Invalid amount')
    if (Number.isInteger(human)) {
      raw = String(human)
    } else {
      // Expand without scientific notation; trim trailing zeros.
      raw = human
        .toFixed(Math.min(decimals, 20))
        .replace(/\.?0+$/, '')
    }
  } else {
    raw = String(human).trim().replace(/,/g, '')
  }

  if (!raw || raw === '.' || !/^\d+(\.\d+)?$/.test(raw)) {
    throw new Error('Invalid amount')
  }

  const rounded = roundHumanAmount(raw, decimals)
  const [wholePart, fracPart = ''] = rounded.split('.')
  if (fracPart.length > decimals) {
    throw new Error('Too many fractional digits')
  }
  const whole = wholePart.replace(/^0+(?=\d)/, '') || '0'
  const frac = fracPart.padEnd(decimals, '0')
  const digits = `${whole}${frac}`.replace(/^0+(?=\d)/, '') || '0'
  const units = BigInt(digits)
  if (units <= 0n) throw new Error('Amount must be positive')
  return units
}

/** Human PLS → beats (PulseChain atomic units). */
export function toBeats(humanPls: number | string): bigint {
  return toSmallestUnits(humanPls, PLS_DECIMALS)
}

export function buildNativeTipUri(opts: {
  address: string
  chainId: number
  /** Amount in beats (1 PLS = 10^18 beats). */
  valueBeats: bigint
}): string {
  const address = assertAddress(opts.address)
  assertPositiveChainId(opts.chainId)
  if (opts.valueBeats <= 0n) throw new Error('Amount must be positive')
  return `ethereum:${address}@${opts.chainId}?value=${opts.valueBeats.toString()}`
}

/**
 * Spec EIP-681 ERC-20 transfer URI.
 * Call target is the token; `address=` is who receives the tokens.
 */
export function buildErc20TransferUri(opts: {
  tokenAddress: string
  receiveAddress: string
  chainId: number
  amountRaw: bigint
}): string {
  const token = assertAddress(opts.tokenAddress, 'token address')
  const receive = assertAddress(opts.receiveAddress, 'receive address')
  assertPositiveChainId(opts.chainId)
  if (opts.amountRaw <= 0n) throw new Error('Amount must be positive')
  return (
    `ethereum:${token}@${opts.chainId}/transfer` +
    `?address=${receive}&uint256=${opts.amountRaw.toString()}`
  )
}

/** First send-to address in an `ethereum:` URI (what wallets actually pay). */
export function eip681PayToAddress(uri: string): `0x${string}` | null {
  const m = String(uri || '')
    .trim()
    .match(/^ethereum:(0x[a-fA-F0-9]{40})\b/i)
  if (!m) return null
  try {
    return getAddress(m[1])
  } catch {
    return null
  }
}

export type ParsedEip681Erc20Transfer = {
  token: `0x${string}`
  receive: `0x${string}`
  amountRaw: bigint
  chainId: number
}

/**
 * Parse `ethereum:<token>@<chain>/transfer?address=<receive>&uint256=<raw>`.
 * Parameter order does not matter.
 */
export function parseEip681Erc20Transfer(
  uri: string,
): ParsedEip681Erc20Transfer | null {
  const t = String(uri || '').trim()
  const m = t.match(
    /^ethereum:(0x[a-fA-F0-9]{40})@(\d+)\/transfer\?(.+)$/i,
  )
  if (!m) return null
  const chainId = Number(m[2])
  if (!Number.isInteger(chainId) || chainId <= 0) return null
  let token: `0x${string}`
  try {
    token = getAddress(m[1])
  } catch {
    return null
  }
  const params = new URLSearchParams(m[3])
  const dest = String(params.get('address') || '').trim()
  const raw = String(params.get('uint256') || '').trim()
  if (!isAddress(dest) || !/^[0-9]+$/.test(raw)) return null
  let receive: `0x${string}`
  try {
    receive = getAddress(dest)
  } catch {
    return null
  }
  let amountRaw: bigint
  try {
    amountRaw = BigInt(raw)
  } catch {
    return null
  }
  if (amountRaw <= 0n) return null
  if (token === receive) return null
  return { token, receive, amountRaw, chainId }
}

/** Native PLS amount in beats when the URI has `value=`. */
export function eip681NativeValue(uri: string): bigint | null {
  const m = String(uri || '')
    .trim()
    .match(/[?&]value=([0-9]+)(?:&|$)/i)
  if (!m) return null
  try {
    const n = BigInt(m[1])
    return n > 0n ? n : null
  } catch {
    return null
  }
}

/**
 * True when the URI pays `receiveAddress`:
 * native — first address is the wallet (optional value=);
 * ERC-20 — spec `/transfer` with `address=` the wallet and uint256 amount.
 */
export function isFanSafeTipUri(uri: string, receiveAddress: string): boolean {
  const t = String(uri || '').trim()
  if (!t.startsWith('ethereum:')) return false
  try {
    const receive = getAddress(receiveAddress)
    const erc20 = parseEip681Erc20Transfer(t)
    if (erc20) return erc20.receive === receive
    if (/\/transfer\b/i.test(t)) return false
    const payTo = eip681PayToAddress(t)
    if (payTo !== receive) return false
    return eip681NativeValue(t) !== null
  } catch {
    return false
  }
}

/**
 * Build the tip QR payload for a ladder amount.
 * Native: receive + value. ERC-20: token /transfer to receive + uint256.
 */
export function buildTipPaymentUri(input: TipPaymentUriInput): string {
  const receive = assertAddress(input.receiveAddress, 'receive address')
  const amountRaw = toSmallestUnits(input.amountHuman, input.decimals)
  const token = (input.tokenAddress || '').trim()
  let uri: string
  if (token) {
    uri = buildErc20TransferUri({
      tokenAddress: token,
      receiveAddress: receive,
      chainId: input.chainId,
      amountRaw,
    })
  } else {
    uri = buildNativeTipUri({
      address: receive,
      chainId: input.chainId,
      valueBeats: amountRaw,
    })
  }
  uri = withPaymentHints(uri, {
    tokenSymbol: input.tokenSymbol,
    networkName: input.networkName,
  })
  if (!isFanSafeTipUri(uri, receive)) {
    throw new Error('Payment URI destination is not the receive wallet')
  }
  if (token) {
    const parsed = parseEip681Erc20Transfer(uri)
    if (!parsed || parsed.amountRaw !== amountRaw) {
      throw new Error('ERC-20 payment URI missing amount')
    }
  } else if (!eip681NativeValue(uri)) {
    throw new Error('Native payment URI missing amount')
  }
  return uri
}

/** Safe wrapper for UI paths — returns null instead of throwing. */
export function tryBuildTipPaymentUri(
  input: TipPaymentUriInput,
): string | null {
  try {
    return buildTipPaymentUri(input)
  } catch {
    return null
  }
}
