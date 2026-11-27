/**
 * Hexagon-module QR SVG.
 * Standard square finders stay intact so phone wallets still lock;
 * data modules are pointy-top hexes. Error correction H covers the styling.
 */

import QRCode from 'qrcode'

const DARK = '#0b1020'
const LIGHT = '#ffffff'
const RING = '#00d4ff'
const MARGIN = 1
const HEX_R = 0.54
let svgSeq = 0

function inFinder(row: number, col: number, n: number): boolean {
  const tl = row < 7 && col < 7
  const tr = row < 7 && col >= n - 7
  const bl = row >= n - 7 && col < 7
  return tl || tr || bl
}

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}

/** Compact hexagon as a path subpath (much smaller than <polygon>). */
function hexSubpath(cx: number, cy: number, r: number): string {
  let d = ''
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6
    const x = (cx + r * Math.cos(a)).toFixed(2)
    const y = (cy + r * Math.sin(a)).toFixed(2)
    d += `${i === 0 ? 'M' : 'L'}${x} ${y}`
  }
  return `${d}z`
}

function finderMarks(n: number, m: number): string {
  const origins = [
    [0, 0],
    [n - 7, 0],
    [0, n - 7],
  ]
  return origins
    .map(([r, c]) => {
      const x = m + c
      const y = m + r
      const cx = x + 3.5
      const cy = y + 3.5
      return (
        `<rect x="${x}" y="${y}" width="7" height="7" rx="0.55" fill="${DARK}"/>` +
        `<rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="0.35" fill="${LIGHT}"/>` +
        `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.15" fill="${DARK}"/>` +
        `<polygon points="${hexPoints(cx, cy, 1.12)}" fill="${DARK}"/>` +
        `<rect x="${x}" y="${y}" width="7" height="7" rx="0.55" fill="none" stroke="${RING}" stroke-width="0.16"/>`
      )
    })
    .join('')
}

export function hexagonQrSvg(payload: string, px: number): string {
  const text = payload.trim()
  if (!text) return ''
  const qr = QRCode.create(text, { errorCorrectionLevel: 'H' })
  const n = qr.modules.size
  const m = MARGIN
  const dim = n + m * 2
  const size = Math.max(120, Math.round(px))
  const gid = `qh${n}-${++svgSeq}`

  const dParts: string[] = []
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (inFinder(row, col, n)) continue
      if (!qr.modules.get(row, col)) continue
      const cx = m + col + 0.5
      const cy = m + row + 0.5
      dParts.push(hexSubpath(cx, cy, HEX_R))
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${dim} ${dim}" preserveAspectRatio="xMidYMid meet" shape-rendering="geometricPrecision">` +
    `<defs>` +
    `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="#16102a"/>` +
    `<stop offset="100%" stop-color="#0b1020"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect width="${dim}" height="${dim}" fill="${LIGHT}"/>` +
    (dParts.length
      ? `<path fill="url(#${gid})" d="${dParts.join('')}"/>`
      : '') +
    finderMarks(n, m) +
    `</svg>`
  )
}
