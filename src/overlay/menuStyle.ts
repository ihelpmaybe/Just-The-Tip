/** OBS tip-menu board look (persisted with operator settings). */

import type { OverlayPosition, OverlaySize, OverlayTheme } from './style'

export type OverlayMenuLayout = 'waves' | 'side' | 'cols' | 'cards' | 'grouped'

/** Bump when the recommended cam layout changes (migrates old default only). */
export const OVERLAY_MENU_BOARD = 2

export type OverlayMenuTheme = Exclude<OverlayTheme, 'custom'>

export type OverlayMenuLayoutInfo = {
  id: OverlayMenuLayout
  name: string
  blurb: string
  /** Shown on the recommended cam layout */
  badge?: string
}

/** Research-ranked gallery. Default = Stream Master analog (price · time · wave). */
export const OVERLAY_MENU_LAYOUTS: readonly OverlayMenuLayoutInfo[] = [
  {
    id: 'waves',
    name: 'Waves',
    blurb: 'Price, hold time, and the vibration shape — same read as Stream Master.',
    badge: 'Best for cam',
  },
  {
    id: 'side',
    name: 'Side list',
    blurb: 'Text pitch + price. Use when you want copy instead of waveforms.',
  },
  {
    id: 'cols',
    name: 'Two columns',
    blurb: 'Same text rows, shorter stack — use when 8–16 offers would grow too tall.',
  },
  {
    id: 'cards',
    name: 'Compact cards',
    blurb: 'Small tiles for a dedicated menu scene, not a close-up cam.',
  },
  {
    id: 'grouped',
    name: 'Grouped',
    blurb: 'Section headers by toy or coin when you sell more than one.',
  },
]

export type OverlayMenuStyle = {
  layout: OverlayMenuLayout
  position: OverlayPosition
  size: OverlaySize
  /** Panel glass only (0.4–0.95). Labels stay opaque. */
  opacity: number
  /** Visible rows after slim (1–32). */
  maxRows: number
  featuredFirst: boolean
  showNote: boolean
  showBlurb: boolean
  theme: OverlayMenuTheme
  headline: string
  brand: string
  /** Overlay generation — kept so a board bump only migrates the old default. */
  board: number
  /**
   * Which tip-menu offers to show on stream.
   * `null` = all current Tip menu rows. `[]` = none. Ids match offer `id`.
   */
  visibleOfferIds: string[] | null
}

export const OVERLAY_MENU_MAX_ROWS = 32
export const OVERLAY_MENU_DEFAULT_ROWS = 16

export const defaultOverlayMenuStyle: OverlayMenuStyle = {
  layout: 'waves',
  position: 'top-left',
  size: 'normal',
  opacity: 0.78,
  maxRows: OVERLAY_MENU_DEFAULT_ROWS,
  featuredFirst: false,
  showNote: false,
  showBlurb: false,
  theme: 'cyan',
  headline: 'Tip menu',
  brand: '',
  board: OVERLAY_MENU_BOARD,
  visibleOfferIds: null,
}

const POSITIONS = new Set<OverlayPosition>([
  'bottom',
  'top',
  'bottom-left',
  'bottom-right',
  'top-left',
  'top-right',
])
const SIZES = new Set<OverlaySize>(['compact', 'normal', 'large'])
const THEMES = new Set<OverlayMenuTheme>(['cyan', 'pink', 'gold', 'soft'])

export function getOverlayMenuLayout(
  id: string,
): OverlayMenuLayoutInfo | undefined {
  return OVERLAY_MENU_LAYOUTS.find((l) => l.id === id)
}

export function normalizeOverlayMenuStyle(raw: unknown): OverlayMenuStyle {
  const o =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const savedBoard = Math.round(Number(o.board))
  const boardIn = Number.isFinite(savedBoard) && savedBoard > 0 ? savedBoard : 0
  const layout: OverlayMenuLayout = 'waves'
  const pos = String(o.position || '') as OverlayPosition
  const size = String(o.size || '') as OverlaySize
  const themeRaw = String(o.theme || '') as OverlayMenuTheme
  let opacity = Number(o.opacity)
  if (!Number.isFinite(opacity)) opacity = defaultOverlayMenuStyle.opacity
  opacity = Math.min(0.95, Math.max(0.4, Math.round(opacity * 100) / 100))
  let maxRows = Math.round(Number(o.maxRows))
  if (!Number.isFinite(maxRows)) maxRows = defaultOverlayMenuStyle.maxRows
  maxRows = Math.min(OVERLAY_MENU_MAX_ROWS, Math.max(1, maxRows))
  return {
    layout,
    position: POSITIONS.has(pos) ? pos : defaultOverlayMenuStyle.position,
    size: SIZES.has(size) ? size : defaultOverlayMenuStyle.size,
    opacity,
    maxRows,
    featuredFirst: false,
    showNote: Boolean(o.showNote),
    showBlurb: Boolean(o.showBlurb),
    theme: THEMES.has(themeRaw) ? themeRaw : defaultOverlayMenuStyle.theme,
    headline: String(o.headline ?? defaultOverlayMenuStyle.headline)
      .trim()
      .slice(0, 48),
    brand: String(o.brand ?? defaultOverlayMenuStyle.brand)
      .trim()
      .slice(0, 48),
    board: Math.max(boardIn, OVERLAY_MENU_BOARD),
    visibleOfferIds: Array.isArray(o.visibleOfferIds)
      ? o.visibleOfferIds
          .map((x) => String(x || '').trim())
          .filter(Boolean)
          .slice(0, OVERLAY_MENU_MAX_ROWS)
      : null,
  }
}
