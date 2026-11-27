/**
 * PulseChain stream pack — free ecosystem kit shipped with Just The Tip.
 * Official marks under /public/brand (from each project’s brand pages).
 * Not SaaS: static links + logos + optional carousel QR targets.
 */

export type PulsePackKind =
  | 'chain'
  | 'dex'
  | 'token'
  | 'wallet'
  | 'scan'
  | 'bridge'

export type PulsePackItem = {
  id: string
  kind: PulsePackKind
  label: string
  /** Short line under the name on stream QRs */
  blurb: string
  url: string
  /** Public path under site root */
  logo?: string
  /** Logo strip on tip alerts + eco slide */
  eco?: boolean
  /**
   * Can be a carousel QR slide (scan → url).
   * Operator toggles each separately under “PulseChain pack”.
   */
  streamQr?: boolean
  /** Default when streamQr is true */
  streamQrDefault?: boolean
  /** Small uppercase label above the QR */
  slideEyebrow?: string
  /**
   * Official branding / downloads page (logos, wordmarks, guidelines).
   * Shown in the operator Branding kit popup.
   */
  brandKitUrl?: string
  /** Extra brand resources (media kits, alt pages) */
  brandLinks?: ReadonlyArray<{ label: string; url: string }>
}

/** Official brand / download hubs (operator Branding popup + docs). */
export const BRAND_KIT_LINKS = {
  hex: {
    label: 'HEX',
    blurb: 'Official HEX.COM logo downloads & guidelines',
    url: 'https://hex.com/downloads',
    site: 'https://hex.com/',
  },
  pulsechain: {
    label: 'PulseChain',
    blurb: 'Chain site — branding resources download',
    url: 'https://pulsechain.com/',
    site: 'https://pulsechain.com/',
  },
  pulsechainMedia: {
    label: 'PulseChain media kit',
    blurb: 'Logos, wordmarks, banners, tickers',
    url: 'https://www.gopulsechain.com/media-kit',
    site: 'https://www.gopulsechain.com/media-kit',
  },
  /** Native gas PLS uses PulseChain brand marks */
  pls: {
    label: 'PLS (native gas)',
    blurb: 'PLS is PulseChain gas — use PulseChain brand assets',
    url: 'https://pulsechain.com/',
    site: 'https://pulsechain.com/',
  },
  pulsex: {
    label: 'PulseX',
    blurb: 'Official PulseX branding resources',
    url: 'https://pulsex.com/brand',
    site: 'https://pulsex.com/',
  },
} as const

/** Curated free PulseChain bundle for streams + tips. */
export const PULSE_PACK: readonly PulsePackItem[] = [
  {
    id: 'pulsechain',
    kind: 'chain',
    label: 'PulseChain',
    blurb: 'The chain tips settle on · also PLS gas mark',
    url: 'https://pulsechain.com/',
    logo: '/brand/pulsechain-mark.svg',
    eco: true,
    streamQr: true,
    streamQrDefault: false,
    slideEyebrow: 'The chain',
    brandKitUrl: BRAND_KIT_LINKS.pulsechain.url,
    brandLinks: [
      { label: 'Media kit', url: BRAND_KIT_LINKS.pulsechainMedia.url },
      { label: 'PLS gas brand', url: BRAND_KIT_LINKS.pls.url },
    ],
  },
  {
    id: 'pulsex',
    kind: 'dex',
    label: 'PulseX',
    blurb: 'Swap tokens on PulseChain',
    url: 'https://pulsex.com/',
    logo: '/brand/pulsex-mark.svg',
    eco: true,
    streamQr: true,
    streamQrDefault: false,
    slideEyebrow: 'Trade',
    brandKitUrl: BRAND_KIT_LINKS.pulsex.url,
  },
  {
    id: 'hex',
    kind: 'token',
    label: 'HEX',
    blurb: 'Certificate of deposit on-chain',
    url: 'https://hex.com/',
    logo: '/brand/hex-mark.svg',
    eco: true,
    brandKitUrl: BRAND_KIT_LINKS.hex.url,
  },
  {
    id: 'plsx',
    kind: 'token',
    label: 'PLSX',
    blurb: 'PulseX native token',
    url: 'https://pulsex.com/',
    logo: '/brand/plsx-mark.png',
    eco: true,
    brandKitUrl: BRAND_KIT_LINKS.pulsex.url,
  },
  {
    id: 'tipWallet',
    kind: 'wallet',
    label: 'Tip Wallet',
    blurb: 'Android EIP-681 PulseChain wallet for QR tips',
    url: 'https://github.com/ihelpmaybe/Tip-wallet/releases/tag/0.1.0',
    streamQr: true,
    streamQrDefault: true,
    slideEyebrow: 'Get a wallet',
  },
  {
    id: 'pulsescan',
    kind: 'scan',
    label: 'PulseScan',
    blurb: 'Explorer — txs & tip proofs',
    url: 'https://scan.pulsechain.com/',
    streamQr: true,
    streamQrDefault: false,
    slideEyebrow: 'Explorer',
  },
  {
    id: 'bridge',
    kind: 'bridge',
    label: 'Bridge',
    blurb: 'Move value onto PulseChain',
    url: 'https://bridge.pulsechain.com/',
    streamQr: true,
    streamQrDefault: false,
    slideEyebrow: 'Bridge in',
  },
] as const

/** Pack rows that ship with a local mark (for Branding popup). */
export function pulsePackLogoItems(): PulsePackItem[] {
  return PULSE_PACK.filter((it) => Boolean(it.logo))
}

/** Absolute URL for a public brand path (operator clipboard / open). */
export function brandAssetUrl(
  path: string,
  origin = typeof location !== 'undefined' ? location.origin : '',
): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const base = origin.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export type PulsePackStreamId = string

export function pulsePackItem(id: string): PulsePackItem | undefined {
  return PULSE_PACK.find((it) => it.id === id)
}

export function pulsePackEcoItems(): PulsePackItem[] {
  return PULSE_PACK.filter((it) => it.eco && it.logo)
}

export function pulsePackStreamQrItems(): PulsePackItem[] {
  return PULSE_PACK.filter((it) => it.streamQr)
}

/** Defaults for operator “pack QR” toggles. */
export function defaultPulsePackQrFlags(): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const it of pulsePackStreamQrItems()) {
    out[it.id] = it.streamQrDefault === true
  }
  return out
}

export function normalizePulsePackQrFlags(
  raw: unknown,
  /** Legacy single-toggle from earlier internetMoney-only slide */
  legacyInternetMoney?: unknown,
): Record<string, boolean> {
  const base = defaultPulsePackQrFlags()
  const o =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  for (const it of pulsePackStreamQrItems()) {
    if (o[it.id] !== undefined) {
      base[it.id] = Boolean(o[it.id])
    }
  }
  // Migrate old Internet Money pack / top-level flag → Tip Wallet
  if (o.tipWallet === undefined) {
    if (o.internetMoney !== undefined) {
      base.tipWallet = Boolean(o.internetMoney)
    } else if (legacyInternetMoney !== undefined) {
      base.tipWallet = Boolean(legacyInternetMoney)
    }
  }
  return base
}

/** Public download URL encoded for Tip Wallet QR. */
export const TIP_WALLET_URL =
  pulsePackItem('tipWallet')?.url ??
  'https://github.com/ihelpmaybe/Tip-wallet/releases/tag/0.1.0'

/** Display domain without scheme for small captions. */
export function packUrlHost(url: string): string {
  try {
    const u = new URL(url)
    return u.host + (u.pathname === '/' ? '' : u.pathname.replace(/\/$/, ''))
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
}
