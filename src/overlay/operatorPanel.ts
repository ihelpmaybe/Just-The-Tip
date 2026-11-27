/**
 * Stream tip alert — operator page + live control panel (modular component).
 */
import {
  defaultOverlayStyle,
  isCustomWindowStyle,
  normalizeOverlayStyle,
  type OverlayStyle,
  type OverlayTheme,
} from './style'
import {
  OVERLAY_TEMPLATES,
  getOverlayTemplate,
  type OverlayTemplate,
} from './templates'
import {
  fetchOverlayStatus,
  openOverlayPreview,
  overlayBrowserUrl,
  overlayPreviewUrl,
  overlayMenuBrowserUrl,
  overlayMenuPreviewUrl,
  publishOverlayTipDetailed,
  pushOverlayStyle,
  pushOverlayMenuStyle,
  pushOverlayLadder,
  type OverlayTipPayload,
} from './publish'
import { copyTextToClipboard } from '../utils/clipboard'
import {
  OVERLAY_MENU_LAYOUTS,
  defaultOverlayMenuStyle,
  normalizeOverlayMenuStyle,
  type OverlayMenuLayout,
  type OverlayMenuStyle,
} from './menuStyle'
import { slimOverlayLadder } from './stage'
import {
  mountMenuPreview,
  mountMenuThumb,
  type MenuPreviewHandle,
} from './menuPreview'
import {
  defaultOverlayQr,
  normalizeOverlayQr,
  overlayQrSlideStarter,
  overlayQrSlideTitle,
  type OverlayQr,
} from './qrState'
import {
  overlayQrBrowserUrl,
  overlayQrPreviewUrl,
  pushOverlayQr,
} from './qrPublish'
import {
  BRAND_KIT_LINKS,
  defaultPulsePackQrFlags,
  pulsePackStreamQrItems,
} from './pulseBundle'
import { onBackdropDismiss } from '../utils/backdropDismiss'
import {
  mountLookPreview,
  type LookPreviewHandle,
} from './tipAlertPreview'
import './operatorPanel.css'

export type StreamTipAlertApi = {
  paint: () => void
  readStyle: () => OverlayStyle
  saveStyle: () => void
  /** Push QR from receive wallet + form */
  syncQr: () => Promise<void>
  readQr: () => OverlayQr
  readMenuStyle: () => OverlayMenuStyle
  saveMenuStyle: () => void
  syncHub: () => void
  notify: (tip: OverlayTipPayload) => Promise<boolean>
  dispose: () => void
}

export type StreamTipAlertHost = {
  el: <T extends HTMLElement = HTMLElement>(id: string) => T
  getStyle: () => OverlayStyle
  setStyle: (s: OverlayStyle) => void
  persist: (s: OverlayStyle) => void
  getQr: () => OverlayQr
  setQr: (q: OverlayQr) => void
  persistQr: (q: OverlayQr) => void
  getReceiveAddress: () => string
  getDryRun: () => boolean
  getChainSymbol: () => string
  /** Live tip menu rows for the carousel (patterns currently offered). */
  getMenuOffers: () => import('./qrState').OverlayMenuOffer[]
  getMenuStyle: () => OverlayMenuStyle
  setMenuStyle: (s: OverlayMenuStyle) => void
  persistMenu: (s: OverlayMenuStyle) => void
  isPageActive: () => boolean
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

function templateOptionsHtml(): string {
  return OVERLAY_TEMPLATES.map(
    (t) =>
      `<option value="${escapeAttr(t.id)}">${escapeAttr(t.name)} — ${escapeAttr(t.blurb)}</option>`,
  ).join('')
}

function findTemplateByContent(
  html: string,
  css: string,
): OverlayTemplate | undefined {
  const h = html.trim()
  const c = css.trim()
  return (
    OVERLAY_TEMPLATES.find((t) => t.html.trim() === h && t.css.trim() === c) ||
    OVERLAY_TEMPLATES.find((t) => t.html.trim() === h)
  )
}

function brandingModalHtml(): string {
  // Three kits people actually want. PLS is PulseChain’s gas token — same brand pack.
  const kits: Array<{
    title: string
    blurb: string
    logo: string
    url: string
    cta: string
  }> = [
    {
      title: 'HEX',
      blurb: 'Logos & guidelines from HEX.COM',
      logo: '/brand/hex-mark.svg',
      url: BRAND_KIT_LINKS.hex.url,
      cta: 'HEX brand kit',
    },
    {
      title: 'PulseChain · PLS',
      blurb: 'Chain logo pack (PLS uses the same brand)',
      logo: '/brand/pulsechain-mark.svg',
      url: BRAND_KIT_LINKS.pulsechainMedia.url,
      cta: 'PulseChain media kit',
    },
    {
      title: 'PulseX · PLSX',
      blurb: 'DEX logo pack from PulseX.com',
      logo: '/brand/pulsex-mark.svg',
      url: BRAND_KIT_LINKS.pulsex.url,
      cta: 'PulseX brand kit',
    },
  ]
  const kitCards = kits
    .map(
      (k) => `
        <a class="obs-brand-card obs-brand-card-link" href="${escapeAttr(k.url)}" target="_blank" rel="noopener noreferrer">
          <img class="obs-brand-mark" src="${escapeAttr(k.logo)}" alt="" width="40" height="40" decoding="async" />
          <div class="obs-brand-card-copy">
            <h4>${escapeAttr(k.title)}</h4>
            <p>${escapeAttr(k.blurb)}</p>
            <span class="obs-brand-cta">${escapeAttr(k.cta)} →</span>
          </div>
        </a>`,
    )
    .join('')

  return `
        <div id="obs-branding-modal" class="pattern-wizard obs-branding-modal" hidden>
          <div
            class="pattern-wizard-panel obs-branding-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="obs-branding-h"
          >
            <div class="pattern-catalog-head">
              <h3 id="obs-branding-h">Branding</h3>
              <button type="button" class="btn ghost tiny" id="btn-obs-branding-close" aria-label="Close branding">Close</button>
            </div>

            <p class="obs-branding-lead">
              Need logos for thumbnails, panels, or socials? Open the official kits.
              Want logos on tip alerts? Toggle them on — no files to download.
            </p>

            <div class="obs-brand-official-grid">
              ${kitCards}
            </div>

            <div class="obs-brand-stream-box">
              <p class="obs-look-shared-title">On tip alerts</p>
              <p class="hint" style="margin:0 0 0.55rem">
                Ecosystem marks already ship with the app. Use
                <strong>Copy OBS URL</strong> on the page behind this dialog, then:
              </p>
              <button type="button" class="btn primary" id="btn-obs-branding-eco-on">
                Show ecosystem logos on tip alerts
              </button>
              <p class="setup-note" id="obs-branding-status" role="status"></p>
            </div>
          </div>
        </div>`
}

function menuLayoutGalleryHtml(): string {
  return OVERLAY_MENU_LAYOUTS.map((l) => {
    const badge = l.badge
      ? `<span class="pill">${escapeAttr(l.badge)}</span>`
      : ''
    return `
            <button type="button" class="obs-menu-layout-card" data-menu-layout="${escapeAttr(l.id)}" aria-pressed="false">
              <span class="obs-menu-layout-thumb" id="obs-menu-thumb-${escapeAttr(l.id)}"></span>
              <span class="obs-menu-layout-copy">
                <span class="obs-menu-layout-name">${escapeAttr(l.name)}</span>
                ${badge}
              </span>
              <span class="obs-menu-layout-blurb">${escapeAttr(l.blurb)}</span>
            </button>`
  }).join('')
}

/** HTML for layout `page-obs` (single composition unit). */
export function streamTipAlertPageHtml(): string {
  return `
      <div id="page-obs" class="page-settings stream-tip-alert" hidden>
        <p class="settings-intro">
          Three separate OBS Browser Sources: tip pop-up, always-on tip menu, and optional QR carousel.
          Picture below is the pop-up. Build the readable price list in <strong>Tip menu overlay</strong>.
          PulseChain only. Keep Just The Tip running while live.
        </p>

        <section class="settings-block" aria-labelledby="obs-h">
          <div class="settings-block-head">
            <h2 id="obs-h">Stream tip alert</h2>
            <span class="pill" id="obs-clients-pill">0 watching</span>
          </div>
          <p class="hint">
            OBS: paste this URL (transparent, 1920×1080). Pop-up only — the always-on price list is the Tip menu overlay URL below.
            Add the carousel URL only if you want rotating QRs.
            <strong>Open dark preview</strong> uses a dark background so you can see it in a browser tab.
          </p>
          <label class="field grow">
            <span>Browser Source URL (OBS — transparent)</span>
            <input id="obs-overlay-url" type="text" readonly spellcheck="false" />
          </label>
          <div class="actions obs-actions">
            <button type="button" class="btn primary" id="btn-obs-copy">Copy OBS URL</button>
            <button type="button" class="btn" id="btn-obs-open">Open dark preview</button>
            <button type="button" class="btn ghost" id="btn-obs-test">Send test tip</button>
            <button type="button" class="btn ghost" id="btn-obs-test-pool">Send test pool swap</button>
            <button type="button" class="btn" id="btn-obs-branding" title="Official HEX, PulseChain, PulseX brand kits + tip logos">Branding</button>
          </div>
          <p class="setup-note" id="obs-status" role="status"></p>

          <div class="obs-look-preview-wrap obs-board-preview-wrap">
            <p class="obs-look-preview-label">What OBS shows</p>
            <div
              class="obs-look-preview"
              id="obs-board-preview"
              aria-label="Tip pop-up sample"
            ></div>
            <p class="hint obs-look-preview-hint">
              Sample of the tip pop-up. <strong>Open dark preview</strong> is the full-size version.
              The live price list is built under <strong>Tip menu overlay</strong>.
            </p>
          </div>

          <details class="obs-advanced-details obs-look-fold" id="obs-look-fold">
            <summary>
              <span class="obs-look-fold-title">Customize look</span>
              <span class="pill" id="obs-look-mode-pill">Built-in</span>
            </summary>
            <p class="hint" id="obs-look-h">
              Theme, size, and filters for tip pop-ups. Changes apply live without reloading OBS.
            </p>

            <div class="obs-look-tabs" role="tablist" aria-label="Look style">
              <button type="button" class="obs-look-tab is-active" role="tab" id="obs-tab-builtin" aria-selected="true" aria-controls="obs-panel-builtin" data-look-mode="builtin">Built-in themes</button>
              <button type="button" class="obs-look-tab" role="tab" id="obs-tab-template" aria-selected="false" aria-controls="obs-panel-template" data-look-mode="template">Template packs</button>
            </div>
            <input type="hidden" id="obs-look-mode" value="builtin" />

            <div class="obs-look-preview-wrap">
              <p class="obs-look-preview-label">Live preview</p>
              <div
                class="obs-look-preview"
                id="obs-look-preview"
                aria-live="polite"
                aria-label="Tip alert look preview"
              ></div>
              <p class="hint obs-look-preview-hint">
                Updates as you change theme or template — no need to open dark preview for a quick look.
              </p>
            </div>

            <div class="obs-look-panel" role="tabpanel" id="obs-panel-builtin" aria-labelledby="obs-tab-builtin">
              <p class="obs-look-panel-title">Card color</p>
              <div class="settings-grid">
                <label class="field grow">
                  <span>Theme color</span>
                  <select id="obs-theme">
                    <option value="cyan">Cyan</option>
                    <option value="pink">Pink</option>
                    <option value="gold">Gold</option>
                    <option value="soft">Soft</option>
                  </select>
                </label>
              </div>
              <p class="hint">Simple colored tip cards. Position, size, and text live below.</p>
            </div>

            <div class="obs-look-panel" role="tabpanel" id="obs-panel-template" aria-labelledby="obs-tab-template" hidden>
              <p class="obs-look-panel-title">Window design</p>
              <div class="settings-grid">
                <label class="field grow">
                  <span>Template pack</span>
                  <select id="obs-template">${templateOptionsHtml()}</select>
                </label>
              </div>
              <p class="hint obs-template-blurb" id="obs-template-blurb"></p>
              <details class="obs-advanced-details" id="obs-advanced">
                <summary>Edit HTML / CSS</summary>
                <p class="hint">
                  Tokens:
                  <code>{{title}}</code> <code>{{subtitle}}</code> <code>{{eyebrow}}</code>
                  <code>{{brand}}</code> <code>{{amount}}</code> <code>{{symbol}}</code>
                  <code>{{source}}</code> <code>{{eco}}</code> (ecosystem logo strip).
                  Switching to Built-in clears this.
                </p>
                <label class="field grow">
                  <span>Custom HTML</span>
                  <textarea id="obs-custom-html" rows="7" spellcheck="false"></textarea>
                </label>
                <label class="field grow">
                  <span>Custom CSS</span>
                  <textarea id="obs-custom-css" rows="8" spellcheck="false"></textarea>
                </label>
              </details>
            </div>

            <div class="obs-look-shared">
              <p class="obs-look-shared-title">All looks</p>
              <div class="settings-grid">
                <label class="field">
                  <span>Position</span>
                  <select id="obs-position">
                    <option value="bottom">Bottom center</option>
                    <option value="top">Top center</option>
                    <option value="bottom-left">Bottom left</option>
                    <option value="bottom-right">Bottom right</option>
                    <option value="top-left">Top left</option>
                    <option value="top-right">Top right</option>
                  </select>
                </label>
                <label class="field">
                  <span>Size</span>
                  <select id="obs-size">
                    <option value="compact">Compact</option>
                    <option value="normal">Normal</option>
                    <option value="large">Large</option>
                  </select>
                </label>
                <label class="field">
                  <span>Hold (seconds)</span>
                  <input id="obs-hold" type="number" min="2" max="20" step="1" />
                </label>
                <label class="field">
                  <span>Label (above amount)</span>
                  <input id="obs-eyebrow" type="text" maxlength="32" placeholder="Tip" spellcheck="false" />
                </label>
                <label class="field">
                  <span>Brand line (optional)</span>
                  <input id="obs-brand" type="text" maxlength="48" placeholder="Your stream name" spellcheck="false" />
                </label>
                <label class="field">
                  <span>Wallet tip alert minimum</span>
                  <input id="obs-wallet-min" type="number" min="0" step="any" />
                </label>
                <label class="field">
                  <span>Pool / chain event alert minimum</span>
                  <input id="obs-pool-min" type="number" min="0" step="any" />
                </label>
              </div>
              <div class="obs-toggles">
                <label class="field settings-toggle-field">
                  <span>Show pattern line</span>
                  <input type="checkbox" id="obs-show-pattern" />
                </label>
                <label class="field settings-toggle-field">
                  <span>Show pool / chain event alerts (same OBS tip card)</span>
                  <input type="checkbox" id="obs-show-pool-alerts" />
                </label>
                <label class="field settings-toggle-field">
                  <span>Show pool name</span>
                  <input type="checkbox" id="obs-show-pool-label" />
                </label>
                <label class="field settings-toggle-field">
                  <span>Show dry-run / tests</span>
                  <input type="checkbox" id="obs-show-dry" />
                </label>
                <label class="field settings-toggle-field">
                  <span>Show connection status on alert page</span>
                  <input type="checkbox" id="obs-show-status" />
                </label>
                <label class="field settings-toggle-field">
                  <span>PulseChain ecosystem logos</span>
                  <input type="checkbox" id="obs-show-eco" />
                </label>
              </div>
            </div>
          </details>
        </section>

        ${brandingModalHtml()}

        <section class="settings-block" aria-labelledby="obs-menu-h">
          <div class="settings-block-head">
            <h2 id="obs-menu-h">Tip menu overlay</h2>
          </div>
          <p class="hint">
            Always-on price list for OBS. Same patterns and amounts as <strong>Tip menu</strong>.
            Separate Browser Source (transparent, 1920×1080). Pick a layout — Side list is the cam default.
            Changes apply live without reloading OBS.
          </p>
          <label class="field grow">
            <span>Browser Source URL (OBS — transparent)</span>
            <input id="obs-menu-url" type="text" readonly spellcheck="false" />
          </label>
          <div class="actions obs-actions">
            <button type="button" class="btn primary" id="btn-obs-menu-copy">Copy OBS URL</button>
            <button type="button" class="btn" id="btn-obs-menu-open">Open dark preview</button>
          </div>
          <p class="setup-note" id="obs-menu-status" role="status"></p>

          <p class="obs-look-shared-title">Layout</p>
          <div class="obs-menu-gallery" role="listbox" aria-label="Tip menu overlay layouts">
            ${menuLayoutGalleryHtml()}
          </div>
          <input type="hidden" id="obs-menu-layout" value="side" />

          <div class="obs-look-preview-wrap">
            <p class="obs-look-preview-label">Live preview</p>
            <div
              class="obs-look-preview"
              id="obs-menu-preview"
              aria-label="Tip menu overlay preview"
            ></div>
            <p class="hint obs-look-preview-hint" id="obs-menu-empty-hint">
              Set patterns and prices on Tip menu — this overlay follows that list.
            </p>
          </div>

          <div class="settings-grid">
            <label class="field">
              <span>Position</span>
              <select id="obs-menu-position">
                <option value="top-left">Top left</option>
                <option value="top-right">Top right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-right">Bottom right</option>
                <option value="top">Top center</option>
                <option value="bottom">Bottom center</option>
              </select>
            </label>
            <label class="field">
              <span>Size</span>
              <select id="obs-menu-size">
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="large">Large</option>
              </select>
            </label>
            <label class="field">
              <span>Theme</span>
              <select id="obs-menu-theme">
                <option value="cyan">Cyan</option>
                <option value="pink">Pink</option>
                <option value="gold">Gold</option>
                <option value="soft">Soft</option>
              </select>
            </label>
            <label class="field">
              <span>Panel opacity</span>
              <input id="obs-menu-opacity" type="range" min="0.4" max="0.95" step="0.01" />
            </label>
            <label class="field">
              <span>Max rows</span>
              <input id="obs-menu-max-rows" type="number" min="1" max="16" step="1" />
            </label>
            <label class="field grow">
              <span>Headline</span>
              <input id="obs-menu-headline" type="text" maxlength="48" placeholder="Tip menu" spellcheck="false" />
            </label>
            <label class="field grow">
              <span>Brand</span>
              <input id="obs-menu-brand" type="text" maxlength="48" placeholder="Optional stream name" spellcheck="false" />
            </label>
            <label class="field settings-toggle-field">
              <span>Featured patterns first</span>
              <input type="checkbox" id="obs-menu-featured-first" />
            </label>
            <label class="field settings-toggle-field">
              <span>Show toy note</span>
              <input type="checkbox" id="obs-menu-show-note" />
            </label>
            <label class="field settings-toggle-field">
              <span>Show blurb</span>
              <input type="checkbox" id="obs-menu-show-blurb" />
            </label>
          </div>
        </section>

        <section class="settings-block" aria-labelledby="obs-qr-h">
          <div class="settings-block-head">
            <h2 id="obs-qr-h">Tip QR · carousel</h2>
            <button type="button" class="pill obs-qr-header-toggle" id="obs-qr-enabled-pill" aria-pressed="false">OFF</button>
          </div>
          <p class="hint">
            Optional third source. Tip pop-ups stay on the Stream tip alert URL above —
            this carousel is QR slides only (no tip alert overlay).
            Rotation is <strong>pre-show</strong> (how to join + links) →
            <strong>tip menu</strong> (one QR per pattern) →
            <strong>post-show</strong> (same join slides again).
            Tick what you want in each block. Nothing ticked = hidden, no empty box.
          </p>
          <label class="field grow">
            <span>Carousel / QR Browser Source URL (OBS — transparent)</span>
            <input id="obs-qr-url" type="text" readonly spellcheck="false" />
          </label>
          <div class="actions obs-actions">
            <button type="button" class="btn primary" id="btn-obs-qr-copy">Copy carousel URL</button>
            <button type="button" class="btn" id="btn-obs-qr-open">Open dark preview</button>
          </div>
          <p class="setup-note" id="obs-qr-status" role="status"></p>
          <div class="settings-grid">
            <label class="field grow">
              <span>Label</span>
              <input id="obs-qr-label" type="text" maxlength="48" placeholder="Tip on PulseChain" spellcheck="false" />
            </label>
            <label class="field">
              <span>Brand under QR</span>
              <input id="obs-qr-brand" type="text" maxlength="48" placeholder="Your stream name" spellcheck="false" />
            </label>
            <label class="field">
              <span>Position</span>
              <select id="obs-qr-position">
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom">Bottom center</option>
                <option value="top-right">Top right</option>
                <option value="top-left">Top left</option>
                <option value="top">Top center</option>
              </select>
            </label>
            <label class="field">
              <span>Size</span>
              <select id="obs-qr-size">
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </label>
            <label class="field">
              <span>Look</span>
              <select id="obs-qr-theme">
                <option value="pulse">Pulse</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>
            <label class="field">
              <span>Seconds per slide</span>
              <input id="obs-qr-dwell" type="number" min="1" max="20" step="1" />
            </label>
            <label class="field settings-toggle-field obs-qr-master-toggle">
              <span>QR carousel on</span>
              <input type="checkbox" id="obs-qr-carousel" />
            </label>
            <label class="field settings-toggle-field">
              <span>Show shortened address</span>
              <input type="checkbox" id="obs-qr-show-addr" />
            </label>
          </div>
          <p class="obs-look-shared-title" style="margin-top:0.75rem">During the show · creator wallet QRs</p>
          <p class="hint" style="margin-top:0">
            One slide per On pattern. <strong>Featured</strong> patterns go first (then cheapest). Each QR pays your receive wallet only.
          </p>
          <div class="obs-toggles obs-slide-toggles">
            <div class="obs-slide-row">
              <label class="field settings-toggle-field">
                <span>Tip menu (creator wallet · FEAT pattern)</span>
                <input type="checkbox" id="obs-qr-slide-menu" />
              </label>
              <button type="button" class="btn ghost obs-slide-edit" data-slide-edit="menu">Edit</button>
            </div>
          </div>
          <p class="obs-look-shared-title" style="margin-top:0.75rem">Pre &amp; post show · how to join</p>
          <p class="hint" style="margin-top:0">
            <strong>Creator wallet</strong> slides (Tip QR, tip menu) encode your receive address.
            <strong>Website link</strong> slides below open public URLs only — no 0x addresses.
          </p>
          <div class="obs-toggles obs-slide-toggles">
            <div class="obs-slide-row">
              <label class="field settings-toggle-field">
                <span>How to participate</span>
                <input type="checkbox" id="obs-qr-slide-how" />
              </label>
              <button type="button" class="btn ghost obs-slide-edit" data-slide-edit="how">Edit</button>
            </div>
            <div class="obs-slide-row">
              <label class="field settings-toggle-field">
                <span>Tip QR (creator wallet)</span>
                <input type="checkbox" id="obs-qr-slide-qr" />
              </label>
              <button type="button" class="btn ghost obs-slide-edit" data-slide-edit="qr">Edit</button>
            </div>
            <div class="obs-slide-row">
              <label class="field settings-toggle-field">
                <span>Brand spotlight</span>
                <input type="checkbox" id="obs-qr-slide-brand" />
              </label>
              <button type="button" class="btn ghost obs-slide-edit" data-slide-edit="brand">Edit</button>
            </div>
            <div class="obs-slide-row">
              <label class="field settings-toggle-field">
                <span>Ecosystem logos</span>
                <input type="checkbox" id="obs-qr-slide-eco" />
              </label>
              <button type="button" class="btn ghost obs-slide-edit" data-slide-edit="eco">Edit</button>
            </div>
          </div>
          <p class="obs-look-shared-title" style="margin-top:0.75rem">PulseChain pack · website link QRs</p>
          <p class="hint" style="margin-top:0">
            Scan-to-open public sites (Tip Wallet, PulseScan, bridge…). These are <strong>not</strong> payment QRs — fans do not send tips to these links.
          </p>
          <div class="obs-toggles obs-slide-toggles" id="obs-qr-pack-toggles">
            ${pulsePackStreamQrItems()
              .map(
                (it) => `
            <div class="obs-slide-row">
              <label class="field settings-toggle-field">
                <span>${it.label}</span>
                <input type="checkbox" id="obs-qr-pack-${it.id}" data-pack-id="${it.id}" />
              </label>
              <button type="button" class="btn ghost obs-slide-edit" data-slide-edit="pack:${it.id}">Edit</button>
            </div>`,
              )
              .join('')}
          </div>
          <details class="obs-advanced-details obs-qr-edit" id="obs-qr-slide-editor" hidden>
            <summary id="obs-qr-slide-editor-summary">Edit slide HTML</summary>
            <p class="hint" id="obs-qr-slide-editor-hint">
              Tokens:
              <code>{{label}}</code> <code>{{brand}}</code> <code>{{brandOrLabel}}</code>
              <code>{{qrSvg}}</code> <code>{{shortAddress}}</code> <code>{{ecoHtml}}</code>
              <code>{{default}}</code> (built-in HTML) · pack:
              <code>{{packLabel}}</code> <code>{{packQrSvg}}</code> <code>{{packLogo}}</code>
            </p>
            <input type="hidden" id="obs-qr-edit-key" value="" />
            <label class="field grow">
              <span id="obs-qr-slide-html-label">Slide HTML</span>
              <textarea id="obs-qr-slide-html" rows="8" spellcheck="false"></textarea>
            </label>
            <div class="actions obs-actions">
              <button type="button" class="btn primary" id="btn-obs-qr-slide-save">Save slide HTML</button>
              <button type="button" class="btn ghost" id="btn-obs-qr-slide-reset">Reset to built-in</button>
              <button type="button" class="btn" id="btn-obs-qr-slide-close">Close</button>
            </div>
            <p class="setup-note" id="obs-qr-slide-edit-status" role="status"></p>
          </details>
          <details class="obs-advanced-details" id="obs-qr-css-editor">
            <summary>Carousel CSS (all slides)</summary>
            <p class="hint">
              Extra CSS for the OBS carousel card. Targets built-in classes like
              <code>.card</code>, <code>.label</code>, <code>.qr-wrap</code>, <code>.menu-row</code>.
            </p>
            <label class="field grow">
              <span>Custom CSS</span>
              <textarea id="obs-qr-custom-css" rows="8" spellcheck="false"></textarea>
            </label>
          </details>
          <p class="hint" id="obs-qr-addr-hint">No receive wallet set yet — add one on Home.</p>
        </section>

        <section class="settings-block">
          <ol class="obs-steps hint">
            <li>OBS → Sources → + → Browser for the tip pop-up URL</li>
            <li>Add a second Browser Source for the <strong>Tip menu overlay</strong> URL (always-on prices)</li>
            <li>Customize look under <strong>Customize look</strong>, then Send test tip</li>
            <li>Optional: add a third Browser Source for tip QR carousel</li>
            <li>Paste each OBS URL without <code>?preview</code>; keep Just The Tip running while live</li>
            <li><strong>Branding</strong> — official logo kits (HEX / PulseChain / PulseX)</li>
          </ol>
        </section>
      </div>
  `
}

const FORM_IDS = [
  'obs-position',
  'obs-theme',
  'obs-size',
  'obs-hold',
  'obs-eyebrow',
  'obs-brand',
  'obs-wallet-min',
  'obs-pool-min',
  'obs-show-pattern',
  'obs-show-pool-alerts',
  'obs-show-pool-label',
  'obs-show-dry',
  'obs-show-status',
  'obs-show-eco',
  'obs-custom-html',
  'obs-custom-css',
] as const

type LookMode = 'builtin' | 'template'

/**
 * Wire events for the stream tip alert panel (call once after shell HTML exists).
 */
export function mountStreamTipAlert(host: StreamTipAlertHost): StreamTipAlertApi {
  const $ = host.el
  const previewHost = document.getElementById('obs-look-preview')
  const boardPreviewHost = document.getElementById('obs-board-preview')
  const lookPreview: LookPreviewHandle | null = previewHost
    ? mountLookPreview(previewHost)
    : null
  const boardPreview: LookPreviewHandle | null = boardPreviewHost
    ? mountLookPreview(boardPreviewHost)
    : null
  const menuPreviewHost = document.getElementById('obs-menu-preview')
  const menuPreview: MenuPreviewHandle | null = menuPreviewHost
    ? mountMenuPreview(menuPreviewHost)
    : null
  const menuThumbs = new Map<string, MenuPreviewHandle>()
  for (const layout of OVERLAY_MENU_LAYOUTS) {
    const thumb = document.getElementById(`obs-menu-thumb-${layout.id}`)
    if (thumb) menuThumbs.set(layout.id, mountMenuThumb(thumb))
  }

  function liveMenuRows() {
    return slimOverlayLadder(host.getMenuOffers(), { featuredFirst: true })
  }

  function refreshLookPreview() {
    const style = readStyle()
    const symbol = host.getChainSymbol()
    lookPreview?.refresh(style, symbol)
    boardPreview?.refresh(style, symbol)
  }

  function refreshMenuPreview() {
    const s = readMenuStyle()
    const rows = liveMenuRows()
    menuPreview?.refresh(s, rows)
    for (const layout of OVERLAY_MENU_LAYOUTS) {
      menuThumbs.get(layout.id)?.refresh({ ...s, layout: layout.id }, rows)
    }
    const hint = document.getElementById('obs-menu-empty-hint')
    if (hint) {
      hint.hidden = rows.length > 0
    }
    document.querySelectorAll<HTMLButtonElement>('[data-menu-layout]').forEach((btn) => {
      const id = btn.getAttribute('data-menu-layout')
      const on = id === s.layout
      btn.classList.toggle('is-active', on)
      btn.setAttribute('aria-pressed', on ? 'true' : 'false')
    })
  }

  function currentMode(): LookMode {
    const h = document.getElementById('obs-look-mode') as HTMLInputElement | null
    return h?.value === 'template' ? 'template' : 'builtin'
  }

  function setModeUi(mode: LookMode, opts?: { silent?: boolean }) {
    const modeInput = document.getElementById(
      'obs-look-mode',
    ) as HTMLInputElement | null
    if (modeInput) modeInput.value = mode

    const tabBuiltin = document.getElementById('obs-tab-builtin')
    const tabTemplate = document.getElementById('obs-tab-template')
    const panelBuiltin = document.getElementById('obs-panel-builtin')
    const panelTemplate = document.getElementById('obs-panel-template')
    const pill = document.getElementById('obs-look-mode-pill')

    tabBuiltin?.classList.toggle('is-active', mode === 'builtin')
    tabTemplate?.classList.toggle('is-active', mode === 'template')
    tabBuiltin?.setAttribute('aria-selected', mode === 'builtin' ? 'true' : 'false')
    tabTemplate?.setAttribute(
      'aria-selected',
      mode === 'template' ? 'true' : 'false',
    )
    if (panelBuiltin) panelBuiltin.hidden = mode !== 'builtin'
    if (panelTemplate) panelTemplate.hidden = mode !== 'template'
    if (pill) {
      pill.textContent = mode === 'template' ? 'Templates' : 'Built-in'
      pill.classList.toggle('on', mode === 'template')
    }
    if (!opts?.silent) updateTemplateBlurb()
    refreshLookPreview()
  }

  function selectLookMode(mode: LookMode) {
    if (mode === currentMode()) {
      setModeUi(mode)
      return
    }
    if (mode === 'builtin') {
      clearTemplateFromForm()
      setModeUi('builtin')
      void saveStyle()
      $<HTMLElement>('obs-status').textContent =
        'Built-in themes — pick a color, then Send test tip'
    } else {
      setModeUi('template')
      const sel = document.getElementById(
        'obs-template',
      ) as HTMLSelectElement | null
      const existing = $<HTMLTextAreaElement>('obs-custom-html').value.trim()
      if (!existing) {
        const t = getOverlayTemplate(sel?.value || OVERLAY_TEMPLATES[0]!.id)
        if (t) applyTemplateToForm(t)
      }
      void saveStyle()
      updateTemplateBlurb()
      const t = getOverlayTemplate(
        (document.getElementById('obs-template') as HTMLSelectElement | null)
          ?.value || '',
      )
      $<HTMLElement>('obs-status').textContent = t
        ? `Template “${t.name}” — Send test tip (Open dark preview to see)`
        : 'Template packs'
    }
  }

  function updateTemplateBlurb() {
    const blurb = document.getElementById('obs-template-blurb')
    const sel = document.getElementById(
      'obs-template',
    ) as HTMLSelectElement | null
    if (!blurb || !sel) return
    const t = getOverlayTemplate(sel.value)
    blurb.textContent = t
      ? `${t.name} — ${t.blurb}`
      : ''
  }

  function applyTemplateToForm(t: OverlayTemplate) {
    $<HTMLTextAreaElement>('obs-custom-html').value = t.html
    $<HTMLTextAreaElement>('obs-custom-css').value = t.css
    if (t.position) $<HTMLSelectElement>('obs-position').value = t.position
    if (t.size) $<HTMLSelectElement>('obs-size').value = t.size
  }

  function clearTemplateFromForm() {
    $<HTMLTextAreaElement>('obs-custom-html').value = ''
    $<HTMLTextAreaElement>('obs-custom-css').value = ''
    const themeEl = $<HTMLSelectElement>('obs-theme')
    if (!themeEl.value || themeEl.value === 'custom') themeEl.value = 'cyan'
  }

  function readStyle(): OverlayStyle {
    const pos = document.getElementById(
      'obs-position',
    ) as HTMLSelectElement | null
    if (!pos) {
      return normalizeOverlayStyle(host.getStyle() || defaultOverlayStyle)
    }
    const mode = currentMode()
    let theme = $<HTMLSelectElement>('obs-theme').value as OverlayTheme
    let customHtml = $<HTMLTextAreaElement>('obs-custom-html').value
    let customCss = $<HTMLTextAreaElement>('obs-custom-css').value

    if (mode === 'builtin') {
      customHtml = ''
      customCss = ''
      if (theme === 'custom' || !theme) theme = 'cyan'
    } else {
      theme = 'custom'
    }

    return normalizeOverlayStyle({
      position: pos.value,
      theme,
      size: $<HTMLSelectElement>('obs-size').value,
      holdSec: Number($<HTMLInputElement>('obs-hold').value),
      eyebrow: $<HTMLInputElement>('obs-eyebrow').value,
      brand: $<HTMLInputElement>('obs-brand').value,
      walletMinAmount: Number(
        $<HTMLInputElement>('obs-wallet-min').value,
      ),
      poolMinAmount: Number($<HTMLInputElement>('obs-pool-min').value),
      showPattern: $<HTMLInputElement>('obs-show-pattern').checked,
      showPoolAlerts: $<HTMLInputElement>('obs-show-pool-alerts').checked,
      showPoolLabel: $<HTMLInputElement>('obs-show-pool-label').checked,
      showDryRun: $<HTMLInputElement>('obs-show-dry').checked,
      showStatus: $<HTMLInputElement>('obs-show-status').checked,
      showEco: $<HTMLInputElement>('obs-show-eco').checked,
      customHtml,
      customCss,
    })
  }

  function writeForm(s: OverlayStyle) {
    const mode: LookMode = isCustomWindowStyle(s) ? 'template' : 'builtin'
    $<HTMLSelectElement>('obs-position').value = s.position
    const themeWrite: OverlayTheme =
      s.theme === 'pink' || s.theme === 'gold' || s.theme === 'soft'
        ? s.theme
        : 'cyan'
    $<HTMLSelectElement>('obs-theme').value = themeWrite
    $<HTMLSelectElement>('obs-size').value = s.size
    $<HTMLInputElement>('obs-hold').value = String(s.holdSec)
    $<HTMLInputElement>('obs-eyebrow').value = s.eyebrow
    $<HTMLInputElement>('obs-brand').value = s.brand
    $<HTMLInputElement>('obs-wallet-min').value = String(
      s.walletMinAmount || 0,
    )
    $<HTMLInputElement>('obs-pool-min').value = String(s.poolMinAmount || 0)
    $<HTMLInputElement>('obs-show-pattern').checked = s.showPattern
    $<HTMLInputElement>('obs-show-pool-alerts').checked = s.showPoolAlerts
    $<HTMLInputElement>('obs-show-pool-label').checked = s.showPoolLabel
    $<HTMLInputElement>('obs-show-dry').checked = s.showDryRun
    $<HTMLInputElement>('obs-show-status').checked = s.showStatus
    $<HTMLInputElement>('obs-show-eco').checked = s.showEco !== false
    $<HTMLTextAreaElement>('obs-custom-html').value = s.customHtml || ''
    $<HTMLTextAreaElement>('obs-custom-css').value = s.customCss || ''

    const match = findTemplateByContent(s.customHtml || '', s.customCss || '')
    const tplSel = document.getElementById(
      'obs-template',
    ) as HTMLSelectElement | null
    if (tplSel && match) tplSel.value = match.id

    setModeUi(mode)
  }

  async function refreshStatus() {
    const st = $<HTMLElement>('obs-status')
    const pill = $<HTMLElement>('obs-clients-pill')
    const url = overlayBrowserUrl()
    const { clients, ok } = await fetchOverlayStatus()
    if (!ok) {
      pill.textContent = 'offline'
      pill.classList.remove('on')
      st.textContent =
        'Could not reach overlay API — keep the Just The Tip dev server running'
      return
    }
    pill.textContent =
      clients === 0
        ? '0 watching'
        : clients === 1
          ? '1 watching'
          : `${clients} watching`
    pill.classList.toggle('on', clients > 0)
    st.textContent =
      clients > 0
        ? `OBS (or a preview tab) connected · tips will show live`
        : `No OBS yet · paste ${url} as Browser Source, or Open dark preview`
  }

  function saveStyle(): Promise<boolean> {
    const s = readStyle()
    host.setStyle(s)
    host.persist(s)
    refreshLookPreview()
    return pushOverlayStyle(s)
  }

  function readMenuStyle(): OverlayMenuStyle {
    const layoutEl = document.getElementById(
      'obs-menu-layout',
    ) as HTMLInputElement | null
    if (!layoutEl) {
      return normalizeOverlayMenuStyle(
        host.getMenuStyle() || defaultOverlayMenuStyle,
      )
    }
    const layout = (layoutEl.value || 'side') as OverlayMenuLayout
    return normalizeOverlayMenuStyle({
      layout,
      position: $<HTMLSelectElement>('obs-menu-position').value,
      size: $<HTMLSelectElement>('obs-menu-size').value,
      theme: $<HTMLSelectElement>('obs-menu-theme').value,
      opacity: Number($<HTMLInputElement>('obs-menu-opacity').value),
      maxRows: Number($<HTMLInputElement>('obs-menu-max-rows').value),
      headline: $<HTMLInputElement>('obs-menu-headline').value,
      brand: $<HTMLInputElement>('obs-menu-brand').value,
      featuredFirst: $<HTMLInputElement>('obs-menu-featured-first').checked,
      showNote: $<HTMLInputElement>('obs-menu-show-note').checked,
      showBlurb: $<HTMLInputElement>('obs-menu-show-blurb').checked,
    })
  }

  function writeMenuForm(s: OverlayMenuStyle) {
    const layoutEl = document.getElementById(
      'obs-menu-layout',
    ) as HTMLInputElement | null
    if (!layoutEl) return
    layoutEl.value = s.layout
    $<HTMLSelectElement>('obs-menu-position').value = s.position
    $<HTMLSelectElement>('obs-menu-size').value = s.size
    $<HTMLSelectElement>('obs-menu-theme').value = s.theme
    $<HTMLInputElement>('obs-menu-opacity').value = String(s.opacity)
    $<HTMLInputElement>('obs-menu-max-rows').value = String(s.maxRows)
    $<HTMLInputElement>('obs-menu-headline').value = s.headline
    $<HTMLInputElement>('obs-menu-brand').value = s.brand
    $<HTMLInputElement>('obs-menu-featured-first').checked = s.featuredFirst !== false
    $<HTMLInputElement>('obs-menu-show-note').checked = Boolean(s.showNote)
    $<HTMLInputElement>('obs-menu-show-blurb').checked = Boolean(s.showBlurb)
    const urlEl = document.getElementById(
      'obs-menu-url',
    ) as HTMLInputElement | null
    if (urlEl) urlEl.value = overlayMenuBrowserUrl()
  }

  function saveMenuStyle(): Promise<boolean> {
    const s = readMenuStyle()
    host.setMenuStyle(s)
    host.persistMenu(s)
    refreshMenuPreview()
    void pushOverlayLadder(liveMenuRows())
    return pushOverlayMenuStyle(s)
  }

  function readQr(): OverlayQr {
    const pos = document.getElementById('obs-qr-position') as HTMLSelectElement | null
    const live = {
      menuOffers: host.getMenuOffers(),
      menuSymbol: host.getChainSymbol(),
    }
    if (!pos) {
      return normalizeOverlayQr({
        ...defaultOverlayQr,
        ...host.getQr(),
        address: host.getReceiveAddress(),
        ...live,
      })
    }
    return normalizeOverlayQr({
      address: host.getReceiveAddress(),
      label: $<HTMLInputElement>('obs-qr-label').value,
      brand: $<HTMLInputElement>('obs-qr-brand').value,
      position: pos.value,
      size: $<HTMLSelectElement>('obs-qr-size').value,
      theme: $<HTMLSelectElement>('obs-qr-theme').value,
      showAddress: $<HTMLInputElement>('obs-qr-show-addr').checked,
      carousel: $<HTMLInputElement>('obs-qr-carousel').checked,
      dwellSec: Number($<HTMLInputElement>('obs-qr-dwell').value) || 7,
      slides: {
        qr: $<HTMLInputElement>('obs-qr-slide-qr').checked,
        brand: $<HTMLInputElement>('obs-qr-slide-brand').checked,
        menu: $<HTMLInputElement>('obs-qr-slide-menu').checked,
        eco: $<HTMLInputElement>('obs-qr-slide-eco').checked,
        how: $<HTMLInputElement>('obs-qr-slide-how').checked,
        pack: readPackFlags(),
      },
      slideHtml: host.getQr().slideHtml || {},
      customCss: $<HTMLTextAreaElement>('obs-qr-custom-css').value,
      ...live,
    })
  }

  function openSlideEditor(key: string) {
    const editor = document.getElementById('obs-qr-slide-editor')
    const keyEl = document.getElementById(
      'obs-qr-edit-key',
    ) as HTMLInputElement | null
    const ta = document.getElementById(
      'obs-qr-slide-html',
    ) as HTMLTextAreaElement | null
    const sum = document.getElementById('obs-qr-slide-editor-summary')
    const label = document.getElementById('obs-qr-slide-html-label')
    const st = document.getElementById('obs-qr-slide-edit-status')
    if (!editor || !keyEl || !ta) return
    const title =
      pulsePackStreamQrItems().find((it) => `pack:${it.id}` === key)?.label ||
      overlayQrSlideTitle(key)
    keyEl.value = key
    const stored = (host.getQr().slideHtml || {})[key]
    ta.value = stored?.trim() ? stored : overlayQrSlideStarter(key)
    if (sum) sum.textContent = `Edit HTML · ${title}`
    if (label) label.textContent = `${title} HTML`
    if (st) {
      st.textContent = stored?.trim()
        ? 'Custom HTML loaded — Save to keep edits'
        : 'Starter template shown — Save to use it (or Reset for built-in)'
    }
    editor.hidden = false
    editor.setAttribute('open', '')
    ta.focus()
  }

  function closeSlideEditor() {
    const editor = document.getElementById('obs-qr-slide-editor')
    const keyEl = document.getElementById(
      'obs-qr-edit-key',
    ) as HTMLInputElement | null
    if (keyEl) keyEl.value = ''
    if (editor) {
      editor.hidden = true
      editor.removeAttribute('open')
    }
  }

  function markSlideEditButtons() {
    const map = host.getQr().slideHtml || {}
    document.querySelectorAll<HTMLButtonElement>('[data-slide-edit]').forEach((btn) => {
      const k = btn.getAttribute('data-slide-edit') || ''
      btn.classList.toggle('is-custom', Boolean(map[k]?.trim()))
      btn.title = map[k]?.trim()
        ? 'Custom HTML set — click to edit'
        : 'Edit HTML for this slide'
    })
  }

  async function saveSlideHtmlFromEditor() {
    const keyEl = document.getElementById(
      'obs-qr-edit-key',
    ) as HTMLInputElement | null
    const ta = document.getElementById(
      'obs-qr-slide-html',
    ) as HTMLTextAreaElement | null
    const key = keyEl?.value?.trim()
    if (!key || !ta) return
    const map = { ...(host.getQr().slideHtml || {}) }
    const html = ta.value.trim()
    if (html) map[key] = html
    else delete map[key]
    const base = readQr()
    const q = normalizeOverlayQr({ ...base, slideHtml: map })
    host.setQr(q)
    host.persistQr(q)
    const pushed = await pushOverlayQr({
      ...q,
      menuOffers: host.getMenuOffers(),
      menuSymbol: host.getChainSymbol(),
    })
    markSlideEditButtons()
    const st = document.getElementById('obs-qr-slide-edit-status')
    if (st) {
      st.textContent = !pushed
        ? 'Could not push to hub'
        : html
          ? 'Saved — open dark preview to check the slide'
          : 'Built-in layout restored for this slide'
    }
  }

  async function resetSlideHtml() {
    const keyEl = document.getElementById(
      'obs-qr-edit-key',
    ) as HTMLInputElement | null
    const ta = document.getElementById(
      'obs-qr-slide-html',
    ) as HTMLTextAreaElement | null
    const key = keyEl?.value?.trim()
    if (!key) return
    const map = { ...(host.getQr().slideHtml || {}) }
    delete map[key]
    const base = readQr()
    const q = normalizeOverlayQr({ ...base, slideHtml: map })
    host.setQr(q)
    host.persistQr(q)
    if (ta) ta.value = overlayQrSlideStarter(key)
    await pushOverlayQr({
      ...q,
      menuOffers: host.getMenuOffers(),
      menuSymbol: host.getChainSymbol(),
    })
    markSlideEditButtons()
    const st = document.getElementById('obs-qr-slide-edit-status')
    if (st) st.textContent = 'Back to built-in layout for this slide'
  }

  function readPackFlags(): Record<string, boolean> {
    const pack = defaultPulsePackQrFlags()
    for (const it of pulsePackStreamQrItems()) {
      const el = document.getElementById(
        `obs-qr-pack-${it.id}`,
      ) as HTMLInputElement | null
      if (el) pack[it.id] = el.checked
    }
    return pack
  }

  function qrForHub(q?: OverlayQr): OverlayQr {
    return normalizeOverlayQr({
      ...(q || host.getQr()),
      address: host.getReceiveAddress(),
      menuOffers: host.getMenuOffers(),
      menuSymbol: host.getChainSymbol(),
    })
  }

  /** Push the current QR config plus the latest live menu offers to OBS. */
  async function pushQrToHub(q?: OverlayQr): Promise<boolean> {
    return pushOverlayQr(qrForHub(q))
  }

  function persistQrState(q: OverlayQr) {
    const stored = normalizeOverlayQr({
      ...q,
      address: host.getReceiveAddress(),
      menuOffers: [],
    })
    host.setQr(stored)
    host.persistQr(stored)
    return stored
  }

  function setQrEnabledPill(on: boolean) {
    const pill = document.getElementById(
      'obs-qr-enabled-pill',
    ) as HTMLButtonElement | null
    if (!pill) return
    pill.textContent = on ? 'ON' : 'OFF'
    pill.classList.toggle('on', on)
    pill.classList.toggle('off', !on)
    pill.setAttribute('aria-pressed', on ? 'true' : 'false')
    pill.title = on ? 'Turn QR carousel off' : 'Turn QR carousel on'
  }

  /** False until paint() copies saved ticks into the checkboxes. */
  let qrFormHydrated = false

  function writeQrForm(q: OverlayQr) {
    const addr = host.getReceiveAddress().trim()
    $<HTMLInputElement>('obs-qr-url').value = overlayQrBrowserUrl()
    $<HTMLInputElement>('obs-qr-label').value = q.label || defaultOverlayQr.label
    $<HTMLInputElement>('obs-qr-brand').value = q.brand || ''
    $<HTMLSelectElement>('obs-qr-position').value = q.position
    $<HTMLSelectElement>('obs-qr-size').value = q.size
    $<HTMLSelectElement>('obs-qr-theme').value = q.theme
    $<HTMLInputElement>('obs-qr-show-addr').checked = q.showAddress !== false
    $<HTMLInputElement>('obs-qr-carousel').checked = q.carousel !== false
    $<HTMLInputElement>('obs-qr-dwell').value = String(q.dwellSec || 7)
    const slides = q.slides || defaultOverlayQr.slides
    $<HTMLInputElement>('obs-qr-slide-qr').checked = slides.qr !== false
    $<HTMLInputElement>('obs-qr-slide-brand').checked = slides.brand !== false
    $<HTMLInputElement>('obs-qr-slide-menu').checked = slides.menu !== false
    $<HTMLInputElement>('obs-qr-slide-eco').checked = slides.eco !== false
    $<HTMLInputElement>('obs-qr-slide-how').checked = slides.how !== false
    const pack = slides.pack || defaultPulsePackQrFlags()
    for (const it of pulsePackStreamQrItems()) {
      const el = document.getElementById(
        `obs-qr-pack-${it.id}`,
      ) as HTMLInputElement | null
      if (el) el.checked = pack[it.id] === true
    }
    $<HTMLTextAreaElement>('obs-qr-custom-css').value = q.customCss || ''
    markSlideEditButtons()
    setQrEnabledPill(q.enabled)
    const hint = document.getElementById('obs-qr-addr-hint')
    if (hint) {
      const n = (q.menuOffers || host.getMenuOffers()).length
      const addrBit = addr
        ? `Encoding receive wallet ${addr.slice(0, 8)}…${addr.slice(-4)}`
        : 'No receive wallet set yet — add one on Home.'
      hint.textContent =
        n > 0
          ? `${addrBit} · tip menu carousel has ${n} pattern${n === 1 ? '' : 's'}`
          : slides.menu !== false
            ? `${addrBit} · Tip menu is on but no patterns yet — enable toys/patterns on Tip menu`
            : `${addrBit} · tick Tip QR or a pack website link below`
    }
    qrFormHydrated = true
  }

  async function syncQr(): Promise<void> {
    const q = persistQrState(qrFormHydrated ? readQr() : host.getQr())
    const pushed = await pushQrToHub(q)
    setQrEnabledPill(q.enabled)
    const st = document.getElementById('obs-qr-status')
    if (st) {
      if (!pushed) {
        st.textContent = 'Could not push QR to hub'
      } else if (!q.carousel) {
        st.textContent = 'QR overlay off for OBS — turn QR carousel on to show it'
      } else if (!q.enabled) {
        st.textContent =
          'Hidden in OBS — tick at least one slide or pack QR below'
      } else if (!q.address.trim()) {
        st.textContent =
          'On, but tip QR needs a receive address in Settings (other slides still rotate)'
      } else {
        st.textContent =
          'On for OBS · open dark preview to watch the rotation'
      }
    }
  }

  async function syncQrFromForm(): Promise<void> {
    qrFormHydrated = true
    const q = persistQrState(readQr())
    const pushed = await pushQrToHub(q)
    setQrEnabledPill(q.enabled)
    const st = document.getElementById('obs-qr-status')
    if (st) {
      if (!pushed) {
        st.textContent = 'Could not push QR to hub'
      } else if (!q.carousel) {
        st.textContent = 'QR overlay off for OBS — turn QR carousel on to show it'
      } else if (!q.enabled) {
        st.textContent =
          'Hidden in OBS — tick at least one slide or pack QR below'
      } else if (!q.address.trim()) {
        st.textContent =
          'On, but tip QR needs a receive address in Settings (other slides still rotate)'
      } else {
        st.textContent =
          'On for OBS · open dark preview to watch the rotation'
      }
    }
  }

  function paint() {
    const s = normalizeOverlayStyle(host.getStyle() || defaultOverlayStyle)
    host.setStyle(s)
    $<HTMLInputElement>('obs-overlay-url').value = overlayBrowserUrl()
    writeForm(s)
    void pushOverlayStyle(s)
    qrFormHydrated = false
    const q = normalizeOverlayQr({
      ...defaultOverlayQr,
      ...host.getQr(),
      address: host.getReceiveAddress(),
    })
    writeQrForm(q)
    void pushQrToHub(q)
    const menu = normalizeOverlayMenuStyle(
      host.getMenuStyle() || defaultOverlayMenuStyle,
    )
    writeMenuForm(menu)
    void pushOverlayMenuStyle(menu)
    void pushOverlayLadder(liveMenuRows())
    void refreshStatus()
    refreshLookPreview()
    refreshMenuPreview()
  }

  function syncHub() {
    void pushOverlayStyle(
      normalizeOverlayStyle(host.getStyle() || defaultOverlayStyle),
    )
    const q = qrFormHydrated && host.isPageActive() ? readQr() : host.getQr()
    void pushQrToHub(q)
    void pushOverlayMenuStyle(
      normalizeOverlayMenuStyle(
        host.getMenuStyle() || defaultOverlayMenuStyle,
      ),
    )
    void pushOverlayLadder(liveMenuRows())
  }

  async function notify(tip: OverlayTipPayload) {
    const r = await publishOverlayTipDetailed(tip)
    return r.ok && !r.filtered
  }

  function onTemplateChange() {
    if (currentMode() !== 'template') return
    const sel = document.getElementById(
      'obs-template',
    ) as HTMLSelectElement | null
    const t = getOverlayTemplate(sel?.value || '')
    if (!t) return
    applyTemplateToForm(t)
    updateTemplateBlurb()
    void saveStyle()
    $<HTMLElement>('obs-status').textContent =
      `Switched to “${t.name}” · preview updated above`
  }

  function brandingStatus(msg: string) {
    const st = document.getElementById('obs-branding-status')
    if (st) st.textContent = msg
  }

  function openBrandingModal() {
    const modal = document.getElementById('obs-branding-modal')
    if (!modal) return
    modal.hidden = false
    brandingStatus('')
    document.getElementById('btn-obs-branding-close')?.focus()
  }

  function closeBrandingModal() {
    const modal = document.getElementById('obs-branding-modal')
    if (modal) modal.hidden = true
  }

  document
    .getElementById('btn-obs-branding')
    ?.addEventListener('click', () => openBrandingModal())
  document
    .getElementById('btn-obs-branding-close')
    ?.addEventListener('click', () => closeBrandingModal())
  const brandingBackdrop = document.getElementById('obs-branding-modal')
  if (brandingBackdrop) {
    onBackdropDismiss(brandingBackdrop, closeBrandingModal)
  }

  document
    .getElementById('btn-obs-branding-eco-on')
    ?.addEventListener('click', () => {
      const el = document.getElementById(
        'obs-show-eco',
      ) as HTMLInputElement | null
      if (el) {
        el.checked = true
        void saveStyle()
      }
      brandingStatus(
        'On. Copy OBS URL on the main page, then Send test tip to confirm.',
      )
    })

  $('btn-obs-copy').addEventListener('click', async () => {
    const url = overlayBrowserUrl()
    const st = $<HTMLElement>('obs-status')
    const ok = await copyTextToClipboard(url)
    if (ok) {
      st.textContent = 'Copied OBS URL (transparent background)'
      return
    }
    $<HTMLInputElement>('obs-overlay-url').select()
    st.textContent = 'Select the URL and copy (Ctrl+C)'
  })

  $('btn-obs-open').addEventListener('click', () => {
    openOverlayPreview(overlayPreviewUrl())
    window.setTimeout(() => void refreshStatus(), 600)
    $<HTMLElement>('obs-status').textContent =
      'Dark preview opened — Send test tip; OBS should still use the transparent URL'
  })

  function flashLookPreviews(parts: {
    title: string
    subtitle?: string
    eyebrow: string
    amount: number
    symbol: string
    source: string
  }) {
    const style = readStyle()
    const tipParts = {
      title: parts.title,
      subtitle: parts.subtitle || '',
      eyebrow: parts.eyebrow,
      brand: String(style.brand || '').trim(),
      amount: parts.amount,
      symbol: parts.symbol,
      source: parts.source,
    }
    lookPreview?.flash(style, tipParts)
    boardPreview?.flash(style, tipParts)
  }

  async function publishOperatorTest(
    tip: OverlayTipPayload,
    opts: { eyebrow: string },
  ) {
    let r = await publishOverlayTipDetailed({ ...tip, force: true })
    if (r.ok && !r.filtered && r.clients === 0) {
      openOverlayPreview(overlayPreviewUrl())
      await new Promise((resolve) => window.setTimeout(resolve, 900))
      r = await publishOverlayTipDetailed({ ...tip, force: true })
    }
    if (r.ok && !r.filtered) {
      flashLookPreviews({
        title: tip.title || `${tip.amount} ${tip.symbol}`,
        subtitle: tip.subtitle,
        eyebrow: opts.eyebrow,
        amount: tip.amount,
        symbol: tip.symbol,
        source: tip.source || 'test',
      })
    }
    return r
  }

  $('btn-obs-test').addEventListener('click', () => {
    void (async () => {
      const st = $<HTMLElement>('obs-status')
      st.textContent = 'Sending test tip…'
      await saveStyle()
      const style = host.getStyle()
      const symbol = host.getChainSymbol()
      const r = await publishOperatorTest(
        {
          id: `test-${Date.now()}`,
          amount: 1000,
          symbol,
          title: `1,000 ${symbol}`,
          subtitle: style?.showPattern ? 'Test alert · stream tip' : undefined,
          source: 'test',
          dryRun: false,
          usd: 8,
          force: true,
        },
        { eyebrow: 'Test tip' },
      )
      if (!r.ok) {
        st.textContent = r.error
          ? `Test tip failed: ${r.error}`
          : 'Test tip failed — is the server running?'
      } else if (r.filtered) {
        st.textContent =
          'Filtered (min amount?) — lower min amount or check Look filters'
      } else if (r.clients === 0) {
        st.textContent =
          'Tip sent · preview opened — if you still see nothing, check the dark preview window'
      } else {
        st.textContent = `Test tip sent · ${r.clients} watching`
      }
      void refreshStatus()
    })()
  })

  $('btn-obs-test-pool').addEventListener('click', () => {
    void (async () => {
      const st = $<HTMLElement>('obs-status')
      st.textContent = 'Sending test pool swap…'
      await saveStyle()
      const style = host.getStyle()
      const r = await publishOperatorTest(
        {
          id: `pool-test-${Date.now()}`,
          amount: 2500,
          symbol: 'WPLS',
          title: '2,500 WPLS',
          subtitle: style?.showPoolLabel
            ? 'PulseX · test pool swap'
            : 'Test pool swap',
          source: 'pool',
          eventKind: 'swap',
          dryRun: false,
          usd: 12,
          force: true,
        },
        { eyebrow: 'Test pool swap' },
      )
      if (!r.ok) {
        st.textContent = r.error
          ? `Test pool swap failed: ${r.error}`
          : 'Test pool swap failed — is the server running?'
      } else if (r.filtered) {
        st.textContent =
          'Filtered — tick “Show pool / chain event alerts” and lower the chain event alert minimum'
      } else if (r.clients === 0) {
        st.textContent =
          'Pool test sent · preview opened — check the dark preview window'
      } else {
        st.textContent = `Test pool swap sent · ${r.clients} watching`
      }
      void refreshStatus()
    })()
  })

  document.getElementById('btn-obs-qr-copy')?.addEventListener('click', async () => {
    const url = overlayQrBrowserUrl()
    const st = document.getElementById('obs-qr-status')
    const ok = await copyTextToClipboard(url)
    if (ok) {
      if (st) st.textContent = 'Copied QR OBS URL'
      return
    }
    $<HTMLInputElement>('obs-qr-url').select()
    if (st) st.textContent = 'Select the QR URL and copy (Ctrl+C)'
  })

  document.getElementById('btn-obs-qr-open')?.addEventListener('click', () => {
    void (host.isPageActive() ? syncQr() : pushQrToHub()).then(() => {
      openOverlayPreview(overlayQrPreviewUrl())
      const st = document.getElementById('obs-qr-status')
      if (st) {
        st.textContent =
          'Dark QR preview opened — OBS uses the URL without ?preview'
      }
    })
  })

  document.getElementById('btn-obs-menu-copy')?.addEventListener('click', async () => {
    const url = overlayMenuBrowserUrl()
    const st = document.getElementById('obs-menu-status')
    const ok = await copyTextToClipboard(url)
    if (ok) {
      if (st) st.textContent = 'Copied tip menu OBS URL (transparent background)'
      return
    }
    const input = document.getElementById(
      'obs-menu-url',
    ) as HTMLInputElement | null
    input?.select()
    if (st) st.textContent = 'Select the URL and copy (Ctrl+C)'
  })

  document.getElementById('btn-obs-menu-open')?.addEventListener('click', () => {
    void saveMenuStyle().then(() => {
      openOverlayPreview(overlayMenuPreviewUrl())
      const st = document.getElementById('obs-menu-status')
      if (st) {
        st.textContent =
          'Dark tip menu preview opened — OBS uses the URL without ?preview'
      }
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-menu-layout]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-menu-layout') || 'side'
      const hidden = document.getElementById(
        'obs-menu-layout',
      ) as HTMLInputElement | null
      if (hidden) hidden.value = id
      void saveMenuStyle()
      const st = document.getElementById('obs-menu-status')
      if (st) st.textContent = 'Layout updated — OBS follows without a reload'
    })
  })

  document.getElementById('obs-qr-enabled-pill')?.addEventListener('click', () => {
    const toggle = document.getElementById(
      'obs-qr-carousel',
    ) as HTMLInputElement | null
    if (!toggle) return
    toggle.checked = !toggle.checked
    void syncQrFromForm()
  })

  document.querySelectorAll<HTMLElement>('.obs-look-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = (btn.dataset.lookMode === 'template' ? 'template' : 'builtin') as LookMode
      selectLookMode(mode)
    })
  })
  document
    .getElementById('obs-template')
    ?.addEventListener('change', onTemplateChange)

  for (const id of FORM_IDS) {
    const el = document.getElementById(id)
    el?.addEventListener('change', () => {
      if (
        (id === 'obs-custom-html' || id === 'obs-custom-css') &&
        currentMode() === 'builtin'
      ) {
        selectLookMode('template')
        return
      }
      void saveStyle()
    })
    el?.addEventListener('input', () => {
      if (
        id === 'obs-eyebrow' ||
        id === 'obs-brand' ||
        id === 'obs-custom-html' ||
        id === 'obs-custom-css'
      ) {
        window.clearTimeout((el as HTMLElement & { _t?: number })._t)
        ;(el as HTMLElement & { _t?: number })._t = window.setTimeout(() => {
          if (
            (id === 'obs-custom-html' || id === 'obs-custom-css') &&
            currentMode() === 'builtin' &&
            ($<HTMLTextAreaElement>('obs-custom-html').value.trim() ||
              $<HTMLTextAreaElement>('obs-custom-css').value.trim())
          ) {
            setModeUi('template')
          }
          void saveStyle()
        }, 400)
      }
    })
  }

  const MENU_IDS = [
    'obs-menu-position',
    'obs-menu-size',
    'obs-menu-theme',
    'obs-menu-opacity',
    'obs-menu-max-rows',
    'obs-menu-headline',
    'obs-menu-brand',
    'obs-menu-featured-first',
    'obs-menu-show-note',
    'obs-menu-show-blurb',
  ] as const
  for (const id of MENU_IDS) {
    const el = document.getElementById(id)
    el?.addEventListener('change', () => void saveMenuStyle())
    el?.addEventListener('input', () => {
      window.clearTimeout((el as HTMLElement & { _t?: number })._t)
      ;(el as HTMLElement & { _t?: number })._t = window.setTimeout(
        () => void saveMenuStyle(),
        400,
      )
    })
  }

  const QR_IDS = [
    'obs-qr-label',
    'obs-qr-brand',
    'obs-qr-position',
    'obs-qr-size',
    'obs-qr-theme',
    'obs-qr-show-addr',
    'obs-qr-carousel',
    'obs-qr-dwell',
    'obs-qr-slide-qr',
    'obs-qr-slide-brand',
    'obs-qr-slide-menu',
    'obs-qr-slide-eco',
    'obs-qr-slide-how',
    'obs-qr-custom-css',
    ...pulsePackStreamQrItems().map((it) => `obs-qr-pack-${it.id}`),
  ] as const
  for (const id of QR_IDS) {
    const el = document.getElementById(id)
    el?.addEventListener('change', () => void syncQrFromForm())
    el?.addEventListener('input', () => {
      window.clearTimeout((el as HTMLElement & { _t?: number })._t)
      ;(el as HTMLElement & { _t?: number })._t = window.setTimeout(
        () => void syncQrFromForm(),
        400,
      )
    })
  }

  document.querySelectorAll<HTMLButtonElement>('[data-slide-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-slide-edit')
      if (key) openSlideEditor(key)
    })
  })

  document
    .getElementById('btn-obs-qr-slide-save')
    ?.addEventListener('click', () => {
      void saveSlideHtmlFromEditor()
    })

  document
    .getElementById('btn-obs-qr-slide-reset')
    ?.addEventListener('click', () => {
      void resetSlideHtml()
    })

  document
    .getElementById('btn-obs-qr-slide-close')
    ?.addEventListener('click', () => closeSlideEditor())

  const poll = window.setInterval(() => {
    if (host.isPageActive()) void refreshStatus()
  }, 4000)

  syncHub()

  return {
    paint,
    readStyle,
    saveStyle,
    syncQr,
    readQr,
    readMenuStyle,
    saveMenuStyle,
    syncHub,
    notify,
    dispose: () => {
      window.clearInterval(poll)
      closeBrandingModal()
    },
  }
}
