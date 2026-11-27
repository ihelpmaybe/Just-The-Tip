/**
 * Per-coin tip reward matrix: each row is coin + pattern + USD target.
 * Live token amounts are derived from PulseChain USD quotes at use time.
 */
import { getAddress, isAddress } from 'viem'
import { getPattern, isPatternId, type PatternId } from '../utils/patterns'
import {
  ensureUniquePriceSheet,
  patternTieBreak,
  pricesEqual,
  resolveSkuPrice,
  roundUsdTarget,
  usdTargetStep,
} from '../utils/pricing'
import { isBlockedTipToken, isRetiredTipPreset } from './tokens'

export type CoinRewardRule = {
  id: string
  /** Display label (HEX, eUSDC, …) */
  coin: string
  /** Checksummed ERC-20, or empty string for native PLS */
  tokenAddress: string
  patternId: PatternId
  /** USD target for this reward row */
  usdTarget: number
  enabled: boolean
  /** Optional linked toy ids; empty = any tip-ready toy that fits the pattern */
  toyIds: string[]
}

export type CoinRewardCsvParseResult = {
  rules: CoinRewardRule[]
  errors: string[]
  warnings: string[]
}

const NATIVE = ''

/**
 * One row per coin×pattern (toyIds merge on the same key). Auto-split across
 * many toys needs coins×fitting-patterns rows — the old 400 cap silently
 * dropped later toys once ~4 vibrate catalogs were painted.
 * Budget: ~12 tip coins × ~200 patterns, plus headroom.
 */
export const MAX_COIN_REWARD_RULES = 3000

function newRuleId(): string {
  return `cr_${Math.random().toString(36).slice(2, 10)}`
}

function clip(s: string, n: number): string {
  return String(s || '')
    .trim()
    .slice(0, n)
}

export function createCoinRewardRule(
  partial: Partial<CoinRewardRule> & {
    coin?: string
    patternId?: string
    usdTarget?: number
  },
): CoinRewardRule | null {
  const patternId = String(partial.patternId || '').trim()
  if (!patternId || !isPatternId(patternId)) return null
  const usd = Number(partial.usdTarget)
  if (!Number.isFinite(usd) || usd < 0) return null
  const rawAddr = String(partial.tokenAddress || '').trim()
  let tokenAddress = NATIVE
  if (rawAddr) {
    if (!isAddress(rawAddr)) return null
    tokenAddress = getAddress(rawAddr)
  }
  const toyIds = Array.isArray(partial.toyIds)
    ? partial.toyIds
        .map((id) => String(id || '').trim())
        .filter(Boolean)
        .slice(0, 12)
    : []
  return {
    id: clip(String(partial.id || ''), 48) || newRuleId(),
    coin: clip(String(partial.coin || ''), 32) || (tokenAddress ? 'TOKEN' : 'PLS'),
    tokenAddress,
    patternId: patternId as PatternId,
    usdTarget: Math.min(1_000_000, usd),
    enabled: partial.enabled === undefined ? true : Boolean(partial.enabled),
    toyIds,
  }
}

export function normalizeCoinRewardRules(raw: unknown): CoinRewardRule[] {
  if (!Array.isArray(raw)) return []
  const out: CoinRewardRule[] = []
  const seen = new Set<string>()
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const rule = createCoinRewardRule(row as Partial<CoinRewardRule>)
    if (!rule) continue
    if (isBlockedTipToken(rule.tokenAddress)) continue
    if (isRetiredTipPreset(rule.tokenAddress)) continue
    const key = `${rule.tokenAddress.toLowerCase()}|${rule.patternId}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(rule)
    if (out.length >= MAX_COIN_REWARD_RULES) break
  }
  return ensureUniqueCoinRewardRules(out)
}

/** Unique configured tip tokens (empty string = native PLS). */
export function coinRewardTokenAddresses(rules: CoinRewardRule[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const rule of rules) {
    if (!rule.enabled) continue
    const key = rule.tokenAddress.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(rule.tokenAddress)
  }
  return out
}

export function enabledCoinRewardRules(rules: CoinRewardRule[]): CoinRewardRule[] {
  return (rules || []).filter((r) => r.enabled && r.usdTarget >= 0)
}

/**
 * Brand paint skins for tip coins. Gradients follow the published brand kits
 * (hex.com/downloads, pulsex.com/brand).
 * - pls: PulseChain gradient
 * - plsx: PulseX red + green candles
 * - hex: HEX main gradient (yellow → orange → red → pink → magenta)
 * - pump: pump.tires neon green (#00ff00)
 * - stable: white (eUSDC / eUSDT / eDAI)
 * - hue: solid hsl(--coin-hue) for everything else
 */
export type CoinPaintSkin = 'hue' | 'pls' | 'plsx' | 'hex' | 'pump' | 'stable'

/** Distinct fallback hues so unknown tip coins stay visually separate. */
export const COIN_COLOR_HUES = [
  190, 28, 145, 320, 48, 250, 8, 170, 85, 210, 340, 115,
] as const

const COIN_PAINT: Readonly<
  Record<string, { skin: CoinPaintSkin; hue: number }>
> = {
  native: { skin: 'pls', hue: 188 },
  // PLSX — red/green
  '0x95b303987a60c71504d99aa1b13b4da07b0790ab': { skin: 'plsx', hue: 0 },
  // HEX (PulseChain)
  '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39': { skin: 'hex', hue: 172 },
  // stables — white
  '0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07': { skin: 'stable', hue: 0 },
  '0x0cb6f5a34ad42ec934882a05265a7d5f59b51a2f': { skin: 'stable', hue: 0 },
  '0xefd766ccb38eaf1dfd701853bfce31359239f305': { skin: 'stable', hue: 0 },
  // ProveX — orange
  '0xf6f8db0aba00007681f8faf16a0fda1c9b030b11': { skin: 'hue', hue: 28 },
  // INC — lime
  '0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d': { skin: 'hue', hue: 128 },
  // PUMP — pump.tires neon green
  '0xec4252e62c6de3d655ca9ce3afc12e553ebba274': { skin: 'pump', hue: 120 },
  // PornDai — gold (fork DAI, not the bridged ~$1 eDAI)
  '0x6b175474e89094c44da98b954eedeac495271d0f': { skin: 'hue', hue: 48 },
}

export function coinPaintSkin(
  tokenAddress: string | null | undefined,
): CoinPaintSkin {
  const key = String(tokenAddress || '')
    .trim()
    .toLowerCase() || 'native'
  return COIN_PAINT[key]?.skin || 'hue'
}

export function coinColorHue(tokenAddress: string | null | undefined): number {
  const key = String(tokenAddress || '')
    .trim()
    .toLowerCase() || 'native'
  const branded = COIN_PAINT[key]
  if (branded) return branded.hue
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return COIN_COLOR_HUES[hash % COIN_COLOR_HUES.length]!
}

function ruleKey(tokenAddress: string, patternId: string): string {
  return `${String(tokenAddress || '').toLowerCase()}|${patternId}`
}

function mergeToyIds(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b].map((id) => String(id || '').trim()).filter(Boolean))].slice(
    0,
    12,
  )
}

function coinRewardSheetToyIds(
  rules: CoinRewardRule[],
  extraToyIds?: string[],
): string[] {
  const toys = new Set<string>([''])
  for (const rule of rules) {
    for (const toyId of rule.toyIds) toys.add(toyId)
  }
  for (const toyId of extraToyIds || []) {
    const id = String(toyId || '').trim()
    if (id) toys.add(id)
  }
  return [...toys].sort((a, b) => a.localeCompare(b))
}

function coinRewardRulesOnSheet(
  rules: CoinRewardRule[],
  tokenAddress: string,
  toyId: string,
): Array<{ idx: number; rule: CoinRewardRule }> {
  const tokenKey = String(tokenAddress || '').toLowerCase()
  const out: Array<{ idx: number; rule: CoinRewardRule }> = []
  for (let idx = 0; idx < rules.length; idx++) {
    const rule = rules[idx]!
    if (!rule.enabled) continue
    if (rule.tokenAddress.toLowerCase() !== tokenKey) continue
    if (toyId) {
      if (rule.toyIds.length && !rule.toyIds.includes(toyId)) continue
    } else if (rule.toyIds.length) {
      continue
    }
    out.push({ idx, rule })
  }
  return out
}

export type EnsureUniqueCoinRulesOpts = {
  extraToyIds?: string[]
  quotes?: Record<string, number | null | undefined>
  decimalsByToken?: Record<string, number>
}

function normalizeEnsureUniqueCoinOpts(
  arg?: string[] | EnsureUniqueCoinRulesOpts,
): EnsureUniqueCoinRulesOpts {
  if (Array.isArray(arg)) return { extraToyIds: arg }
  return arg || {}
}

function ensureUniqueCoinRewardTokenAmounts(
  out: CoinRewardRule[],
  tokenKey: string,
  toyId: string,
  quotes: Record<string, number | null | undefined>,
  decimalsByToken: Record<string, number>,
): void {
  const sheet = coinRewardRulesOnSheet(out, tokenKey, toyId)
  if (sheet.length < 2) return
  const usdPer = quotes[tokenKey]
  if (usdPer == null || !Number.isFinite(usdPer) || usdPer <= 0) return
  const decimals = decimalsByToken[tokenKey] ?? 18
  const entries = sheet.map(({ rule }) => {
    const amount =
      usdTargetToTokenAmount(rule.usdTarget, usdPer, decimals) ?? rule.usdTarget
    return { id: rule.patternId, price: amount }
  })
  const unique = ensureUniquePriceSheet(entries)
  for (const { idx, rule } of sheet) {
    const targetAmt = unique[rule.patternId]
    if (targetAmt == null) continue
    const currentAmt = usdTargetToTokenAmount(
      out[idx]!.usdTarget,
      usdPer,
      decimals,
    )
    if (currentAmt != null && pricesEqual(currentAmt, targetAmt)) continue
    const nextUsd = roundUsdTarget(targetAmt * usdPer)
    if (!pricesEqual(nextUsd, out[idx]!.usdTarget)) {
      out[idx] = { ...out[idx]!, usdTarget: nextUsd }
    }
  }
}

/**
 * Auto-bump duplicate USD targets within each toy+coin paint sheet so
 * unit+coin stays a real SKU for overlays, menus, and exports.
 */
export function ensureUniqueCoinRewardRules(
  rules: CoinRewardRule[],
  opts?: string[] | EnsureUniqueCoinRulesOpts,
): CoinRewardRule[] {
  const { extraToyIds, quotes, decimalsByToken } =
    normalizeEnsureUniqueCoinOpts(opts)
  const out = (rules || []).map((rule) => ({ ...rule, toyIds: [...rule.toyIds] }))
  const tokens = [
    ...new Set(out.map((rule) => rule.tokenAddress.toLowerCase())),
  ].sort()
  const toys = coinRewardSheetToyIds(out, extraToyIds)
  const sheetOpts = {
    round: roundUsdTarget,
    step: usdTargetStep,
    tieBreak: patternTieBreak,
  }
  for (const tokenKey of tokens) {
    for (const toyId of toys) {
      const sheet = coinRewardRulesOnSheet(out, tokenKey, toyId)
      if (sheet.length < 2) continue
      const unique = ensureUniquePriceSheet(
        sheet.map(({ rule }) => ({
          id: rule.patternId,
          price: rule.usdTarget,
        })),
        sheetOpts,
      )
      for (const { idx, rule } of sheet) {
        const next = unique[rule.patternId]
        if (next == null || pricesEqual(next, rule.usdTarget)) continue
        out[idx] = { ...out[idx]!, usdTarget: next }
      }
      if (quotes && decimalsByToken) {
        ensureUniqueCoinRewardTokenAmounts(
          out,
          tokenKey,
          toyId,
          quotes,
          decimalsByToken,
        )
        const uniqueUsd = ensureUniquePriceSheet(
          coinRewardRulesOnSheet(out, tokenKey, toyId).map(({ rule }) => ({
            id: rule.patternId,
            price: rule.usdTarget,
          })),
          sheetOpts,
        )
        for (const { idx, rule } of coinRewardRulesOnSheet(out, tokenKey, toyId)) {
          const next = uniqueUsd[rule.patternId]
          if (next == null || pricesEqual(next, rule.usdTarget)) continue
          out[idx] = { ...out[idx]!, usdTarget: next }
        }
      }
    }
  }
  return out
}

/**
 * Insert or merge exact coin→pattern rules. Same coin+pattern unions toyIds
 * and updates usdTarget / label / enabled.
 */
export function upsertCoinRewardRules(
  existing: CoinRewardRule[] | null | undefined,
  incoming: Array<Partial<CoinRewardRule>>,
): CoinRewardRule[] {
  const out = normalizeCoinRewardRules(existing || [])
  for (const partial of incoming) {
    const rule = createCoinRewardRule(partial)
    if (!rule || isBlockedTipToken(rule.tokenAddress)) continue
    const key = ruleKey(rule.tokenAddress, rule.patternId)
    const idx = out.findIndex(
      (row) => ruleKey(row.tokenAddress, row.patternId) === key,
    )
    if (idx < 0) {
      if (out.length >= MAX_COIN_REWARD_RULES) continue
      out.push(rule)
      continue
    }
    const prev = out[idx]!
    out[idx] = {
      ...prev,
      coin: rule.coin || prev.coin,
      usdTarget: rule.usdTarget,
      enabled: rule.enabled,
      toyIds: mergeToyIds(prev.toyIds, rule.toyIds),
    }
  }
  return ensureUniqueCoinRewardRules(out)
}

/** Drop rules for the given coins, optionally limited to pattern ids. */
export function removeCoinRewardRules(
  existing: CoinRewardRule[] | null | undefined,
  filter: { tokenAddresses: string[]; patternIds?: string[] },
): CoinRewardRule[] {
  const tokens = new Set(
    (filter.tokenAddresses || []).map((addr) => String(addr || '').toLowerCase()),
  )
  const patterns = filter.patternIds?.length
    ? new Set(filter.patternIds)
    : null
  return normalizeCoinRewardRules(existing || []).filter((rule) => {
    if (!tokens.has(rule.tokenAddress.toLowerCase())) return true
    if (patterns && !patterns.has(rule.patternId)) return true
    return false
  })
}

/**
 * Toggle an exact coin→pattern assignment. With toyId, adds/removes that toy
 * on the rule (empty toyIds after remove deletes the row). Without toyId,
 * toggles a pattern-wide rule (toyIds []).
 */
export function toggleCoinRewardAssignment(
  existing: CoinRewardRule[] | null | undefined,
  opts: {
    coin: string
    tokenAddress: string
    patternId: string
    usdTarget: number
    toyId?: string | null
  },
): { rules: CoinRewardRule[]; assigned: boolean } {
  const toyId = String(opts.toyId || '').trim()
  const finish = (
    rules: CoinRewardRule[],
    assigned: boolean,
  ): { rules: CoinRewardRule[]; assigned: boolean } => ({
    rules: ensureUniqueCoinRewardRules(rules, toyId ? [toyId] : undefined),
    assigned,
  })
  const base = createCoinRewardRule({
    coin: opts.coin,
    tokenAddress: opts.tokenAddress,
    patternId: opts.patternId,
    usdTarget: opts.usdTarget,
    enabled: true,
    toyIds: toyId ? [toyId] : [],
  })
  if (!base || isBlockedTipToken(base.tokenAddress)) {
    return finish(normalizeCoinRewardRules(existing || []), false)
  }
  const out = normalizeCoinRewardRules(existing || [])
  const key = ruleKey(base.tokenAddress, base.patternId)
  const idx = out.findIndex(
    (row) => ruleKey(row.tokenAddress, row.patternId) === key,
  )

  if (!toyId) {
    if (idx >= 0 && out[idx]!.toyIds.length === 0) {
      out.splice(idx, 1)
      return finish(out, false)
    }
    if (idx >= 0) {
      out[idx] = {
        ...out[idx]!,
        coin: base.coin || out[idx]!.coin,
        usdTarget: base.usdTarget,
        enabled: true,
        toyIds: [],
      }
      return finish(out, true)
    }
    if (out.length >= MAX_COIN_REWARD_RULES) {
      return finish(out, false)
    }
    out.push(base)
    return finish(out, true)
  }

  if (idx < 0) {
    if (out.length >= MAX_COIN_REWARD_RULES) {
      return finish(out, false)
    }
    out.push(base)
    return finish(out, true)
  }

  const prev = out[idx]!
  if (prev.toyIds.includes(toyId)) {
    const nextToys = prev.toyIds.filter((id) => id !== toyId)
    if (!nextToys.length) {
      out.splice(idx, 1)
      return finish(out, false)
    }
    out[idx] = { ...prev, toyIds: nextToys }
    return finish(out, false)
  }

  // Pattern-wide (any toy) already covers this toy — toggle off removes it.
  if (!prev.toyIds.length) {
    out.splice(idx, 1)
    return finish(out, false)
  }

  out[idx] = {
    ...prev,
    coin: base.coin || prev.coin,
    usdTarget: base.usdTarget,
    enabled: true,
    toyIds: mergeToyIds(prev.toyIds, [toyId]),
  }
  return finish(out, true)
}

export function coinRewardRulesForPattern(
  rules: CoinRewardRule[] | null | undefined,
  patternId: string,
  toyId?: string | null,
): CoinRewardRule[] {
  const pid = String(patternId || '').trim()
  if (!pid) return []
  return enabledCoinRewardRules(rules || []).filter((rule) => {
    if (rule.patternId !== pid) return false
    if (!toyId) return true
    if (!rule.toyIds.length) return true
    return rule.toyIds.includes(toyId)
  })
}

/**
 * Convert a USD target into a human token amount for the given decimals.
 * Returns null when the USD/unit quote is missing or invalid.
 */
export function usdTargetToTokenAmount(
  usdTarget: number,
  usdPerUnit: number | null | undefined,
  decimals = 18,
): number | null {
  const usd = Number(usdTarget)
  const rate = Number(usdPerUnit)
  if (!Number.isFinite(usd) || usd < 0) return null
  if (!Number.isFinite(rate) || rate <= 0) return null
  const raw = usd / rate
  if (!Number.isFinite(raw) || raw < 0) return null
  const places = Math.max(0, Math.min(8, Math.round(Number(decimals) || 18)))
  const factor = 10 ** places
  return Math.round(raw * factor) / factor
}

export type MatchedCoinReward = {
  rule: CoinRewardRule
  /** Required human token amount at the quote used for matching */
  requiredAmount: number
  usdPerUnit: number
}

/**
 * Exact required-token SKU match for this tip token (plus narrow truncation snap-up).
 * `quotes` maps lowercased token address ('' for native) → USD per 1 token.
 */
export function matchCoinReward(
  rules: CoinRewardRule[] | null | undefined,
  payment: {
    amount: number
    tokenAddress?: string | null
  },
  quotes: Record<string, number | null | undefined>,
  decimalsByToken: Record<string, number> = {},
): MatchedCoinReward | null {
  const tip = Number(payment.amount)
  if (!Number.isFinite(tip) || tip < 0) return null
  const tokenKey = String(payment.tokenAddress || '')
    .trim()
    .toLowerCase()
  const list = enabledCoinRewardRules(rules || [])
    .filter((r) => r.tokenAddress.toLowerCase() === tokenKey)
    .sort((a, b) => b.usdTarget - a.usdTarget || a.patternId.localeCompare(b.patternId))
  if (!list.length) return null

  const usdPerUnit = quotes[tokenKey]
  if (usdPerUnit == null || !Number.isFinite(usdPerUnit) || usdPerUnit <= 0) {
    return null
  }
  const decimals = decimalsByToken[tokenKey] ?? 18

  const rows: MatchedCoinReward[] = []
  for (const rule of list) {
    const required = usdTargetToTokenAmount(rule.usdTarget, usdPerUnit, decimals)
    if (required == null) continue
    if (!getPattern(rule.patternId)) continue
    rows.push({ rule, requiredAmount: required, usdPerUnit })
  }
  const matched = resolveSkuPrice(
    tip,
    rows.map((row) => row.requiredAmount),
  )
  if (matched == null) return null
  return rows.find((row) => pricesEqual(row.requiredAmount, matched)) ?? null
}

/**
 * Exact usdTarget SKU match (plus narrow truncation snap-up), any tip coin.
 * Used when a bridged stable is on the whitelist: eUSDC / eUSDT / eDAI unlock painted majors.
 */
export function matchCoinRewardByUsd(
  rules: CoinRewardRule[] | null | undefined,
  usdPaid: number,
): MatchedCoinReward | null {
  const tipUsd = Number(usdPaid)
  if (!Number.isFinite(tipUsd) || tipUsd < 0) return null
  const list = enabledCoinRewardRules(rules || [])
    .sort(
      (a, b) =>
        b.usdTarget - a.usdTarget || a.patternId.localeCompare(b.patternId),
    )
  const rows = list.filter((rule) => getPattern(rule.patternId))
  const matched = resolveSkuPrice(
    tipUsd,
    rows.map((rule) => rule.usdTarget),
    {
      round: roundUsdTarget,
      truncationStep: () => 0.01,
    },
  )
  if (matched == null) return null
  const hit = rows.find((rule) => pricesEqual(rule.usdTarget, matched))
  if (!hit) return null
  return { rule: hit, requiredAmount: hit.usdTarget, usdPerUnit: 1 }
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out.map((c) => c.trim())
}

function csvEscape(value: string): string {
  const s = String(value ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

const CSV_HEADERS = [
  'coin',
  'token_address',
  'pattern',
  'usd_target',
  'enabled',
  'toy_ids',
] as const

export function exportCoinRewardCsv(rules: CoinRewardRule[]): string {
  const lines = [CSV_HEADERS.join(',')]
  for (const rule of rules) {
    lines.push(
      [
        csvEscape(rule.coin),
        csvEscape(rule.tokenAddress),
        csvEscape(rule.patternId),
        String(rule.usdTarget),
        rule.enabled ? 'true' : 'false',
        csvEscape(rule.toyIds.join('|')),
      ].join(','),
    )
  }
  return `${lines.join('\n')}\n`
}

/**
 * Starter CSV: one row per pattern for each saved token (and optional native PLS).
 * Uses each pattern's current ladder price as a USD target seed when possible.
 */
export function starterCoinRewardCsv(opts: {
  tokens: Array<{ address: string; symbol: string; label?: string }>
  patterns: Array<{ id: string; name: string; price?: number }>
  includeNative?: boolean
  nativeSymbol?: string
}): string {
  const rules: CoinRewardRule[] = []
  const coins: Array<{ coin: string; tokenAddress: string }> = []
  if (opts.includeNative) {
    coins.push({ coin: opts.nativeSymbol || 'PLS', tokenAddress: NATIVE })
  }
  for (const t of opts.tokens) {
    if (!isAddress(t.address)) continue
    coins.push({
      coin: clip(t.label || t.symbol || 'TOKEN', 32),
      tokenAddress: getAddress(t.address),
    })
  }
  for (const coin of coins) {
    for (const p of opts.patterns) {
      if (!isPatternId(p.id)) continue
      const seed = Number(p.price)
      rules.push({
        id: newRuleId(),
        coin: coin.coin,
        tokenAddress: coin.tokenAddress,
        patternId: p.id as PatternId,
        usdTarget: Number.isFinite(seed) && seed >= 0 ? seed : 1,
        enabled: true,
        toyIds: [],
      })
    }
  }
  return exportCoinRewardCsv(rules)
}

export function parseCoinRewardCsv(text: string): CoinRewardCsvParseResult {
  const errors: string[] = []
  const warnings: string[] = []
  const rules: CoinRewardRule[] = []
  const seen = new Set<string>()
  const raw = String(text || '').replace(/^\uFEFF/, '')
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (!lines.length) {
    return { rules: [], errors: ['CSV is empty'], warnings }
  }

  const headerCells = parseCsvLine(lines[0]!).map((h) => h.toLowerCase())
  const idx = (name: string) => headerCells.indexOf(name)
  const iCoin = idx('coin')
  const iAddr = idx('token_address')
  const iPattern = idx('pattern')
  const iUsd = idx('usd_target')
  const iEnabled = idx('enabled')
  const iToys = idx('toy_ids')

  if (iPattern < 0 || iUsd < 0) {
    return {
      rules: [],
      errors: ['CSV header must include pattern and usd_target columns'],
      warnings,
    }
  }

  for (let rowNum = 2; rowNum <= lines.length; rowNum++) {
    const cells = parseCsvLine(lines[rowNum - 1]!)
    const pattern = cells[iPattern] || ''
    const usdRaw = cells[iUsd] || ''
    if (!pattern && !usdRaw) continue

    const coin = iCoin >= 0 ? cells[iCoin] || '' : ''
    const tokenAddress = iAddr >= 0 ? cells[iAddr] || '' : ''
    const enabledRaw = iEnabled >= 0 ? (cells[iEnabled] || 'true') : 'true'
    const toysRaw = iToys >= 0 ? cells[iToys] || '' : ''
    const enabled =
      !/^(0|false|no|off)$/i.test(enabledRaw.trim()) &&
      enabledRaw.trim() !== ''

    if (tokenAddress && !isAddress(tokenAddress)) {
      errors.push(`Row ${rowNum}: invalid token_address`)
      continue
    }
    if (tokenAddress && isBlockedTipToken(tokenAddress)) {
      warnings.push(`Row ${rowNum}: skipped blocked tip token`)
      continue
    }
    if (!isPatternId(pattern)) {
      errors.push(`Row ${rowNum}: unknown pattern “${pattern}”`)
      continue
    }
    const usdTarget = Number(usdRaw)
    if (!Number.isFinite(usdTarget) || usdTarget < 0) {
      errors.push(`Row ${rowNum}: usd_target must be a non-negative number`)
      continue
    }

    const rule = createCoinRewardRule({
      coin: coin || (tokenAddress ? 'TOKEN' : 'PLS'),
      tokenAddress: tokenAddress ? getAddress(tokenAddress) : NATIVE,
      patternId: pattern,
      usdTarget,
      enabled,
      toyIds: toysRaw
        ? toysRaw.split(/[|;]/).map((t) => t.trim()).filter(Boolean)
        : [],
    })
    if (!rule) {
      errors.push(`Row ${rowNum}: could not build rule`)
      continue
    }
    const key = `${rule.tokenAddress.toLowerCase()}|${rule.patternId}`
    if (seen.has(key)) {
      warnings.push(
        `Row ${rowNum}: duplicate ${rule.coin}/${rule.patternId} — keeping first`,
      )
      continue
    }
    seen.add(key)
    rules.push(rule)
  }

  return { rules: ensureUniqueCoinRewardRules(rules), errors, warnings }
}

/** Migrate legacy single-token ladder into coin reward rows (once). */
export function migratePatternPricesToCoinRewards(opts: {
  patternPrices: Record<string, number>
  tokenAddress?: string
  tokenSymbol?: string
  existing?: CoinRewardRule[]
}): CoinRewardRule[] {
  if (opts.existing && opts.existing.length) {
    return normalizeCoinRewardRules(opts.existing)
  }
  const tokenAddress =
    opts.tokenAddress && isAddress(opts.tokenAddress)
      ? getAddress(opts.tokenAddress)
      : NATIVE
  const coin = clip(opts.tokenSymbol || (tokenAddress ? 'TOKEN' : 'PLS'), 32)
  const out: CoinRewardRule[] = []
  for (const [patternId, price] of Object.entries(opts.patternPrices || {})) {
    const rule = createCoinRewardRule({
      coin,
      tokenAddress,
      patternId,
      usdTarget: Number(price) || 0,
      enabled: true,
    })
    if (rule) out.push(rule)
  }
  return ensureUniqueCoinRewardRules(out)
}
