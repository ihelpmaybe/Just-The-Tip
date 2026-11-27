import { getAddress, isAddress } from 'viem'
import { shortAddress } from './wallets'

/** Majors + extras + picked Tang tickers. Unpicked suggestions stay off this list. */
export const MAX_SAVED_TOKENS = 96

/** ERC‑20 tip token the operator can pick again later. */
export type SavedToken = {
  /** Checksummed contract address */
  address: string
  symbol: string
  decimals: number
  /** Optional nickname (falls back to symbol) */
  label: string
  lastUsed: number
}

/** Curated PulseChain majors (verified addresses, not ticker search). */
export type TokenPreset = {
  address: string
  symbol: string
  decimals: number
  label: string
  note?: string
}

/**
 * PulseChain tip presets — catalog-verified addresses.
 * e* = bridged from Ethereum. HEX is the PulseChain state-fork copy.
 * Bridged stables live in STABLE_TOKEN_PRESETS (USD tips when selected).
 */
export const TOKEN_PRESETS: TokenPreset[] = [
  {
    address: '0x95B303987A60C71504D99Aa1b13B4DA07b0790ab',
    symbol: 'PLSX',
    decimals: 18,
    label: 'PLSX',
    note: 'PulseX',
  },
  {
    address: '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39',
    symbol: 'HEX',
    decimals: 8,
    label: 'HEX',
    note: 'HEX on PulseChain',
  },
  {
    address: '0xF6f8Db0aBa00007681F8fAF16A0FDa1c9B030b11',
    symbol: 'PRVX',
    decimals: 18,
    label: 'ProveX',
    note: 'ProveX (PRVX)',
  },
  {
    address: '0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d',
    symbol: 'INC',
    decimals: 18,
    label: 'INC',
    note: 'PulseX Incentive',
  },
]

/** Bridged ~$1 stables — tip by USD when saved / selected. */
export const STABLE_TOKEN_PRESETS: TokenPreset[] = [
  {
    address: '0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07',
    symbol: 'USDC',
    decimals: 6,
    label: 'eUSDC',
    note: 'USDC bridged (~$1)',
  },
  {
    address: '0x0Cb6F5a34ad42ec934882A05265A7d5F59b51A2f',
    symbol: 'USDT',
    decimals: 6,
    label: 'eUSDT',
    note: 'USDT bridged (~$1)',
  },
  {
    address: '0xefD766cCb38EaF1dfd701853BFCe31359239F305',
    symbol: 'DAI',
    decimals: 18,
    label: 'eDAI',
    note: 'DAI bridged (~$1)',
  },
]

/** Dropped tip majors — prune from saved lists when loading presets. */
export const RETIRED_TIP_PRESET_ADDRESSES = new Set([
  '0xa1077a294dde1b09bb078844df40758a5d0f9a27', // WPLS
  '0x57fde0a71132198bbec939b98976993d8d89d225', // eHEX
  '0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c', // eWETH
  '0x1b71505d95ab3e7234ed2239b8ec7aa65b94ae7b', // pump.tires PEPE
  '0x3ca80d83277e721171284667829c686527b8b3c5', // 9INCH
  '0x8b4cfb020af9acad95ad80020ce8f67fbb2c700e', // BBC
])

export const STABLE_TIP_PRESET_ADDRESSES = new Set(
  STABLE_TOKEN_PRESETS.map((p) => p.address.toLowerCase()),
)

export function isRetiredTipPreset(address: string | null | undefined): boolean {
  const key = String(address || '')
    .trim()
    .toLowerCase()
  return Boolean(key) && RETIRED_TIP_PRESET_ADDRESSES.has(key)
}

export function isStableTipPreset(address: string | null | undefined): boolean {
  const key = String(address || '')
    .trim()
    .toLowerCase()
  return Boolean(key) && STABLE_TIP_PRESET_ADDRESSES.has(key)
}

/**
 * Extra PulseChain tip coins (pump.tires memes + fork DAI).
 * Addresses verified on PulseX / BlockScout — not ticker search.
 */
export const MEME_TOKEN_PRESETS: TokenPreset[] = [
  {
    address: '0xe33a5AE21F93aceC5CfC0b7b0FDBB65A0f0Be5cC',
    symbol: 'MOST',
    decimals: 18,
    label: 'MOST',
    note: 'MostWanted (pump.tires)',
  },
  {
    address: '0xec4252e62c6de3d655ca9ce3afc12e553ebba274',
    symbol: 'PUMP',
    decimals: 18,
    label: 'PUMP',
    note: 'PUMP.tires',
  },
]

/** Fork DAI — known for Save-token labels (not a Suggestions entry). */
export const PDAI_TIP_ADDRESS =
  '0x6B175474E89094C44Da98b954EedeAC495271d0F'

const PDAI_TIP_PRESET: TokenPreset = {
  address: PDAI_TIP_ADDRESS,
  symbol: 'DAI',
  decimals: 18,
  label: 'PornDai',
  note: 'DAI on PulseChain (state fork, not bridged eDAI)',
}

/** Curated suggestion lists — cleared; operators Save token or pick PLS. */
export const TANG_GANG_TOKEN_PRESETS: TokenPreset[] = []

export const EXTRA_TIP_BOARD_SUGGESTIONS: TokenPreset[] = []

export const TRENDING_TIP_BOARD_SUGGESTIONS: TokenPreset[] = []

/** Empty — no Suggested-token dropdown entries beyond native PLS. */
export const TIP_BOARD_SUGGESTIONS: TokenPreset[] = []

export const TIP_BOARD_SUGGESTION_ADDRESSES = new Set(
  TIP_BOARD_SUGGESTIONS.map((p) => p.address.toLowerCase()),
)

export function isFrontTipBoardToken(
  address: string | null | undefined,
): boolean {
  const key = String(address || '')
    .trim()
    .toLowerCase()
  // Native PLS only — everything else comes from Save token.
  return !key
}

export function isTipBoardSuggestion(
  address: string | null | undefined,
): boolean {
  const key = String(address || '')
    .trim()
    .toLowerCase()
  return Boolean(key) && TIP_BOARD_SUGGESTION_ADDRESSES.has(key)
}

/** Extra Save-token helpers — emptied with Suggestions. */
export const EXTRA_SAVED_TOKEN_PRESETS: TokenPreset[] = []

export const EXTRA_SAVED_TOKEN_ADDRESSES = new Set(
  EXTRA_SAVED_TOKEN_PRESETS.map((p) => p.address.toLowerCase()),
)

export function isExtraSavedTipToken(
  address: string | null | undefined,
): boolean {
  const key = String(address || '')
    .trim()
    .toLowerCase()
  return Boolean(key) && EXTRA_SAVED_TOKEN_ADDRESSES.has(key)
}

export function hideTipBoardToken(
  hidden: string[] | null | undefined,
  address: string,
): string[] {
  if (isFrontTipBoardToken(address)) return [...(hidden || [])]
  const key = String(address || '')
    .trim()
    .toLowerCase()
  if (!key) return [...(hidden || [])]
  return [...new Set([...(hidden || []).map((a) => a.toLowerCase()), key])]
}

export function unhideTipBoardToken(
  hidden: string[] | null | undefined,
  address: string,
): string[] {
  const key = String(address || '')
    .trim()
    .toLowerCase()
  return (hidden || [])
    .map((a) => String(a || '').trim().toLowerCase())
    .filter((a) => a && a !== key)
}

/**
 * Never offer these as tip majors / saved tip coins.
 */
export const BLOCKED_TIP_TOKEN_ADDRESSES = new Set<string>([])

export function isBlockedTipToken(address: string | null | undefined): boolean {
  const key = String(address || '')
    .trim()
    .toLowerCase()
  return Boolean(key) && BLOCKED_TIP_TOKEN_ADDRESSES.has(key)
}

export function normalizeSavedTokens(raw: unknown): SavedToken[] {
  if (!Array.isArray(raw)) return []
  const out: SavedToken[] = []
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
    if (isBlockedTipToken(key)) continue
    seen.add(key)
    const decimals = Math.max(
      0,
      Math.min(36, Math.round(Number(r.decimals) || 18)),
    )
    const symbolRaw =
      typeof r.symbol === 'string' && r.symbol.trim()
        ? r.symbol.trim().slice(0, 16)
        : 'TOKEN'
    const label =
      typeof r.label === 'string' ? r.label.trim().slice(0, 48) : ''
    const lastUsed = Number(r.lastUsed)
    out.push({
      address,
      symbol: symbolRaw,
      decimals,
      label,
      lastUsed: Number.isFinite(lastUsed) ? lastUsed : 0,
    })
  }
  out.sort((a, b) => b.lastUsed - a.lastUsed)
  return out.slice(0, MAX_SAVED_TOKENS)
}

export function rememberToken(
  list: SavedToken[],
  address: string,
  opts?: {
    symbol?: string
    decimals?: number
    label?: string
  },
): SavedToken[] {
  if (!isAddress(address) || isBlockedTipToken(address)) return list
  let checksum: string
  try {
    checksum = getAddress(address)
  } catch {
    return list
  }
  const key = checksum.toLowerCase()
  const prev = list.find((t) => t.address.toLowerCase() === key)
  const decimals =
    opts?.decimals !== undefined
      ? Math.max(0, Math.min(36, Math.round(Number(opts.decimals) || 18)))
      : prev?.decimals ?? 18
  const symbol =
    opts?.symbol !== undefined
      ? opts.symbol.trim().slice(0, 16) || prev?.symbol || 'TOKEN'
      : prev?.symbol || 'TOKEN'
  const label =
    opts?.label !== undefined
      ? opts.label.trim().slice(0, 48)
      : prev?.label || ''
  const rest = list.filter((t) => t.address.toLowerCase() !== key)
  return normalizeSavedTokens([
    {
      address: checksum,
      symbol,
      decimals,
      label,
      lastUsed: Date.now(),
    },
    ...rest,
  ])
}

/** Merge curated majors into the saved list (keeps any custom tokens). */
export function mergeTokenPresets(list: SavedToken[]): {
  list: SavedToken[]
  added: number
  updated: number
} {
  return mergePresetList(
    list.filter((t) => !isRetiredTipPreset(t.address)),
    TOKEN_PRESETS,
  )
}

/** Merge extra tip presets (MOST · PUMP · PornDai). */
export function mergeMemeTokenPresets(list: SavedToken[]): {
  list: SavedToken[]
  added: number
  updated: number
} {
  return mergePresetList(list, MEME_TOKEN_PRESETS)
}

/** Merge operator-style extras (TEXAN · LOAN · ATROPA · …). */
export function mergeExtraSavedTokenPresets(list: SavedToken[]): {
  list: SavedToken[]
  added: number
  updated: number
} {
  return mergePresetList(list, EXTRA_SAVED_TOKEN_PRESETS)
}

/** Keep operator-saved tip coins; do not inject curated suggestion presets. */
export function ensureBuiltinTipTokens(
  list: SavedToken[],
  hiddenTipCoins: string[] | null | undefined = [],
): SavedToken[] {
  const ban = new Set(
    (hiddenTipCoins || []).map((a) => String(a || '').trim().toLowerCase()).filter(Boolean),
  )
  const hiddenCustoms = list.filter((t) => ban.has(t.address.toLowerCase()))
  const visible = list.filter((t) => !ban.has(t.address.toLowerCase()))
  return normalizeSavedTokens([...visible, ...hiddenCustoms])
}

function mergePresetList(
  list: SavedToken[],
  presets: TokenPreset[],
): {
  list: SavedToken[]
  added: number
  updated: number
} {
  let next = list.slice()
  let added = 0
  let updated = 0
  for (const p of presets) {
    const key = p.address.toLowerCase()
    const prev = next.find((t) => t.address.toLowerCase() === key)
    if (prev) {
      updated++
      next = rememberToken(next, p.address, {
        symbol: p.symbol,
        decimals: p.decimals,
        label: p.label,
      })
    } else {
      added++
      next = rememberToken(next, p.address, {
        symbol: p.symbol,
        decimals: p.decimals,
        label: p.label,
      })
    }
  }
  return { list: normalizeSavedTokens(next), added, updated }
}

export function removeSavedToken(
  list: SavedToken[],
  address: string,
): SavedToken[] {
  if (!isAddress(address)) return list
  const key = address.toLowerCase()
  return list.filter((t) => t.address.toLowerCase() !== key)
}

export function tokenDisplayLabel(t: SavedToken): string {
  const key = t.address.toLowerCase()
  const preset =
    TOKEN_PRESETS.find((p) => p.address.toLowerCase() === key) ||
    STABLE_TOKEN_PRESETS.find((p) => p.address.toLowerCase() === key) ||
    MEME_TOKEN_PRESETS.find((p) => p.address.toLowerCase() === key) ||
    (key === PDAI_TIP_ADDRESS.toLowerCase() ? PDAI_TIP_PRESET : undefined) ||
    EXTRA_SAVED_TOKEN_PRESETS.find((p) => p.address.toLowerCase() === key) ||
    TANG_GANG_TOKEN_PRESETS.find((p) => p.address.toLowerCase() === key) ||
    EXTRA_TIP_BOARD_SUGGESTIONS.find((p) => p.address.toLowerCase() === key) ||
    TRENDING_TIP_BOARD_SUGGESTIONS.find((p) => p.address.toLowerCase() === key)
  if (preset?.label) return preset.label
  return t.label || t.symbol || shortAddress(t.address)
}
