import {
  isPatternId,
  patternDurationMs,
  patternNeeds,
  type PatternId,
  PATTERNS,
} from './patterns'
import {
  patternFamily,
  patternFitsToy,
  toyMenuFamilies,
  type CapabilitySource,
  type ToyFamily,
} from './patternFit'

/** Tip amount per pattern id (native units). */
export type PatternPrices = Record<string, number>

/** Compact tip numbers for narrow phone rows (20000 â†’ 20k). */
export function formatMenuPrice(n: number): string {
  if (!Number.isFinite(n)) return '0'
  const v = Math.max(0, n)
  if (v >= 1_000_000)
    return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`
  if (v >= 10_000) return `${(v / 1000).toFixed(v >= 100_000 ? 0 : 1)}k`
  if (v >= 1000)
    return v.toLocaleString(undefined, { maximumFractionDigits: 0 })
  if (v >= 10)
    return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
  return v.toLocaleString(undefined, {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  })
}


/**
 * Per physical toy tip prices (overrides patternPrices for that device).
 * toyId â†’ patternId â†’ amount. Lets two of the same product charge differently.
 */
export type ToyPatternPrices = Record<string, PatternPrices>

/** Personal rating 0â€“5 per pattern id. */
export type PatternRatings = Record<string, number>

/** Sorting for tip menu list */
export type MenuSort =
  | 'catalog'
  | 'duration-desc'
  | 'duration-asc'
  | 'price-desc'
  | 'price-asc'
  | 'rating-desc'
  | 'rating-asc'

export const MENU_SORTS: { id: MenuSort; label: string }[] = [
  { id: 'catalog', label: 'Catalog' },
  { id: 'duration-desc', label: 'Longest' },
  { id: 'duration-asc', label: 'Shortest' },
  { id: 'price-desc', label: 'Price high → low' },
  { id: 'price-asc', label: 'Price low → high' },
  { id: 'rating-desc', label: 'Rating high → low' },
  { id: 'rating-asc', label: 'Rating low → high' },
]

export function isMenuSort(v: unknown): v is MenuSort {
  return (
    typeof v === 'string' &&
    MENU_SORTS.some((s) => s.id === v)
  )
}

export type BuzzPlan = {
  intensity: number
  durationMs: number
  pattern: PatternId
  label: string
  /** Which linked toy receives this tip (when multi-device menu). */
  toyId?: string
  /** Effective tip price that unlocked this pattern on that toy */
  price?: number
}

/** Default tip price for every live pattern. */
export function defaultPatternPrices(): PatternPrices {
  const out: PatternPrices = {}
  for (const p of PATTERNS) out[p.id] = p.price
  return out
}

/** Catalog / def ladder floor (lowest positive built-in tip). */
export function catalogBasePrice(): number {
  let min = Infinity
  for (const p of PATTERNS) {
    const n = Number(p.price)
    if (Number.isFinite(n) && n > 0 && n < min) min = n
  }
  return Number.isFinite(min) ? min : 1
}

/** Catalog / def ladder ceiling (highest built-in tip). */
export function catalogTopPrice(): number {
  let max = 0
  for (const p of PATTERNS) {
    const n = Number(p.price)
    if (Number.isFinite(n) && n > max) max = n
  }
  return max > 0 ? max : catalogBasePrice()
}

/** Shortest live pattern length (ms) — Scale menu floor. */
export function catalogShortestMs(): number {
  let min = Infinity
  for (const p of PATTERNS) {
    const n = patternDurationMs(p.id)
    if (Number.isFinite(n) && n > 0 && n < min) min = n
  }
  return Number.isFinite(min) ? min : 1000
}

/** Longest live pattern length (ms) — Scale menu ceiling. */
export function catalogLongestMs(): number {
  let max = 0
  for (const p of PATTERNS) {
    const n = patternDurationMs(p.id)
    if (Number.isFinite(n) && n > max) max = n
  }
  return max > 0 ? max : catalogShortestMs()
}

/** Quantize tip amounts the same way ladders and menus display them. */
export function roundTipAmount(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0
  // Cheap meme coins → whole tokens; stables / mid prices keep cents.
  if (n >= 1000) return Math.round(n)
  if (n >= 10) return Math.round(n * 100) / 100
  return Math.round(n * 10_000) / 10_000
}

/**
 * Last digit wallet UIs typically drop when they truncate a send.
 * Whole tokens for meme-size amounts; cents for everything else.
 */
export function skuTruncationStep(n: number): number {
  const v = Math.max(0, Number(n) || 0)
  if (v >= 1000) return 1
  return 0.01
}

/**
 * Minimum bump when resolving duplicate prices on a tip sheet.
 * Two truncation units so a chopped send cannot land on the neighbor SKU.
 */
export function tipPriceStep(n: number): number {
  return skuTruncationStep(n) * 2
}

/** Quantize USD targets for coin-reward paint rows. */
export function roundUsdTarget(n: number): number {
  return Math.round(Math.max(0, n) * 100) / 100
}

/** Minimum bump when resolving duplicate USD targets on a coin sheet. */
export function usdTargetStep(_n: number): number {
  return 0.02
}

function priceBucketKey(n: number): string {
  return String(Math.round(n * 1e9) / 1e9)
}

/** Stable tie-break: shortest duration, then name, then id. */
export function patternTieBreak(a: string, b: string): number {
  const da = patternDurationMs(a as PatternId) || 0
  const db = patternDurationMs(b as PatternId) || 0
  if (da !== db) return da - db
  const na = PATTERNS.find((p) => p.id === a)?.name || a
  const nb = PATTERNS.find((p) => p.id === b)?.name || b
  if (na !== nb) return na.localeCompare(nb)
  return a.localeCompare(b)
}

export type EnsureUniquePriceOpts = {
  round?: (n: number) => number
  step?: (n: number) => number
  tieBreak?: (a: string, b: string) => number
}

/**
 * Deterministic auto-bump: within one sheet, every entry gets a unique
 * quantized price. Earlier tie-break entries keep their target; later ones
 * nudge upward by the sheet step size.
 */
export function ensureUniquePriceSheet(
  entries: Array<{ id: string; price: number }>,
  opts?: EnsureUniquePriceOpts,
): Record<string, number> {
  const round = opts?.round ?? roundTipAmount
  const step = opts?.step ?? tipPriceStep
  const tieBreak = opts?.tieBreak ?? patternTieBreak
  const sorted = [...entries].sort((a, b) => {
    const dp = round(a.price) - round(b.price)
    if (dp !== 0) return dp
    return tieBreak(a.id, b.id)
  })
  const used = new Set<string>()
  const out: Record<string, number> = {}
  for (const { id, price } of sorted) {
    let next = round(Math.max(0, price))
    let guard = 0
    while (used.has(priceBucketKey(next)) && guard < 100_000) {
      next = round(next + step(next))
      guard++
    }
    used.add(priceBucketKey(next))
    out[id] = next
  }
  return out
}

/** Repair one stored pattern price map so listed ids are SKU-unique. */
export function ensureUniquePatternPriceMap(
  prices: PatternPrices,
  patternIds?: string[],
): PatternPrices {
  const ids = patternIds?.length ? patternIds : PATTERNS.map((p) => p.id)
  const entries = ids.map((id) => ({
    id,
    price: patternMenuPrice(id, prices),
  }))
  const unique = ensureUniquePriceSheet(entries)
  const next = { ...prices }
  for (const id of ids) {
    const v = unique[id]
    if (v != null) next[id] = v
  }
  return next
}

/** Repair the effective price sheet for one toy tab (sparse overrides). */
export function ensureUniqueEffectiveToySheet(
  basePrices: PatternPrices,
  toyPrices: ToyPatternPrices,
  toyId: string,
  patternIds: string[],
): { toyPrices: ToyPatternPrices; changed: string[] } {
  const id = String(toyId || '').trim()
  if (!id || !patternIds.length) {
    return { toyPrices: toyPrices || {}, changed: [] }
  }
  const entries = patternIds.map((pid) => ({
    id: pid,
    price: patternToyPrice(pid, basePrices, toyPrices, id),
  }))
  const unique = ensureUniquePriceSheet(entries)
  const next: ToyPatternPrices = { ...(toyPrices || {}) }
  const row: PatternPrices = { ...(next[id] || {}) }
  const changed: string[] = []
  for (const pid of patternIds) {
    const target = unique[pid]
    if (target == null) continue
    const base = patternMenuPrice(pid, basePrices)
    const prev = patternToyPrice(pid, basePrices, toyPrices, id)
    if (!pricesEqual(target, prev)) changed.push(pid)
    if (pricesEqual(target, base)) delete row[pid]
    else row[pid] = target
  }
  if (Object.keys(row).length) next[id] = row
  else delete next[id]
  return { toyPrices: next, changed }
}

/** Repair a global pattern ladder and report which ids moved. */
export function repairPatternPriceUniqueness(
  prices: PatternPrices,
  patternIds?: string[],
): { prices: PatternPrices; changed: string[] } {
  const ids = patternIds?.length ? patternIds : PATTERNS.map((p) => p.id)
  const before = new Map(
    ids.map((id) => [id, patternMenuPrice(id, prices)] as const),
  )
  const next = ensureUniquePatternPriceMap(prices, ids)
  const changed = ids.filter((id) => !pricesEqual(before.get(id)!, next[id]!))
  return { prices: next, changed }
}

/** Repair every stored toy override sheet against the global ladder. */
export function ensureUniqueToyPatternPrices(
  basePrices: PatternPrices,
  toyPrices: ToyPatternPrices,
): ToyPatternPrices {
  let next = normalizeToyPatternPrices(toyPrices)
  for (const toyId of Object.keys(next)) {
    const patternIds = [
      ...new Set([
        ...Object.keys(next[toyId] || {}),
        ...PATTERNS.map((p) => p.id),
      ]),
    ]
    next = ensureUniqueEffectiveToySheet(
      basePrices,
      next,
      toyId,
      patternIds,
    ).toyPrices
  }
  return next
}

/** Count duplicate quantized prices on a sheet (0 = SKU-safe). */
export function countDuplicateSheetPrices(
  entries: Array<{ id: string; price: number }>,
  round: (n: number) => number = roundTipAmount,
): number {
  const seen = new Set<string>()
  let dups = 0
  for (const { price } of entries) {
    const key = priceBucketKey(round(price))
    if (seen.has(key)) dups++
    else seen.add(key)
  }
  return dups
}

/**
 * Rebuild all tip prices from a single "cheapest tip" amount,
 * stretching the longest pattern by the same duration ratio.
 */
export function ladderPricesFromBase(base: number): PatternPrices {
  const b = Math.max(0, Number(base) || 0)
  const floor = catalogShortestMs() || 1
  const top = catalogLongestMs()
  return ladderPricesFromRange(b, (top / floor) * b)
}

/**
 * Rebuild tip prices so the shortest pattern maps to `min` and the longest
 * maps to `max` (linear by duration). Colliding durations are auto-bumped
 * so every pattern keeps a unique SKU amount.
 *
 * Pass `duration` when scaling a tip-menu subset (one toy’s top-N) so Low/High
 * land on the cheapest/longest cards on that menu — not the full catalog.
 */
export function ladderPricesFromRange(
  min: number,
  max: number,
  duration?: { loMs: number; hiMs: number },
): PatternPrices {
  const lo = Math.max(0, Number(min) || 0)
  let hi = Math.max(0, Number(max) || 0)
  if (hi < lo) hi = lo
  const dLo = Math.max(0, Number(duration?.loMs ?? catalogShortestMs()) || 0)
  const dHi = Math.max(
    dLo,
    Number(duration?.hiMs ?? catalogLongestMs()) || dLo || 1,
  )
  const span = dHi - dLo
  const out: PatternPrices = {}
  for (const p of PATTERNS) {
    const ms = Math.max(0, patternDurationMs(p.id) || 0)
    if (span <= 0) {
      out[p.id] = roundTipAmount(lo)
      continue
    }
    const t = Math.min(1, Math.max(0, (ms - dLo) / span))
    out[p.id] = roundTipAmount(lo + t * (hi - lo))
  }
  return ensureUniquePatternPriceMap(out)
}

/** Duration floor/ceiling for a tip-menu pattern set (ms). */
export function durationBoundsForPatterns(
  patterns: { id: string }[],
): { loMs: number; hiMs: number } {
  let lo = Infinity
  let hi = 0
  for (const p of patterns) {
    const ms = patternDurationMs(p.id as PatternId)
    if (!Number.isFinite(ms) || ms <= 0) continue
    if (ms < lo) lo = ms
    if (ms > hi) hi = ms
  }
  if (!Number.isFinite(lo) || lo <= 0) {
    return { loMs: catalogShortestMs(), hiMs: catalogLongestMs() }
  }
  return { loMs: lo, hiMs: Math.max(lo, hi) }
}

/** USD tip for one pattern across a duration span (Low → High). */
export function usdTargetAcrossDuration(
  patternId: string,
  usdLo: number,
  usdHi: number,
  duration?: { loMs: number; hiMs: number },
): number {
  const lo = Math.max(0, Number(usdLo) || 0)
  const hi = Math.max(lo, Number(usdHi) || 0)
  const dLo = Math.max(0, Number(duration?.loMs ?? catalogShortestMs()) || 0)
  const dHi = Math.max(
    dLo,
    Number(duration?.hiMs ?? catalogLongestMs()) || dLo || 1,
  )
  const span = dHi - dLo
  if (span <= 0) return roundUsdTarget(lo)
  const ms = Math.max(0, patternDurationMs(patternId as PatternId))
  const t = Math.min(1, Math.max(0, (ms - dLo) / span))
  return roundUsdTarget(lo + t * (hi - lo))
}

/**
 * Duration-based USD targets for a menu subset, auto-bumped so no two
 * patterns on the same sheet share a SKU amount.
 */
export function uniqueUsdTargetsForPatterns(
  patternIds: string[],
  usdLo: number,
  usdHi: number,
  duration?: { loMs: number; hiMs: number },
): Record<string, number> {
  if (!patternIds.length) return {}
  return ensureUniquePriceSheet(
    patternIds.map((id) => ({
      id,
      price: usdTargetAcrossDuration(id, usdLo, usdHi, duration),
    })),
    {
      round: roundUsdTarget,
      step: usdTargetStep,
      tieBreak: patternTieBreak,
    },
  )
}

/** Apply SKU-unique token amounts to rows sharing one toy+coin sheet. */
export function applyUniqueSkuAmounts<
  T extends { id: string; amount: number },
>(rows: T[]): T[] {
  if (rows.length < 2) return rows
  const unique = ensureUniquePriceSheet(
    rows.map((row) => ({ id: row.id, price: row.amount })),
  )
  return rows.map((row) => ({
    ...row,
    amount: unique[row.id] ?? row.amount,
  }))
}

/** Current cheapest price on the live menu (for the scale field). */
export function menuBaseFromPrices(prices: PatternPrices): number {
  let min = Infinity
  for (const p of PATTERNS) {
    const n = patternMenuPrice(p.id, prices)
    if (Number.isFinite(n) && n >= 0 && n < min) min = n
  }
  return Number.isFinite(min) ? min : catalogBasePrice()
}

/** Current most expensive price on the live menu (for the scale field). */
export function menuTopFromPrices(prices: PatternPrices): number {
  let max = 0
  for (const p of PATTERNS) {
    const n = patternMenuPrice(p.id, prices)
    if (Number.isFinite(n) && n > max) max = n
  }
  return max > 0 ? max : catalogTopPrice()
}

export function normalizePatternPrices(raw: unknown): PatternPrices {
  const base = defaultPatternPrices()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ensureUniquePatternPriceMap(base)
  }
  for (const p of PATTERNS) {
    const v = Number((raw as Record<string, unknown>)[p.id])
    if (Number.isFinite(v) && v >= 0) base[p.id] = v
  }
  return ensureUniquePatternPriceMap(base)
}

/** Only stored overrides (not full catalogs per toy). */
export function normalizeToyPatternPrices(raw: unknown): ToyPatternPrices {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: ToyPatternPrices = {}
  for (const [toyId, row] of Object.entries(raw as Record<string, unknown>)) {
    const id = String(toyId || '').trim()
    if (!id || !row || typeof row !== 'object' || Array.isArray(row)) continue
    const prices: PatternPrices = {}
    for (const [pid, val] of Object.entries(row as Record<string, unknown>)) {
      const n = Number(val)
      if (pid && Number.isFinite(n) && n >= 0) prices[pid] = n
    }
    if (Object.keys(prices).length) out[id] = prices
  }
  return out
}

export function defaultPatternRatings(): PatternRatings {
  const out: PatternRatings = {}
  for (const p of PATTERNS) out[p.id] = 0
  return out
}

export function normalizePatternRatings(raw: unknown): PatternRatings {
  const base = defaultPatternRatings()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base
  for (const p of PATTERNS) {
    const v = Number((raw as Record<string, unknown>)[p.id])
    if (Number.isFinite(v)) base[p.id] = Math.min(5, Math.max(0, Math.round(v)))
  }
  return base
}

export function patternRating(
  id: string,
  ratings: PatternRatings,
): number {
  const v = Number(ratings[id])
  if (!Number.isFinite(v)) return 0
  return Math.min(5, Math.max(0, Math.round(v)))
}

/** One-shot migration: old package list â†’ pattern prices. */
export function pricesFromLegacyTiers(raw: unknown): PatternPrices | null {
  if (!Array.isArray(raw) || !raw.length) return null
  const base = defaultPatternPrices()
  let any = false
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const t = row as Record<string, unknown>
    const pattern = typeof t.pattern === 'string' ? t.pattern : ''
    const amount = Number(t.amount)
    if (isPatternId(pattern) && Number.isFinite(amount) && amount >= 0) {
      base[pattern] = amount
      any = true
    }
  }
  return any ? base : null
}

export function patternMenuPrice(
  id: string,
  prices: PatternPrices,
): number {
  const v = Number(prices[id])
  if (Number.isFinite(v) && v >= 0) return v
  return PATTERNS.find((x) => x.id === id)?.price ?? 0
}

/**
 * Effective tip price for a pattern on a specific toy.
 * Falls back to global patternPrices when that toy has no override.
 */
export function patternToyPrice(
  patternId: string,
  basePrices: PatternPrices,
  toyPrices?: ToyPatternPrices | null,
  toyId?: string | null,
): number {
  if (toyId && toyPrices) {
    const v = Number(toyPrices[toyId]?.[patternId])
    if (Number.isFinite(v) && v >= 0) return v
  }
  return patternMenuPrice(patternId, basePrices)
}

export function setToyPatternPrice(
  map: ToyPatternPrices,
  toyId: string,
  patternId: string,
  price: number,
): ToyPatternPrices {
  const id = String(toyId || '').trim()
  if (!id) return map
  const n = Math.max(0, Number(price) || 0)
  const next: ToyPatternPrices = { ...map }
  next[id] = { ...(next[id] || {}), [patternId]: n }
  return next
}

/** Replace one toy’s full tip ladder (used by Scale menu on a toy tab). */
export function setToyPatternLadder(
  map: ToyPatternPrices,
  toyId: string,
  prices: PatternPrices,
): ToyPatternPrices {
  const id = String(toyId || '').trim()
  if (!id) return map
  return { ...map, [id]: { ...prices } }
}

export function normalizeDisabledPatterns(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const id of raw) {
    if (typeof id === 'string' && isPatternId(id) && !out.includes(id)) {
      out.push(id)
    }
  }
  return out
}

/** Patterns highlighted on the exported tip menu card. */
export function normalizeFeaturedPatterns(raw: unknown): string[] {
  return normalizeDisabledPatterns(raw)
}

export function isPatternFeatured(
  id: string,
  featured: string[] | Set<string>,
): boolean {
  if (Array.isArray(featured)) return featured.includes(id)
  return featured.has(id)
}

export function isPatternEnabled(
  id: string,
  disabled: string[] | Set<string>,
): boolean {
  if (Array.isArray(disabled)) return !disabled.includes(id)
  return !disabled.has(id)
}

export function enabledPatterns(disabled: string[]) {
  const set = new Set(disabled)
  return PATTERNS.filter((p) => !set.has(p.id))
}

/**
 * Fresh installs ship this many patterns on the tip menu (shortest / featured
 * first). Operators can add more from Pattern catalog — there is no hard max.
 */
export const DEFAULT_SHIP_MENU_PATTERNS = 10

/** @deprecated Use {@link DEFAULT_SHIP_MENU_PATTERNS} — not a runtime cap. */
export const MAX_PATTERNS_PER_TOY = DEFAULT_SHIP_MENU_PATTERNS

/** Starter set spans every pattern family so multi-function toys get rows on day one. */
const SHIP_PATTERN_FAMILIES: ToyFamily[] = [
  'vibe',
  'multi',
  'rotate',
  'air',
  'thrust',
]

function patternDurationSec(p: { timeSec?: number; intervalMs?: number; strengths?: unknown[] }): number {
  if (typeof p.timeSec === 'number' && p.timeSec > 0) return p.timeSec
  const steps = Math.max(1, p.strengths?.length || 1)
  return ((p.intervalMs || 400) * steps) / 1000
}

function compareMenuRank(
  a: (typeof PATTERNS)[number],
  b: (typeof PATTERNS)[number],
  featured: Set<string>,
): number {
  const fa = featured.has(a.id) ? 0 : 1
  const fb = featured.has(b.id) ? 0 : 1
  if (fa !== fb) return fa - fb
  const da = patternDurationSec(a)
  const db = patternDurationSec(b)
  if (da !== db) return da - db
  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
}

/**
 * Stable ranking used by shared tip menus: featured first, then shortest
 * duration. Membership stays put when the sort dropdown changes.
 */
function rankMenuPatterns(
  pool: (typeof PATTERNS)[number][],
  featured: Set<string>,
  limit?: number,
): (typeof PATTERNS)[number][] {
  const out = [...pool]
  out.sort((a, b) => compareMenuRank(a, b, featured))
  if (limit === undefined) return out
  return out.slice(0, Math.max(1, Math.round(limit)))
}

function activeFamiliesInPool(
  pool: (typeof PATTERNS)[number][],
  families: ToyFamily[],
  excludeIds: Set<string>,
): ToyFamily[] {
  return families.filter((f) =>
    pool.some(
      (p) => !excludeIds.has(p.id) && patternFamily(patternNeeds(p)) === f,
    ),
  )
}

/**
 * Top-N with a few patterns from each requested family (shortest in each),
 * then fill leftover slots with shortest overall. Featured rows win first.
 */
function rankBalancedMenuPatterns(
  pool: (typeof PATTERNS)[number][],
  featured: Set<string>,
  limit: number | undefined,
  families: ToyFamily[],
): (typeof PATTERNS)[number][] {
  if (limit === undefined || limit <= 0) {
    return rankMenuPatterns(pool, featured, limit)
  }

  const featuredRows = pool
    .filter((p) => featured.has(p.id))
    .sort((a, b) => compareMenuRank(a, b, featured))
  const out: (typeof PATTERNS)[number][] = featuredRows.slice(0, limit)
  const pickedIds = new Set(out.map((p) => p.id))
  if (out.length >= limit) return out.slice(0, limit)

  let remaining = limit - out.length
  const active = activeFamiliesInPool(pool, families, pickedIds)

  if (active.length <= 1) {
    const filler = pool
      .filter((p) => !pickedIds.has(p.id))
      .sort((a, b) => compareMenuRank(a, b, featured))
      .slice(0, remaining)
    out.push(...filler)
    return out.slice(0, limit)
  }

  const perFamily = Math.max(1, Math.floor(remaining / active.length))
  for (const f of active) {
    const rows = pool
      .filter(
        (p) =>
          !pickedIds.has(p.id) && patternFamily(patternNeeds(p)) === f,
      )
      .sort((a, b) => compareMenuRank(a, b, featured))
    const take = Math.min(rows.length, perFamily)
    for (let i = 0; i < take && out.length < limit; i++) {
      out.push(rows[i]!)
      pickedIds.add(rows[i]!.id)
    }
  }

  remaining = limit - out.length
  if (remaining > 0) {
    const filler = pool
      .filter((p) => !pickedIds.has(p.id))
      .sort((a, b) => compareMenuRank(a, b, featured))
      .slice(0, remaining)
    out.push(...filler)
  }
  return out.slice(0, limit)
}

/**
 * Per-toy top-N: featured first, then a few patterns per function the toy
 * supports (vibe + rotate on Nora, vibe + air on Max, etc.).
 */
function rankToyMenuPatterns(
  pool: (typeof PATTERNS)[number][],
  featured: Set<string>,
  limit: number | undefined,
  toy: CapabilitySource,
): (typeof PATTERNS)[number][] {
  const families = toyMenuFamilies(toy)
  if (families.length <= 1) {
    return rankMenuPatterns(pool, featured, limit)
  }
  return rankBalancedMenuPatterns(pool, featured, limit, families)
}

/**
 * Enabled tip-menu patterns for one toy: fitting rows, featured first,
 * specialty family reserved when `limit` is set, then shortest duration.
 * With no `limit`, every enabled fitting pattern is included.
 */
export function patternsForToyMenu(
  toy: CapabilitySource,
  opts?: {
    disabled?: string[]
    featured?: string[]
    /** When false, Off patterns stay out (paint / tip match). Default true for the studio list. */
    includeDisabled?: boolean
    /** When set, keep only the top-N ranked rows (used for fresh-install defaults). */
    limit?: number
  },
): (typeof PATTERNS)[number][] {
  const limit =
    opts?.limit === undefined
      ? undefined
      : Math.max(1, Math.round(opts.limit))
  const disabled = new Set(opts?.disabled || [])
  const featured = new Set(opts?.featured || [])
  const includeDisabled = opts?.includeDisabled !== false
  const pool = PATTERNS.filter((p) => {
    if (!includeDisabled && disabled.has(p.id)) return false
    return patternFitsToy(patternNeeds(p), toy, p.forProducts)
  })
  return rankToyMenuPatterns(pool, featured, limit, toy)
}

/** Enabled patterns for the shared (no-toy-tab) menu. */
export function patternsForSharedMenu(opts?: {
  disabled?: string[]
  featured?: string[]
  includeDisabled?: boolean
  /** When set, keep only the top-N ranked rows (used for fresh-install defaults). */
  limit?: number
}): (typeof PATTERNS)[number][] {
  const limit =
    opts?.limit === undefined
      ? undefined
      : Math.max(1, Math.round(opts.limit))
  const disabled = new Set(opts?.disabled || [])
  const featured = new Set(opts?.featured || [])
  const includeDisabled = opts?.includeDisabled !== false
  const pool = PATTERNS.filter((p) => includeDisabled || !disabled.has(p.id))
  if (limit === undefined) {
    return rankMenuPatterns(pool, featured, limit)
  }
  return rankBalancedMenuPatterns(pool, featured, limit, SHIP_PATTERN_FAMILIES)
}

/** Pattern ids off the menu so a fresh install ships with a short starter set. */
export function defaultShipDisabledPatterns(
  count: number = DEFAULT_SHIP_MENU_PATTERNS,
): string[] {
  const limit = Math.max(1, Math.round(count))
  const keep = new Set(
    rankBalancedMenuPatterns(
      PATTERNS,
      new Set(),
      limit,
      SHIP_PATTERN_FAMILIES,
    ).map((p) => p.id),
  )
  return PATTERNS.filter((p) => !keep.has(p.id)).map((p) => p.id)
}

/** Fair pick when several toys share the same ladder step. */
let tipPlanRr = 0

/** Reset rotation (tests / long-running hosts). */
export function resetTipPlanRr(): void {
  tipPlanRr = 0
}

/** Tolerant price compare (pool quote floats vs integer tip menu). */
export function pricesEqual(a: number, b: number): boolean {
  if (a === b) return true
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  const scale = Math.max(1, Math.abs(a), Math.abs(b))
  return Math.abs(a - b) <= scale * 1e-9
}

export type ResolveSkuOpts = {
  round?: (n: number) => number
  truncationStep?: (n: number) => number
}

function snapSlack(sku: number, tip: number): number {
  return Math.max(1, Math.abs(sku), Math.abs(tip)) * 1e-9
}

/**
 * Map a paid amount onto listed SKU prices.
 * Exact match only — mid-interval tips do not unlock a lower rung.
 * Some wallets truncate the last display digit and send a hair under the QR:
 *  1. Exact listed SKU.
 *  2. Else snap up to the next SKU when the shortfall is one truncation unit
 *     and still above the previous SKU (never alias a neighbor).
 *  3. Else miss (null).
 */
export function resolveSkuPrice(
  amount: number,
  listed: Iterable<number>,
  opts?: ResolveSkuOpts,
): number | null {
  const round = opts?.round ?? roundTipAmount
  const trunc = opts?.truncationStep ?? skuTruncationStep
  const tip = Number(amount)
  if (!Number.isFinite(tip) || tip < 0) return null

  const prices = [
    ...new Set(
      [...listed]
        .map((n) => round(Number(n)))
        .filter((n) => Number.isFinite(n) && n >= 0),
    ),
  ].sort((a, b) => a - b)
  if (!prices.length) return null

  const exact = prices.find((p) => pricesEqual(p, tip))
  if (exact != null) return exact

  const above = prices.find((p) => p > tip)
  if (above != null) {
    const prevIdx = prices.indexOf(above) - 1
    const prev = prevIdx >= 0 ? prices[prevIdx]! : null
    const gap = prev != null ? above - prev : Infinity
    const win = Math.min(
      trunc(above),
      Number.isFinite(gap) ? gap / 2 : trunc(above),
    )
    if (win > 0 && above - tip <= win + snapSlack(above, tip)) return above
  }

  return null
}

/**
 * At one ladder price, keep one pattern per toy so N toys round-robin
 * evenly when each has many menu rows at the same amount.
 */
function onePatternPerToy<
  T extends { toyId: string; pattern: string; name: string },
>(cands: T[]): T[] {
  const byToy = new Map<string, T>()
  for (const c of cands) {
    const prev = byToy.get(c.toyId)
    if (
      !prev ||
      c.pattern.localeCompare(prev.pattern) < 0 ||
      (c.pattern === prev.pattern && c.name.localeCompare(prev.name) < 0)
    ) {
      byToy.set(c.toyId, c)
    }
  }
  return [...byToy.values()].sort((a, b) => a.toyId.localeCompare(b.toyId))
}

export type PlanBuzzOptions = {
  /**
   * Linked buzzable toys. When non-empty, tips resolve to one (pattern, toy)
   * using each toyâ€™s own price sheet.
   */
  toys?: CapabilitySource[]
  toyPrices?: ToyPatternPrices
  disabledToys?: string[]
  /** Featured patterns sort first on each toy menu. */
  featured?: string[]
}

/**
 * Tip amount → menu ladder (prices are SKUs):
 *  1. Exact listed price.
 *  2. Else snap up when a wallet truncated the last digit of the next SKU.
 *  3. Else miss (no floor / next-lower unlock).
 * Multiple toys: evaluate every (pattern, toy) price, pick that step, then
 * round-robin among toys offering it. Live tips use planBuzzEachToy so every
 * buzz-on toy can play at once; this helper still returns one pick.
 */
export function planBuzz(
  amount: number,
  prices: PatternPrices,
  disabled: string[] = [],
  opts?: PlanBuzzOptions,
): BuzzPlan | null {
  const pool = enabledPatterns(disabled)
  if (!pool.length) return null
  const tip = Number(amount)
  if (!Number.isFinite(tip) || tip < 0) return null

  const toys = (opts?.toys || []).filter((t) => {
    if (!t.id) return false
    if (opts?.disabledToys?.includes(t.id)) return false
    if (t.connected === false) return false
    return true
  })

  if (toys.length) {
    type Cand = {
      pattern: PatternId
      name: string
      price: number
      toyId: string
      toyLabel: string
    }
    const cands: Cand[] = []
    for (const toy of toys) {
      const toyLabel =
        String(toy.name || toy.toyType || toy.id || 'toy').trim() || toy.id!
      const menu = patternsForToyMenu(toy, {
        disabled,
        featured: opts?.featured,
        includeDisabled: false,
      })
      for (const p of menu) {
        const price = patternToyPrice(
          p.id,
          prices,
          opts?.toyPrices,
          toy.id,
        )
        cands.push({
          pattern: p.id,
          name: p.name,
          price,
          toyId: toy.id!,
          toyLabel,
        })
      }
    }
    if (!cands.length) return null

    const matched = resolveSkuPrice(
      tip,
      cands.map((c) => c.price),
    )
    if (matched == null) return null
    const tier = cands.filter((c) => pricesEqual(c.price, matched))
    if (!tier.length) return null

    const field = onePatternPerToy(tier)
    const pick = field[tipPlanRr % field.length]!
    tipPlanRr = (tipPlanRr + 1) % 1_000_000
    return {
      intensity: 1,
      durationMs: patternDurationMs(pick.pattern),
      pattern: pick.pattern,
      toyId: pick.toyId,
      price: pick.price,
      label: `${pick.name} · ${pick.toyLabel}`,
    }
  }

  const ranked = pool.map((p) => ({
    id: p.id,
    name: p.name,
    price: patternMenuPrice(p.id, prices),
  }))
  const matched = resolveSkuPrice(
    tip,
    ranked.map((p) => p.price),
  )
  if (matched == null) return null
  const tier = ranked.filter((p) => pricesEqual(p.price, matched))
  if (!tier.length) return null
  tier.sort((a, b) => a.id.localeCompare(b.id))
  const pick = tier[tipPlanRr % tier.length]!
  tipPlanRr = (tipPlanRr + 1) % 1_000_000
  return {
    intensity: 1,
    durationMs: patternDurationMs(pick.id),
    pattern: pick.id,
    price: pick.price,
    label: pick.name,
  }
}

/**
 * One tip → one plan per buzz-on toy (that toy's own price sheet).
 * Toys that cannot offer any on-menu rung for the amount are skipped.
 */
export function planBuzzEachToy(
  amount: number,
  prices: PatternPrices,
  disabled: string[] = [],
  opts?: PlanBuzzOptions,
): BuzzPlan[] {
  const toys = (opts?.toys || []).filter((t) => {
    if (!t.id) return false
    if (opts?.disabledToys?.includes(t.id)) return false
    if (t.connected === false) return false
    return true
  })
  if (!toys.length) {
    const one = planBuzz(amount, prices, disabled, opts)
    return one ? [one] : []
  }
  const out: BuzzPlan[] = []
  for (const toy of toys) {
    const plan = planBuzz(amount, prices, disabled, { ...opts, toys: [toy] })
    if (plan) out.push(plan)
  }
  return out
}

/**
 * One concrete (pattern Ã— toy) for Simulate â€” never re-ladders into vibes.
 */
export type SimTipJob = {
  amount: number
  pattern: PatternId
  name: string
  price: number
  toyId: string
  toyLabel: string
}

type JobOpts = {
  prices: PatternPrices
  disabled?: string[]
  toyPrices?: ToyPatternPrices
  toys?: CapabilitySource[]
  minAmount?: number
  maxTips?: number
  featured?: string[]
}

/** Enabled fitting tips for each buzz-on toy (respects family: rotate â†’ Nora only). */
export function listSimTipJobs(opts: JobOpts): SimTipJob[] {
  const pool = enabledPatterns(opts.disabled || [])
  const floor = Math.max(0, Number(opts.minAmount) || 0)
  const targets = (opts.toys || []).filter((t) => t.id)
  const jobs: SimTipJob[] = []

  if (targets.length) {
    for (const toy of targets) {
      const toyLabel =
        String(toy.name || toy.toyType || toy.id || 'toy').trim() || toy.id!
      const menu = patternsForToyMenu(toy, {
        disabled: opts.disabled,
        featured: opts.featured,
        includeDisabled: false,
      })
      for (const p of menu) {
        const price = patternToyPrice(
          p.id,
          opts.prices,
          opts.toyPrices,
          toy.id,
        )
        if (!Number.isFinite(price) || price < 0 || price < floor) continue
        jobs.push({
          amount: price,
          pattern: p.id,
          name: p.name,
          price,
          toyId: toy.id!,
          toyLabel,
        })
      }
    }
    return jobs
  }

  // No linked toys â†’ sheet only (preview / pre-connect)
  for (const p of pool) {
    const price = patternMenuPrice(p.id, opts.prices)
    if (!Number.isFinite(price) || price < 0 || price < floor) continue
    jobs.push({
      amount: price,
      pattern: p.id,
      name: p.name,
      price,
      toyId: '',
      toyLabel: '',
    })
  }
  return jobs
}

/** One random job with even weight per toy (Nora not drowned by vibe catalog). */
export function sampleSimTipJob(opts: JobOpts): SimTipJob | null {
  const all = listSimTipJobs({ ...opts, minAmount: 0 })
  if (!all.length) return null
  const byToy = new Map<string, SimTipJob[]>()
  for (const j of all) {
    const k = j.toyId || '_'
    const row = byToy.get(k) || []
    row.push(j)
    byToy.set(k, row)
  }
  const toyKeys = [...byToy.keys()]
  const pickToy = toyKeys[Math.floor(Math.random() * toyKeys.length)]!
  const row = byToy.get(pickToy)!
  return row[Math.floor(Math.random() * row.length)]!
}

/**
 * Exactly one job per linked toy â€” Test must prove every toy responds,
 * including a second unit of the same model.
 */
export function testSimTipJobs(opts: JobOpts): SimTipJob[] {
  const all = listSimTipJobs({ ...opts, minAmount: 0 })
  if (!all.length) return []
  const byToy = new Map<string, SimTipJob[]>()
  for (const j of all) {
    const k = j.toyId || '_'
    const row = byToy.get(k) || []
    row.push(j)
    byToy.set(k, row)
  }
  const out: SimTipJob[] = []
  for (const row of byToy.values()) {
    out.push(row[Math.floor(Math.random() * row.length)]!)
  }
  return out
}

/**
 * Balanced spoof queue: walk each toy's patterns in round-robin so rotate
 * (Nora), multi (Gemini), and vibe all appear — not only vibes.
 */
export function ladderSimTipJobs(opts: JobOpts): SimTipJob[] {
  const maxTips = Math.max(1, Math.min(64, opts.maxTips ?? 32))
  const all = listSimTipJobs({ ...opts, minAmount: 0 })
  if (!all.length) return []

  const byToy = new Map<string, SimTipJob[]>()
  for (const j of all) {
    const k = j.toyId || '_'
    const row = byToy.get(k) || []
    row.push(j)
    byToy.set(k, row)
  }
  for (const row of byToy.values()) {
    // shuffle each toyâ€™s patterns so rotate lines arenâ€™t always last
    for (let i = row.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const t = row[i]!
      row[i] = row[j]!
      row[j] = t
    }
  }

  const keys = [...byToy.keys()].sort()
  const idxs = keys.map(() => 0)
  const out: SimTipJob[] = []
  let guard = 0
  while (out.length < maxTips && guard < maxTips * 16) {
    guard++
    let progressed = false
    for (let t = 0; t < keys.length; t++) {
      const row = byToy.get(keys[t]!)!
      const i = idxs[t]!
      if (i >= row.length) continue
      out.push(row[i]!)
      idxs[t] = i + 1
      progressed = true
      if (out.length >= maxTips) break
    }
    if (!progressed) break
  }
  return shuffleJobs(out)
}

function shuffleJobs<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]!
    a[i] = a[j]!
    a[j] = t
  }
  return a
}

/**
 * Unique menu tip amounts for the live ladder (enabled patterns that fit
 * the given toys â€” or the shared sheet when toys is empty).
 */
export function listLadderAmounts(
  prices: PatternPrices,
  minAmount: number,
  disabled: string[] = [],
  toyPrices?: ToyPatternPrices,
  toys?: CapabilitySource[],
): number[] {
  const jobs = listSimTipJobs({
    prices,
    minAmount,
    disabled,
    toyPrices,
    toys,
  })
  const uniq = new Map<string, number>()
  for (const j of jobs) {
    const k = String(Math.round(j.amount * 1e9) / 1e9)
    if (!uniq.has(k)) uniq.set(k, j.amount)
  }
  return [...uniq.values()].sort((a, b) => a - b)
}

/**
 * One tip amount for Simulate: even by toy first, then pattern on that toy.
 */
export function sampleTipAmount(
  prices: PatternPrices,
  minAmount: number,
  disabled: string[] = [],
  toyPrices?: ToyPatternPrices,
  toys?: CapabilitySource[],
): number {
  const job = sampleSimTipJob({
    prices,
    minAmount,
    disabled,
    toyPrices,
    toys,
  })
  if (job) return job.amount
  return Math.max(minAmount || 0, 1)
}

/**
 * Spoof amounts only (legacy). Prefer ladderSimTipJobs for Simulate.
 */
export function ladderSimulateAmounts(
  prices: PatternPrices,
  minAmount: number,
  disabled: string[] = [],
  toyPrices?: ToyPatternPrices,
  toys?: CapabilitySource[],
  maxTips = 32,
): number[] {
  return ladderSimTipJobs({
    prices,
    minAmount,
    disabled,
    toyPrices,
    toys,
    maxTips,
  }).map((j) => j.amount)
}
