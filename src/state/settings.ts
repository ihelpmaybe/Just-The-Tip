import {
  normalizeWatchedPools,
  type WatchedPool,
} from '../chain/pools'
import {
  normalizeWatchedBridges,
  type WatchedBridge,
} from '../chain/bridges'
import {
  normalizeWatchedChainLogs,
  type WatchedChainLog,
} from '../chain/chainLogs'
import {
  STORAGE_KEY,
  adoptCurrentDefaultRpcsIfStock,
  defaultRpcs,
  formatRpcList,
  normalizeChainKey,
  type ChainKey,
} from '../chain/config'
import type { DeviceBackend } from '../device/controller'
import {
  isPatternId,
  normalizePatternDefList,
  normalizePatternOverrides,
  rebuildPatterns,
  type PatternDef,
  type PatternId,
} from '../utils/patterns'
import {
  defaultPatternPrices,
  defaultPatternRatings,
  defaultShipDisabledPatterns,
  isMenuSort,
  normalizeDisabledPatterns,
  normalizeFeaturedPatterns,
  normalizePatternPrices,
  normalizePatternRatings,
  normalizeToyPatternPrices,
  ensureUniqueToyPatternPrices,
  pricesFromLegacyTiers,
  type MenuSort,
  type PatternPrices,
  type PatternRatings,
  type ToyPatternPrices,
} from '../utils/pricing'
import {
  normalizeSavedWallets,
  type SavedWallet,
} from './wallets'
import {
  ensureBuiltinTipTokens,
  isBlockedTipToken,
  isRetiredTipPreset,
  normalizeSavedTokens,
  STABLE_TIP_PRESET_ADDRESSES,
  type SavedToken,
} from './tokens'
import {
  migratePatternPricesToCoinRewards,
  normalizeCoinRewardRules,
  type CoinRewardRule,
} from './coinRewards'
import {
  normalizeToyIdentity,
  type ToyIdentityOverride,
} from '../utils/toyIdentity'
import { normalizeSavedToys } from '../utils/tipFilterToys'
import type { DeviceToy } from '@pulsefans/domain/types/device'
import {
  defaultOverlayStyle,
  normalizeOverlayStyle,
  type OverlayStyle,
} from '../overlay'
import {
  defaultOverlayQr,
  normalizeOverlayQr,
  type OverlayQr,
} from '../overlay/qrState'
import {
  defaultOverlayMenuStyle,
  normalizeOverlayMenuStyle,
  type OverlayMenuStyle,
} from '../overlay/menuStyle'

export type { SavedWallet }
export type { SavedToken }
export type { ToyIdentityOverride }
export type { CoinRewardRule }

export type Saved = {
  chainKey: ChainKey
  receive: string
  /** Previously used receive addresses */
  savedWallets: SavedWallet[]
  /** Multi-line RPC list (one URL per line). Empty → chain defaults. */
  rpcList: string
  minAmount: number
  tokenAddress: string
  tokenDecimals: number
  tokenSymbol: string
  /** Previously used ERC‑20 tip configs */
  savedTokens: SavedToken[]
  /**
   * Per-coin tip reward matrix (CSV-managed).
   * Each enabled row is for sale in that coin and can unlock its pattern.
   */
  coinRewardRules: CoinRewardRule[]
  /**
   * Bridged stables the operator accepts as tips (lowercased addresses).
   * Accepted stables tip by USD and unlock painted majors — no paint chips.
   */
  acceptedStables: string[]
  /**
   * Selected tip-coin chips for painting / badge cycling (lowercased addresses).
   * Empty = nothing whitelisted. Not derived from coinRewardRules on reload.
   */
  paintCoinKeys: string[]
  /**
   * Tip coins the operator hid from the board (lowercased addresses).
   * Builtins stay available until dismissed; ensureBuiltin will not re-add these.
   */
  hiddenTipCoins: string[]
  /**
   * When true, watch extra chain events (PulseX pairs, OmniBridge, custom logs).
   * Amounts are sized in each trigger's quote token for the tip ladder.
   */
  poolWatch: boolean
  pools: WatchedPool[]
  bridges: WatchedBridge[]
  chainLogs: WatchedChainLog[]
  backend: DeviceBackend
  intifaceUrl: string
  lovenseLocalIp: string
  lovenseAppId: string
  nightMode: boolean
  /**
   * Unused in UI (Fake a tip is the test path). Kept so old settings JSON still loads.
   */
  dryRun: boolean
  queueGapMs: number
  maxQueue: number
  pollMs: number
  /**
   * Operator had Start watching on. Reload must resume the chain watcher
   * immediately — a show cannot wait on toys to finish GATT.
   */
  watchLive: boolean
  /** Epoch ms when the current watch stretch began (survives reload). */
  watchLiveSince: number
  /**
   * Operator had toys linked. Reload reconnects Connect / Bluetooth / Intiface
   * until they hit Disconnect (Connect itself stays running on the phone).
   */
  hardwareLive: boolean
  /** Selected pattern (menu default) */
  defaultPattern: PatternId
  /** Tip price per pattern id */
  patternPrices: PatternPrices
  /**
   * Per linked toy tip overrides (toyId → pattern → price).
   * Use when two performers / two of the same device charge differently.
   */
  toyPatternPrices: ToyPatternPrices
  /** Your rating 0–5 per pattern id */
  patternRatings: PatternRatings
  /** Pattern ids not used for tip matching */
  disabledPatterns: string[]
  /** Pattern ids highlighted (brighter) on tip menu export */
  featuredPatterns: string[]
  /** Toy ids excluded from buzz (Lovense / Intiface) */
  disabledToys: string[]
  /**
   * Per-toy motor subset (1-based indices). Missing id or empty = both/all.
   * Example: { "abc": [1] } buzzes only motor 1 on that Gemini.
   */
  toyMotorMasks: Record<string, number[]>
  /**
   * BLE / device id → model reassignment (advertised N0104 → Gemini, etc.).
   * Also keys like mac:aabbccddeeff when DeviceType reported a MAC.
   */
  toyIdentity: Record<string, ToyIdentityOverride>
  /**
   * Last linked hardware (Home + tip-menu tabs). Survives reload while
   * Bluetooth / Connect is still reconnecting. Catalog filter: ids stay out.
   */
  savedToys: DeviceToy[]
  /** Tip menu sort */
  menuSort: MenuSort
  /** Tip menu scale range in USD (what the operator typed, not the ladder) */
  menuUsdLo: number
  menuUsdHi: number
  /** Per-toy USD scale endpoints (active toy tab overrides the globals) */
  toyMenuUsd: Record<string, { lo: number; hi: number }>
  /**
   * Max vibration strength ceiling (1–8 Lovense scale) for the shared menu.
   * Per-toy overrides live in toyMaxVibe.
   */
  menuMaxVibe: number
  /** Per-toy max vibe (1–8). Missing toy → menuMaxVibe. */
  toyMaxVibe: Record<string, number>
  /**
   * Tip menu: when true, ignore toy ticks and show every pattern.
   * When false, filter by menuFilterToyIds (union of their channels).
   */
  menuFilterFullCatalog: boolean
  /** null = auto (currently connected hardware only). [] = none ticked. */
  menuFilterToyIds: string[] | null
  /** OBS / stream tip alert look */
  overlayStyle: OverlayStyle
  /** OBS tip QR panel look (address always synced from receive) */
  overlayQr: OverlayQr
  /** OBS tip-menu board look (always-on price list) */
  overlayMenu: OverlayMenuStyle
  /** User-created patterns (ids not in catalog) */
  customPatterns: PatternDef[]
  /** Built-in patterns you edited */
  patternOverrides: Record<string, PatternDef>
}

export const defaults: Saved = {
  chainKey: 'pulsechain',
  receive: '',
  savedWallets: [],
  rpcList: formatRpcList(defaultRpcs('pulsechain')),
  minAmount: 0,
  tokenAddress: '',
  tokenDecimals: 18,
  tokenSymbol: 'TOKEN',
  savedTokens: [],
  coinRewardRules: [],
  acceptedStables: [],
  paintCoinKeys: [],
  hiddenTipCoins: [],
  poolWatch: false,
  pools: [],
  bridges: [],
  chainLogs: [],
  backend: 'lovense',
  intifaceUrl: 'ws://127.0.0.1:12345',
  lovenseLocalIp: '',
  lovenseAppId: '',
  nightMode: true,
  dryRun: false,
  queueGapMs: 450,
  maxQueue: 64,
  pollMs: 4000,
  watchLive: false,
  watchLiveSince: 0,
  hardwareLive: true,
  defaultPattern: 'wave',
  patternPrices: defaultPatternPrices(),
  toyPatternPrices: {},
  patternRatings: defaultPatternRatings(),
  disabledPatterns: defaultShipDisabledPatterns(),
  featuredPatterns: [],
  disabledToys: [],
  toyMotorMasks: {},
  toyIdentity: {},
  savedToys: [],
  menuSort: 'duration-asc',
  menuUsdLo: 3.69,
  menuUsdHi: 55.55,
  toyMenuUsd: {},
  menuMaxVibe: 8,
  toyMaxVibe: {},
  menuFilterFullCatalog: false,
  menuFilterToyIds: null,
  overlayStyle: structuredClone(defaultOverlayStyle),
  overlayQr: structuredClone(defaultOverlayQr),
  overlayMenu: structuredClone(defaultOverlayMenuStyle),
  customPatterns: [],
  patternOverrides: {},
}

function normalizeToyMotorMasks(v: unknown): Record<string, number[]> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Record<string, number[]> = {}
  for (const [id, arr] of Object.entries(v as Record<string, unknown>)) {
    if (!id || typeof id !== 'string' || !Array.isArray(arr)) continue
    const motors = [
      ...new Set(
        arr
          .map((n) => Math.round(Number(n)))
          .filter((m) => m === 1 || m === 2 || m === 3),
      ),
    ].sort()
    if (motors.length) out[id] = motors
  }
  return out
}

export function clampInt(
  v: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

/** Tip scale endpoints are real dollars — keep them sane, in cents. */
function clampUsdTip(v: unknown, fallback: number): number {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(1_000_000, Math.round(n * 100) / 100)
}

function normalizeAddrList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const row of raw) {
    const key = String(row || '')
      .trim()
      .toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(key)
    if (out.length >= 48) break
  }
  return out
}

/** Native gas coin paint key in storage (runtime key is ''). */
export const NATIVE_PAINT_COIN_KEY = 'native'

/** Paint whitelist — keeps the native sentinel; addresses lowercased. */
export function normalizePaintCoinKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const row of raw) {
    const key = String(row ?? '')
      .trim()
      .toLowerCase()
    if (!key || seen.has(key)) continue
    if (key !== NATIVE_PAINT_COIN_KEY && isRetiredTipPreset(key)) continue
    seen.add(key)
    out.push(key)
    if (out.length >= 48) break
  }
  return out
}

/** Only the three known bridged stables may appear in acceptedStables. */
function normalizeAcceptedStables(raw: unknown, legacyAll?: boolean): string[] {
  if (Array.isArray(raw)) {
    return normalizeAddrList(raw).filter((a) => STABLE_TIP_PRESET_ADDRESSES.has(a))
  }
  // Migrate old acceptStables boolean — false stays empty; true/undefined no longer auto-enables.
  if (legacyAll === true) return [...STABLE_TIP_PRESET_ADDRESSES]
  return []
}

/** True when a bridged stable is on the paint whitelist (selected chip). */
export function isAcceptedStableTip(
  paintOrAccepted: string[] | null | undefined,
  address: string | null | undefined,
): boolean {
  const key = String(address || '')
    .trim()
    .toLowerCase()
  if (!key || !STABLE_TIP_PRESET_ADDRESSES.has(key)) return false
  return (paintOrAccepted || []).some(
    (a) =>
      String(a || '')
        .trim()
        .toLowerCase() === key,
  )
}

/** Lovense-style strength ceiling for tip patterns (1 = soft … 8 = full). */
export function clampMenuMaxVibe(v: unknown, fallback = 8): number {
  return clampInt(v, 1, 8, fallback)
}

function normalizeToyMaxVibe(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, number> = {}
  for (const [toyId, value] of Object.entries(raw as Record<string, unknown>)) {
    const id = String(toyId || '').trim()
    if (!id) continue
    out[id] = clampMenuMaxVibe(value, 8)
  }
  return out
}

export function resolveToyMaxVibe(
  toyId: string | undefined,
  saved: Pick<Saved, 'menuMaxVibe' | 'toyMaxVibe'>,
): number {
  const global = clampMenuMaxVibe(saved.menuMaxVibe, defaults.menuMaxVibe)
  if (toyId) {
    const row = saved.toyMaxVibe?.[toyId]
    if (row != null) return clampMenuMaxVibe(row, global)
  }
  return global
}

function normalizeToyMenuUsd(
  raw: unknown,
): Record<string, { lo: number; hi: number }> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, { lo: number; hi: number }> = {}
  for (const [toyId, row] of Object.entries(raw as Record<string, unknown>)) {
    const id = String(toyId || '').trim()
    if (!id || !row || typeof row !== 'object' || Array.isArray(row)) continue
    const r = row as { lo?: unknown; hi?: unknown }
    const lo = clampUsdTip(r.lo, defaults.menuUsdLo)
    const hi = clampUsdTip(r.hi, defaults.menuUsdHi)
    out[id] = { lo, hi: Math.max(lo, hi) }
  }
  return out
}

/** Load-time blob may still carry old field names. */
type Blob = Partial<Saved> & {
  lovenseUrl?: string
  rpcUrl?: string
  priceTiers?: unknown
  intensity?: unknown
  usePriceTiers?: unknown
}

/** Normalize raw/partial settings (localStorage or import file). */
export function mergeSaved(
  partial: Blob,
  previous: Saved = defaults,
): Saved {
  let rpcList = partial.rpcList
  if (!rpcList && partial.rpcUrl) rpcList = partial.rpcUrl
  if (!rpcList) {
    rpcList =
      previous.rpcList ||
      formatRpcList(
        defaultRpcs(
          normalizeChainKey(partial.chainKey ?? previous.chainKey),
        ),
      )
  }
  rpcList = adoptCurrentDefaultRpcsIfStock(String(rpcList || ''))

  let patternPrices: PatternPrices
  if (
    partial.patternPrices &&
    typeof partial.patternPrices === 'object' &&
    !Array.isArray(partial.patternPrices)
  ) {
    patternPrices = normalizePatternPrices(partial.patternPrices)
  } else {
    patternPrices =
      pricesFromLegacyTiers(partial.priceTiers) ?? defaultPatternPrices()
  }

  const merged: Saved = {
    chainKey: normalizeChainKey(
      partial.chainKey ?? previous.chainKey ?? defaults.chainKey,
    ),
    receive: partial.receive ?? previous.receive ?? '',
    savedWallets: normalizeSavedWallets(
      partial.savedWallets ?? previous.savedWallets,
    ),
    rpcList,
    minAmount: Number(partial.minAmount ?? previous.minAmount) || 0,
    tokenAddress: (() => {
      const addr = partial.tokenAddress ?? previous.tokenAddress ?? ''
      return isBlockedTipToken(addr) ? '' : addr
    })(),
    tokenDecimals: Number(partial.tokenDecimals ?? previous.tokenDecimals) || 18,
    tokenSymbol: (() => {
      const addr = partial.tokenAddress ?? previous.tokenAddress ?? ''
      if (isBlockedTipToken(addr)) return 'PLS'
      return partial.tokenSymbol || previous.tokenSymbol || 'TOKEN'
    })(),
    savedTokens: ensureBuiltinTipTokens(
      normalizeSavedTokens(partial.savedTokens ?? previous.savedTokens),
      partial.hiddenTipCoins ?? previous.hiddenTipCoins,
    ),
    coinRewardRules: (() => {
      if (Object.prototype.hasOwnProperty.call(partial, 'coinRewardRules')) {
        return normalizeCoinRewardRules(partial.coinRewardRules)
      }
      const fromPrev = normalizeCoinRewardRules(previous.coinRewardRules)
      if (fromPrev.length) return fromPrev
      // One-shot migration: seed matrix from the old single-token ladder.
      return migratePatternPricesToCoinRewards({
        patternPrices,
        tokenAddress: partial.tokenAddress ?? previous.tokenAddress ?? '',
        tokenSymbol: partial.tokenSymbol || previous.tokenSymbol || 'TOKEN',
        existing: [],
      })
    })(),
    acceptedStables: normalizeAcceptedStables(
      (partial as { acceptedStables?: unknown }).acceptedStables ??
        (previous as { acceptedStables?: unknown }).acceptedStables,
      (partial as { acceptStables?: unknown }).acceptStables !== undefined
        ? Boolean((partial as { acceptStables?: unknown }).acceptStables)
        : (previous as { acceptStables?: unknown }).acceptStables !== undefined
          ? Boolean((previous as { acceptStables?: unknown }).acceptStables)
          : undefined,
    ),
    paintCoinKeys: normalizePaintCoinKeys(
      partial.paintCoinKeys ?? previous.paintCoinKeys,
    ),
    hiddenTipCoins: normalizeAddrList(
      partial.hiddenTipCoins ?? previous.hiddenTipCoins,
    ),
    poolWatch:
      partial.poolWatch === undefined
        ? Boolean(previous.poolWatch)
        : Boolean(partial.poolWatch),
    pools: normalizeWatchedPools(
      partial.pools !== undefined ? partial.pools : previous.pools,
    ),
    bridges: normalizeWatchedBridges(
      (partial as { bridges?: unknown }).bridges !== undefined
        ? (partial as { bridges?: unknown }).bridges
        : (previous as { bridges?: unknown }).bridges,
    ),
    chainLogs: normalizeWatchedChainLogs(
      (partial as { chainLogs?: unknown }).chainLogs !== undefined
        ? (partial as { chainLogs?: unknown }).chainLogs
        : (previous as { chainLogs?: unknown }).chainLogs,
    ),
    backend: (() => {
      const raw = String(
        (partial.backend as string) || previous.backend || 'lovense',
      ).trim()
      if (raw === 'bluetooth' || raw === 'ble' || raw === 'toy')
        return 'bluetooth' as DeviceBackend
      if (raw === 'lovense') return 'lovense' as DeviceBackend
      if (raw === 'lovense-remote' || raw === 'remote')
        return 'lovense-remote' as DeviceBackend
      if (raw === 'intiface') return 'intiface' as DeviceBackend
      // Retired Preview (fake toy) and local emu → Connect
      return 'lovense' as DeviceBackend
    })(),
    intifaceUrl: partial.intifaceUrl || previous.intifaceUrl || defaults.intifaceUrl,
    lovenseLocalIp: (() => {
      const ip = String(
        partial.lovenseLocalIp ||
          partial.lovenseUrl ||
          previous.lovenseLocalIp ||
          defaults.lovenseLocalIp ||
          '',
      ).trim()
      // Drop leftover loopback — that only applied to the retired local emulator
      if (
        /^127\.0\.0\.1\b/i.test(ip) ||
        /^localhost\b/i.test(ip) ||
        /\/\/127\.0\.0\.1\b/i.test(ip) ||
        /\/\/localhost\b/i.test(ip)
      ) {
        return ''
      }
      return ip
    })(),
    lovenseAppId: partial.lovenseAppId ?? previous.lovenseAppId ?? '',
    nightMode: partial.nightMode !== false,
    dryRun: false,
    queueGapMs: clampInt(partial.queueGapMs, 0, 10_000, defaults.queueGapMs),
    maxQueue: clampInt(partial.maxQueue, 1, 256, defaults.maxQueue),
    pollMs: clampInt(partial.pollMs, 1500, 30_000, defaults.pollMs),
    watchLive: Boolean(
      partial.watchLive ?? previous.watchLive ?? defaults.watchLive,
    ),
    watchLiveSince: clampInt(
      partial.watchLiveSince ?? previous.watchLiveSince,
      0,
      Number.MAX_SAFE_INTEGER,
      0,
    ),
    hardwareLive: Boolean(
      partial.hardwareLive ?? previous.hardwareLive ?? defaults.hardwareLive,
    ),
    defaultPattern:
      (typeof partial.defaultPattern === 'string'
        ? partial.defaultPattern
        : previous.defaultPattern) || defaults.defaultPattern,
    patternPrices,
    toyPatternPrices: normalizeToyPatternPrices(
      partial.toyPatternPrices ?? previous.toyPatternPrices,
    ),
    patternRatings: normalizePatternRatings(
      partial.patternRatings ?? previous.patternRatings,
    ),
    disabledPatterns: Array.isArray(partial.disabledPatterns)
      ? (partial.disabledPatterns as string[]).filter((x) => typeof x === 'string')
      : previous.disabledPatterns?.length
        ? [...previous.disabledPatterns]
        : defaults.disabledPatterns,
    featuredPatterns: Array.isArray(partial.featuredPatterns)
      ? (partial.featuredPatterns as string[]).filter((x) => typeof x === 'string')
      : previous.featuredPatterns?.length
        ? [...previous.featuredPatterns]
        : [],
    disabledToys: Array.isArray(partial.disabledToys)
      ? (partial.disabledToys as string[]).filter(
          (x) => typeof x === 'string' && x.trim(),
        )
      : previous.disabledToys?.length
        ? [...previous.disabledToys]
        : [],
    toyMotorMasks: normalizeToyMotorMasks(
      partial.toyMotorMasks ?? previous.toyMotorMasks,
    ),
    toyIdentity: normalizeToyIdentity(
      partial.toyIdentity ?? previous.toyIdentity,
    ),
    savedToys: normalizeSavedToys(partial.savedToys ?? previous.savedToys),
    menuSort: isMenuSort(partial.menuSort)
      ? partial.menuSort
      : isMenuSort(previous.menuSort)
        ? previous.menuSort
        : defaults.menuSort,
    menuUsdLo: clampUsdTip(
      partial.menuUsdLo ?? previous.menuUsdLo,
      defaults.menuUsdLo,
    ),
    menuUsdHi: clampUsdTip(
      partial.menuUsdHi ?? previous.menuUsdHi,
      defaults.menuUsdHi,
    ),
    toyMenuUsd: normalizeToyMenuUsd(
      partial.toyMenuUsd ?? previous.toyMenuUsd,
    ),
    menuMaxVibe: clampMenuMaxVibe(
      partial.menuMaxVibe ?? previous.menuMaxVibe,
      defaults.menuMaxVibe,
    ),
    toyMaxVibe: normalizeToyMaxVibe(
      partial.toyMaxVibe ?? previous.toyMaxVibe,
    ),
    menuFilterFullCatalog: (() => {
      if (partial.menuFilterFullCatalog !== undefined) {
        return Boolean(partial.menuFilterFullCatalog)
      }
      // migrate old string filter
      const legacy =
        (partial as { menuToyFilter?: string }).menuToyFilter ??
        (previous as { menuToyFilter?: string }).menuToyFilter
      if (legacy === '') return true
      return Boolean(previous.menuFilterFullCatalog)
    })(),
    menuFilterToyIds: (() => {
      if (partial.menuFilterToyIds === null) return null
      if (Array.isArray(partial.menuFilterToyIds)) {
        return (partial.menuFilterToyIds as string[]).filter(
          (x) => typeof x === 'string' && x.trim(),
        )
      }
      if (previous.menuFilterToyIds === null) return null
      if (Array.isArray(previous.menuFilterToyIds)) {
        return [...previous.menuFilterToyIds]
      }
      const legacy =
        (partial as { menuToyFilter?: string }).menuToyFilter ??
        (previous as { menuToyFilter?: string }).menuToyFilter
      if (legacy === '*') return null
      if (typeof legacy === 'string' && legacy && legacy !== '') {
        return [legacy]
      }
      return null
    })(),
    overlayStyle: normalizeOverlayStyle(
      partial.overlayStyle ?? previous.overlayStyle ?? defaultOverlayStyle,
    ),
    overlayQr: normalizeOverlayQr(
      partial.overlayQr ?? previous.overlayQr ?? defaultOverlayQr,
    ),
    overlayMenu: normalizeOverlayMenuStyle(
      partial.overlayMenu ?? previous.overlayMenu ?? defaultOverlayMenuStyle,
    ),
    customPatterns: normalizePatternDefList(
      partial.customPatterns ?? previous.customPatterns,
    ),
    patternOverrides: normalizePatternOverrides(
      partial.patternOverrides ?? previous.patternOverrides,
    ),
  }

  rebuildPatterns(merged.customPatterns, merged.patternOverrides)
  merged.patternPrices = normalizePatternPrices(merged.patternPrices)
  merged.toyPatternPrices = ensureUniqueToyPatternPrices(
    merged.patternPrices,
    normalizeToyPatternPrices(merged.toyPatternPrices),
  )
  merged.patternRatings = normalizePatternRatings(merged.patternRatings)
  merged.disabledPatterns = normalizeDisabledPatterns(merged.disabledPatterns)
  merged.featuredPatterns = normalizeFeaturedPatterns(merged.featuredPatterns)
  if (!isPatternId(merged.defaultPattern)) {
    merged.defaultPattern = defaults.defaultPattern
  }
  return merged
}

function applyPatternCatalog(s: Saved): Saved {
  rebuildPatterns(s.customPatterns, s.patternOverrides)
  s.patternPrices = normalizePatternPrices(s.patternPrices)
  s.toyPatternPrices = ensureUniqueToyPatternPrices(
    s.patternPrices,
    normalizeToyPatternPrices(s.toyPatternPrices),
  )
  s.patternRatings = normalizePatternRatings(s.patternRatings)
  return s
}

export function loadSettings(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const d = structuredClone(defaults)
      d.savedTokens = ensureBuiltinTipTokens(d.savedTokens)
      return applyPatternCatalog(d)
    }
    const merged = applyPatternCatalog(mergeSaved(JSON.parse(raw) as Blob))
    return merged
  } catch {
    const d = structuredClone(defaults)
    d.savedTokens = ensureBuiltinTipTokens(d.savedTokens)
    return applyPatternCatalog(d)
  }
}

export function saveSettings(s: Saved): boolean {
  rebuildPatterns(s.customPatterns, s.patternOverrides)
  // Never persist tip-menu SVG snapshots in overlayQr — bloats storage and can
  // QuotaExceeded → reload keeps the last good write; surface failures in UI.
  const overlayQr = normalizeOverlayQr({
    ...(s.overlayQr || defaultOverlayQr),
    menuOffers: [],
  })
  const clean: Saved = {
    chainKey: s.chainKey,
    receive: s.receive,
    savedWallets: normalizeSavedWallets(s.savedWallets),
    rpcList: s.rpcList,
    minAmount: s.minAmount,
    tokenAddress: isBlockedTipToken(s.tokenAddress) ? '' : s.tokenAddress,
    tokenDecimals: s.tokenDecimals,
    tokenSymbol: isBlockedTipToken(s.tokenAddress)
      ? 'PLS'
      : s.tokenSymbol,
    savedTokens: ensureBuiltinTipTokens(
      normalizeSavedTokens(s.savedTokens),
      s.hiddenTipCoins,
    ),
    coinRewardRules: normalizeCoinRewardRules(s.coinRewardRules),
    acceptedStables: normalizeAcceptedStables(s.acceptedStables),
    paintCoinKeys: normalizePaintCoinKeys(s.paintCoinKeys),
    hiddenTipCoins: normalizeAddrList(s.hiddenTipCoins),
    poolWatch: Boolean(s.poolWatch),
    pools: normalizeWatchedPools(s.pools),
    bridges: normalizeWatchedBridges(s.bridges),
    chainLogs: normalizeWatchedChainLogs(s.chainLogs),
    backend: s.backend,
    intifaceUrl: s.intifaceUrl,
    lovenseLocalIp: s.lovenseLocalIp,
    lovenseAppId: s.lovenseAppId,
    nightMode: s.nightMode,
    dryRun: false,
    queueGapMs: s.queueGapMs,
    maxQueue: s.maxQueue,
    pollMs: s.pollMs,
    watchLive: Boolean(s.watchLive),
    watchLiveSince: clampInt(s.watchLiveSince, 0, Number.MAX_SAFE_INTEGER, 0),
    hardwareLive: s.hardwareLive !== false,
    defaultPattern: s.defaultPattern,
    patternPrices: normalizePatternPrices(s.patternPrices),
    toyPatternPrices: ensureUniqueToyPatternPrices(
      normalizePatternPrices(s.patternPrices),
      normalizeToyPatternPrices(s.toyPatternPrices),
    ),
    patternRatings: s.patternRatings,
    disabledPatterns: s.disabledPatterns,
    featuredPatterns: s.featuredPatterns,
    disabledToys: s.disabledToys,
    toyMotorMasks: normalizeToyMotorMasks(s.toyMotorMasks),
    toyIdentity: normalizeToyIdentity(s.toyIdentity),
    savedToys: normalizeSavedToys(s.savedToys),
    menuSort: s.menuSort,
    menuUsdLo: clampUsdTip(s.menuUsdLo, defaults.menuUsdLo),
    menuUsdHi: clampUsdTip(s.menuUsdHi, defaults.menuUsdHi),
    toyMenuUsd: normalizeToyMenuUsd(s.toyMenuUsd),
    menuMaxVibe: clampMenuMaxVibe(s.menuMaxVibe, defaults.menuMaxVibe),
    toyMaxVibe: normalizeToyMaxVibe(s.toyMaxVibe),
    menuFilterFullCatalog: Boolean(s.menuFilterFullCatalog),
    menuFilterToyIds:
      s.menuFilterToyIds === null
        ? null
        : Array.isArray(s.menuFilterToyIds)
          ? s.menuFilterToyIds.filter((x) => typeof x === 'string' && x.trim())
          : null,
    overlayStyle: normalizeOverlayStyle(s.overlayStyle),
    overlayQr,
    overlayMenu: normalizeOverlayMenuStyle(s.overlayMenu),
    customPatterns: s.customPatterns,
    patternOverrides: s.patternOverrides,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
    return true
  } catch (e) {
    // Quota or private mode — keep in-memory state; try a slimmer write once.
    console.warn('[settings] localStorage save failed', e)
    try {
      const slim = {
        ...clean,
        patternOverrides: {},
        customPatterns: clean.customPatterns.slice(0, 32),
        overlayQr: normalizeOverlayQr({
          ...clean.overlayQr,
          menuOffers: [],
        }),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
      return true
    } catch {
      return false
    }
  }
}
