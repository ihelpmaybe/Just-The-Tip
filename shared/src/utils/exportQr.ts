/**
 * Self-contained QR SVG for tip-menu exports (no external QR API).
 * Scannable square modules — EIP-681 payment URIs for PulseChain wallets.
 */
import QRCode from 'qrcode'

const LIGHT = '#ffffff'
const DARK = '#0b1020'
const MARGIN = 2

function squareSubpath(x: number, y: number, cell: number): string {
  const w = cell * 0.92
  const o = (cell - w) / 2
  const x0 = x + o
  const y0 = y + o
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}h${w.toFixed(2)}v${w.toFixed(2)}h${-w.toFixed(2)}z`
}

/** Compact square-module QR (path-based — small enough for OBS hub payloads). */
export function compactPaymentQrSvg(payload: string, px = 180): string {
  const text = String(payload || '').trim()
  if (!text) return ''
  const qr = QRCode.create(text, { errorCorrectionLevel: 'H' })
  const n = qr.modules.size
  const dim = n + MARGIN * 2
  const size = Math.max(64, Math.round(px))
  const cell = size / dim
  const dParts: string[] = []
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!qr.modules.get(row, col)) continue
      const x = (MARGIN + col) * cell
      const y = (MARGIN + row) * cell
      dParts.push(squareSubpath(x, y, cell))
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-hidden="true">` +
    `<rect width="${size}" height="${size}" fill="${LIGHT}"/>` +
    `<g fill="${DARK}">${dParts.length ? `<path d="${dParts.join('')}"/>` : ''}</g>` +
    `</svg>`
  )
}

/** Inline SVG QR for embedding in exported HTML (sync, offline-safe). */
export function paymentQrSvg(payload: string, px = 180): string {
  return compactPaymentQrSvg(payload, px)
}

/** PNG data URL for canvas JPG export (browser only). */
export async function paymentQrDataUrl(
  payload: string,
  px = 128,
): Promise<string> {
  const text = String(payload || '').trim()
  if (!text) return ''
  return QRCode.toDataURL(text, {
    width: Math.max(64, Math.round(px)),
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: DARK, light: LIGHT },
  })
}
