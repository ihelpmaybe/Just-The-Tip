/** Client → local overlay hub API. */
import type { OverlayStyle } from './style'
import { normalizeOverlayStyle } from './style'
import type { OverlayMenuStyle } from './menuStyle'
import { normalizeOverlayMenuStyle } from './menuStyle'
import type { OverlayLadderRow } from './stage'

export type OverlayTipPayload = {
  id?: string
  amount: number
  symbol: string
  title?: string
  subtitle?: string
  source?: 'wallet' | 'pool' | 'test'
  eventKind?: string
  dryRun?: boolean
  at?: number
  usd?: number
  /** Operator Send-test — hub must not filter this tip. */
  force?: boolean
}

export type PublishOverlayResult = {
  ok: boolean
  filtered: boolean
  clients: number
  error?: string
}

export async function publishOverlayTip(
  tip: OverlayTipPayload,
): Promise<boolean> {
  const r = await publishOverlayTipDetailed(tip)
  return r.ok && !r.filtered
}

export async function publishOverlayTipDetailed(
  tip: OverlayTipPayload,
): Promise<PublishOverlayResult> {
  const body = {
    id: tip.id || `tip-${Date.now()}`,
    amount: Number(tip.amount) || 0,
    symbol: String(tip.symbol || 'PLS'),
    title:
      tip.title ||
      `${(Number(tip.amount) || 0).toLocaleString(undefined, {
        maximumFractionDigits: 4,
      })} ${tip.symbol || 'PLS'}`,
    subtitle: tip.subtitle || undefined,
    source: tip.source || 'wallet',
    eventKind: tip.eventKind || undefined,
    dryRun: Boolean(tip.dryRun),
    at: tip.at || Date.now(),
    ...(tip.force ? { force: true } : {}),
    ...(Number.isFinite(Number(tip.usd)) && Number(tip.usd) >= 0
      ? { usd: Number(tip.usd) }
      : {}),
  }
  try {
    const res = await fetch('/api/overlay/tip', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      return {
        ok: false,
        filtered: false,
        clients: 0,
        error: `HTTP ${res.status}`,
      }
    }
    const data = (await res.json()) as {
      ok?: boolean
      filtered?: boolean
      clients?: number
      event?: unknown
    }
    const filtered = Boolean(data.filtered) || !data.event
    return {
      ok: true,
      filtered,
      clients: Number(data.clients) || 0,
    }
  } catch (e) {
    return {
      ok: false,
      filtered: false,
      clients: 0,
      error: e instanceof Error ? e.message : 'network error',
    }
  }
}

export async function pushOverlayStyle(style: OverlayStyle): Promise<boolean> {
  const s = normalizeOverlayStyle(style)
  try {
    const res = await fetch('/api/overlay/style', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ style: s }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function pushOverlayPulse(pulse: number): Promise<boolean> {
  try {
    const res = await fetch('/api/overlay/pulse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pulse: Math.min(1, Math.max(0, Number(pulse) || 0)),
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function pushOverlayLadder(
  ladder: OverlayLadderRow[],
): Promise<boolean> {
  try {
    const res = await fetch('/api/overlay/ladder', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ladder }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function pushOverlayMenuStyle(
  style: OverlayMenuStyle,
): Promise<boolean> {
  const s = normalizeOverlayMenuStyle(style)
  try {
    const res = await fetch('/api/overlay/menu-style', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ style: s }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function fetchOverlayStatus(): Promise<{
  clients: number
  ok: boolean
  qrAddress?: string
  qrMenuCount?: number
  qrSlideCount?: number
}> {
  try {
    const res = await fetch('/api/overlay/status', { cache: 'no-store' })
    if (!res.ok) return { clients: 0, ok: false }
    const data = (await res.json()) as {
      clients?: number
      qr?: {
        address?: string
        menuCount?: number
        slideCount?: number
      }
    }
    return {
      clients: Number(data.clients) || 0,
      ok: true,
      qrAddress: String(data.qr?.address || ''),
      qrMenuCount: Number(data.qr?.menuCount) || 0,
      qrSlideCount: Number(data.qr?.slideCount) || 0,
    }
  } catch {
    return { clients: 0, ok: false }
  }
}

export function overlayBrowserUrl(origin = location.origin): string {
  return `${origin}/overlay`
}

/** Dark background for checking look in a browser tab (not for OBS). */
export function overlayPreviewUrl(origin = location.origin): string {
  return `${origin}/overlay?preview=1`
}

export function overlayMenuBrowserUrl(origin = location.origin): string {
  return `${origin}/overlay/menu?v=1`
}

export function overlayMenuPreviewUrl(origin = location.origin): string {
  return `${origin}/overlay/menu?preview=1&v=1`
}

/** Open overlay preview — desktop shell uses a preview window; Cursor uses system browser. */
export function openOverlayPreview(url: string): void {
  const ua = navigator.userAgent || ''
  // Cursor Simple Browser cannot show a useful overlay tab.
  if (/\bCursor\//i.test(ua)) {
    void fetch('/api/open-chrome', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    }).catch(() => {
      window.open(url, '_blank', 'noopener,noreferrer')
    })
    return
  }
  // Electron: main process opens a child BrowserWindow (see desktop/main.mjs).
  // Plain Chrome/Edge: normal tab.
  window.open(url, '_blank', 'noopener,noreferrer')
}
