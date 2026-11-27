/**
 * Shareable tip-menu card as JPEG (canvas).
 * Landscape (16:9) + portrait (9:16) with dynamic grid columns/rows.
 * Per-card EIP-681 QRs (token name, amount, network) for PulseChain wallets.
 */
import { paymentQrDataUrl } from '@pulsefans/domain/utils/exportQr'
import { resolveExportPaymentUri } from '@pulsefans/domain/utils/exportTipMenuHtml'
import { APP_SLUG } from '../version'

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
  /** Brighter tile on export */
  featured?: boolean
  /** When multi-toy menus differ by performer / device */
  forToy?: string
  /** Per-row tip coin (coin reward matrix) */
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
  /** When the creator goes live / takes tips */
  showTimes?: string
  chainLabel: string
  /** Unit shown on price cards (active tip token label, or native). */
  symbol: string
  /**
   * Optional second unit. Prefer omitting when `symbol` is already the tip unit.
   * Kept for older dual-label menus (“PLS or TOKEN”).
   */
  tokenSymbol?: string
  receive?: string
  cheapest?: number
  links?: TipMenuLink[]
  items: TipMenuExportRow[]
  /** JPG canvas aspect only — HTML export ignores this */
  orientation?: MenuExportOrientation
  /** EVM chain id (kept for export metadata / future payment URIs) */
  chainId?: number
  chainRpcs?: string[]
  explorerUrl?: string
  /** Native gas/chain currency (wallet_addEthereumChain) — not the tip unit. */
  nativeSymbol?: string
  nativeDecimals?: number
  /** When set, tips send this ERC‑20 instead of native */
  tokenAddress?: string
  tokenDecimals?: number
}

const SCALE = 2
const GRID_GAP = 12
const PAD_TOP = 48
/** Absolute intensity scale for pattern bars (matches live menu 0–8). */
const VIZ_MAX = 8

const C = {
  paper: '#050d18',
  ink: '#e8f4ff',
  soft: '#9bb8d4',
  muted: 'rgba(232, 244, 255, 0.52)',
  ember: '#00c8ff',
  emberSoft: 'rgba(0, 200, 255, 0.16)',
  emberSoftFeatured: 'rgba(0, 200, 255, 0.32)',
  gold: '#5ce1ff',
  line: 'rgba(0, 200, 255, 0.14)',
  lineFeatured: 'rgba(92, 225, 255, 0.55)',
  card: 'rgba(10, 28, 52, 0.82)',
  cardAlt: 'rgba(14, 36, 64, 0.88)',
  cardFeatured: 'rgba(18, 48, 82, 0.96)',
  cardFeaturedAlt: 'rgba(22, 56, 96, 0.98)',
  panel: 'rgba(8, 22, 44, 0.78)',
}

const FONT_DISPLAY =
  '"Avenir Next", "Segoe UI", Candara, system-ui, sans-serif'
const FONT_SANS = '"Avenir Next", "Segoe UI", Candara, system-ui, sans-serif'

type OrientPreset = {
  /** Short id for filenames */
  id: MenuExportOrientation
  w: number
  /** Ideal height for aspect (grows if tiles need room) */
  targetH: number
  padX: number
  minCols: number
  maxCols: number
  minCardW: number
  minCardH: number
  /** Preferred card width / height */
  cardAspect: number
}

const PRESETS: Record<MenuExportOrientation, OrientPreset> = {
  landscape: {
    id: 'landscape',
    w: 1920,
    targetH: 1080,
    padX: 48,
    minCols: 3,
    maxCols: 7,
    minCardW: 180,
    minCardH: 190,
    cardAspect: 0.62,
  },
  portrait: {
    id: 'portrait',
    w: 1080,
    targetH: 1920,
    padX: 36,
    minCols: 2,
    maxCols: 3,
    minCardW: 200,
    minCardH: 175,
    cardAspect: 0.7,
  },
}

function formatPrice(n: number): string {
  if (!Number.isFinite(n)) return '0'
  if (n >= 1000) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }
  if (n >= 10) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  return n.toLocaleString(undefined, {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  })
}

function tipUnitLine(symbol: string, tokenSymbol?: string): string {
  // symbol is primary tip unit; only dual-label when a distinct second ticker is supplied
  // and it isn't already the label (e.g. PornDai label vs DAI ticker → no "PornDai or DAI").
  const t = (tokenSymbol || '').trim()
  const s = (symbol || '').trim() || 'TOKEN'
  if (!t) return s
  if (t.toUpperCase() === s.toUpperCase()) return s
  // Prefer single primary unit — token menus must not look like native PLS.
  return s
}

function paintBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  ctx.fillStyle = C.paper
  ctx.fillRect(0, 0, w, h)

  const g1 = ctx.createRadialGradient(w * 0.12, 0, 0, w * 0.12, 0, w * 0.75)
  g1.addColorStop(0, 'rgba(0, 200, 255, 0.26)')
  g1.addColorStop(1, 'transparent')
  ctx.fillStyle = g1
  ctx.fillRect(0, 0, w, h)

  const g2 = ctx.createRadialGradient(
    w * 0.95,
    h * 0.05,
    0,
    w * 0.95,
    h * 0.05,
    w * 0.6,
  )
  g2.addColorStop(0, 'rgba(0, 100, 220, 0.16)')
  g2.addColorStop(1, 'transparent')
  ctx.fillStyle = g2
  ctx.fillRect(0, 0, w, h)

  const g3 = ctx.createLinearGradient(0, 0, 0, h)
  g3.addColorStop(0, 'transparent')
  g3.addColorStop(1, 'rgba(0, 8, 24, 0.55)')
  ctx.fillStyle = g3
  ctx.fillRect(0, 0, w, h)
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  maxLines: number,
): string[] {
  const raw = text.replace(/\s+/g, ' ').trim()
  if (!raw) return []
  const words = raw.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (ctx.measureText(next).width <= maxW) {
      cur = next
      continue
    }
    if (cur) lines.push(cur)
    cur = w
    if (lines.length >= maxLines) break
  }
  if (cur && lines.length < maxLines) lines.push(cur)
  if (lines.length > maxLines) lines.length = maxLines
  if (lines.length === maxLines) {
    const used = lines.join(' ').length
    if (used < raw.length) {
      let last = lines[maxLines - 1]!
      while (last.length > 1 && ctx.measureText(`${last}…`).width > maxW) {
        last = last.slice(0, -1)
      }
      lines[maxLines - 1] = `${last}…`
    }
  }
  return lines
}

function truncate(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
): string {
  if (ctx.measureText(text).width <= maxW) return text
  let s = text
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) {
    s = s.slice(0, -1)
  }
  return `${s}…`
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/**
 * Framed intensity window — bars always on absolute 0–8 ceiling.
 */
function drawPatternBars(
  ctx: CanvasRenderingContext2D,
  steps: number[],
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const raw = (steps?.length ? steps : [2, 4, 3]).slice(0, 24)
  const n = Math.max(1, raw.length)
  const maxI = VIZ_MAX

  const bg = ctx.createLinearGradient(x, y, x, y + h)
  bg.addColorStop(0, 'rgba(0, 0, 0, 0.42)')
  bg.addColorStop(1, 'rgba(0, 0, 0, 0.22)')
  ctx.fillStyle = bg
  roundRect(ctx, x, y, w, h, 7)
  ctx.fill()
  ctx.strokeStyle = 'rgba(90, 78, 70, 0.95)'
  ctx.lineWidth = 1.25
  roundRect(ctx, x, y, w, h, 7)
  ctx.stroke()

  const inset = Math.max(3, Math.min(5, h * 0.12))
  const plotX = x + inset
  const plotY = y + inset
  const plotW = w - inset * 2
  const plotH = h - inset * 2

  ctx.save()
  ctx.beginPath()
  roundRect(ctx, x, y, w, h, 7)
  ctx.clip()

  for (const frac of [1, 0.75, 0.5, 0.25]) {
    const gy = plotY + plotH * (1 - frac)
    ctx.strokeStyle =
      frac === 1 ? 'rgba(0, 200, 255, 0.38)' : 'rgba(139, 130, 120, 0.18)'
    ctx.lineWidth = frac === 1 ? 1.25 : 1
    ctx.setLineDash(frac === 1 ? [3, 3] : [])
    ctx.beginPath()
    ctx.moveTo(plotX, gy)
    ctx.lineTo(plotX + plotW, gy)
    ctx.stroke()
  }
  ctx.setLineDash([])

  ctx.strokeStyle = 'rgba(139, 130, 120, 0.4)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(plotX, plotY + plotH)
  ctx.lineTo(plotX + plotW, plotY + plotH)
  ctx.stroke()

  if (h >= 28) {
    ctx.fillStyle = 'rgba(0, 200, 255, 0.55)'
    ctx.font = `600 8px ${FONT_SANS}`
    ctx.textAlign = 'right'
    ctx.fillText('max', plotX + plotW - 1, plotY + 8)
    ctx.textAlign = 'left'
  }

  const padX = 2
  const gap = Math.max(1, Math.min(2.5, ((plotW - padX * 2) / n) * 0.16))
  const usableW = plotW - padX * 2 - gap * (n - 1)
  const barW = Math.max(2, usableW / n)

  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(maxI, Number(raw[i]) || 0))
    const cx = plotX + padX + i * (barW + gap) + barW / 2
    const barH = (plotH * v) / maxI
    const cy = plotY + plotH - barH
    if (i === 0) ctx.moveTo(cx, cy)
    else ctx.lineTo(cx, cy)
  }
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.55)'
  ctx.lineWidth = 1.5
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.stroke()

  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(maxI, Number(raw[i]) || 0))
    if (v <= 0) continue
    const barH = Math.max(1.5, (plotH * v) / maxI)
    const bx = plotX + padX + i * (barW + gap)
    const by = plotY + plotH - barH
    const t = v / maxI
    const r = Math.round(224 + (212 - 224) * (1 - t))
    const gC = Math.round(120 + (165 - 120) * t)
    const b = Math.round(98 + (116 - 98) * t)
    ctx.fillStyle = `rgba(${r}, ${gC}, ${b}, ${0.55 + t * 0.4})`
    roundRect(ctx, bx, by, barW, barH, 1.2)
    ctx.fill()
  }

  ctx.restore()
}

/** Draw one compact lane per motor when the pattern is dual/multi-motor. */
function drawPatternViz(
  ctx: CanvasRenderingContext2D,
  row: TipMenuExportRow,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const lanes = row.motorStrengths?.filter((lane) => lane.length) || []
  if (lanes.length < 2) {
    drawPatternBars(ctx, row.strengths, x, y, w, h)
    return
  }

  const gap = 3
  const laneH = Math.max(16, (h - gap) / Math.min(3, lanes.length))
  const labelW = 15
  for (let i = 0; i < Math.min(3, lanes.length); i++) {
    const ly = y + i * (laneH + gap)
    ctx.fillStyle = 'rgba(232, 244, 255, 0.7)'
    ctx.font = `700 ${Math.max(7, Math.min(9, laneH * 0.32))}px ${FONT_SANS}`
    ctx.fillText(`M${i + 1}`, x, ly + laneH * 0.62)
    drawPatternBars(ctx, lanes[i]!, x + labelW, ly, w - labelW, laneH)
  }
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

type Tile = {
  row: TipMenuExportRow
  blurbLines: string[]
  qrImg: HTMLImageElement | null
}

type GridPick = {
  cols: number
  rows: number
  cardW: number
  cardH: number
  gridH: number
}

/**
 * Choose cols/rows so the grid fills the available area near the frame aspect.
 * Grows grid height if tiles would go below min readable size.
 */
function pickGrid(
  count: number,
  innerW: number,
  /** Height budget in the target frame for the grid alone */
  budgetH: number,
  preset: OrientPreset,
): GridPick {
  const gap = GRID_GAP
  const maxByWidth = Math.max(
    1,
    Math.floor((innerW + gap) / (preset.minCardW + gap)),
  )
  const minC = Math.min(preset.minCols, count)
  const maxC = Math.min(preset.maxCols, count, maxByWidth)

  // Ideal columns so pack roughly matches area aspect (more cols in landscape)
  const areaAspect = innerW / Math.max(1, budgetH)
  const ideal = Math.sqrt(count * areaAspect * preset.cardAspect)
  let best: GridPick | null = null
  let bestScore = Infinity

  for (let cols = minC; cols <= maxC; cols++) {
    const rows = Math.ceil(count / cols)
    const cardW = (innerW - gap * (cols - 1)) / cols

    // Height if we fill the budget
    let cardH = (budgetH - gap * (rows - 1)) / rows
    // Prefer not stretched beyond aspect; prefer not squashed below min
    const preferredH = cardW / preset.cardAspect
    if (cardH > preferredH * 1.25) cardH = preferredH * 1.25
    if (cardH < preset.minCardH) cardH = preset.minCardH
    if (cardW < preset.minCardW - 0.5) continue

    const gridH = rows * cardH + Math.max(0, rows - 1) * gap
    const empty = cols * rows - count
    // Prefer near-ideal cols, less empty, height close to budget
    const wasteH = Math.abs(gridH - budgetH) / Math.max(budgetH, 1)
    const score =
      Math.abs(cols - ideal) * 1.4 +
      empty * 0.55 +
      wasteH * 1.2 +
      (gridH > budgetH * 1.02 ? (gridH - budgetH) / budgetH : 0)

    if (score < bestScore) {
      bestScore = score
      best = { cols, rows, cardW, cardH, gridH }
    }
  }

  if (!best) {
    // Fallback single-column stack
    const cols = 1
    const rows = count
    const cardW = innerW
    const cardH = Math.max(preset.minCardH, cardW / preset.cardAspect)
    const gridH = rows * cardH + Math.max(0, rows - 1) * gap
    return { cols, rows, cardW, cardH, gridH }
  }
  return best
}

function measureHeaderH(
  scratch: CanvasRenderingContext2D,
  opts: {
    hasName: boolean
    tagline: boolean
    showTimes: boolean
    links: TipMenuLink[]
    receive: boolean
    hasPayQr: boolean
    innerW: number
    padX: number
    W: number
  },
): { headerH: number; panelH: number } {
  let headerH = PAD_TOP
  headerH += 28 // brand
  if (opts.hasName) headerH += 58
  if (opts.tagline) headerH += 28
  if (opts.showTimes) headerH += 44
  headerH += opts.hasName || opts.tagline || opts.showTimes ? 36 : 52

  if (opts.links.length) {
    scratch.font = `600 13px ${FONT_SANS}`
    let px = 0
    let linkRows = 1
    const gap = 10
    for (const link of opts.links) {
      const text = `${link.label.trim() || 'Link'}  ${link.value.trim()}`
      const pillW = Math.min(opts.innerW, scratch.measureText(text).width + 28)
      if (px + pillW > opts.innerW && px > 0) {
        px = 0
        linkRows += 1
      }
      px += pillW + gap
    }
    headerH += 10 + linkRows * 36 + 8
  }

  const panelLines = 1 + (opts.receive ? 1 : 0) + (opts.hasPayQr ? 1 : 0) + 1
  let panelH = 18 + panelLines * 22 + 14
  if (opts.hasPayQr) panelH = Math.max(panelH, 188)
  headerH += panelH + 28
  headerH += 8
  return { headerH, panelH }
}

function loadQrImage(dataUrl: string): Promise<HTMLImageElement | null> {
  if (!dataUrl) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

/**
 * Draw tip menu → JPEG download.
 */
export async function exportTipMenuJpg(
  input: TipMenuExportInput,
): Promise<void> {
  const items = input.items.filter((r) => r.name.trim())
  if (!items.length) {
    throw new Error(
      'No enabled patterns to export — turn some On in the tip menu.',
    )
  }

  const orientation: MenuExportOrientation =
    input.orientation === 'portrait' ? 'portrait' : 'landscape'
  const preset = PRESETS[orientation]
  const W = preset.w
  const padX = preset.padX
  const brand = input.brand || 'Just The Tip'
  const symbol = input.symbol || 'TOKEN'
  const displayName = input.displayName.trim() || 'Tip menu'
  const tagline = (input.tagline || '').trim()
  const showTimes = (input.showTimes || '').trim()
  const unit = tipUnitLine(symbol, input.tokenSymbol)
  const receive = input.receive?.trim() || ''
  const hasName = Boolean(input.displayName.trim())
  const links = (input.links || []).filter((l) => l.value.trim())
  const payCtx = {
    receive,
    chainId: input.chainId ?? 369,
    tokenAddress: input.tokenAddress,
    tokenDecimals: input.tokenDecimals,
    nativeDecimals: input.nativeDecimals ?? 18,
    tokenSymbol: symbol,
    networkName: input.chainLabel,
  }
  const rowUris = items.map((row) => resolveExportPaymentUri(row, payCtx))
  const hasPayQr = Boolean(receive && rowUris.some(Boolean))
  const tileQrImgs = await Promise.all(
    rowUris.map(async (uri) =>
      uri ? loadQrImage(await paymentQrDataUrl(uri, 320)) : null,
    ),
  )
  let cheapestUri: string | null = null
  let cheapestPrice = Infinity
  for (let i = 0; i < items.length; i++) {
    const uri = rowUris[i]
    if (!uri) continue
    const price = items[i]!.price
    if (price < cheapestPrice) {
      cheapestPrice = price
      cheapestUri = uri
    }
  }
  const panelQrImg = cheapestUri
    ? await loadQrImage(await paymentQrDataUrl(cheapestUri, 140))
    : null

  const scratch = document.createElement('canvas').getContext('2d')
  if (!scratch) throw new Error('Canvas unavailable')

  const innerW = W - padX * 2
  const footerH = 64
  const { headerH, panelH } = measureHeaderH(scratch, {
    hasName,
    tagline: Boolean(tagline),
    showTimes: Boolean(showTimes),
    links,
    receive: Boolean(receive),
    hasPayQr,
    innerW,
    padX,
    W,
  })

  // Height budget for tiles inside the target aspect frame
  const budgetH = Math.max(
    preset.minCardH,
    preset.targetH - headerH - footerH,
  )
  const grid = pickGrid(items.length, innerW, budgetH, preset)

  // Final canvas: keep width fixed (L/P); grow height if grid needs more room
  const neededH = Math.ceil(headerH + grid.gridH + footerH)
  const H = Math.max(preset.targetH, neededH)

  // Re-scale card heights to fill extra room when we have tall budget and short grid
  let cardH = grid.cardH
  const cardW = grid.cardW
  if (neededH < preset.targetH && grid.rows > 0) {
    // Expand cards evenly into leftover space under footer reserve
    const room = preset.targetH - headerH - footerH
    const stretch =
      (room - GRID_GAP * Math.max(0, grid.rows - 1)) / grid.rows
    if (stretch > cardH) {
      cardH = Math.min(stretch, (cardW / preset.cardAspect) * 1.2)
    }
  }

  const blurbMaxLines = cardH >= 175 ? 2 : 1
  const blurbFont = cardW < 220 ? 10 : 11
  scratch.font = `400 ${blurbFont}px ${FONT_SANS}`
  const textW = cardW - 24
  const tiles: Tile[] = items.map((row, i) => ({
    row,
    blurbLines: wrapLines(scratch, row.blurb || '', textW, blurbMaxLines),
    qrImg: tileQrImgs[i] ?? null,
  }))

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W * SCALE)
  canvas.height = Math.round(H * SCALE)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.scale(SCALE, SCALE)
  paintBackground(ctx, W, H)

  let y = PAD_TOP

  // Brand
  ctx.fillStyle = C.ember
  ctx.font = `600 13px ${FONT_SANS}`
  ctx.fillText(brand.toUpperCase(), padX, y + 12)
  y += 28

  if (hasName) {
    ctx.fillStyle = C.ink
    const nameSize = orientation === 'portrait' ? 42 : 48
    ctx.font = `600 ${nameSize}px ${FONT_DISPLAY}`
    ctx.fillText(truncate(ctx, displayName, innerW), padX, y + 38)
    y += orientation === 'portrait' ? 52 : 58
  }

  if (tagline) {
    ctx.fillStyle = C.soft
    ctx.font = `400 17px ${FONT_SANS}`
    ctx.fillText(truncate(ctx, tagline, innerW), padX, y + 15)
    y += 28
  }

  if (showTimes) {
    ctx.fillStyle = C.ember
    ctx.font = `600 12px ${FONT_SANS}`
    ctx.fillText('SHOW TIMES', padX, y + 12)
    y += 16
    ctx.fillStyle = C.soft
    ctx.font = `500 16px ${FONT_SANS}`
    ctx.fillText(truncate(ctx, showTimes, innerW), padX, y + 14)
    y += 28
  }

  const headHasMeta = hasName || Boolean(tagline) || Boolean(showTimes)
  ctx.fillStyle = headHasMeta ? C.soft : C.ink
  ctx.font = headHasMeta
    ? `500 20px ${FONT_SANS}`
    : `600 40px ${FONT_DISPLAY}`
  ctx.fillText('Tip menu', padX, y + (headHasMeta ? 16 : 32))
  y += headHasMeta ? 34 : 50

  // Social / links strip
  if (links.length) {
    y += 4
    let px = padX
    let py = y
    const maxX = W - padX
    const pillH = 28
    const gap = 10
    let rowBottom = py + pillH

    ctx.font = `600 13px ${FONT_SANS}`
    for (const link of links) {
      const label = link.label.trim() || 'Link'
      const value = link.value.trim()
      const text = `${label}  ${value}`
      const tw = ctx.measureText(text).width
      const pillW = Math.min(innerW, tw + 28)

      if (px + pillW > maxX && px > padX) {
        px = padX
        py = rowBottom + 8
        rowBottom = py + pillH
      }

      ctx.fillStyle = 'rgba(0, 200, 255, 0.14)'
      roundRect(ctx, px, py, pillW, pillH, 999)
      ctx.fill()
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.35)'
      ctx.lineWidth = 1
      roundRect(ctx, px, py, pillW, pillH, 999)
      ctx.stroke()

      ctx.fillStyle = C.ink
      ctx.fillText(text, px + 14, py + 19)

      px += pillW + gap
    }
    y = rowBottom + 18
  }

  // How-to panel
  const panelTop = y
  ctx.fillStyle = C.panel
  roundRect(ctx, padX, panelTop, innerW, panelH, 14)
  ctx.fill()
  ctx.strokeStyle = C.line
  ctx.lineWidth = 1
  roundRect(ctx, padX, panelTop, innerW, panelH, 14)
  ctx.stroke()

  let py = panelTop + 28
  const panelQrSize = panelQrImg ? 140 : 0
  const panelQrCapH = panelQrImg ? 22 : 0
  const panelTextX = panelQrImg ? padX + 20 + panelQrSize + 16 : padX + 20
  const panelTextW = panelQrImg
    ? innerW - 40 - panelQrSize - 16
    : innerW - 40

  const floor =
    input.cheapest != null && Number.isFinite(input.cheapest)
      ? formatPrice(input.cheapest)
      : formatPrice(Math.min(...items.map((i) => i.price)))
  const qrHint = [floor, symbol, input.chainLabel].filter(Boolean).join(' · ')

  if (panelQrImg) {
    ctx.fillStyle = '#ffffff'
    roundRect(
      ctx,
      padX + 20,
      panelTop + 14,
      panelQrSize,
      panelQrSize + panelQrCapH,
      8,
    )
    ctx.fill()
    ctx.drawImage(panelQrImg, padX + 20, panelTop + 14, panelQrSize, panelQrSize)
    ctx.fillStyle = '#123456'
    ctx.font = `700 10px ${FONT_SANS}`
    ctx.textAlign = 'center'
    ctx.fillText(
      truncate(ctx, qrHint, panelQrSize - 8),
      padX + 20 + panelQrSize / 2,
      panelTop + 14 + panelQrSize + 14,
    )
    ctx.textAlign = 'left'
  }

  ctx.fillStyle = C.ink
  ctx.font = `600 15px ${FONT_SANS}`
  ctx.fillText(
    panelQrImg
      ? `Scan ${qrHint}`
      : `Send ${unit} on ${input.chainLabel} to this wallet`,
    panelTextX,
    py,
  )
  py += 22

  if (receive) {
    ctx.fillStyle = C.gold
    ctx.font = `500 14px ${FONT_SANS}`
    ctx.fillText(truncate(ctx, receive, panelTextW), panelTextX, py)
    py += 22
  }

  if (panelQrImg && cheapestUri) {
    ctx.fillStyle = C.soft
    ctx.font = `400 11px ${FONT_SANS}`
    ctx.fillText(
      truncate(ctx, cheapestUri, panelTextW),
      panelTextX,
      py,
    )
    py += 20
  }

  ctx.fillStyle = C.soft
  ctx.font = `400 13px ${FONT_SANS}`
  ctx.fillText(
    `Tip at least ${floor} ${symbol} · higher amounts unlock the next pattern up`,
    panelTextX,
    py,
  )
  y = panelTop + panelH + 28

  // Dynamic tile grid
  for (let i = 0; i < tiles.length; i++) {
    const col = i % grid.cols
    const row = Math.floor(i / grid.cols)
    const x = padX + col * (cardW + GRID_GAP)
    const top = y + row * (cardH + GRID_GAP)
    drawTile(
      ctx,
      tiles[i]!,
      x,
      top,
      cardW,
      cardH,
      symbol,
      i,
      input.chainLabel,
    )
  }

  // Footer
  const footY = H - 28
  ctx.strokeStyle = C.line
  ctx.beginPath()
  ctx.moveTo(padX, footY - 18)
  ctx.lineTo(W - padX, footY - 18)
  ctx.stroke()

  ctx.fillStyle = C.muted
  ctx.font = `400 12px ${FONT_SANS}`
  const toyNames = [
    ...new Set(items.map((r) => (r.forToy || '').trim()).filter(Boolean)),
  ]
  const countLabel =
    items.length === 1
      ? '1 pattern on this menu'
      : toyNames.length > 1
        ? `${toyNames.length} toys · ${items.length} patterns · ${grid.cols}×${grid.rows} · ${orientation}`
        : `${items.length} patterns · ${grid.cols}×${grid.rows} · ${orientation}`
  ctx.fillText(
    `${countLabel} · cheapest ${floor} ${symbol}`,
    padX,
    footY,
  )
  ctx.textAlign = 'right'
  ctx.fillText(`${brand} · local tip-to-buzz`, W - padX, footY)
  ctx.textAlign = 'left'

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('JPEG encode failed'))),
      'image/jpeg',
      0.93,
    )
  })

  const slug = (input.displayName.trim() || 'menu')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32)
  const day = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${APP_SLUG}-tip-menu-${orientation}-${slug || 'menu'}-${day}.jpg`
  a.click()
  URL.revokeObjectURL(a.href)
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  x: number,
  top: number,
  cardW: number,
  cardH: number,
  symbol: string,
  index: number,
  _networkName: string,
) {
  const { row, qrImg } = tile
  const featured = Boolean(row.featured)
  const s = Math.min(1.15, Math.max(0.68, cardH / 190))
  const pad = Math.max(6, Math.round(8 * s))
  const textW = cardW - pad * 2
  const gap = Math.max(3, Math.round(5 * s))
  const symFont = Math.max(9, Math.round(10 * s))
  const innerPad = Math.max(6, Math.round(7 * s))
  const lineGap = Math.max(6, Math.round(7 * s))
  let priceFont = Math.max(16, Math.round(24 * s))
  const symLineH = symFont + 2
  const vizH =
    row.motorStrengths && row.motorStrengths.length > 1
      ? Math.max(32, Math.min(56, Math.round(48 * s)))
      : Math.max(18, Math.min(36, Math.round(28 * s)))

  ctx.fillStyle = featured
    ? index % 2 === 0
      ? C.cardFeatured
      : C.cardFeaturedAlt
    : index % 2 === 0
      ? C.card
      : C.cardAlt
  roundRect(ctx, x, top, cardW, cardH, 12)
  ctx.fill()
  ctx.strokeStyle = featured ? C.lineFeatured : C.line
  ctx.lineWidth = featured ? 1.75 : 1
  roundRect(ctx, x, top, cardW, cardH, 12)
  ctx.stroke()

  ctx.fillStyle = featured ? C.emberSoftFeatured : C.emberSoft
  const priceMain = formatPrice(row.price)
  ctx.fillStyle = featured ? '#7af0ff' : C.gold
  ctx.font = `800 ${priceFont}px ${FONT_SANS}`
  ctx.textAlign = 'center'
  while (priceFont > 12 && ctx.measureText(priceMain).width > textW - 4) {
    priceFont -= 1
    ctx.font = `800 ${priceFont}px ${FONT_SANS}`
  }
  const priceBlockH =
    innerPad + priceFont + lineGap + symLineH + Math.round(innerPad * 0.6)
  roundRect(ctx, x + 4, top + 4, cardW - 8, priceBlockH, 7)
  ctx.fillStyle = featured ? C.emberSoftFeatured : C.emberSoft
  ctx.fill()

  const coinLabel = (row.coin || symbol || 'TOKEN').trim() || 'TOKEN'
  const sec = row.timeSec > 0 ? `${Math.round(row.timeSec)}s` : '—'
  const blockTop = top + 4
  ctx.fillStyle = featured ? '#7af0ff' : C.gold
  ctx.font = `800 ${priceFont}px ${FONT_SANS}`
  ctx.fillText(priceMain, x + cardW / 2, blockTop + innerPad + priceFont)

  ctx.fillStyle = featured ? 'rgba(232, 244, 255, 0.78)' : C.muted
  ctx.font = `600 ${symFont}px ${FONT_SANS}`
  ctx.fillText(
    `${coinLabel} · ${sec}`,
    x + cardW / 2,
    blockTop + innerPad + priceFont + lineGap + symFont,
  )
  ctx.textAlign = 'left'

  const ty = blockTop + priceBlockH + gap

  // BIG QR — fills all space between price and graph
  if (qrImg) {
    const bottomReserved = pad + vizH + gap
    const qrMaxByH = cardH - (ty - top) - bottomReserved
    const qrMaxByW = cardW - pad * 2
    const qrSize = Math.max(56, Math.min(qrMaxByW, qrMaxByH))
    const qx = x + (cardW - qrSize) / 2
    const qy = ty + Math.max(0, (qrMaxByH - qrSize) / 2)
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, qx - 3, qy - 3, qrSize + 6, qrSize + 6, 6)
    ctx.fill()
    ctx.drawImage(qrImg, qx, qy, qrSize, qrSize)
  }

  const vizY = top + cardH - pad - vizH
  drawPatternViz(ctx, row, x + pad, vizY, textW, vizH)
}
