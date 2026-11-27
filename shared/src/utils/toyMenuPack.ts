/**
 * Portable per-toy tip menu: prices + on/off + featured for pattern set.
 * Import remaps onto any linked toy id (two devices / two performers).
 */
import {
  PATTERNS,
  patternNeeds,
  type PatternId,
} from './patterns'
import {
  patternFitsToy,
  type CapabilitySource,
} from './patternFit'
import {
  normalizeToyPatternPrices,
  ensureUniquePriceSheet,
  patternToyPrice,
  type PatternPrices,
  type ToyPatternPrices,
} from './pricing'

export const TOY_MENU_PACK_KIND = 'pulsefans-toy-menu' as const
export const TOY_MENU_PACK_VERSION = 1 as const

export type ToyMenuPackItem = {
  id: string
  name: string
  price: number
  /** Tip matching: pattern is usable */
  enabled: boolean
  featured: boolean
}

export type ToyMenuPack = {
  kind: typeof TOY_MENU_PACK_KIND
  version: typeof TOY_MENU_PACK_VERSION
  exportedAt: string
  /** Human label for the file (performer / device nick) */
  label: string
  source: {
    id?: string
    name?: string
    toyType?: string
  }
  items: ToyMenuPackItem[]
}

export function isToyMenuPack(raw: unknown): raw is ToyMenuPack {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const o = raw as Record<string, unknown>
  return (
    o.kind === TOY_MENU_PACK_KIND &&
    Number(o.version) === TOY_MENU_PACK_VERSION &&
    Array.isArray(o.items)
  )
}

export function parseToyMenuPack(raw: unknown): ToyMenuPack {
  if (!isToyMenuPack(raw)) {
    throw new Error(
      'Not a toy price/menu pack (expected pulsefans-toy-menu v1 JSON)',
    )
  }
  const items: ToyMenuPackItem[] = []
  for (const row of raw.items) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const id = String(r.id || '').trim()
    if (!id) continue
    const price = Number(r.price)
    items.push({
      id,
      name: String(r.name || id),
      price: Number.isFinite(price) && price >= 0 ? price : 0,
      enabled: r.enabled !== false,
      featured: Boolean(r.featured),
    })
  }
  if (!items.length) throw new Error('Toy menu pack has no patterns')
  return {
    kind: TOY_MENU_PACK_KIND,
    version: TOY_MENU_PACK_VERSION,
    exportedAt:
      typeof raw.exportedAt === 'string'
        ? raw.exportedAt
        : new Date().toISOString(),
    label: String(raw.label || raw.source?.name || 'Toy menu').trim() || 'Toy menu',
    source: {
      id: raw.source?.id ? String(raw.source.id) : undefined,
      name: raw.source?.name ? String(raw.source.name) : undefined,
      toyType: raw.source?.toyType ? String(raw.source.toyType) : undefined,
    },
    items,
  }
}

export function buildToyMenuPack(opts: {
  toy: CapabilitySource
  label: string
  basePrices: PatternPrices
  toyPrices: ToyPatternPrices
  disabled: string[]
  featured: string[]
  /** Prefer full family fit set over currently shown list */
  patterns?: { id: string; name: string }[]
}): ToyMenuPack {
  const disabledSet = new Set(opts.disabled)
  const featuredSet = new Set(opts.featured)
  const list =
    opts.patterns ||
    PATTERNS.filter((p) =>
      patternFitsToy(patternNeeds(p), opts.toy, p.forProducts),
    ).map((p) => ({ id: p.id, name: p.name }))

  const items: ToyMenuPackItem[] = list.map((p) => ({
    id: p.id,
    name: p.name,
    price: patternToyPrice(
      p.id,
      opts.basePrices,
      opts.toyPrices,
      opts.toy.id,
    ),
    enabled: !disabledSet.has(p.id),
    featured: featuredSet.has(p.id),
  }))

  return {
    kind: TOY_MENU_PACK_KIND,
    version: TOY_MENU_PACK_VERSION,
    exportedAt: new Date().toISOString(),
    label: opts.label,
    source: {
      id: opts.toy.id,
      name: opts.toy.name,
      toyType: opts.toy.toyType,
    },
    items,
  }
}

export type ApplyToyMenuPackResult = {
  toyPatternPrices: ToyPatternPrices
  disabledPatterns: string[]
  featuredPatterns: string[]
  applied: number
  skipped: number
}

/**
 * Apply pack prices onto target toy; merge on/off + featured for pack patterns only.
 * Other toys’ price overrides are left alone.
 */
export function applyToyMenuPack(
  pack: ToyMenuPack,
  targetToyId: string,
  current: {
    toyPatternPrices: ToyPatternPrices
    disabledPatterns: string[]
    featuredPatterns: string[]
  },
): ApplyToyMenuPackResult {
  const toyId = String(targetToyId || '').trim()
  if (!toyId) throw new Error('Target toy id required')

  const priceRow: PatternPrices = {
    ...(current.toyPatternPrices[toyId] || {}),
  }
  const disabled = new Set(current.disabledPatterns)
  const featured = new Set(current.featuredPatterns)
  let applied = 0
  let skipped = 0

  for (const item of pack.items) {
    const id = item.id as PatternId | string
    if (!PATTERNS.some((p) => p.id === id)) {
      skipped++
      continue
    }
    priceRow[id] = Math.max(0, Number(item.price) || 0)
    if (item.enabled) disabled.delete(id)
    else disabled.add(id)
    if (item.featured) featured.add(id)
    else featured.delete(id)
    applied++
  }

  const unique = ensureUniquePriceSheet(
    Object.entries(priceRow).map(([id, price]) => ({ id, price })),
  )
  for (const id of Object.keys(priceRow)) {
    const next = unique[id]
    if (next != null) priceRow[id] = next
  }

  const toyPatternPrices = normalizeToyPatternPrices({
    ...current.toyPatternPrices,
    [toyId]: priceRow,
  })

  return {
    toyPatternPrices,
    disabledPatterns: [...disabled],
    featuredPatterns: [...featured],
    applied,
    skipped,
  }
}
