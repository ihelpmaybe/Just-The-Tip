/** Tip QR / stream toolbox panel (OBS Browser Source — opt-in). */

import { fanSafeCreatorWalletUri } from './qrSafety.ts'
import type { OverlayPosition } from './style'
import {
  defaultPulsePackQrFlags,
  normalizePulsePackQrFlags,
} from './pulseBundle'

export type OverlayQrSize = 'sm' | 'md' | 'lg'
export type OverlayQrTheme = 'dark' | 'light' | 'pulse'

/** One tip-menu row pushed to the stream carousel. */
export type OverlayMenuOffer = {
  /** Toy+pattern+coin sheet key */
  id?: string
  name: string
  /** Display amount (already formatted, e.g. "25 PLS") */
  amountLabel: string
  amount: number
  /** Optional short line (toy / family) */
  note?: string
  /** Pattern blurb — what the action does */
  blurb?: string
  /** On-stream sell line (time + feel), not the catalog id */
  sellPitch?: string
  /** Pattern length in seconds */
  timeSec?: number
  featured?: boolean
  /** Strength strip for intensity bars (0–8 steps) */
  strengths?: number[]
  /** Prebuilt compact bars SVG (OBS page has no patternViz module) */
  barsSvg?: string
  /** EIP-681 payment URI for this tip (native value= or ERC-20 /transfer). */
  paymentUri?: string
  /** Pre-rendered QR SVG for paymentUri (or empty) */
  qrSvg?: string
}

export type OverlayQrCoreSlides = {
  /** Receive-wallet QR */
  qr: boolean
  /** Brand / stream name spotlight */
  brand: boolean
  /** Live tip menu patterns (amounts you offer) */
  menu: boolean
  /** PulseChain ecosystem logos */
  eco: boolean
  /** Short “how to tip” card */
  how: boolean
}

export type OverlayQrSlides = OverlayQrCoreSlides & {
  /**
   * Free PulseChain pack QR slides (wallet, chain, DEX, scan, bridge…).
   * Keys match pulseBundle streamQr item ids.
   */
  pack: Record<string, boolean>
}

/** Core carousel slides that support custom HTML overrides. */
export type OverlayQrSlideHtmlKey =
  | keyof OverlayQrCoreSlides
  | `pack:${string}`

export type OverlayQr = {
  /**
   * Master switch: when false, OBS `/overlay/qr` shows nothing.
   * Derived from slide ticks — not a separate operator toggle.
   */
  enabled: boolean
  /** Receive wallet (pushed from settings — not a secret) */
  address: string
  /** Small headline above QR */
  label: string
  /** Optional streamer name under QR */
  brand: string
  position: OverlayPosition
  size: OverlayQrSize
  /** Show shortened 0x… under the code */
  showAddress: boolean
  theme: OverlayQrTheme
  /**
   * Rotate through toolbox slides.
   * When false, prefers tip QR if available.
   */
  carousel: boolean
  /** Seconds each slide stays (carousel mode) */
  dwellSec: number
  slides: OverlayQrSlides
  /**
   * Tip menu patterns currently offered (from Tip menu page).
   * Not a secret — live snapshot for OBS carousel.
   */
  menuOffers: OverlayMenuOffer[]
  /** e.g. PLS — for empty-state copy */
  menuSymbol: string
  /**
   * Optional per-slide HTML (tokens → live fields). Empty = built-in layout.
   * Keys: qr | brand | menu | eco | how | pack:<id>
   */
  slideHtml: Partial<Record<string, string>>
  /** Optional extra CSS for the carousel Browser Source (all slides). */
  customCss: string
}

export const defaultOverlayQrSlides: OverlayQrSlides = {
  qr: true,
  brand: true,
  menu: true,
  eco: true,
  how: true,
  pack: defaultPulsePackQrFlags(),
}

export const defaultOverlayQr: OverlayQr = {
  enabled: false,
  address: '',
  label: 'Tip on PulseChain',
  brand: '',
  position: 'bottom-right',
  size: 'md',
  showAddress: true,
  theme: 'pulse',
  carousel: true,
  dwellSec: 7,
  slides: {
    ...defaultOverlayQrSlides,
    pack: { ...defaultPulsePackQrFlags() },
  },
  menuOffers: [],
  menuSymbol: 'PLS',
  slideHtml: {},
  customCss: '',
}

const MAX_SLIDE_HTML = 12_000
const MAX_QR_CSS = 24_000
/** Hexagon payment QRs are path-compacted; ERC-20 URIs still need ~130k. */
const MAX_QR_SVG = 160_000
const MAX_SLIDE_HTML_KEYS = 24

function clipFieldText(v: unknown, max: number): string {
  return String(v ?? '').slice(0, max)
}

function normalizeSlideHtmlMap(raw: unknown): Partial<Record<string, string>> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const o = raw as Record<string, unknown>
  const out: Partial<Record<string, string>> = {}
  let n = 0
  for (const [k, v] of Object.entries(o)) {
    if (n >= MAX_SLIDE_HTML_KEYS) break
    let key = String(k).trim().slice(0, 48)
    if (key === 'pack:internetMoney' || key === 'internetMoney') {
      key = 'pack:tipWallet'
    }
    if (!key) continue
    const html = clipFieldText(v, MAX_SLIDE_HTML).trim()
    if (!html) continue
    // Prefer an explicit tipWallet override over a migrated Internet Money key
    if (out[key] && key === 'pack:tipWallet' && k !== 'pack:tipWallet') continue
    out[key] = html
    n += 1
  }
  return out
}

/** Max rows pushed to OBS (carousel may paginate). Room for two toys. */
export const OVERLAY_MENU_OFFER_LIMIT = 32
/** One pattern per carousel slide so each item has a scanable payment QR. */
export const OVERLAY_MENU_PAGE_SIZE = 1

/** Keep every toy represented when the offer list is capped. */
export function takeOverlayMenuOffersEvenly<T>(
  pool: T[],
  keyOf: (row: T) => string,
  limit = OVERLAY_MENU_OFFER_LIMIT,
): T[] {
  if (pool.length <= limit) return pool.slice()
  const buckets = new Map<string, T[]>()
  for (const row of pool) {
    const key = keyOf(row) || ''
    const list = buckets.get(key) || []
    list.push(row)
    buckets.set(key, list)
  }
  const keys = [...buckets.keys()]
  const out: T[] = []
  while (out.length < limit) {
    let added = false
    for (const key of keys) {
      const list = buckets.get(key)
      if (!list?.length) continue
      out.push(list.shift()!)
      added = true
      if (out.length >= limit) break
    }
    if (!added) break
  }
  return out
}

const POSITIONS = new Set<OverlayPosition>([
  'bottom',
  'top',
  'bottom-left',
  'bottom-right',
  'top-left',
  'top-right',
])
const SIZES = new Set<OverlayQrSize>(['sm', 'md', 'lg'])
const THEMES = new Set<OverlayQrTheme>(['dark', 'light', 'pulse'])

function normalizeMenuOffers(
  raw: unknown,
  receiveAddress: string,
): OverlayMenuOffer[] {
  if (!Array.isArray(raw)) return []
  const out: OverlayMenuOffer[] = []
  for (const row of raw.slice(0, OVERLAY_MENU_OFFER_LIMIT)) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const name = String(o.name || '').trim().slice(0, 48)
    const amount = Number(o.amount)
    if (!name || !Number.isFinite(amount)) continue
    const amountLabel =
      String(o.amountLabel || '').trim().slice(0, 24) || String(amount)
    const note = String(o.note || '')
      .trim()
      .slice(0, 40)
    const blurb = String(o.blurb || '')
      .trim()
      .slice(0, 80)
    const strengths = Array.isArray(o.strengths)
      ? o.strengths
          .map((n) => Math.max(0, Math.min(8, Number(n) || 0)))
          .slice(0, 24)
      : undefined
    const paymentUriRaw = String(o.paymentUri || '')
      .trim()
      .slice(0, 512)
    const qrSvg = String(o.qrSvg || '')
      .trim()
      .slice(0, MAX_QR_SVG)
    const sellPitch = String(o.sellPitch || '')
      .trim()
      .slice(0, 56)
    let timeSec = Math.round(Number(o.timeSec))
    if (!Number.isFinite(timeSec) || timeSec < 0) timeSec = 0
    const paymentUri = fanSafeCreatorWalletUri(paymentUriRaw, receiveAddress)
    out.push({
      name,
      amount,
      amountLabel,
      note: note || undefined,
      blurb: blurb || undefined,
      sellPitch: sellPitch || undefined,
      timeSec: timeSec || undefined,
      featured: Boolean(o.featured),
      strengths: strengths?.length ? strengths : undefined,
      barsSvg: undefined,
      paymentUri,
      id: String(o.id || '').trim().slice(0, 96) || undefined,
      // Never keep a QR drawn from a dropped / contract-first URI.
      qrSvg:
        paymentUri && qrSvg.startsWith('<svg') ? qrSvg : undefined,
    })
  }
  return out
}

function normalizeSlides(raw: unknown): OverlayQrSlides {
  const o =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const pack = normalizePulsePackQrFlags(o.pack, o.internetMoney)
  return {
    qr: o.qr === undefined ? true : Boolean(o.qr),
    brand: o.brand === undefined ? true : Boolean(o.brand),
    menu: o.menu === undefined ? true : Boolean(o.menu),
    eco: o.eco === undefined ? true : Boolean(o.eco),
    how: o.how === undefined ? true : Boolean(o.how),
    pack,
  }
}

/** Live in OBS only while carousel is enabled and a slide is ticked. */
export function overlayQrEnabled(
  carousel: boolean,
  slides: OverlayQrSlides,
): boolean {
  if (!carousel) return false
  if (slides.qr || slides.brand || slides.menu || slides.eco || slides.how) {
    return true
  }
  return Object.values(slides.pack || {}).some(Boolean)
}

export function normalizeOverlayQr(raw: unknown): OverlayQr {
  const o =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const pos = String(o.position || '') as OverlayPosition
  const size = String(o.size || '') as OverlayQrSize
  const theme = String(o.theme || '') as OverlayQrTheme
  const address = String(o.address ?? '')
    .trim()
    .slice(0, 128)
  let dwell = Math.round(Number(o.dwellSec))
  if (!Number.isFinite(dwell)) dwell = defaultOverlayQr.dwellSec
  dwell = Math.min(20, Math.max(1, dwell))
  const slides = normalizeSlides(o.slides)
  return {
    enabled: overlayQrEnabled(
      o.carousel === undefined ? true : Boolean(o.carousel),
      slides,
    ),
    address,
    label: String(o.label ?? defaultOverlayQr.label)
      .trim()
      .slice(0, 48) || defaultOverlayQr.label,
    brand: String(o.brand ?? '')
      .trim()
      .slice(0, 48),
    position: POSITIONS.has(pos) ? pos : defaultOverlayQr.position,
    size: SIZES.has(size) ? size : defaultOverlayQr.size,
    showAddress:
      o.showAddress === undefined ? true : Boolean(o.showAddress),
    theme: THEMES.has(theme) ? theme : defaultOverlayQr.theme,
    carousel: o.carousel === undefined ? true : Boolean(o.carousel),
    dwellSec: dwell,
    slides,
    menuOffers: normalizeMenuOffers(o.menuOffers, address),
    menuSymbol: String(o.menuSymbol || 'PLS')
      .trim()
      .slice(0, 12) || 'PLS',
    slideHtml: normalizeSlideHtmlMap(o.slideHtml),
    customCss: clipFieldText(o.customCss, MAX_QR_CSS),
  }
}

/**
 * Merge a hub PUT into current QR settings.
 * Omitting `menuOffers` keeps the last tip-menu snapshot — Just The Tip
 * remounts before toys reconnect and must not wipe the OBS carousel.
 */
export function applyOverlayQrUpdate(current: OverlayQr, raw: unknown): OverlayQr {
  const o =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const next = normalizeOverlayQr(raw)
  if (!Object.prototype.hasOwnProperty.call(o, 'menuOffers')) {
    next.menuOffers = current.menuOffers
  }
  return next
}

/** Starter markup when opening Edit (not auto-saved). Uses {{default}} for dynamic slides. */
export const OVERLAY_QR_SLIDE_STARTERS: Record<string, string> = {
  qr: `<div class="kq">
  <div class="label">Creator wallet</div>
  <div class="kq-head">
    <img class="kq-mark" src="/brand/pulsechain-mark.svg" alt="" width="28" height="28" />
    <div class="kq-title">{{brandOrLabel}}</div>
  </div>
  <div class="qr-wrap">{{qrSvg}}</div>
  <div class="kq-caption">Your receive wallet · never a token contract</div>
  <div class="kq-meta">{{shortAddress}}</div>
</div>`,
  brand: `<div class="slide-info">
  <div class="label">{{label}}</div>
  <div class="brand-big">{{brandOrLabel}}</div>
  <div class="kq-caption">Crypto tips on PulseChain</div>
</div>`,
  menu: `{{default}}`,
  eco: `<div class="slide-info">
  <div class="label">Ecosystem</div>
  {{ecoHtml}}
  <div class="kq-caption">PLS · PulseX · HEX · PLSX</div>
</div>`,
  how: `<div class="slide-info">
  <div class="label">How to tip</div>
  <div class="how-body">Menu shows the treats. This QR is the buy button.</div>
  <ul class="how-list">
    <li>Read the tip menu on stream (time · feel · price)</li>
    <li>When this carousel shows a treat, scan that QR</li>
    <li>Send the exact amount on PulseChain — that row buzzes</li>
  </ul>
</div>`,
}

export function overlayQrSlideStarter(key: string): string {
  if (OVERLAY_QR_SLIDE_STARTERS[key]) return OVERLAY_QR_SLIDE_STARTERS[key]!
  if (key.startsWith('pack:')) {
    return `<div class="kq">
  <div class="label">Website link</div>
  <div class="kq-head">
    {{packLogo}}
    <div class="kq-title">{{packLabel}}</div>
  </div>
  <div class="qr-wrap">{{packQrSvg}}</div>
  <div class="kq-caption">Opens {{packHost}} · not a payment QR</div>
  <div class="kq-meta">{{packBlurb}}</div>
</div>`
  }
  return '{{default}}'
}

export function overlayQrSlideTitle(key: string): string {
  const titles: Record<string, string> = {
    qr: 'Tip QR',
    brand: 'Brand spotlight',
    menu: 'Tip menu patterns',
    eco: 'Ecosystem logos',
    how: 'How to participate',
  }
  if (titles[key]) return titles[key]!
  if (key.startsWith('pack:')) {
    const id = key.slice(5)
    // Label filled by UI when known; raw id is fine as fallback
    return id
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase())
      .trim() || 'Pack QR'
  }
  return key
}

export function shortenAddress(addr: string, head = 6, tail = 4): string {
  const a = addr.trim()
  if (a.length <= head + tail + 2) return a
  return `${a.slice(0, head)}…${a.slice(-tail)}`
}

/** Slide id prefix for pack QR cards on the OBS page. */
export const PACK_SLIDE_PREFIX = 'pack:'
export const MENU_SLIDE_PREFIX = 'menu:'

export function packSlideId(itemId: string): string {
  return `${PACK_SLIDE_PREFIX}${itemId}`
}

export function parsePackSlideId(slideId: string): string | null {
  if (!slideId.startsWith(PACK_SLIDE_PREFIX)) return null
  return slideId.slice(PACK_SLIDE_PREFIX.length)
}

export function menuSlideId(page: number): string {
  return `${MENU_SLIDE_PREFIX}${page}`
}

export function parseMenuSlidePage(slideId: string): number | null {
  if (slideId === 'menu') return 0
  if (!slideId.startsWith(MENU_SLIDE_PREFIX)) return null
  const n = Number(slideId.slice(MENU_SLIDE_PREFIX.length))
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}
