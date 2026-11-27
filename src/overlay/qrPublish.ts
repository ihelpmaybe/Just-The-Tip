/** Client → hub for tip QR overlay. */
import {
  defaultOverlayQr,
  normalizeOverlayQr,
  type OverlayQr,
} from './qrState'
import type { OverlayQrPayload } from './qrRender'

export async function pushOverlayQr(qr: OverlayQr): Promise<boolean> {
  try {
    const res = await fetch('/api/overlay/qr', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        qr: {
          ...normalizeOverlayQr(qr),
          slideHtml: normalizeOverlayQr(qr).slideHtml || {},
        },
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function fetchOverlayQr(): Promise<OverlayQrPayload | null> {
  try {
    const res = await fetch('/api/overlay/qr', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as { qr?: OverlayQrPayload }
    return data.qr || null
  } catch {
    return null
  }
}

export function overlayQrBrowserUrl(origin = location.origin): string {
  // Cache-bust so OBS picks up page logic changes (e.g. show-on-stream gate).
  return `${origin}/overlay/qr?v=18`
}

export function overlayQrPreviewUrl(origin = location.origin): string {
  return `${origin}/overlay/qr?preview=1&v=18`
}

export { defaultOverlayQr, normalizeOverlayQr }
export type { OverlayQr }
