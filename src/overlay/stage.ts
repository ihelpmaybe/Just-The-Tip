/** Always-on overlay board (ladder) — slim, no QR SVGs. */

import {
  OVERLAY_MENU_MAX_ROWS,
} from './menuStyle'

export type OverlayLadderRow = {
  name: string
  amountLabel: string
  featured?: boolean
  /** Tip-menu offer id (visibility ticks). */
  id?: string
  /** Toy / family line */
  note?: string
  blurb?: string
  /** Numeric amount when known — used to re-sort when featured-first is off */
  amount?: number
  timeSec?: number
  sellPitch?: string
  strengths?: number[]
}

export type OverlayPulseHit = 's' | 'm' | 'l' | 'xl'

const LADDER_LIMIT = OVERLAY_MENU_MAX_ROWS

/** USD floors: below s → tiny, below m → normal, below l → large, else xl. */
export const OVERLAY_HIT_USD = { s: 1, m: 8, l: 25 } as const
export const OVERLAY_HIT_HOLD = { s: 0.7, m: 1, l: 1.35, xl: 1.7 } as const
export const OVERLAY_HIT_ZOOM = { s: 0.88, m: 1, l: 1.18, xl: 1.32 } as const

function clipRow(raw: Record<string, unknown>, featured: boolean): OverlayLadderRow | null {
  const name = String(raw.name || '').trim().slice(0, 48)
  const amountLabel = String(raw.amountLabel || raw.amount || '')
    .trim()
    .slice(0, 24)
  if (!name || !amountLabel) return null
  const note = String(raw.note || '')
    .trim()
    .slice(0, 40)
  const blurb = String(raw.blurb || '')
    .trim()
    .slice(0, 80)
  const id = String(raw.id || '')
    .trim()
    .slice(0, 96)
  const amountN = Number(raw.amount)
  const row: OverlayLadderRow = {
    name,
    amountLabel,
    featured: featured || undefined,
  }
  if (id) row.id = id
  if (note) row.note = note
  if (blurb) row.blurb = blurb
  if (Number.isFinite(amountN)) row.amount = amountN
  const sellPitch = String(raw.sellPitch || '')
    .trim()
    .slice(0, 56)
  if (sellPitch) row.sellPitch = sellPitch
  const timeSec = Math.round(Number(raw.timeSec))
  if (Number.isFinite(timeSec) && timeSec > 0) row.timeSec = timeSec
  if (Array.isArray(raw.strengths) && raw.strengths.length) {
    const steps = raw.strengths
      .map((n) => {
        const sv = Math.round(Number(n) || 0)
        return sv < 0 ? 0 : sv > 8 ? 8 : sv
      })
      .slice(0, 16)
    if (steps.length) row.strengths = steps
  }
  return row
}

export function slimOverlayLadder(
  raw: unknown,
  opts?: { limit?: number; featuredFirst?: boolean },
): OverlayLadderRow[] {
  if (!Array.isArray(raw)) return []
  const limit = Math.min(
    LADDER_LIMIT,
    Math.max(1, Math.round(Number(opts?.limit) || LADDER_LIMIT)),
  )
  const featuredFirst = opts?.featuredFirst !== false
  const out: OverlayLadderRow[] = []
  const seen = new Set<string>()
  const take = (source: Record<string, unknown>, featured: boolean) => {
    const row = clipRow(source, featured)
    if (!row) return
    const key =
      row.id ||
      `${row.name.toLowerCase()}|${row.amountLabel.toLowerCase()}|${(row.note || '').toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    out.push(row)
  }
  const passes: boolean[] = featuredFirst ? [true, false] : [false]
  for (const featuredOnly of passes) {
    for (const row of raw) {
      if (!row || typeof row !== 'object') continue
      const o = row as Record<string, unknown>
      if (featuredOnly && !o.featured) continue
      if (!featuredOnly && featuredFirst && o.featured) continue
      take(o, Boolean(o.featured))
      if (out.length >= limit) return out
    }
  }
  return out
}

/** `null` = all rows. Empty array = none. Ids match tip-menu offer `id`. */
export function filterVisibleOverlayRows(
  rows: OverlayLadderRow[],
  visibleOfferIds: string[] | null | undefined,
): OverlayLadderRow[] {
  if (!Array.isArray(visibleOfferIds)) return rows
  const want = new Set(visibleOfferIds.map((id) => String(id)))
  return rows.filter((row) => row.id && want.has(row.id))
}

/** Group-friendly order: toy/note, then price, then name. */
export function sortOverlayRowsByToy(
  rows: OverlayLadderRow[],
): OverlayLadderRow[] {
  return [...rows].sort(
    (a, b) =>
      String(a.note || '').localeCompare(String(b.note || '')) ||
      (Number(a.amount) || 0) - (Number(b.amount) || 0) ||
      String(a.name).localeCompare(String(b.name)),
  )
}

/** Bigger USD → bigger on-screen hit (Stream Master per-tier feel). */
export function overlayHitFromUsd(
  usd: number | null | undefined,
): OverlayPulseHit {
  const n = Number(usd)
  if (!Number.isFinite(n) || n < 0) return 'm'
  if (n < OVERLAY_HIT_USD.s) return 's'
  if (n < OVERLAY_HIT_USD.m) return 'm'
  if (n < OVERLAY_HIT_USD.l) return 'l'
  return 'xl'
}

export function overlayHoldMs(holdSec: number, hit: OverlayPulseHit): number {
  const base = Math.min(20, Math.max(2, Math.round(Number(holdSec) || 7)))
  const mul = OVERLAY_HIT_HOLD[hit]
  return Math.round(Math.min(20, Math.max(2, base * mul)) * 1000)
}
