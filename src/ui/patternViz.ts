/**
 * Compact strength-bar SVG (0–8 steps), matching chain-haptic menu viz.
 */

import { patternMotorLanes } from '../utils/patterns'

const SVG_NS = 'http://www.w3.org/2000/svg'

function el(
  name: string,
  attrs: Record<string, string>,
): SVGElement {
  const n = document.createElementNS(SVG_NS, name)
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v)
  return n
}

/** Bar chart + envelope path for strength steps 0–8. */
export function buildPatternSvg(
  steps: number[],
  opts?: { w?: number; h?: number; intervalMs?: number; animate?: boolean },
): SVGSVGElement {
  const w = opts?.w ?? 200
  const h = opts?.h ?? 44
  const animate = opts?.animate !== false
  const intervalMs = opts?.intervalMs ?? 400

  const svg = el('svg', {
    viewBox: `0 0 ${w} ${h}`,
    preserveAspectRatio: 'none',
    class: 'pattern-viz-svg',
    'aria-hidden': 'true',
  }) as SVGSVGElement

  const s = (steps?.length ? steps : [2, 4, 3]).slice(0, 24)
  const n = s.length
  const padX = 4
  const padY = 4
  const gap = Math.max(1, Math.min(3, ((w - padX * 2) / n) * 0.18))
  const usableW = w - padX * 2 - gap * (n - 1)
  const barW = Math.max(2, usableW / n)
  const maxI = 8

  svg.appendChild(
    el('line', {
      x1: String(padX),
      x2: String(w - padX),
      y1: String(h - padY),
      y2: String(h - padY),
      class: 'pattern-baseline',
    }),
  )

  let d = ''
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(maxI, Number(s[i]) || 0))
    const x = padX + i * (barW + gap) + barW / 2
    const barH = ((h - padY * 2) * v) / maxI
    const y = h - padY - barH
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `
  }
  const path = el('path', {
    d,
    class: 'pattern-path',
    fill: 'none',
  })
  svg.appendChild(path)

  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(maxI, Number(s[i]) || 0))
    const barH = Math.max(1.5, ((h - padY * 2) * v) / maxI)
    const x = padX + i * (barW + gap)
    const y = h - padY - barH
    const rect = el('rect', {
      x: x.toFixed(2),
      y: y.toFixed(2),
      width: barW.toFixed(2),
      height: barH.toFixed(2),
      rx: '1.5',
      class: 'pattern-bar',
    }) as SVGRectElement
    rect.dataset.i = String(i)
    rect.style.setProperty('--v', String(v / maxI))
    if (animate) {
      const delay = (intervalMs / 1000) * i * 0.12
      rect.style.animationDelay = `${delay.toFixed(2)}s`
    }
    svg.appendChild(rect)
  }

  return svg
}

function catmullRomPath(pts: Array<{ x: number; y: number }>): string {
  if (!pts.length) return ''
  if (pts.length === 1) return `M${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`
  if (pts.length === 2) {
    return `M${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} L${pts[1].x.toFixed(2)} ${pts[1].y.toFixed(2)}`
  }
  let d = `M${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += `C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  return d
}

/**
 * SVG markup string (no DOM) for OBS / HTML exports.
 * Style with `.menu-viz-svg`, `.menu-bar`, `.menu-viz-path`, `.menu-viz-base`.
 * `quality: 'hd'` renders a denser viewBox with a smooth envelope (OBS carousel).
 */
export function patternBarsSvgString(
  steps: number[],
  opts?: { w?: number; h?: number; quality?: 'compact' | 'hd' },
): string {
  const hd = opts?.quality === 'hd'
  const w = opts?.w ?? (hd ? 720 : 180)
  const h = opts?.h ?? (hd ? 64 : 28)
  const raw = (steps?.length ? steps : [2, 4, 3]).slice(0, 24)
  const n = Math.max(1, raw.length)
  const padX = hd ? 18 : 3
  const padY = hd ? 10 : 3
  const maxI = 8
  const gapRatio = hd ? 0.38 : 0.16
  const gap = Math.max(hd ? 6 : 1, Math.min(hd ? 14 : 2.5, ((w - padX * 2) / n) * gapRatio))
  const usableW = w - padX * 2 - gap * (n - 1)
  const barW = Math.min(hd ? 32 : 10, Math.max(hd ? 8 : 2, usableW / n))
  const groupW = n * barW + (n - 1) * gap
  const originX = (w - groupW) / 2
  const rx = barW / 2
  const baseY = h - padY

  const pts: Array<{ x: number; y: number }> = []
  const bars: string[] = []
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(maxI, Number(raw[i]) || 0))
    const bx = originX + i * (barW + gap)
    const cx = bx + barW / 2
    const barH = ((h - padY * 2) * v) / maxI
    const y = baseY - barH
    pts.push({ x: cx, y })
    if (v > 0) {
      const bh = Math.max(hd ? 3 : 1.4, barH)
      const by = baseY - bh
      const cls = hd ? 'menu-bar-hd' : 'menu-bar'
      const fill = hd ? ' fill="url(#pv-bar)"' : ''
      bars.push(
        `<rect class="${cls}" x="${bx.toFixed(2)}" y="${by.toFixed(2)}" width="${barW.toFixed(2)}" height="${bh.toFixed(2)}" rx="${rx.toFixed(2)}"${fill}/>`,
      )
    }
  }

  const line = hd ? catmullRomPath(pts) : pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const first = pts[0]
  const last = pts[pts.length - 1]
  const area = hd && first && last
    ? `<path class="menu-viz-fill" d="${line} L${last.x.toFixed(2)} ${baseY.toFixed(2)} L${first.x.toFixed(2)} ${baseY.toFixed(2)} Z"/>`
    : ''
  const defs = hd
    ? `<defs>` +
      `<linearGradient id="pv-bar" x1="0" y1="${padY}" x2="0" y2="${baseY}" gradientUnits="userSpaceOnUse">` +
      `<stop offset="0%" stop-color="var(--viz-hi,#b8fff6)"/>` +
      `<stop offset="100%" stop-color="var(--viz-lo,#1a7dff)"/>` +
      `</linearGradient>` +
      `<linearGradient id="pv-path" x1="${padX}" y1="0" x2="${w - padX}" y2="0" gradientUnits="userSpaceOnUse">` +
      `<stop offset="0%" stop-color="var(--viz-hi,#b8fff6)"/>` +
      `<stop offset="100%" stop-color="var(--viz-path,#7dffef)"/>` +
      `</linearGradient>` +
      `<filter id="pv-glow" x="-20%" y="-40%" width="140%" height="180%">` +
      `<feGaussianBlur stdDeviation="1.4" result="b"/>` +
      `<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>` +
      `</filter>` +
      `</defs>`
    : ''
  const path = hd
    ? `<path class="menu-viz-path-hd" d="${line}" fill="none" stroke="url(#pv-path)" filter="url(#pv-glow)"/>`
    : `<path class="menu-viz-path" d="${line}" fill="none"/>`
  const ratio = hd ? 'xMidYMid meet' : 'none'
  const extra = hd ? ' class="menu-viz-svg menu-viz-svg-hd"' : ' class="menu-viz-svg"'

  return (
    `<svg${extra} viewBox="0 0 ${w} ${h}" preserveAspectRatio="${ratio}" shape-rendering="geometricPrecision" aria-hidden="true">` +
    defs +
    `<line class="menu-viz-base" x1="${padX}" y1="${baseY}" x2="${w - padX}" y2="${baseY}"/>` +
    area +
    bars.join('') +
    path +
    `</svg>`
  )
}

/** Normalize strength strip for display (pulse/preset use stored strengths). */
export function vizStepsForPattern(p: {
  strengths: number[]
  intensity?: number
}): number[] {
  if (p.strengths?.length) return p.strengths.map((n) => Number(n) || 0)
  const i = Math.max(1, Math.min(8, Number(p.intensity) || 4))
  return [0, i, i, 0]
}

/**
 * Per-motor strength lanes for dual/triple toys.
 * motorStrengths wins when the pattern stores its own lane per motor; otherwise stepMotors
 * (0 = both · 1 = M1 · 2 = M2 · 3 = M3) gates the shared strength strip.
 *
 * When every lane is identical (plain vibe on a dual toy), collapse to one
 * strip so the tip menu does not show two copies of the same waveform.
 */
export function vizMotorLanes(
  p: {
    strengths: number[]
    intensity?: number
    stepMotors?: Array<0 | 1 | 2 | 3 | number>
    motorStrengths?: number[][]
  },
  motorCount: number,
): number[][] {
  const lanes = patternMotorLanes(
    { ...p, strengths: vizStepsForPattern(p) },
    motorCount,
  )
  if (lanes.length <= 1) return lanes
  const first = lanes[0]!
  const identical = lanes.every(
    (lane) =>
      lane.length === first.length &&
      lane.every((v, i) => v === first[i]),
  )
  return identical ? [first] : lanes
}
