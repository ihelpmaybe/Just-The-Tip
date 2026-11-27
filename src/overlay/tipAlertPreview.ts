/**
 * Inline tip-alert preview for the Stream tip alert Look panel.
 * Isolated via Shadow DOM so template CSS cannot restyle the app chrome.
 */
import { ecosystemLogosHtml } from './ecosystem'
import type { OverlayStyle } from './style'
import type { OverlayMenuStyle } from './menuStyle'
import { defaultOverlayMenuStyle } from './menuStyle'
import {
  OVERLAY_MENU_CSS,
  overlayMenuPanelHtml,
  overlayMenuStageClass,
} from './menuRender'
import type { OverlayLadderRow } from './stage'
import type { OverlayQrTheme } from './qrState'
import { cohesiveMenuTheme } from './lookCohesion'

export type TipAlertParts = {
  title: string
  subtitle: string
  eyebrow: string
  brand: string
  amount: string | number
  symbol: string
  source: string
}

export type LookPreviewScene = {
  menuStyle?: OverlayMenuStyle
  menuRows?: OverlayLadderRow[]
  qrTheme?: OverlayQrTheme
  qrLabel?: string
  qrBrand?: string
  templateId?: string
}

const SAMPLE_MENU_ROWS: OverlayLadderRow[] = [
  {
    name: 'Spark',
    amountLabel: '10 PLS',
    amount: 10,
    timeSec: 4,
    sellPitch: '4s · spark',
    featured: true,
    strengths: [2, 6, 2],
  },
  {
    name: 'Wave',
    amountLabel: '25 PLS',
    amount: 25,
    timeSec: 8,
    sellPitch: '8s · wave',
    strengths: [1, 4, 7, 4, 1],
  },
  {
    name: 'Pulse',
    amountLabel: '50 PLS',
    amount: 50,
    timeSec: 12,
    sellPitch: '12s · pulse',
    strengths: [8, 0, 8, 0, 8],
  },
]

const PREVIEW_BASE_CSS = `
:host { display: block; }
* { box-sizing: border-box; }
.stage {
  position: relative;
  min-height: 18.5rem;
  aspect-ratio: 16 / 9;
  max-height: 24rem;
  padding: 0.7rem;
  border-radius: calc(var(--radius, 14px) - 2px);
  border: 1px solid rgba(0, 200, 255, 0.18);
  background:
    radial-gradient(80% 70% at 20% 0%, rgba(0, 160, 255, 0.12), transparent 55%),
    #0a0e14;
  overflow: hidden;
}
.stage.is-thumb {
  min-height: 5.6rem;
  aspect-ratio: auto;
  max-height: none;
  padding: 0.4rem 0.45rem;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.slot-alert {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0.7rem 7.2rem 0.7rem 8.4rem;
  pointer-events: none;
  z-index: 2;
}
.stage.pos-top .slot-alert { align-items: flex-start; }
.stage.pos-bottom-left .slot-alert,
.stage.pos-top-left .slot-alert { justify-content: flex-start; padding-left: 8.4rem; padding-right: 7.2rem; }
.stage.pos-bottom-right .slot-alert,
.stage.pos-top-right .slot-alert { justify-content: flex-end; }
.stage.is-thumb .slot-alert {
  position: relative;
  inset: auto;
  padding: 0;
  z-index: 1;
}
.slot-menu {
  position: absolute;
  left: 0.45rem;
  top: 0.45rem;
  width: min(42%, 11.2rem);
  z-index: 3;
  pointer-events: none;
  transform: scale(0.84);
  transform-origin: top left;
}
.stage.is-thumb .slot-menu,
.stage.is-thumb .slot-qr { display: none; }
.stage.is-thumb .alert {
  zoom: 0.72;
  max-width: 100%;
}
.slot-menu .menu-stage {
  position: relative;
  inset: auto;
  padding: 0;
  width: 100%;
  height: auto;
  display: block;
}
.slot-menu .menu-panel { max-width: 100%; }
.slot-qr {
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  width: min(30%, 7.8rem);
  z-index: 3;
  pointer-events: none;
}
.qr-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.28rem;
  padding: 0.42rem 0.4rem 0.38rem;
  border-radius: 10px;
  text-align: center;
  font-family: "Segoe UI", system-ui, sans-serif;
}
.qr-card.theme-pulse {
  background: linear-gradient(160deg, rgba(8,18,32,0.92), rgba(18,8,28,0.9));
  border: 1px solid rgba(0, 200, 255, 0.4);
  color: #e8f8ff;
}
.qr-card.theme-dark {
  background: rgba(8, 12, 18, 0.88);
  border: 1px solid rgba(255,255,255,0.12);
  color: #e8f0f8;
}
.qr-card.theme-light {
  background: rgba(244, 248, 252, 0.94);
  border: 1px solid rgba(20, 40, 70, 0.16);
  color: #102030;
}
.qr-card.look-cyan { --look-accent: #7ad7ff; }
.qr-card.look-pink { --look-accent: #ff9ad4; }
.qr-card.look-gold { --look-accent: #f0c36a; }
.qr-card.look-soft { --look-accent: #c8d4e4; }
.qr-card.look-cyan,
.qr-card.look-pink,
.qr-card.look-gold,
.qr-card.look-soft {
  border-color: color-mix(in srgb, var(--look-accent) 60%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--look-accent) 22%, transparent);
}
.qr-label {
  font-size: 0.48rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--look-accent, #7ad7ff);
}
.qr-fake {
  width: 3.6rem;
  height: 3.6rem;
  border-radius: 6px;
  background:
    linear-gradient(#111 1px, transparent 1px) 0 0 / 20% 20%,
    linear-gradient(90deg, #111 1px, transparent 1px) 0 0 / 20% 20%,
    #fff;
  box-shadow: inset 0 0 0 3px #fff;
}
.qr-card.theme-light .qr-fake {
  background:
    linear-gradient(#111 1px, transparent 1px) 0 0 / 20% 20%,
    linear-gradient(90deg, #111 1px, transparent 1px) 0 0 / 20% 20%,
    #fff;
}
.qr-brand {
  font-size: 0.52rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  opacity: 0.88;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.alert {
  --accent: #6ec8ff;
  --glow: rgba(0, 180, 255, 0.35);
  position: relative;
  max-width: min(22rem, 94%);
  padding: 0.85rem 1.05rem 0.95rem;
  border-radius: 14px;
  color: #f2f8ff;
  font-family: "Segoe UI", system-ui, sans-serif;
  background: color-mix(in srgb, #0c1828 82%, var(--accent));
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent),
    0 14px 36px rgba(0, 20, 50, 0.55),
    0 0 28px var(--glow);
  transform-origin: 50% 100%;
}
.alert.is-flash {
  animation: tip-preview-flash 0.85s ease;
}
@keyframes tip-preview-flash {
  0% { transform: translateY(10px) scale(0.96); opacity: 0.4; filter: brightness(1.35); }
  40% { transform: translateY(0) scale(1.02); opacity: 1; filter: brightness(1.12); }
  100% { transform: translateY(0) scale(1); opacity: 1; filter: none; }
}
.alert.theme-cyan { --accent: #6ec8ff; --glow: rgba(0, 180, 255, 0.35); }
.alert.theme-pink { --accent: #ff7ab8; --glow: rgba(255, 90, 160, 0.32); }
.alert.theme-gold { --accent: #f0c75a; --glow: rgba(230, 180, 40, 0.28); }
.alert.theme-soft {
  --accent: #b8c8d8;
  --glow: rgba(160, 180, 200, 0.2);
  background: rgba(18, 24, 34, 0.92);
}
.alert.theme-custom {
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  max-width: min(26rem, 96%);
}
.alert.size-compact {
  padding: 0.55rem 0.75rem 0.65rem;
  max-width: min(16rem, 90%);
  border-radius: 12px;
}
.alert.size-compact .title { font-size: clamp(1.05rem, 3.5vw, 1.35rem); }
.alert.size-compact .sub { font-size: 0.78rem; }
.alert.size-compact .eyebrow { font-size: 0.58rem; }
.alert.size-large {
  padding: 1.2rem 1.45rem 1.3rem;
  max-width: min(30rem, 98%);
}
.alert.size-large .title { font-size: clamp(1.7rem, 5vw, 2.45rem); }
.alert.size-large .sub { font-size: 1.05rem; }
.alert.size-large .eyebrow { font-size: 0.78rem; }
.alert.size-large .brand { font-size: 0.85rem; }
.alert.theme-custom.size-compact,
.alert.theme-custom.size-normal,
.alert.theme-custom.size-large {
  padding: 0;
  border-radius: 0;
}
.alert.theme-custom.size-compact { zoom: 0.82; max-width: min(22rem, 92%); }
.alert.theme-custom.size-normal { zoom: 1; }
.alert.theme-custom.size-large { zoom: 1.28; max-width: min(30rem, 98%); }
.brand {
  font-size: 0.72rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--accent) 85%, #fff);
  margin-bottom: 0.15rem;
  letter-spacing: 0.04em;
}
.eyebrow {
  font-size: 0.66rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 700;
  margin-bottom: 0.28rem;
}
.title {
  font-size: clamp(1.25rem, 4vw, 1.75rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
}
.sub {
  margin-top: 0.3rem;
  font-size: 0.88rem;
  color: #b8d8f0;
  font-weight: 600;
}
.eco {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.55rem;
  margin-top: 0.6rem;
  padding-top: 0.5rem;
  border-top: 1px solid color-mix(in srgb, var(--accent, #6ec8ff) 28%, transparent);
}
.theme-custom .eco {
  margin: 0.5rem 0.2rem 0;
  padding: 0.45rem 0.3rem 0;
  border-top-color: rgba(255,255,255,0.14);
}
.eco-item { display: inline-flex; align-items: center; gap: 0.25rem; }
.eco-img {
  display: block;
  width: 1.2rem;
  height: 1.2rem;
  object-fit: contain;
}
.eco-label {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--accent, #9ec8e8) 70%, #c8d8e8);
}
.size-compact .eco-label { display: none; }
`

function esc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function ecoBlock(showEco: boolean): string {
  if (!showEco) return ''
  return ecosystemLogosHtml(20)
}

export function defaultTipAlertInner(
  parts: TipAlertParts,
  showEco: boolean,
): string {
  let h = ''
  if (parts.brand) h += `<div class="brand">${esc(parts.brand)}</div>`
  h += `<div class="eyebrow">${esc(parts.eyebrow)}</div>`
  h += `<div class="title">${esc(parts.title)}</div>`
  if (parts.subtitle) h += `<div class="sub">${esc(parts.subtitle)}</div>`
  h += ecoBlock(showEco)
  return h
}

export function fillTipAlertTemplate(
  tpl: string,
  parts: TipAlertParts,
  showEco: boolean,
): string {
  const eco = ecoBlock(showEco)
  let out = String(tpl)
    .replace(/\{\{title\}\}/g, esc(parts.title))
    .replace(/\{\{subtitle\}\}/g, esc(parts.subtitle))
    .replace(/\{\{eyebrow\}\}/g, esc(parts.eyebrow))
    .replace(/\{\{brand\}\}/g, esc(parts.brand))
    .replace(/\{\{amount\}\}/g, esc(parts.amount))
    .replace(/\{\{symbol\}\}/g, esc(parts.symbol))
    .replace(/\{\{source\}\}/g, esc(parts.source))
    .replace(/\{\{eco\}\}/g, eco)
  if (showEco && !out.includes('class="eco"')) out += eco
  return out
}

export function tipAlertPartsFromStyle(
  style: OverlayStyle,
  opts?: { amount?: number; symbol?: string },
): TipAlertParts {
  const amount = opts?.amount ?? 1000
  const symbol = opts?.symbol || 'PLS'
  const title = `${amount.toLocaleString(undefined, {
    maximumFractionDigits: 4,
  })} ${symbol}`
  const eyebrow = String(style.eyebrow || 'Tip').trim() || 'Tip'
  return {
    title,
    subtitle: style.showPattern ? 'Sample tip · live preview' : '',
    eyebrow,
    brand: String(style.brand || '').trim(),
    amount,
    symbol,
    source: 'test',
  }
}

export function renderTipAlertMarkup(
  style: OverlayStyle,
  parts: TipAlertParts,
): { innerHtml: string; theme: string; size: string; position: string } {
  const custom = String(style.customHtml || '').trim()
  const showEco = style.showEco !== false
  const innerHtml = custom
    ? fillTipAlertTemplate(custom, parts, showEco)
    : defaultTipAlertInner(parts, showEco)
  const theme = custom
    ? 'custom'
    : style.theme === 'pink' ||
        style.theme === 'gold' ||
        style.theme === 'soft'
      ? style.theme
      : 'cyan'
  return {
    innerHtml,
    theme,
    size: style.size || 'normal',
    position: style.position || 'bottom',
  }
}

export type LookPreviewHandle = {
  refresh: (
    style: OverlayStyle,
    symbol?: string,
    scene?: LookPreviewScene,
  ) => void
  /** Play a one-shot tip animation in the inline preview (Send test tip). */
  flash: (style: OverlayStyle, parts: TipAlertParts) => void
}

function sampleMenuRows(symbol: string): OverlayLadderRow[] {
  return SAMPLE_MENU_ROWS.map((row) => ({
    ...row,
    amountLabel: `${row.amount} ${symbol}`,
  }))
}

function paintQrCard(
  el: HTMLElement,
  style: OverlayStyle,
  scene: LookPreviewScene | undefined,
  look: ReturnType<typeof cohesiveMenuTheme>,
) {
  const theme = scene?.qrTheme || 'pulse'
  const label =
    String(scene?.qrLabel || 'Tip on PulseChain').trim() || 'Tip on PulseChain'
  const brand =
    String(scene?.qrBrand || style.brand || 'Scan to send').trim() ||
    'Scan to send'
  el.className = `qr-card theme-${theme} look-${look}`
  el.innerHTML =
    `<div class="qr-label">${esc(label)}</div>` +
    `<div class="qr-fake" aria-hidden="true"></div>` +
    `<div class="qr-brand">${esc(brand)}</div>`
}

function mountFrame(
  host: HTMLElement,
  opts: { thumb?: boolean },
): LookPreviewHandle {
  const thumb = Boolean(opts.thumb)
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = `
    <style id="base">${PREVIEW_BASE_CSS}${thumb ? '' : OVERLAY_MENU_CSS}</style>
    <style id="user"></style>
    <div class="stage${thumb ? ' is-thumb' : ''} pos-bottom" id="stage">
      ${thumb ? '' : '<div class="slot-menu" id="menu-slot"></div>'}
      <div class="slot-alert">
        <div class="alert theme-cyan size-normal" id="alert"></div>
      </div>
      ${thumb ? '' : '<div class="slot-qr"><div class="qr-card theme-pulse look-cyan" id="qr-card"></div></div>'}
    </div>
  `
  const stage = shadow.getElementById('stage')!
  const alertEl = shadow.getElementById('alert')!
  const userCss = shadow.getElementById('user') as HTMLStyleElement
  const menuSlot = shadow.getElementById('menu-slot')
  const qrCard = shadow.getElementById('qr-card')

  return {
    refresh(style, symbol = 'PLS', scene) {
      const parts = tipAlertPartsFromStyle(style, { symbol })
      const painted = renderTipAlertMarkup(style, parts)
      stage.className = `stage${thumb ? ' is-thumb' : ''} pos-${painted.position}`
      alertEl.className = `alert theme-${painted.theme} size-${painted.size}`
      alertEl.innerHTML = painted.innerHtml
      userCss.textContent = String(style.customCss || '')
      if (thumb) return
      const look = cohesiveMenuTheme(style, scene?.templateId)
      const menuStyle: OverlayMenuStyle = {
        ...(scene?.menuStyle || defaultOverlayMenuStyle),
        theme: look,
      }
      const rows =
        scene?.menuRows && scene.menuRows.length
          ? scene.menuRows.slice(0, 6)
          : sampleMenuRows(symbol)
      if (menuSlot) {
        menuSlot.innerHTML = `<div class="${overlayMenuStageClass(menuStyle)}">${overlayMenuPanelHtml(rows, menuStyle)}</div>`
      }
      if (qrCard) paintQrCard(qrCard, style, scene, look)
    },
    flash(style, parts) {
      const painted = renderTipAlertMarkup(style, parts)
      stage.className = `stage${thumb ? ' is-thumb' : ''} pos-${painted.position}`
      alertEl.className = `alert theme-${painted.theme} size-${painted.size}`
      alertEl.innerHTML = painted.innerHtml
      userCss.textContent = String(style.customCss || '')
      alertEl.classList.remove('is-flash')
      void alertEl.offsetWidth
      alertEl.classList.add('is-flash')
    },
  }
}

export function mountLookPreview(host: HTMLElement): LookPreviewHandle {
  return mountFrame(host, {})
}

export function mountLookThumb(host: HTMLElement): LookPreviewHandle {
  return mountFrame(host, { thumb: true })
}
