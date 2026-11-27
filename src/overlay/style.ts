/** OBS tip-alert look & filters (persisted with operator settings). */

export type OverlayPosition =
  | 'bottom'
  | 'top'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-left'
  | 'top-right'

export type OverlayTheme = 'cyan' | 'pink' | 'gold' | 'soft' | 'custom'
export type OverlaySize = 'compact' | 'normal' | 'large'

export type OverlayStyle = {
  /** Corner / edge placement */
  position: OverlayPosition
  theme: OverlayTheme
  size: OverlaySize
  /** How long the alert stays (seconds) */
  holdSec: number
  /** Small label above amount, e.g. "TIP" or streamer tag */
  eyebrow: string
  /** When set, prefix under eyebrow (streamer name) */
  brand: string
  showPattern: boolean
  /** Show pool-swap alerts at all. */
  showPoolAlerts: boolean
  /** Keep the pair label in pool-swap alerts. */
  showPoolLabel: boolean
  /** Show dry-run / simulate on stream */
  showDryRun: boolean
  /** @deprecated Legacy shared threshold; mirrors walletMinAmount. */
  minAmount: number
  /** Hide wallet-tip alerts under this amount (0 = all). */
  walletMinAmount: number
  /** Hide pool-swap alerts under this amount (0 = all). */
  poolMinAmount: number
  /** Dim connection indicator in corner of overlay page */
  showStatus: boolean
  /** PulseChain / PulseX / HEX / PLSX logo strip on alerts */
  showEco: boolean
  /**
   * Your own CSS for the alert. Targets #stage, .alert, .title, etc.
   * Use theme "Custom window" for a blank shell with only your CSS/HTML.
   */
  customCss: string
  /**
   * Optional HTML for the window box. Tokens:
   * {{title}} {{subtitle}} {{eyebrow}} {{brand}} {{amount}} {{symbol}} {{source}} {{eco}}
   * Empty = default layout (brand / eyebrow / title / subtitle + eco logos).
   */
  customHtml: string
}

export const defaultOverlayStyle: OverlayStyle = {
  position: 'bottom',
  theme: 'cyan',
  size: 'normal',
  holdSec: 7,
  eyebrow: 'Tip',
  brand: '',
  showPattern: true,
  showPoolAlerts: true,
  showPoolLabel: true,
  showDryRun: true,
  minAmount: 0,
  walletMinAmount: 0,
  poolMinAmount: 0,
  showStatus: false,
  showEco: true,
  customCss: '',
  customHtml: '',
}

/** @deprecated use OVERLAY_TEMPLATES / SAMPLE_* from `./templates` */
export { SAMPLE_CUSTOM_CSS, SAMPLE_CUSTOM_HTML } from './templates'

const POSITIONS = new Set<OverlayPosition>([
  'bottom',
  'top',
  'bottom-left',
  'bottom-right',
  'top-left',
  'top-right',
])
const THEMES = new Set<OverlayTheme>(['cyan', 'pink', 'gold', 'soft', 'custom'])
const SIZES = new Set<OverlaySize>(['compact', 'normal', 'large'])

const MAX_CSS = 24_000
const MAX_HTML = 12_000

function clipText(v: unknown, max: number): string {
  return String(v ?? '').slice(0, max)
}

export function normalizeOverlayStyle(raw: unknown): OverlayStyle {
  const o =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const pos = String(o.position || '') as OverlayPosition
  const theme = String(o.theme || '') as OverlayTheme
  const size = String(o.size || '') as OverlaySize
  let hold = Math.round(Number(o.holdSec))
  if (!Number.isFinite(hold)) hold = defaultOverlayStyle.holdSec
  hold = Math.min(20, Math.max(2, hold))
  // Existing saved styles used one minAmount for every source. Preserve it
  // as the wallet threshold on upgrade; pools keep showing until configured.
  let legacyMin = Number(o.minAmount)
  if (!Number.isFinite(legacyMin) || legacyMin < 0) legacyMin = 0
  let walletMin = Number(o.walletMinAmount)
  if (!Number.isFinite(walletMin) || walletMin < 0) walletMin = legacyMin
  let poolMin = Number(o.poolMinAmount)
  if (!Number.isFinite(poolMin) || poolMin < 0) poolMin = 0

  const customHtml = clipText(o.customHtml, MAX_HTML)
  const customCss = clipText(o.customCss, MAX_CSS)
  // Packs / custom windows require the blank shell — never mix with cyan/pink chrome
  const hasCustomWindow = customHtml.trim().length > 0
  let nextTheme: OverlayTheme = THEMES.has(theme)
    ? theme
    : defaultOverlayStyle.theme
  if (hasCustomWindow) nextTheme = 'custom'
  else if (nextTheme === 'custom') nextTheme = 'cyan'

  return {
    position: POSITIONS.has(pos) ? pos : defaultOverlayStyle.position,
    theme: nextTheme,
    size: SIZES.has(size) ? size : defaultOverlayStyle.size,
    holdSec: hold,
    eyebrow: String(o.eyebrow ?? defaultOverlayStyle.eyebrow)
      .trim()
      .slice(0, 32),
    brand: String(o.brand ?? '')
      .trim()
      .slice(0, 48),
    showPattern: o.showPattern === undefined ? true : Boolean(o.showPattern),
    // Pool watches use the same OBS tip alert as wallet tips. Default on
    // even if an older save only toggled “show pool name”.
    showPoolAlerts:
      o.showPoolAlerts === undefined ? true : Boolean(o.showPoolAlerts),
    showPoolLabel:
      o.showPoolLabel === undefined ? true : Boolean(o.showPoolLabel),
    showDryRun: o.showDryRun === undefined ? true : Boolean(o.showDryRun),
    minAmount: walletMin,
    walletMinAmount: walletMin,
    poolMinAmount: poolMin,
    showStatus: Boolean(o.showStatus),
    showEco: o.showEco === undefined ? true : Boolean(o.showEco),
    customCss,
    customHtml,
  }
}

/** True when custom HTML drives the window (not a built-in theme). */
export function isCustomWindowStyle(s: OverlayStyle): boolean {
  return String(s.customHtml || '').trim().length > 0
}
