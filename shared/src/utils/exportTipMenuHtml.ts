/**
 * Standalone tip-menu HTML for fans.
 *
 * Click a pattern → `ethereum:` URI (same payload as the card QR).
 * EIP-681 injects token name, amount, and network so a PulseChain wallet can prefill Send.
 * Mobile: scan the QR. Host over http(s) so `ethereum:` clicks open a wallet.
 */

import { sanitizeCreatorWalletQrPayload } from './fanQr'
import { tryBuildTipPaymentUri } from './eip681'
import { paymentQrSvg } from './exportQr'
import type {
  TipMenuExportInput,
  TipMenuExportRow,
  TipMenuLink,
} from './tipMenuTypes'

function fanTipUri(
  input: Parameters<typeof tryBuildTipPaymentUri>[0],
  receive: string,
): string | null {
  const uri = tryBuildTipPaymentUri(input)
  if (!uri) return null
  return sanitizeCreatorWalletQrPayload(uri, receive)
}

const VIZ_MAX = 8

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatPrice(n: number): string {
  if (!Number.isFinite(n)) return '0'
  if (n >= 1000) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }
  if (n >= 10) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  return n.toLocaleString(undefined, {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  })
}

function tipUnitLine(symbol: string, tokenSymbol?: string): string {
  const t = (tokenSymbol || '').trim()
  const s = (symbol || '').trim() || 'TOKEN'
  if (!t) return s
  if (t.toUpperCase() === s.toUpperCase()) return s
  return s
}

function linkHref(link: TipMenuLink): string {
  const raw = link.value.trim()
  if (!raw) return '#'
  if (/^https?:\/\//i.test(raw)) return raw
  const label = link.label.toLowerCase()
  if (label === 'x') {
    const h = raw.replace(/^@+/, '')
    return `https://x.com/${encodeURIComponent(h)}`
  }
  if (label === 'telegram') {
    if (/^t\.me\//i.test(raw)) return `https://${raw}`
    const h = raw.replace(/^@+/, '')
    return `https://t.me/${encodeURIComponent(h)}`
  }
  if (label === 'discord') {
    if (/discord\.gg|discord\.com/i.test(raw)) {
      return raw.startsWith('http') ? raw : `https://${raw}`
    }
    return '#'
  }
  if (label === 'web' || label === 'link') {
    if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(raw) && !/\s/.test(raw)) {
      return `https://${raw}`
    }
  }
  return '#'
}

function patternBarsSvg(steps: number[]): string {
  const raw = (steps?.length ? steps : [2, 4, 3]).slice(0, 24)
  const n = Math.max(1, raw.length)
  const w = 200
  const h = 40
  const padX = 4
  const padY = 4
  const gap = Math.max(1, Math.min(3, ((w - padX * 2) / n) * 0.16))
  const usableW = w - padX * 2 - gap * (n - 1)
  const barW = Math.max(2, usableW / n)

  let path = ''
  const bars: string[] = []
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(VIZ_MAX, Number(raw[i]) || 0))
    const cx = padX + i * (barW + gap) + barW / 2
    const barH = (h - padY * 2) * (v / VIZ_MAX)
    const y = h - padY - barH
    path += `${i === 0 ? 'M' : 'L'}${cx.toFixed(1)} ${y.toFixed(1)} `
    if (v > 0) {
      const bh = Math.max(1.5, barH)
      const by = h - padY - bh
      const bx = padX + i * (barW + gap)
      bars.push(
        `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="1.2" class="bar"/>`,
      )
    }
  }

  return `<svg class="viz-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
  <line class="ceiling" x1="${padX}" y1="${padY}" x2="${w - padX}" y2="${padY}" stroke-dasharray="3 3"/>
  <line class="mid" x1="${padX}" y1="${padY + (h - padY * 2) * 0.25}" x2="${w - padX}" y2="${padY + (h - padY * 2) * 0.25}"/>
  <line class="mid" x1="${padX}" y1="${padY + (h - padY * 2) * 0.5}" x2="${w - padX}" y2="${padY + (h - padY * 2) * 0.5}"/>
  <line class="floor" x1="${padX}" y1="${h - padY}" x2="${w - padX}" y2="${h - padY}"/>
  <path class="env" d="${path.trim()}" fill="none"/>
  ${bars.join('')}
</svg>`
}

function patternVizHtml(row: TipMenuExportRow): string {
  const lanes = row.motorStrengths?.filter((lane) => lane.length) || []
  if (lanes.length < 2) {
    return `<div class="viz" title="Intensity over time · max ceiling = 8">
    ${patternBarsSvg(row.strengths)}
    <span class="max-label">max</span>
  </div>`
  }
  return `<div class="viz viz-multi" title="Independent motor intensity over time · max ceiling = 8">
    ${lanes
      .slice(0, 3)
      .map(
        (lane, i) => `<div class="viz-lane">
      <span class="motor-label">M${i + 1}</span>
      ${patternBarsSvg(lane)}
    </div>`,
      )
      .join('')}
    <span class="max-label">max</span>
  </div>`
}

/** Build EIP-681 URI for one export row (HTML / JPG QR). */
export function resolveExportPaymentUri(
  row: Pick<
    TipMenuExportRow,
    'price' | 'tokenAddress' | 'tokenDecimals' | 'paymentUri' | 'coin'
  >,
  ctx: {
    receive: string
    chainId: number
    tokenAddress?: string
    tokenDecimals?: number
    nativeDecimals?: number
    tokenSymbol?: string
    networkName?: string
  },
): string | null {
  return rowPaymentUri(
    {
      name: '',
      blurb: '',
      price: row.price,
      timeSec: 0,
      tag: '',
      family: '',
      strengths: [],
      coin: row.coin,
      tokenAddress: row.tokenAddress,
      tokenDecimals: row.tokenDecimals,
      paymentUri: row.paymentUri,
    },
    ctx.receive,
    ctx.chainId,
    ctx.tokenAddress || '',
    ctx.tokenDecimals ?? 18,
    ctx.nativeDecimals ?? 18,
    ctx.tokenSymbol || '',
    ctx.networkName || '',
  )
}

function rowPaymentUri(
  row: TipMenuExportRow,
  receive: string,
  chainId: number,
  fallbackToken: string,
  fallbackDecimals: number,
  nativeDecimals: number,
  fallbackSymbol = '',
  networkName = '',
): string | null {
  if (!receive || !/^0x[a-fA-F0-9]{40}$/i.test(receive)) return null
  const rowToken = (row.tokenAddress || fallbackToken || '').trim()
  const rowDecimals = rowToken
    ? Math.max(0, Math.round(Number(row.tokenDecimals ?? fallbackDecimals) || 18))
    : Math.max(0, Math.round(Number(nativeDecimals) || 18))
  const tokenSymbol = (row.coin || fallbackSymbol || '').trim()
  const rebuilt = fanTipUri(
    {
      receiveAddress: receive,
      amountHuman: row.price,
      chainId,
      decimals: rowDecimals,
      tokenAddress: rowToken || null,
      tokenSymbol: tokenSymbol || null,
      networkName: networkName || null,
    },
    receive,
  )
  if (rebuilt) return rebuilt
  const pre = String(row.paymentUri || '').trim()
  if (pre && pre.startsWith('ethereum:')) {
    return sanitizeCreatorWalletQrPayload(pre, receive)
  }
  return null
}

function cardHtml(
  row: TipMenuExportRow,
  symbol: string,
  canTip: boolean,
  paymentUri: string | null,
  networkName: string,
): string {
  const price = formatPrice(row.price)
  const sec = row.timeSec > 0 ? `${Math.round(row.timeSec)}s` : '—'
  const coinLabel = (row.coin || symbol || 'TOKEN').trim() || 'TOKEN'
  const network = (networkName || '').trim()
  const amountAttr = String(row.price)
  const featClass = row.featured ? ' is-featured' : ''
  const uriAttr = paymentUri
    ? ` href="${esc(paymentUri)}" data-payment-uri="${esc(paymentUri)}"`
    : ''
  const qrBlock =
    canTip && paymentUri
      ? `<div class="card-qr" aria-hidden="true">${paymentQrSvg(paymentUri, 200)}</div>`
      : ''
  const tipAttrs = canTip && paymentUri
    ? ` class="card tip-card${featClass}" data-amount="${esc(amountAttr)}" data-name="${esc(row.name)}"${uriAttr} title="Pay ${esc(price)} ${esc(coinLabel)} on ${esc(network || 'PulseChain')}"`
    : ` class="card${featClass}" aria-disabled="true"`
  const tag = canTip && paymentUri ? 'a' : 'article'
  return `<${tag}${tipAttrs}>
  <div class="price-block">
    <div class="price">${esc(price)}</div>
    <div class="sym-line">${esc(coinLabel)} · ${esc(sec)}</div>
  </div>
  ${qrBlock}
  <div class="name">${esc(row.name)}</div>
  ${patternVizHtml(row)}
  ${canTip ? `<span class="tap-hint">Click to pay · or scan QR</span>` : ''}
</${tag}>`
}

const CSS = `
:root {
  color-scheme: dark;
  --ink: #e8f4ff;
  --soft: #9bb8d4;
  --muted: rgba(232, 244, 255, 0.55);
  --ember: #00c8ff;
  --gold: #5ce1ff;
  --ok: #6fbf95;
  --paper: #050d18;
  --card: rgba(10, 28, 52, 0.9);
  --panel: rgba(8, 22, 44, 0.85);
  --line: rgba(232, 244, 255, 0.14);
  --sans: "Avenir Next", "Segoe UI", Candara, system-ui, sans-serif;
  --display: "Avenir Next", "Segoe UI", Candara, system-ui, sans-serif;
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  min-height: 100%;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--sans);
}
body {
  background:
    radial-gradient(80% 50% at 8% -5%, rgba(0, 200, 255, 0.22), transparent 55%),
    radial-gradient(60% 40% at 100% 0%, rgba(0, 140, 220, 0.12), transparent 50%),
    linear-gradient(168deg, #040a14 0%, #071428 45%, #030810 100%);
  min-height: 100svh;
  padding-bottom: 4rem;
}
.wrap {
  max-width: 72rem;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 2.5rem;
}
.brand {
  color: var(--ember);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  margin: 0 0 0.5rem;
}
h1 {
  font-family: var(--display);
  font-size: clamp(2rem, 5vw, 2.75rem);
  font-weight: 600;
  margin: 0 0 0.35rem;
  line-height: 1.15;
}
.tagline {
  color: var(--soft);
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
}
.show-times {
  margin: 0 0 0.85rem;
  font-size: 0.95rem;
  color: var(--ink);
}
.show-times .lbl {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ember);
  margin-bottom: 0.2rem;
}
.subtitle {
  color: var(--soft);
  margin: 0 0 1rem;
  font-size: 1.15rem;
  font-weight: 500;
}
.links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0 0 1.15rem;
}
.links a {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(0, 200, 255, 0.14);
  border: 1px solid rgba(0, 200, 255, 0.35);
  color: var(--ink);
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 600;
}
.links a:hover { border-color: var(--ember); }
.links a .lbl { color: var(--ember); margin-right: 0.35rem; }
.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 0.9rem 1.1rem;
  margin-bottom: 1.35rem;
}
.panel p { margin: 0.35rem 0; font-size: 0.95rem; }
.panel .wallet { color: var(--gold); word-break: break-all; font-weight: 500; }
.panel .rule { color: var(--soft); font-size: 0.9rem; }
.panel .rule a { color: var(--ember); }
.file-warn {
  margin: 0.5rem 0 0;
  padding: 0.55rem 0.7rem;
  border-radius: 10px;
  border: 1px solid rgba(240, 128, 128, 0.45);
  background: rgba(240, 128, 128, 0.12);
  color: #f08080;
  font-size: 0.9rem;
}
.pay-now {
  display: inline-block;
  margin-top: 0.65rem;
  padding: 0.65rem 1.1rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 200, 255, 0.55);
  background: linear-gradient(180deg, rgba(0, 200, 255, 0.28), rgba(0, 140, 220, 0.18));
  color: var(--ink);
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}
.pay-now:hover {
  border-color: var(--gold);
  background: linear-gradient(180deg, rgba(92, 225, 255, 0.35), rgba(0, 160, 230, 0.22));
}
.pay-now[aria-disabled="true"] {
  opacity: 0.45;
  pointer-events: none;
}
.pay-layout {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem 1.15rem;
  align-items: start;
  margin-top: 0.65rem;
}
@media (max-width: 520px) {
  .pay-layout { grid-template-columns: 1fr; justify-items: center; text-align: center; }
  .pay-layout .wallet { text-align: center; }
}
.pay-qr-wrap {
  width: 168px;
  border-radius: 10px;
  background: #fff;
  padding: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.pay-qr-wrap svg {
  width: 156px;
  height: 156px;
  display: block;
}
.pay-qr-wrap .qr-cap,
.card-qr .qr-cap {
  display: block;
  margin-top: 4px;
  padding: 0 2px 2px;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.25;
  color: #123;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
#pay-uri-display {
  margin: 0.45rem 0 0;
  font-size: 0.72rem;
  line-height: 1.35;
  color: var(--soft);
  word-break: break-all;
  font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
}
#pay-uri-display code { color: var(--gold); font-size: inherit; }
.pay-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.55rem;
}
.pay-actions button {
  display: inline-block;
  padding: 0.35rem 0.7rem;
  border-radius: 8px;
  border: 1px solid rgba(212, 168, 75, 0.4);
  background: rgba(212, 168, 75, 0.12);
  color: var(--gold);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}
.pay-actions button:hover {
  border-color: var(--gold);
  background: rgba(212, 168, 75, 0.22);
}
#selected-tip {
  margin: 0.5rem 0 0;
  padding: 0.55rem 0.7rem;
  border-radius: 10px;
  border: 1px dashed rgba(0, 200, 255, 0.45);
  background: rgba(0, 200, 255, 0.1);
  color: var(--ink);
  font-size: 0.95rem;
  min-height: 2.6rem;
}
#selected-tip strong { color: var(--gold); }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11.5rem, 1fr));
  gap: 0.75rem;
}
.toy-block { margin: 0 0 1.1rem; }
.toy-h {
  margin: 0 0 0.45rem;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gold, #f0c14b);
}
@media (min-width: 900px) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
  }
}
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.45rem 0.5rem 0.4rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.35rem;
  min-height: 13rem;
  color: inherit;
  text-align: center;
  font: inherit;
  width: 100%;
}
.card-qr {
  flex: 1 1 auto;
  width: 100%;
  min-height: 5.5rem;
  background: #fff;
  border-radius: 8px;
  padding: 4px;
  line-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-qr svg {
  width: 100%;
  height: auto;
  max-height: 100%;
  aspect-ratio: 1;
  display: block;
}
a.card {
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
}
a.card:hover {
  border-color: rgba(0, 200, 255, 0.55);
  box-shadow: 0 0 0 1px rgba(0, 200, 255, 0.2);
  transform: translateY(-1px);
}
a.card:active { transform: translateY(0); }
a.card.is-selected {
  border-color: var(--ember);
  box-shadow: 0 0 0 1px rgba(0, 200, 255, 0.35);
}
.card.is-featured {
  background: linear-gradient(165deg, rgba(78, 52, 34, 0.98), rgba(48, 34, 26, 0.96));
  border-color: rgba(92, 225, 255, 0.55);
  box-shadow: 0 0 0 1px rgba(92, 225, 255, 0.22), 0 8px 22px rgba(0, 0, 0, 0.28);
}
.card.is-featured .price-block {
  background: rgba(0, 200, 255, 0.3);
}
.card.is-featured .price {
  color: #7af0ff;
}
.card.is-featured .price {
  color: #7af0ff;
}
.feat-badge {
  margin: 0;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gold);
}
.price-block {
  flex: 0 0 auto;
  width: 100%;
  background: rgba(0, 200, 255, 0.14);
  border-radius: 7px;
  padding: 0.3rem 0.45rem 0.28rem;
}
.price {
  font-family: var(--display);
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.05;
  color: var(--gold);
}
.sym-line {
  margin-top: 0.38rem;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.03em;
}
.name {
  font-size: 0.78rem;
  font-weight: 650;
  line-height: 1.25;
  color: var(--ink);
  word-break: break-word;
}
.viz {
  position: relative;
  height: 2.4rem;
  margin-top: auto;
  width: 100%;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(0,0,0,0.25);
}
.viz-svg { width: 100%; height: 100%; display: block; }
.viz-multi {
  height: 4.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.16rem;
  padding: 0.2rem 0.25rem;
}
.viz-lane {
  display: grid;
  grid-template-columns: 1.35rem minmax(0, 1fr);
  align-items: center;
  min-height: 0;
  flex: 1;
}
.viz-lane .viz-svg { min-height: 0; }
.motor-label {
  color: var(--soft);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.viz .bar { fill: rgba(0, 200, 255, 0.75); }
.viz .env { stroke: var(--gold); stroke-width: 1.2; }
.viz .ceiling { stroke: rgba(92, 225, 255, 0.55); stroke-width: 1; }
.viz .mid { stroke: rgba(232, 244, 255, 0.08); stroke-width: 1; }
.viz .floor { stroke: rgba(232, 244, 255, 0.12); stroke-width: 1; }
.max-label {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 0.62rem;
  color: var(--muted);
}
.tap-hint {
  display: block;
  margin-top: 0.4rem;
  font-size: 0.72rem;
  color: var(--ember);
  font-weight: 600;
  letter-spacing: 0.03em;
}
.foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--line);
  font-size: 0.8rem;
  color: var(--muted);
}
#tip-toast {
  position: fixed;
  left: 50%;
  bottom: 1.25rem;
  transform: translateX(-50%);
  z-index: 50;
  max-width: min(36rem, calc(100vw - 1.5rem));
  padding: 0.65rem 1rem;
  border-radius: 12px;
  background: rgba(28, 22, 20, 0.95);
  border: 1px solid var(--line);
  color: var(--ink);
  font-size: 0.88rem;
  box-shadow: 0 8px 28px rgba(0,0,0,0.45);
  display: none;
}
#tip-toast.show { display: block; }
#tip-toast.ok { border-color: rgba(111, 191, 149, 0.5); color: var(--ok); }
#tip-toast.err { border-color: rgba(240, 128, 128, 0.5); color: #f08080; }
#tip-toast a { color: var(--gold); }
`.trim()

/**
 * Click a pattern → `ethereum:` (same URI as the QR). EIP-681 prefills
 * token, amount, and network. file:// often cannot open a wallet — host over http(s).
 */
function tipScript(cfgJson: string): string {
  return `
(function () {
  const CFG = ${cfgJson};
  const toast = document.getElementById('tip-toast');
  const selectedEl = document.getElementById('selected-tip');
  const payQrWrap = document.querySelector('.pay-qr-wrap');
  const payUriDisplay = document.getElementById('pay-uri-display');
  const fileWarn = document.getElementById('file-warn');
  const isFile = location.protocol === 'file:';
  let currentUri = '';

  if (isFile && fileWarn) fileWarn.hidden = false;

  function showToast(msg, kind) {
    if (!toast) return;
    toast.className = 'show' + (kind ? ' ' + kind : '');
    toast.innerHTML = msg;
  }

  function tipUnitLabel() {
    return CFG.symbol || CFG.tokenSymbol || 'TOKEN';
  }

  function fanSafePaymentUri(uri) {
    uri = String(uri || '').trim();
    if (!uri || uri.indexOf('ethereum:') !== 0) return '';
    var receive = String(CFG.receive || '').toLowerCase();
    if (!receive) return '';
    var transfer = uri.match(/^ethereum:(0x[a-fA-F0-9]{40})@(\\d+)\\/transfer\\?(.+)$/i);
    if (transfer) {
      var params = new URLSearchParams(transfer[3]);
      var dest = String(params.get('address') || '');
      var amt = String(params.get('uint256') || '');
      if (!/^0x[a-fA-F0-9]{40}$/i.test(dest)) return '';
      if (dest.toLowerCase() !== receive) return '';
      if (transfer[1].toLowerCase() === receive) return '';
      if (!/^\\d+$/.test(amt) || amt === '0') return '';
      return uri;
    }
    if (/\\/transfer\\b/i.test(uri)) return '';
    var value = uri.match(/[?&]value=([0-9]+)(?:&|$)/i);
    if (!value || value[1] === '0') return '';
    var addrs = uri.match(/0x[a-fA-F0-9]{40}/g) || [];
    if (addrs.length !== 1) return '';
    if (addrs[0].toLowerCase() !== receive) return '';
    return uri;
  }

  function setMainQrFromButton(el) {
    if (!payQrWrap) return;
    var cardQr = el && el.querySelector && el.querySelector('.card-qr');
    if (!cardQr) return;
    payQrWrap.innerHTML = cardQr.innerHTML;
  }

  function setPayUriDisplay(uri) {
    if (!payUriDisplay) return;
    if (!uri) {
      payUriDisplay.innerHTML = '';
      return;
    }
    payUriDisplay.innerHTML = 'EIP-681: <code>' + uri.replace(/</g, '') + '</code>';
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () {
        return legacyCopy(text);
      });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (_) {
      return false;
    }
  }

  function markSelected(el) {
    document.querySelectorAll('a.tip-card').forEach(function (b) {
      b.classList.remove('is-selected');
    });
    if (el && el.classList.contains('tip-card')) el.classList.add('is-selected');
  }

  function onPayClick(e, el) {
    var raw = el.getAttribute('href') || el.getAttribute('data-payment-uri') || '';
    var uri = fanSafePaymentUri(raw);
    var amount = el.getAttribute('data-amount') || '';
    var name = el.getAttribute('data-name') || 'tip';
    if (!uri) return;
    currentUri = uri;
    markSelected(el);
    setMainQrFromButton(el);
    setPayUriDisplay(uri);
    if (selectedEl) {
      selectedEl.innerHTML =
        'Pay <strong>' +
        (amount || '') +
        ' ' +
        tipUnitLabel() +
        '</strong> for “' +
        name +
        '” — same EIP-681 as the QR (token, amount, network).';
    }
    if (isFile) {
      e.preventDefault();
      showToast('This downloaded file cannot open a wallet. Host the page over http(s), or scan the QR.', 'err');
      copyText(uri);
      return;
    }
    showToast('Opening wallet… confirm token, amount, and network.', 'ok');
    copyText(uri);
  }

  document.querySelectorAll('a.tip-card').forEach(function (el) {
    el.addEventListener('click', function (e) {
      onPayClick(e, el);
    });
  });

  var payNow = document.getElementById('btn-pay-now');
  if (payNow) {
    currentUri = fanSafePaymentUri(payNow.getAttribute('href') || '') || currentUri;
    payNow.addEventListener('click', function (e) {
      onPayClick(e, payNow);
    });
  }

  var copyAddr = document.getElementById('btn-copy-addr');
  if (copyAddr) {
    copyAddr.addEventListener('click', function () {
      copyText(CFG.receive).then(function (ok) {
        showToast(ok ? 'Address copied' : 'Copy failed — long-press the address', ok ? 'ok' : 'err');
      });
    });
  }

  var copyLink = document.getElementById('btn-copy-payment');
  if (copyLink) {
    currentUri = fanSafePaymentUri(copyLink.getAttribute('data-default-uri') || '') || currentUri;
    copyLink.addEventListener('click', function () {
      if (!currentUri) {
        showToast('Tap a pattern first to copy its payment link', 'err');
        return;
      }
      copyText(currentUri).then(function (ok) {
        showToast(ok ? 'Payment link copied — paste into a PulseChain EIP-681 wallet' : 'Copy failed', ok ? 'ok' : 'err');
      });
    });
  }
})();
`.trim()
}

/**
 * Build self-contained tip menu HTML string (no download).
 */
export function buildTipMenuHtml(input: TipMenuExportInput): string {
  const items = input.items.filter((r) => r.name.trim())
  if (!items.length) {
    throw new Error(
      'No enabled patterns to export — turn some On in the tip menu.',
    )
  }

  const brand = input.brand || 'Just The Tip'
  const symbol = input.symbol || 'TOKEN'
  const displayName = input.displayName.trim()
  const tagline = (input.tagline || '').trim()
  const showTimes = (input.showTimes || '').trim()
  const unit = tipUnitLine(symbol, input.tokenSymbol)
  const receive = input.receive?.trim() || ''
  // Orientation is JPG-only; HTML stays responsive (ignores landscape/portrait).
  const links = (input.links || []).filter((l) => l.value.trim())
  const cheapestAmount =
    input.cheapest != null && Number.isFinite(input.cheapest)
      ? input.cheapest
      : Math.min(...items.map((i) => i.price))
  const floor = formatPrice(cheapestAmount)

  const canTip = Boolean(receive && /^0x[a-fA-F0-9]{40}$/i.test(receive))

  const title = displayName
    ? `${displayName} · Tip menu`
    : `${brand} Tip menu`

  const linkHtml = links.length
    ? `<nav class="links">${links
        .map((l) => {
          const href = linkHref(l)
          const external = href.startsWith('http')
          const attrs = external
            ? ' target="_blank" rel="noopener noreferrer"'
            : ''
          return `<a href="${esc(href)}"${attrs}><span class="lbl">${esc(l.label)}</span>${esc(l.value)}</a>`
        })
        .join('')}</nav>`
    : ''

  const tipCfg = {
    receive,
    symbol,
    tokenSymbol: input.tokenSymbol || '',
    /** Present when fans must send ERC‑20 (label-only; no wallet APIs). */
    tokenAddress: (input.tokenAddress || '').trim(),
    chainId: Number(input.chainId) || 369,
  }
  const cfgJson = JSON.stringify(tipCfg).replace(/</g, '\\u003c')

  const chainId = Number(input.chainId) || 369
  const tokenAddress = (input.tokenAddress || '').trim()
  const decimals = tokenAddress
    ? Math.max(0, Math.round(Number(input.tokenDecimals) || 18))
    : Math.max(0, Math.round(Number(input.nativeDecimals) || 18))
  const nativeDecimals = Math.max(
    0,
    Math.round(Number(input.nativeDecimals) || 18),
  )

  const cheapestUri = canTip
    ? rowPaymentUri(
        {
          name: '',
          blurb: '',
          price: cheapestAmount,
          timeSec: 0,
          tag: '',
          family: '',
          strengths: [],
          tokenAddress: tokenAddress || undefined,
          tokenDecimals: decimals,
        },
        receive,
        chainId,
        tokenAddress,
        decimals,
        nativeDecimals,
        symbol,
        input.chainLabel,
      )
    : null

  const cheapestCap = [floor, symbol, input.chainLabel]
    .filter(Boolean)
    .join(' · ')
  const mainQrSvg =
    canTip && cheapestUri
      ? `${paymentQrSvg(cheapestUri, 156)}<span class="qr-cap">${esc(cheapestCap)}</span>`
      : ''

  const cardFor = (r: TipMenuExportRow) => {
    const rowSymbol = (r.coin || symbol || 'TOKEN').trim() || 'TOKEN'
    const uri = canTip
      ? rowPaymentUri(
          r,
          receive,
          chainId,
          tokenAddress,
          decimals,
          nativeDecimals,
          symbol,
          input.chainLabel,
        )
      : null
    return cardHtml(r, rowSymbol, canTip, uri, input.chainLabel)
  }
  const toyNames = [
    ...new Set(items.map((r) => (r.forToy || '').trim()).filter(Boolean)),
  ]
  const patternGrid =
    toyNames.length > 1
      ? toyNames
          .map((toy) => {
            const rows = items.filter((r) => (r.forToy || '').trim() === toy)
            if (!rows.length) return ''
            return `<section class="toy-block" aria-label="${esc(toy)}">
    <h2 class="toy-h">${esc(toy)}</h2>
    <div class="grid">${rows.map(cardFor).join('\n    ')}</div>
  </section>`
          })
          .join('\n  ')
      : `<section class="grid" aria-label="Patterns">
    ${items.map(cardFor).join('\n    ')}
  </section>`
  const toyBit = toyNames.length > 1 ? `${toyNames.length} toys · ` : ''

  const payPanel = canTip
    ? `<div class="pay-layout">
    <div class="pay-qr-wrap" aria-label="Payment QR">${mainQrSvg}</div>
    <div>
      <p class="rule"><strong>Same EIP-681 as the QR:</strong> click a pattern (or Open payment) to send with token name, amount, and network filled in. Scan the QR from a PulseChain wallet. Host this page over http(s) so <code>ethereum:</code> links can open a wallet — a downloaded file often cannot.</p>
      <p id="file-warn" class="file-warn" hidden>This is a downloaded file. Scan the QR, or open this menu from an http(s) URL so Pay can launch a wallet.</p>
      <p class="wallet">${esc(receive)}</p>
      <a id="btn-pay-now" class="pay-now" href="${esc(cheapestUri || '#')}"${cheapestUri ? ` data-payment-uri="${esc(cheapestUri)}" data-amount="${esc(floor)}" data-name="tip"` : ' aria-disabled="true"'}>Open payment</a>
      <div class="pay-actions">
        <button type="button" id="btn-copy-addr">Copy address</button>
        <button type="button" id="btn-copy-payment"${cheapestUri ? ` data-default-uri="${esc(cheapestUri)}"` : ''}>Copy payment link</button>
      </div>
      <div id="selected-tip">Tap a pattern — wallet Send should prefill token, amount, and network</div>
      <p id="pay-uri-display">${cheapestUri ? `EIP-681: <code>${esc(cheapestUri)}</code>` : ''}</p>
    </div>
  </div>`
    : `<p class="rule">Set a valid 0x receive address in Just The Tip before export — QRs need that wallet, plus token name, amount, and network.</p>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="color-scheme" content="dark"/>
<title>${esc(title)}</title>
<style>
${CSS}
</style>
</head>
<body>
<main class="wrap">
  <p class="brand">${esc(brand.toUpperCase())}</p>
  ${displayName ? `<h1>${esc(displayName)}</h1>` : ''}
  ${tagline ? `<p class="tagline">${esc(tagline)}</p>` : ''}
  ${
    showTimes
      ? `<p class="show-times"><span class="lbl">Show times</span>${esc(showTimes)}</p>`
      : ''
  }
  <p class="subtitle">Tip menu</p>
  ${linkHtml}
  <section class="panel" aria-label="How to tip">
    <p><strong>Send ${esc(unit)} on ${esc(input.chainLabel)}</strong></p>
    <p class="rule">Tip at least ${esc(floor)} ${esc(symbol)} · higher amounts unlock the next pattern up</p>
    ${payPanel}
  </section>
  ${patternGrid}
  <footer class="foot">
    <span>${esc(toyBit)}${items.length} pattern${items.length === 1 ? '' : 's'} · cheapest ${esc(floor)} ${esc(symbol)}</span>
    <span>${esc(brand)} · PulseChain · EIP-681</span>
  </footer>
</main>
<div id="tip-toast" role="status" aria-live="polite"></div>
${canTip ? `<script>\n${tipScript(cfgJson)}\n</script>` : ''}
</body>
</html>
`
}

export function tipMenuDownloadName(_input?: TipMenuExportInput): string {
  // Netlify Drop / static hosts serve the homepage from index.html only.
  return 'index.html'
}
