/**
 * PulseChain OmniBridge (ETH ↔ PLS) watches.
 *
 * Home mediator on PulseChain was read from the official Ethereum foreign
 * OmniBridge (`mediatorContractOnOtherSide()`):
 *   foreign 0x1715a3E4A142d8b698131108995174F37aEBA10D
 *   home    0x4fD0aaa7506f3d9cB8274bdB946Ec42A1b8751Ef
 *
 * TokensBridged = deposit arriving on PulseChain.
 * TokensBridgingInitiated = withdrawal leaving PulseChain.
 */

import { isAddress, parseAbiItem, type Address } from 'viem'
import {
  normalizePoolBuzzRules,
  newTriggerId,
  type PoolBuzzRule,
} from './pools'

export const PULSECHAIN_OMNIBRIDGE_ADDRESS =
  '0x4fD0aaa7506f3d9cB8274bdB946Ec42A1b8751Ef' as Address

export const PULSECHAIN_HOME_AMB_ADDRESS =
  '0x6ef79FD6f9f840264332884240539Ed7A2dA8b2b' as Address

export const tokensBridgedEvent = parseAbiItem(
  'event TokensBridged(address indexed token, address indexed recipient, uint256 value, bytes32 indexed messageId)',
)

export const tokensBridgingInitiatedEvent = parseAbiItem(
  'event TokensBridgingInitiated(address indexed token, address indexed sender, uint256 value, bytes32 indexed messageId)',
)

export const erc20TransferEvent = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
)

/**
 * Canonical ETH→PulseChain OmniBridge tokens. Used only as a Transfer-log
 * backup when the mediator events are missed (RPC gaps). Not the forked copies.
 */
export const BRIDGE_BACKUP_TOKENS = [
  '0x57fde0a71132198bbec939b98976993d8d89d225', // HEX from Ethereum
  '0x02DcdD04e3F455D838cd1249292C58f3B79e3C3C', // WETH
  '0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07', // USDC
  '0x0cb6f5a34ad42ec934882a05265a7d5f59b51a2f', // USDT
  '0xefD766cCb38EaF1dfd701853BFCe31359239F305', // DAI
] as const satisfies readonly Address[]

export type BridgeDirection = 'both' | 'in' | 'out'

export type WatchedBridge = {
  id: string
  address: Address
  label: string
  direction: BridgeDirection
  /** Optional: only this token. Empty = any token on the mediator. */
  token: Address | null
  minAmount: number
  quoteSymbol: string
  decimals: number
  enabled: boolean
  overlayAlert: boolean
  overlayMinAmount: number | null
  buzzRules: PoolBuzzRule[]
  /**
   * Also watch ERC-20 Transfer mint/burn (and to/from the mediator).
   * Backup only — official TokensBridged logs still win for the same tx.
   * Missing field → On.
   */
  tokenTxBackup: boolean
}

const ZERO = '0x0000000000000000000000000000000000000000'

function asAddress(v: unknown): Address | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!isAddress(t) || t.toLowerCase() === ZERO) return null
  return t as Address
}

export function isBridgeDirection(v: unknown): v is BridgeDirection {
  return v === 'both' || v === 'in' || v === 'out'
}

export function normalizeWatchedBridge(raw: unknown): WatchedBridge | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const address = asAddress(o.address)
  if (!address) return null
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
        .slice(0, 48) || newTriggerId('brg'),
    address,
    label: String(o.label || 'bridge').trim().slice(0, 48) || 'bridge',
    direction: isBridgeDirection(o.direction) ? o.direction : 'both',
    token: asAddress(o.token),
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
    tokenTxBackup:
      o.tokenTxBackup === undefined ? true : Boolean(o.tokenTxBackup),
  }
}

export function normalizeWatchedBridges(raw: unknown): WatchedBridge[] {
  if (!Array.isArray(raw)) return []
  const out: WatchedBridge[] = []
  const seen = new Set<string>()
  for (const row of raw.slice(0, 16)) {
    const b = normalizeWatchedBridge(row)
    if (!b) continue
    const key = b.address.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(b)
  }
  return out
}

export function activeBridges(
  bridges: WatchedBridge[] | undefined,
): WatchedBridge[] {
  return (bridges || []).filter(
    (b) => b.enabled !== false && isAddress(b.address),
  )
}

export function bridgeBackupTokens(
  bridge: Pick<WatchedBridge, 'token'>,
): Address[] {
  if (bridge.token) return [bridge.token]
  const seen = new Set<string>()
  const out: Address[] = []
  for (const addr of BRIDGE_BACKUP_TOKENS) {
    const key = addr.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(addr)
  }
  return out
}

/**
 * Classify a token Transfer as a likely bridge in/out.
 * Mint (from 0x0) or from the mediator → in.
 * Burn (to 0x0) or to the mediator → out.
 * Ordinary user-to-user transfers return null.
 */
export function bridgeTransferSide(
  from: string,
  to: string,
  mediator: string,
): 'in' | 'out' | null {
  const f = String(from || '').toLowerCase()
  const t = String(to || '').toLowerCase()
  const m = String(mediator || '').toLowerCase()
  const z = ZERO
  if (!f || !t || f === t) return null
  const fromBridge = f === z || f === m
  const toBridge = t === z || t === m
  if (fromBridge && !toBridge) return 'in'
  if (toBridge && !fromBridge) return 'out'
  return null
}

export function bridgeClaimKey(
  hash: string,
  kind: 'bridge-in' | 'bridge-out',
  token: string,
): string {
  return `${String(hash).toLowerCase()}:${kind}:${String(token).toLowerCase()}`
}

export const BRIDGE_PRESETS: WatchedBridge[] = normalizeWatchedBridges([
  {
    address: PULSECHAIN_OMNIBRIDGE_ADDRESS,
    label: 'PulseChain OmniBridge',
    direction: 'both',
    minAmount: '100',
    quoteSymbol: 'TOKEN',
    decimals: 18,
  },
])

export function mergeBridgePresets(current: WatchedBridge[]): {
  bridges: WatchedBridge[]
  added: number
} {
  const have = new Set(current.map((b) => b.address.toLowerCase()))
  const next = [...current]
  let added = 0
  for (const b of BRIDGE_PRESETS) {
    const key = b.address.toLowerCase()
    if (have.has(key)) continue
    have.add(key)
    next.push({ ...b, enabled: false })
    added++
  }
  return { bridges: next, added }
}
