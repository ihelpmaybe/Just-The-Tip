/**
 * Self-contained Browser Source page for the stream tip alert.
 * Includes enter/exit motion + PulseChain eco logos.
 */
import { ecosystemLogosHtml } from './ecosystem.ts'
import { APP_NAME } from '../version.ts'

const EXIT_MS = 480

export function overlayPageHtml(): string {
  const ecoSeed = ecosystemLogosHtml(20)
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${APP_NAME} · Stream tip alert</title>
  <style id="base-css">
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: transparent !important;
      font-family: "Segoe UI", system-ui, sans-serif;
    }
    html.preview, html.preview body {
      background: #0a0e14 !important;
    }
    html.preview body::before {
      content: "Preview (dark) · paste the URL without ?preview into OBS for transparency";
      position: fixed;
      top: 10px;
      left: 12px;
      right: 12px;
      z-index: 2;
      font-size: 11px;
      letter-spacing: 0.02em;
      color: rgba(180, 200, 220, 0.45);
      font-family: ui-monospace, monospace;
      pointer-events: none;
    }
    * { box-sizing: border-box; }
    #stage {
      position: fixed;
      inset: 0;
      pointer-events: none;
      display: flex;
      padding: 6vh 4vw;
    }
    #stage.pos-bottom { align-items: flex-end; justify-content: center; }
    #stage.pos-top { align-items: flex-start; justify-content: center; }
    #stage.pos-bottom-left { align-items: flex-end; justify-content: flex-start; }
    #stage.pos-bottom-right { align-items: flex-end; justify-content: flex-end; }
    #stage.pos-top-left { align-items: flex-start; justify-content: flex-start; }
    #stage.pos-top-right { align-items: flex-start; justify-content: flex-end; }

    /* —— enter / exit (position-aware) —— */
    @keyframes tip-enter-up {
      0% { opacity: 0; transform: translateY(2.4rem) scale(0.88); filter: blur(8px); }
      55% { opacity: 1; filter: blur(0); }
      100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
    }
    @keyframes tip-enter-down {
      0% { opacity: 0; transform: translateY(-2.4rem) scale(0.88); filter: blur(8px); }
      55% { opacity: 1; filter: blur(0); }
      100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
    }
    @keyframes tip-enter-left {
      0% { opacity: 0; transform: translateX(2.2rem) scale(0.9); filter: blur(6px); }
      100% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
    }
    @keyframes tip-enter-right {
      0% { opacity: 0; transform: translateX(-2.2rem) scale(0.9); filter: blur(6px); }
      100% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
    }
    @keyframes tip-exit-down {
      0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
      100% { opacity: 0; transform: translateY(1.6rem) scale(0.9); filter: blur(6px); }
    }
    @keyframes tip-exit-up {
      0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
      100% { opacity: 0; transform: translateY(-1.6rem) scale(0.9); filter: blur(6px); }
    }
    @keyframes tip-exit-left {
      0% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
      100% { opacity: 0; transform: translateX(-1.4rem) scale(0.92); filter: blur(5px); }
    }
    @keyframes tip-exit-right {
      0% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
      100% { opacity: 0; transform: translateX(1.4rem) scale(0.92); filter: blur(5px); }
    }
    @keyframes tip-pulse-glow {
      0%, 100% { box-shadow:
        0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent),
        0 18px 48px rgba(0, 30, 70, 0.55),
        0 0 40px var(--glow); }
      50% { box-shadow:
        0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent),
        0 18px 48px rgba(0, 30, 70, 0.55),
        0 0 56px color-mix(in srgb, var(--glow) 80%, transparent); }
    }
    @keyframes eco-pop {
      0% { opacity: 0; transform: translateY(6px) scale(0.7); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes eco-shine {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.18); }
    }

    .alert {
      --accent: #6ec8ff;
      --border: rgba(0, 200, 255, 0.55);
      --glow: rgba(0, 180, 255, 0.22);
      --bg1: rgba(5, 20, 40, 0.92);
      --bg2: rgba(8, 40, 70, 0.88);
      max-width: min(42rem, 92vw);
      padding: 1.1rem 1.5rem 1.15rem;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: linear-gradient(135deg, var(--bg1), var(--bg2));
      box-shadow:
        0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent),
        0 18px 48px rgba(0, 30, 70, 0.55),
        0 0 40px var(--glow);
      color: #eef8ff;
      opacity: 0;
      will-change: transform, opacity, filter;
    }
    .alert.show {
      animation: tip-enter-up 0.58s cubic-bezier(0.2, 0.9, 0.25, 1) both;
    }
    .alert.hide {
      animation: tip-exit-down 0.48s cubic-bezier(0.4, 0, 0.7, 0.2) both;
    }

    #stage.pos-top .alert.show { animation-name: tip-enter-down; }
    #stage.pos-top .alert.hide { animation-name: tip-exit-up; }
    #stage.pos-bottom-left .alert.show,
    #stage.pos-top-left .alert.show { animation-name: tip-enter-right; }
    #stage.pos-bottom-left .alert.hide,
    #stage.pos-top-left .alert.hide { animation-name: tip-exit-left; }
    #stage.pos-bottom-right .alert.show,
    #stage.pos-top-right .alert.show { animation-name: tip-enter-left; }
    #stage.pos-bottom-right .alert.hide,
    #stage.pos-top-right .alert.hide { animation-name: tip-exit-right; }

    .alert.show:not(.theme-custom):not(.hide) {
      animation:
        tip-enter-up 0.58s cubic-bezier(0.2, 0.9, 0.25, 1) both,
        tip-pulse-glow 2.4s ease-in-out 0.6s infinite;
    }
    #stage.pos-top .alert.show:not(.theme-custom):not(.hide) {
      animation:
        tip-enter-down 0.58s cubic-bezier(0.2, 0.9, 0.25, 1) both,
        tip-pulse-glow 2.4s ease-in-out 0.6s infinite;
    }
    #stage.pos-bottom-left .alert.show:not(.theme-custom):not(.hide),
    #stage.pos-top-left .alert.show:not(.theme-custom):not(.hide) {
      animation:
        tip-enter-right 0.58s cubic-bezier(0.2, 0.9, 0.25, 1) both,
        tip-pulse-glow 2.4s ease-in-out 0.6s infinite;
    }
    #stage.pos-bottom-right .alert.show:not(.theme-custom):not(.hide),
    #stage.pos-top-right .alert.show:not(.theme-custom):not(.hide) {
      animation:
        tip-enter-left 0.58s cubic-bezier(0.2, 0.9, 0.25, 1) both,
        tip-pulse-glow 2.4s ease-in-out 0.6s infinite;
    }

    .alert.dry { --border: rgba(255, 180, 80, 0.55); --accent: #ffc56e; }

    .theme-cyan { --accent: #6ec8ff; --border: rgba(0, 200, 255, 0.55); --glow: rgba(0, 180, 255, 0.22); }
    .theme-pink { --accent: #ff8fb8; --border: rgba(255, 100, 160, 0.55); --glow: rgba(255, 80, 140, 0.22);
      --bg1: rgba(40, 10, 28, 0.92); --bg2: rgba(60, 15, 40, 0.88); }
    .theme-gold { --accent: #ffd56e; --border: rgba(255, 200, 80, 0.55); --glow: rgba(255, 180, 40, 0.22);
      --bg1: rgba(30, 22, 8, 0.93); --bg2: rgba(55, 40, 10, 0.88); }
    .theme-soft { --accent: #c8d8e8; --border: rgba(200, 220, 240, 0.35); --glow: rgba(255, 255, 255, 0.08);
      --bg1: rgba(12, 16, 24, 0.88); --bg2: rgba(20, 26, 36, 0.86); }
    .theme-custom {
      padding: 0;
      border: none;
      background: transparent;
      box-shadow: none;
      border-radius: 0;
      color: #fff;
    }

    .size-compact { padding: 0.7rem 1rem; border-radius: 12px; max-width: min(28rem, 88vw); }
    .size-compact .title { font-size: clamp(1.15rem, 2.6vw, 1.55rem); }
    .size-compact .sub { font-size: 0.88rem; }
    .size-compact .eyebrow { font-size: 0.65rem; }
    .size-large { padding: 1.35rem 1.75rem; max-width: min(48rem, 94vw); }
    .size-large .title { font-size: clamp(2rem, 4.5vw, 3rem); }
    .size-large .sub { font-size: clamp(1.05rem, 2.2vw, 1.3rem); }
    .size-large .eyebrow { font-size: 0.8rem; }
    .size-large .brand { font-size: 0.9rem; }
    /* Templates hardcode padding/fonts — scale the whole card so Size still matters */
    .theme-custom.size-compact,
    .theme-custom.size-normal,
    .theme-custom.size-large { padding: 0; border-radius: 0; }
    .theme-custom.size-compact { zoom: 0.82; }
    .theme-custom.size-normal { zoom: 1; }
    .theme-custom.size-large { zoom: 1.28; }

    .brand {
      font-size: 0.78rem;
      font-weight: 700;
      color: color-mix(in srgb, var(--accent) 85%, #fff);
      margin-bottom: 0.2rem;
      letter-spacing: 0.04em;
    }
    .eyebrow {
      font-size: 0.72rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--accent);
      font-weight: 700;
      margin-bottom: 0.35rem;
    }
    .title {
      font-size: clamp(1.6rem, 3.8vw, 2.35rem);
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.02em;
      text-shadow: 0 2px 18px rgba(0, 0, 0, 0.45);
    }
    .sub {
      margin-top: 0.4rem;
      font-size: clamp(0.95rem, 2vw, 1.15rem);
      color: #b8d8f0;
      font-weight: 600;
    }

    /* —— ecosystem logos —— */
    .eco {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.45rem 0.65rem;
      margin-top: 0.75rem;
      padding-top: 0.65rem;
      border-top: 1px solid color-mix(in srgb, var(--accent, #6ec8ff) 28%, transparent);
    }
    .theme-custom .eco {
      margin: 0.55rem 0.2rem 0;
      padding: 0.5rem 0.35rem 0;
      border-top-color: rgba(255,255,255,0.14);
    }
    .eco-item {
      display: inline-flex;
      align-items: center;
      gap: 0.28rem;
      opacity: 0;
      animation: eco-pop 0.4s cubic-bezier(0.2, 0.9, 0.25, 1) both;
    }
    .alert.show .eco-item:nth-child(1) { animation-delay: 0.22s; }
    .alert.show .eco-item:nth-child(2) { animation-delay: 0.3s; }
    .alert.show .eco-item:nth-child(3) { animation-delay: 0.38s; }
    .alert.show .eco-item:nth-child(4) { animation-delay: 0.46s; }
    .eco-img {
      display: block;
      width: 1.35rem;
      height: 1.35rem;
      object-fit: contain;
      flex-shrink: 0;
      animation: eco-shine 3.2s ease-in-out infinite;
    }
    .eco-item:nth-child(2) .eco-img { animation-delay: 0.4s; }
    .eco-item:nth-child(3) .eco-img { animation-delay: 0.8s; }
    .eco-item:nth-child(4) .eco-img { animation-delay: 1.2s; }
    .size-compact .eco-img {
      width: 1.15rem;
      height: 1.15rem;
    }
    .eco-label {
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--accent, #9ec8e8) 70%, #c8d8e8);
      opacity: 0.9;
    }
    .size-compact .eco-label { display: none; }
    .size-compact .eco { gap: 0.4rem; }

    .conn {
      position: fixed;
      top: 10px;
      right: 12px;
      font-size: 11px;
      color: rgba(255,255,255,0.35);
      font-family: ui-monospace, monospace;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .conn.visible { opacity: 1; }
    .conn.ok { color: rgba(100, 220, 160, 0.55); }
    .conn.bad { color: rgba(255, 120, 120, 0.55); }
  </style>
  <style id="user-css"></style>
</head>
<body>
  <div class="conn" id="conn">connecting…</div>
  <div id="stage" class="pos-bottom">
    <div class="alert theme-cyan size-normal" id="alert" hidden></div>
  </div>
  <script>
    const ECO_HTML = ${JSON.stringify(ecoSeed)}
    const EXIT_MS = ${EXIT_MS}
    const conn = document.getElementById('conn')
    const stage = document.getElementById('stage')
    const alertEl = document.getElementById('alert')
    const userCss = document.getElementById('user-css')
    let hideTimer = 0
    let hideDoneTimer = 0
    let style = {
      position: 'bottom',
      theme: 'cyan',
      size: 'normal',
      holdSec: 7,
      eyebrow: 'Tip',
      brand: '',
      showPattern: true,
      showPoolAlerts: true,
      showPoolLabel: true,
      showDryRun: true,
      minAmount: 0,
      walletMinAmount: 0,
      poolMinAmount: 0,
      showStatus: false,
      showEco: true,
      customCss: '',
      customHtml: ''
    }

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    function ecoBlock() {
      if (style.showEco === false) return ''
      return ECO_HTML
    }

    function defaultInner(parts) {
      let h = ''
      if (parts.brand) h += '<div class="brand">' + esc(parts.brand) + '</div>'
      h += '<div class="eyebrow">' + esc(parts.eyebrow) + '</div>'
      h += '<div class="title">' + esc(parts.title) + '</div>'
      if (parts.subtitle) h += '<div class="sub">' + esc(parts.subtitle) + '</div>'
      h += ecoBlock()
      return h
    }

    function fillTemplate(tpl, parts) {
      let out = String(tpl)
        .replace(/\\{\\{title\\}\\}/g, esc(parts.title))
        .replace(/\\{\\{subtitle\\}\\}/g, esc(parts.subtitle))
        .replace(/\\{\\{eyebrow\\}\\}/g, esc(parts.eyebrow))
        .replace(/\\{\\{brand\\}\\}/g, esc(parts.brand))
        .replace(/\\{\\{amount\\}\\}/g, esc(parts.amount))
        .replace(/\\{\\{symbol\\}\\}/g, esc(parts.symbol))
        .replace(/\\{\\{source\\}\\}/g, esc(parts.source))
        .replace(/\\{\\{eco\\}\\}/g, ecoBlock())
      // Auto-append eco bar if pack has no {{eco}} token
      if (style.showEco !== false && out.indexOf('class="eco"') < 0) {
        out += ecoBlock()
      }
      return out
    }

    function applyStyle(s) {
      if (!s || typeof s !== 'object') return
      style = Object.assign(style, s)
      if (style.showEco === undefined) style.showEco = true
      stage.className = 'pos-' + (style.position || 'bottom')
      const hasCustom = String(style.customHtml || '').trim().length > 0
      const theme = hasCustom ? 'custom' : (style.theme === 'custom' ? 'cyan' : (style.theme || 'cyan'))
      const keepShow = alertEl.classList.contains('show')
      const keepHide = alertEl.classList.contains('hide')
      const keepDry = alertEl.classList.contains('dry')
      alertEl.className = 'alert theme-' + theme + ' size-' + (style.size || 'normal')
      if (keepShow) alertEl.classList.add('show')
      if (keepHide) alertEl.classList.add('hide')
      if (keepDry) alertEl.classList.add('dry')
      conn.classList.toggle('visible', Boolean(style.showStatus))
      userCss.textContent = String(style.customCss || '')
    }

    function showTip(t) {
      const forced = Boolean(t.force) || t.source === 'test'
      if (t.dryRun && !forced && !style.showDryRun) return
      if (t.source === 'pool' && !forced && !style.showPoolAlerts) return
      const minimum = t.source === 'pool'
        ? style.poolMinAmount
        : style.walletMinAmount
      if (!forced && minimum > 0 && Number(t.amount) < minimum) return

      let typeLabel = t.source === 'pool'
        ? (t.eventKind === 'mint' ? 'LP add'
          : t.eventKind === 'burn' ? 'LP remove'
          : t.eventKind === 'bridge-in' ? 'Bridge in'
          : t.eventKind === 'bridge-out' ? 'Bridge out'
          : t.eventKind === 'custom' ? 'Chain event'
          : 'Pool swap')
        : t.source === 'test'
          ? (t.eventKind === 'pool' || t.eventKind === 'swap' ? 'Test pool swap' : 'Test tip')
          : (style.eyebrow || 'Tip')
      if (t.source === 'wallet' || !t.source) typeLabel = style.eyebrow || 'Tip'
      const eyebrowText = (t.dryRun && !forced) ? typeLabel + ' · dry-run' : typeLabel
      const titleText = t.title || ((t.amount || 0) + ' ' + (t.symbol || ''))
      let subText = t.subtitle || ''

      const parts = {
        title: titleText,
        subtitle: subText,
        eyebrow: eyebrowText,
        brand: String(style.brand || '').trim(),
        amount: t.amount != null ? t.amount : '',
        symbol: t.symbol || '',
        source: t.source || 'wallet'
      }

      const tpl = String(style.customHtml || '').trim()
      alertEl.innerHTML = tpl ? fillTemplate(tpl, parts) : defaultInner(parts)
      alertEl.hidden = false
      alertEl.classList.toggle('dry', Boolean(t.dryRun) && !forced)
      alertEl.dataset.source = parts.source

      clearTimeout(hideTimer)
      clearTimeout(hideDoneTimer)
      alertEl.classList.remove('show', 'hide')
      void alertEl.offsetWidth
      alertEl.classList.add('show')

      const hold = Math.min(20, Math.max(2, Number(style.holdSec) || 7)) * 1000
      hideTimer = setTimeout(() => {
        alertEl.classList.add('hide')
        alertEl.classList.remove('show')
        hideDoneTimer = setTimeout(() => { alertEl.hidden = true }, EXIT_MS)
      }, hold)
    }

    function connect() {
      conn.textContent = 'connecting…'
      conn.className = 'conn' + (style.showStatus ? ' visible' : '')
      const es = new EventSource('/api/overlay/stream')
      es.addEventListener('open', () => {
        conn.textContent = 'live'
        conn.className = 'conn ok' + (style.showStatus ? ' visible' : '')
      })
      es.addEventListener('style', (ev) => {
        try { applyStyle(JSON.parse(ev.data)) } catch (e) {}
      })
      es.addEventListener('tip', (ev) => {
        try { showTip(JSON.parse(ev.data)) } catch (e) { console.warn(e) }
      })
      es.onerror = () => {
        conn.textContent = 'reconnecting…'
        conn.className = 'conn bad' + (style.showStatus ? ' visible' : '')
        es.close()
        setTimeout(connect, 1500)
      }
    }
    fetch('/api/overlay/style').then(r => r.json()).then(j => {
      if (j && j.style) applyStyle(j.style)
    }).catch(() => {})
    if (location.search.indexOf('preview=1') >= 0) {
      document.documentElement.classList.add('preview')
    }
    function afterLoad(fn) {
      if (document.readyState === 'complete') setTimeout(fn, 0)
      else window.addEventListener('load', fn)
    }
    afterLoad(connect)
  </script>
</body>
</html>`
}
