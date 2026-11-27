/**
 * Tip menu export types + social link formatting (desktop-compatible).
 */

export type TipMenuExportRow = {
  name: string
  blurb: string
  price: number
  timeSec: number
  tag: string
  family: string
  strengths: number[]
  /** Independent 0–8 strength rows for M1, M2, etc. */
  motorStrengths?: number[][]
  featured?: boolean
  forToy?: string
  /** Per-row tip coin (coin reward matrix). Empty/omit = use export-level token. */
  coin?: string
  tokenAddress?: string
  tokenDecimals?: number
  usdTarget?: number
  /** Pre-built EIP-681 payment URI for this row (export QR). */
  paymentUri?: string
}

export type MenuExportOrientation = 'landscape' | 'portrait'

export type TipMenuLink = {
  label: string
  value: string
}

export type TipMenuExportInput = {
  brand?: string
  displayName: string
  tagline?: string
  showTimes?: string
  chainLabel: string
  symbol: string
  tokenSymbol?: string
  receive?: string
  cheapest?: number
  links?: TipMenuLink[]
  items: TipMenuExportRow[]
  orientation?: MenuExportOrientation
  chainId?: number
  chainRpcs?: string[]
  explorerUrl?: string
  nativeSymbol?: string
  nativeDecimals?: number
  tokenAddress?: string
  tokenDecimals?: number
}

/** Pretty-print social fields for the share card. */
export function formatShareLinks(opts: {
  x?: string
  telegram?: string
  discord?: string
  web?: string
  extra?: string
}): TipMenuLink[] {
  const out: TipMenuLink[] = []
  const x = prettyX(opts.x)
  if (x) out.push({ label: 'X', value: x })
  const tg = prettyTelegram(opts.telegram)
  if (tg) out.push({ label: 'Telegram', value: tg })
  const dc = cleanLink(opts.discord)
  if (dc) out.push({ label: 'Discord', value: dc })
  const web = cleanLink(opts.web)
  if (web) out.push({ label: 'Web', value: web })
  const extra = cleanLink(opts.extra)
  if (extra) out.push({ label: 'Link', value: extra })
  return out
}

function cleanLink(raw?: string): string {
  return (raw || '').trim().replace(/\s+/g, ' ')
}

function prettyX(raw?: string): string {
  let s = cleanLink(raw)
  if (!s) return ''
  s = s
    .replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, '')
    .replace(/^@+/, '')
    .replace(/\/.*$/, '')
  if (!s) return ''
  return `@${s}`
}

function prettyTelegram(raw?: string): string {
  let s = cleanLink(raw)
  if (!s) return ''
  s = s
    .replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me)\//i, '')
    .replace(/^@+/, '')
    .replace(/\/.*$/, '')
  if (!s) return cleanLink(raw)
  if (/^(joinchat\/|\+)/i.test(s)) return `t.me/${s}`
  return `@${s}`
}

export function vizStepsForPattern(p: {
  strengths: number[]
  intensity?: number
}): number[] {
  if (p.strengths?.length) return p.strengths.map((n) => Number(n) || 0)
  const i = Math.max(1, Math.min(8, Number(p.intensity) || 4))
  return [0, i, i, 0]
}
