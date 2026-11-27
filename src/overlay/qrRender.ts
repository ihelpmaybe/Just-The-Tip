/** Generate tip-address QR SVGs + carousel slide list for OBS. */
import {
  fanSafeCreatorWalletUri,
  sanitizeCreatorWalletQrPayload,
  sanitizeWebsiteLinkQrPayload,
} from './qrSafety.ts'
import { paymentQrSvg } from '@pulsefans/domain/utils/exportQr'
import { hexagonQrSvg } from './qrHexSvg'
import { ecosystemLogosHtml } from './ecosystem'
import {
  TIP_WALLET_URL,
  packUrlHost,
  pulsePackStreamQrItems,
  type PulsePackItem,
} from './pulseBundle'
import {
  MENU_SLIDE_PREFIX,
  OVERLAY_MENU_PAGE_SIZE,
  menuSlideId,
  packSlideId,
  parseMenuSlidePage,
  parsePackSlideId,
  shortenAddress,
  type OverlayMenuOffer,
  type OverlayQr,
} from './qrState'

/** Website / pack slide — https link only, never a wallet or contract. */
export async function renderWebsiteQrSvg(
  url: string,
  px = 280,
): Promise<string> {
  const safe = sanitizeWebsiteLinkQrPayload(url)
  if (!safe) return ''
  try {
    return hexagonQrSvg(safe, px)
  } catch {
    return ''
  }
}

/** Creator receive wallet — EIP-681 native value= or ERC-20 /transfer. */
export async function renderCreatorWalletQrSvg(
  receiveAddress: string,
  payload: string,
  px = 280,
): Promise<string> {
  const trimmed = payload.trim()
  const safe =
    sanitizeCreatorWalletQrPayload(trimmed, receiveAddress) ??
    sanitizeCreatorWalletQrPayload(receiveAddress, receiveAddress)
  if (!safe) return ''
  return paymentQrSvg(safe, px)
}

/** @deprecated Use renderCreatorWalletQrSvg or renderWebsiteQrSvg. */
export async function renderTipQrSvg(
  payload: string,
  px = 280,
  receiveAddress = '',
): Promise<string> {
  const t = payload.trim()
  if (!t) return ''
  if (/^https?:\/\//i.test(t)) return renderWebsiteQrSvg(t, px)
  if (receiveAddress) return renderCreatorWalletQrSvg(receiveAddress, t, px)
  return ''
}

export type OverlayCoreSlideId = 'qr' | 'brand' | 'menu' | 'eco' | 'how'
/** Core slides, `menu:<page>`, or `pack:<itemId>`. */
export type OverlayQrSlideId = OverlayCoreSlideId | string

export type PackQrSlidePayload = {
  id: string
  label: string
  blurb: string
  url: string
  host: string
  logo?: string
  eyebrow: string
  qrSvg: string
}

export type OverlayQrPayload = OverlayQr & {
  /** Ready-to-inline SVG markup (empty if no address) */
  qrSvg: string
  /** Abbreviated address for display */
  shortAddress: string
  hasAddress: boolean
  /** Ordered slide ids to play in carousel (or just first if static) */
  slideIds: OverlayQrSlideId[]
  /** Prebuilt eco strip HTML */
  ecoHtml: string
  /** Pre-rendered pack QR slides keyed by pack item id */
  packQrs: Record<string, PackQrSlidePayload>
  /** Paginated tip menu (same as menuOffers chunks) */
  menuPages: OverlayMenuOffer[][]
  /** Label for the main tip QR when it encodes a specific amount */
  tipAmountLabel?: string
  /**
   * @deprecated Prefer packQrs.tipWallet — kept for older browser sources.
   */
  tipWalletQrSvg: string
  tipWalletUrl: string
}

function packSlideEnabled(q: OverlayQr, itemId: string): boolean {
  return q.slides.pack?.[itemId] === true
}

function paginateOffers(
  offers: OverlayMenuOffer[],
  pageSize = OVERLAY_MENU_PAGE_SIZE,
): OverlayMenuOffer[][] {
  if (!offers.length) return []
  const pages: OverlayMenuOffer[][] = []
  for (let i = 0; i < offers.length; i += pageSize) {
    pages.push(offers.slice(i, i + pageSize))
  }
  return pages
}

function menuSlideIds(q: OverlayQr, pages: OverlayMenuOffer[][]): string[] {
  if (!q.slides.menu || !pages.length) return []
  if (pages.length === 1) return ['menu']
  return pages.map((_, i) => menuSlideId(i))
}

function participateSlideIds(
  q: OverlayQr,
  hasQrSlide: boolean,
  packIds: string[],
): OverlayQrSlideId[] {
  const out: OverlayQrSlideId[] = []
  // Tip wallet QR first so fans see a scannable code quickly.
  if (q.slides.qr && hasQrSlide) out.push('qr')
  if (q.slides.how) out.push('how')
  if (q.slides.brand) out.push('brand')
  out.push(...packIds)
  if (q.slides.eco) out.push('eco')
  return out
}

function orderedSlideIds(
  q: OverlayQr,
  hasQrSlide: boolean,
  packItems: PulsePackItem[],
  menuIds: string[],
): OverlayQrSlideId[] {
  if (!q.enabled) return []
  const packIds = packItems
    .filter((it) => packSlideEnabled(q, it.id))
    .map((it) => packSlideId(it.id))
  const intro = participateSlideIds(q, hasQrSlide, packIds)

  if (!q.carousel) {
    return []
  }

  if (!menuIds.length) return intro
  if (!intro.length) return menuIds
  // Pre-show (wallet QR + links) → tip menu → post-show (same bumpers).
  return [...intro, ...menuIds, ...intro]
}

export async function buildOverlayQrPayload(
  qr: OverlayQr,
): Promise<OverlayQrPayload> {
  const sizePx = qr.size === 'sm' ? 220 : qr.size === 'lg' ? 400 : 320
  const offerQrPx = sizePx
  const receive = qr.address.trim()
  const hasAddress = Boolean(receive)
  const packItems = pulsePackStreamQrItems()
  const rawOffers = (Array.isArray(qr.menuOffers) ? qr.menuOffers : []).map(
    (offer) => {
      const uri = offer.paymentUri?.trim() || ''
      const paymentUri =
        uri && hasAddress ? fanSafeCreatorWalletUri(uri, receive) : undefined
      return { ...offer, paymentUri, qrSvg: undefined }
    },
  )

  // Featured pattern QRs first; among those, cheapest amount for the main tip slide.
  const payable = rawOffers.filter((o) => o.paymentUri)
  const featuredPay = payable.filter((o) => o.featured)
  const cheapest = (featuredPay.length ? featuredPay : payable)
    .slice()
    .sort((a, b) => a.amount - b.amount)[0]
  const tipPayload =
    cheapest?.paymentUri ||
    (hasAddress && sanitizeCreatorWalletQrPayload(receive, receive)
      ? receive
      : '')
  const tipAmountLabel = cheapest
    ? `Tip ${cheapest.amountLabel}`
    : undefined

  const menuPagesBare = paginateOffers(rawOffers)
  const menuIds = menuSlideIds(qr, menuPagesBare)
  const slideIds = orderedSlideIds(
    qr,
    hasAddress && Boolean(tipPayload),
    packItems,
    menuIds,
  )

  const wantMenuPages = new Set<number>()
  let wantMainQr = false
  const wantPack = new Set<string>()
  for (const id of slideIds) {
    if (id === 'qr') wantMainQr = true
    const rawPackId =
      id === 'internetMoney' || id === 'tipWallet'
        ? id
        : parsePackSlideId(id)
    const resolvedPackId =
      rawPackId === 'internetMoney' ? 'tipWallet' : rawPackId
    if (resolvedPackId) wantPack.add(resolvedPackId)
    const page = parseMenuSlidePage(id)
    if (page !== null) wantMenuPages.add(page)
  }

  const svgMemo = new Map<string, Promise<string>>()
  const creatorQr = (payload: string, px: number) => {
    const key = `${px}\n${payload}`
    let pending = svgMemo.get(key)
    if (!pending) {
      pending = renderCreatorWalletQrSvg(receive, payload, px)
      svgMemo.set(key, pending)
    }
    return pending
  }

  const menuOffers = await Promise.all(
    rawOffers.map(async (offer, i) => {
      const page = Math.floor(i / OVERLAY_MENU_PAGE_SIZE)
      if (!wantMenuPages.has(page) || !offer.paymentUri) return offer
      const qrSvg = await creatorQr(offer.paymentUri, offerQrPx)
      return qrSvg ? { ...offer, qrSvg } : offer
    }),
  )
  const menuPages = paginateOffers(menuOffers)

  const packPromises = packItems
    .filter((it) => wantPack.has(it.id))
    .map(async (it) => {
      const svg = await renderWebsiteQrSvg(it.url, sizePx)
      return {
        id: it.id,
        label: it.label,
        blurb: it.blurb,
        url: it.url,
        host: packUrlHost(it.url),
        logo: it.logo,
        eyebrow: it.slideEyebrow || it.label,
        qrSvg: svg,
      } satisfies PackQrSlidePayload
    })

  const [qrSvg, packList] = await Promise.all([
    wantMainQr && tipPayload
      ? creatorQr(tipPayload, sizePx)
      : Promise.resolve(''),
    Promise.all(packPromises),
  ])

  const packQrs: Record<string, PackQrSlidePayload> = {}
  for (const p of packList) packQrs[p.id] = p

  const tw = packQrs.tipWallet
  return {
    ...qr,
    enabled: slideIds.length > 0,
    menuOffers,
    qrSvg,
    shortAddress: hasAddress ? shortenAddress(qr.address) : '',
    hasAddress,
    tipAmountLabel,
    slideIds,
    ecoHtml: ecosystemLogosHtml(20),
    packQrs,
    menuPages,
    tipWalletQrSvg: tw?.qrSvg || '',
    tipWalletUrl: tw?.url || TIP_WALLET_URL,
  }
}

export { MENU_SLIDE_PREFIX }
