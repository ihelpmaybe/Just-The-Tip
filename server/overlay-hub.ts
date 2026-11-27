/**
 * Live tip alert hub (SSE) — shared by vite.dev and standalone host.
 * Browser page HTML lives in src/overlay (re-exported).
 */
import type { ServerResponse } from 'node:http'
import {
  defaultOverlayStyle,
  normalizeOverlayStyle,
  type OverlayStyle,
} from '../src/overlay/style.ts'
import {
  applyOverlayQrUpdate,
  defaultOverlayQr,
  overlayQrEnabled,
  type OverlayQr,
} from '../src/overlay/qrState.ts'
import {
  buildOverlayQrPayload,
  type OverlayQrPayload,
} from '../src/overlay/qrRender.ts'
import { overlayQrPayloadLooksUnsafe } from '../src/overlay/qrSafety.ts'
import {
  slimOverlayLadder,
  type OverlayLadderRow,
} from '../src/overlay/stage.ts'
import {
  defaultOverlayMenuStyle,
  normalizeOverlayMenuStyle,
  type OverlayMenuStyle,
} from '../src/overlay/menuStyle.ts'
export { overlayPageHtml } from '../src/overlay/browserHtml.ts'
export { overlayQrPageHtml } from '../src/overlay/qrPageHtml.ts'
export { overlayMenuPageHtml } from '../src/overlay/menuPageHtml.ts'

export type OverlayFocus = {
  name?: string
  amountLabel?: string
}

export type OverlayTipEvent = {
  id: string
  amount: number
  symbol: string
  title: string
  subtitle?: string
  source?: 'wallet' | 'pool' | 'test'
  eventKind?: string
  dryRun?: boolean
  at: number
  /** USD value when a quote exists — overlay scales the hit from this. */
  usd?: number
  /** Operator Send-test — never drop for min / showPoolAlerts. */
  force?: boolean
}

type Client = {
  res: ServerResponse
  heartbeat: ReturnType<typeof setInterval>
}

const clients = new Set<Client>()
let last: OverlayTipEvent | null = null
let style: OverlayStyle = { ...defaultOverlayStyle }
let qr: OverlayQr = { ...defaultOverlayQr }
let qrPayload: OverlayQrPayload | null = null
let qrBuildSeq = 0
let stagePulse = 0
let stageLadder: OverlayLadderRow[] = []
let menuStyle: OverlayMenuStyle = { ...defaultOverlayMenuStyle }
let overlayFocus: OverlayFocus = {}

export function overlayClientCount(): number {
  return clients.size
}

export function lastOverlayTip(): OverlayTipEvent | null {
  return last
}

export function getOverlayStyle(): OverlayStyle {
  return { ...style }
}

export function getOverlayQr(): OverlayQr {
  return { ...qr }
}

export function getOverlayQrPayload(): OverlayQrPayload | null {
  return qrPayload ? { ...qrPayload } : null
}

/** Cheap status snapshot — never include pre-rendered QR SVGs. */
export function getOverlayHubStatus() {
  return {
    clients: overlayClientCount(),
    last: lastOverlayTip(),
    style: getOverlayStyle(),
    qr: {
      rev: qrBuildSeq,
      address: qr.address,
      enabled: qrPayload
        ? qrPayload.enabled
        : overlayQrEnabled(qr.carousel, qr.slides),
      slideCount: qrPayload?.slideIds?.length ?? 0,
      menuCount: qr.menuOffers.length,
    },
    url: '/overlay',
    qrUrl: '/overlay/qr',
    menuUrl: '/overlay/menu',
    pulse: stagePulse,
    ladder: stageLadder,
    menuStyle: { ...menuStyle },
    focus: { ...overlayFocus },
  }
}

export function overlayTipFromBody(
  body: Partial<OverlayTipEvent>,
): OverlayTipEvent {
  const usdN = Number(body.usd)
  const event: OverlayTipEvent = {
    id: String(body.id || `tip-${Date.now()}`),
    amount: Number(body.amount) || 0,
    symbol: String(body.symbol || 'PLS'),
    title: String(
      body.title || `${Number(body.amount) || 0} ${body.symbol || 'PLS'}`,
    ),
    subtitle: body.subtitle ? String(body.subtitle) : undefined,
    source:
      body.source === 'pool' || body.source === 'test' ? body.source : 'wallet',
    eventKind: body.eventKind ? String(body.eventKind).slice(0, 32) : undefined,
    dryRun: Boolean(body.dryRun),
    at: Number(body.at) || Date.now(),
  }
  if (Number.isFinite(usdN) && usdN >= 0) event.usd = usdN
  if (body.force) event.force = true
  return event
}

export function setOverlayPulse(level: unknown): number {
  const n = Number(level)
  const pulse = Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0))
  const wasOff = stagePulse < 0.02
  const nowOff = pulse < 0.02
  if (Math.abs(pulse - stagePulse) < 0.015 && wasOff === nowOff) {
    return stagePulse
  }
  stagePulse = pulse
  broadcast('pulse', { pulse: stagePulse })
  return stagePulse
}

export function setOverlayLadder(raw: unknown): OverlayLadderRow[] {
  const next = slimOverlayLadder(raw)
  if (JSON.stringify(next) === JSON.stringify(stageLadder)) return stageLadder
  stageLadder = next
  broadcast('ladder', { ladder: stageLadder })
  return stageLadder
}

export function ingestOverlayPulseBody(raw: unknown): number {
  const obj =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return setOverlayPulse(obj.pulse ?? obj.level ?? raw)
}

export function ingestOverlayLadderBody(raw: unknown): OverlayLadderRow[] {
  const obj =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const list = Array.isArray(obj.ladder) ? obj.ladder : raw
  return setOverlayLadder(list)
}

function qrNotice() {
  return { rev: qrBuildSeq }
}

function writeSse(res: ServerResponse, payload: string) {
  res.write(payload)
}

function broadcast(event: string, data: unknown) {
  const line = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const c of [...clients]) {
    try {
      writeSse(c.res, line)
    } catch {
      clearInterval(c.heartbeat)
      clients.delete(c)
    }
  }
}

async function refreshQrPayload(): Promise<OverlayQrPayload> {
  const seq = ++qrBuildSeq
  const payload = await buildOverlayQrPayload(qr)
  if (seq !== qrBuildSeq) {
    // newer build in flight — return current if present
    return qrPayload || payload
  }
  qrPayload = payload
  // Slim notice only — full hex QR SVGs on SSE crash OBS CEF on refresh.
  broadcast('qr', qrNotice())
  return payload
}

export function getOverlayMenuStyle(): OverlayMenuStyle {
  return { ...menuStyle }
}

export function setOverlayMenuStyle(raw: unknown): OverlayMenuStyle {
  menuStyle = normalizeOverlayMenuStyle(raw)
  broadcast('menuStyle', menuStyle)
  return menuStyle
}

export function setOverlayFocus(raw: unknown): OverlayFocus {
  const o =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const name = String(o.name || '').trim().slice(0, 48)
  const amountLabel = String(o.amountLabel || o.amount || '')
    .trim()
    .slice(0, 24)
  overlayFocus =
    name && amountLabel ? { name, amountLabel } : {}
  broadcast('focus', overlayFocus)
  return overlayFocus
}

export function setOverlayStyle(raw: unknown): OverlayStyle {
  style = normalizeOverlayStyle(raw)
  broadcast('style', style)
  return style
}

export async function setOverlayQr(raw: unknown): Promise<OverlayQrPayload> {
  qr = applyOverlayQrUpdate(qr, raw)
  // Always re-emit so disabled state reaches open browser sources.
  return refreshQrPayload()
}

/** Fresh payload for GET/clients even when nothing was PUT yet. Does not broadcast. */
export async function ensureOverlayQrPayload(): Promise<OverlayQrPayload> {
  if (qrPayload && !overlayQrPayloadLooksUnsafe(qrPayload.menuOffers, qr.address)) {
    return qrPayload
  }
  const seq = ++qrBuildSeq
  const payload = await buildOverlayQrPayload(qr)
  if (seq !== qrBuildSeq) {
    return qrPayload || payload
  }
  qrPayload = payload
  return payload
}

export function publishOverlayTip(
  tip: OverlayTipEvent,
): OverlayTipEvent | null {
  const event: OverlayTipEvent = {
    ...tip,
    id: String(tip.id || `tip-${Date.now()}`),
    title: String(tip.title || `${tip.amount} ${tip.symbol}`),
    at: Number(tip.at) || Date.now(),
  }

  // Operator "Send test …" must always reach OBS / preview, even when live
  // filters (min amount, hide pool alerts, hide dry-run) are strict.
  if (!event.force) {
    if (
      event.dryRun &&
      event.source !== 'test' &&
      !style.showDryRun
    ) {
      return null
    }
    if (event.source === 'pool' && !style.showPoolAlerts) return null
    const minimum =
      event.source === 'pool' ? style.poolMinAmount : style.walletMinAmount
    if (
      event.source !== 'test' &&
      minimum > 0 &&
      Number(event.amount) < minimum
    ) {
      return null
    }
  }

  last = event
  broadcast('tip', event)
  return event
}

export function attachOverlaySse(res: ServerResponse) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('X-Accel-Buffering', 'no')
  if (
    typeof (res as ServerResponse & { flushHeaders?: () => void })
      .flushHeaders === 'function'
  ) {
    ;(res as ServerResponse & { flushHeaders: () => void }).flushHeaders()
  }

  writeSse(res, ': connected\n\n')
  writeSse(res, `event: style\ndata: ${JSON.stringify(style)}\n\n`)
  writeSse(res, `event: qr\ndata: ${JSON.stringify(qrNotice())}\n\n`)
  writeSse(res, `event: pulse\ndata: ${JSON.stringify({ pulse: stagePulse })}\n\n`)
  writeSse(
    res,
    `event: ladder\ndata: ${JSON.stringify({ ladder: stageLadder })}\n\n`,
  )
  writeSse(
    res,
    `event: menuStyle\ndata: ${JSON.stringify(menuStyle)}\n\n`,
  )
  writeSse(
    res,
    `event: focus\ndata: ${JSON.stringify(overlayFocus)}\n\n`,
  )
  void ensureOverlayQrPayload().then(() => {
    try {
      writeSse(res, `event: qr\ndata: ${JSON.stringify(qrNotice())}\n\n`)
    } catch {
      /* client gone */
    }
  })
  if (last) {
    writeSse(res, `event: tip\ndata: ${JSON.stringify(last)}\n\n`)
  }

  const heartbeat = setInterval(() => {
    try {
      writeSse(res, ': ping\n\n')
    } catch {
      clearInterval(heartbeat)
      for (const c of clients) {
        if (c.res === res) clients.delete(c)
      }
    }
  }, 12_000)

  const client: Client = { res, heartbeat }
  clients.add(client)

  res.on('close', () => {
    clearInterval(heartbeat)
    clients.delete(client)
  })
}
