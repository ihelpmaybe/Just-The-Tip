/** OBS Browser Source: tip QR + optional toolbox carousel. */
import { APP_NAME } from '../version.ts'

export function overlayQrPageHtml(): string {
  const brandFallback = JSON.stringify(APP_NAME)
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${APP_NAME} · Stream carousel</title>
  <style>
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
      content: "Carousel preview (dark) · use URL without ?preview in OBS";
      position: fixed;
      top: 10px;
      left: 12px;
      z-index: 2;
      font-size: 11px;
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
      padding: 4vh 3vw;
    }
    #stage.pos-bottom { align-items: flex-end; justify-content: center; }
    #stage.pos-top { align-items: flex-start; justify-content: center; }
    #stage.pos-bottom-left { align-items: flex-end; justify-content: flex-start; }
    #stage.pos-bottom-right { align-items: flex-end; justify-content: flex-end; }
    #stage.pos-top-left { align-items: flex-start; justify-content: flex-start; }
    #stage.pos-top-right { align-items: flex-start; justify-content: flex-end; }

    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.28rem;
      padding: 0.62rem 0.62rem 0.5rem;
      border-radius: 14px;
      /* Locked width so pack vs tip QR cards don’t resize while cycling */
      width: min(15.25rem, 86vw);
      max-width: min(15.25rem, 86vw);
      min-width: min(12.5rem, 82vw);
      overflow: hidden;
    }
    /* Author display:flex beats bare [hidden] — force hide when off */
    .card[hidden] {
      display: none !important;
    }
    .card.theme-dark {
      --viz-hi: #9ad4ff;
      --viz-lo: #4a8ec8;
      --viz-path: #8ec8ff;
      background: rgba(8, 12, 18, 0.88);
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow: 0 12px 32px rgba(0,0,0,0.45);
      color: #e8f0f8;
    }
    .card.theme-light {
      --viz-hi: #3aa0e8;
      --viz-lo: #125a9a;
      --viz-path: #0a6aad;
      background: rgba(255,255,255,0.94);
      border: 1px solid rgba(0,0,0,0.08);
      box-shadow: 0 12px 32px rgba(0,0,0,0.2);
      color: #121820;
    }
    .card.theme-pulse {
      --viz-hi: #b8fff6;
      --viz-lo: #1a7dff;
      --viz-path: #7dffef;
      background: linear-gradient(160deg, rgba(8,18,32,0.92), rgba(18,8,28,0.9));
      border: 1px solid rgba(0, 200, 255, 0.4);
      box-shadow:
        0 0 0 1px rgba(128, 0, 255, 0.15),
        0 14px 36px rgba(0, 30, 60, 0.5);
      color: #e8f8ff;
    }

    .viewport {
      width: 100%;
      position: relative;
      display: flex;
      flex-direction: column;
      /* Room for QR stack without a tall empty hole */
      min-height: 0;
    }
    .slide {
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      width: 100%;
      text-align: center;
      flex: 1 1 auto;
    }
    .slide.active {
      display: flex;
      animation: slide-in 0.5s cubic-bezier(0.2, 0.9, 0.25, 1) both;
    }
    .slide.leaving {
      display: flex;
      position: absolute;
      left: 0; right: 0; top: 0;
      animation: slide-out 0.4s cubic-bezier(0.4, 0, 0.7, 0.2) both;
      pointer-events: none;
    }
    @keyframes slide-in {
      from { opacity: 0; transform: translateX(1.5rem) scale(0.96); filter: blur(4px); }
      to { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
    }
    @keyframes slide-out {
      from { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
      to { opacity: 0; transform: translateX(-1.2rem) scale(0.96); filter: blur(4px); }
    }

    .label {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .card.theme-pulse .label {
      background: linear-gradient(90deg, #00eaff, #8000ff, #ff3333);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .card.look-cyan { --look-accent: #7ad7ff; }
    .card.look-pink { --look-accent: #ff9ad4; }
    .card.look-gold { --look-accent: #f0c36a; }
    .card.look-soft { --look-accent: #c8d4e4; }
    .card.look-cyan,
    .card.look-pink,
    .card.look-gold,
    .card.look-soft {
      border-color: color-mix(in srgb, var(--look-accent) 55%, rgba(255,255,255,0.12));
      box-shadow:
        0 0 0 1px color-mix(in srgb, var(--look-accent) 22%, transparent),
        0 14px 36px rgba(0, 30, 60, 0.5);
    }
    .card.look-cyan .label,
    .card.look-pink .label,
    .card.look-gold .label,
    .card.look-soft .label {
      background: none;
      -webkit-background-clip: unset;
      background-clip: unset;
      color: var(--look-accent);
    }
    .qr-wrap {
      background: #fff;
      border-radius: 8px;
      padding: 0.22rem;
      line-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: fit-content;
      height: fit-content;
      max-width: 100%;
      box-sizing: border-box;
    }
    .qr-wrap svg,
    .qr-wrap .qr-img {
      display: block;
      width: var(--qr, 200px);
      height: var(--qr, 200px);
      max-width: 100%;
      max-height: 100%;
      margin: 0;
      flex: 0 0 auto;
      object-fit: contain;
    }
    .size-sm { --qr: 160px; }
    .size-md { --qr: 220px; }
    .size-lg { --qr: 280px; }

    /* Unified QR card stack (tip wallet + pack links) */
    .kq {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.26rem;
      width: 100%;
      text-align: center;
    }
    .kq-head {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      min-height: 1.5rem;
      max-width: 100%;
      padding: 0 0.15rem;
    }
    .kq-mark {
      width: 1.75rem;
      height: 1.75rem;
      object-fit: contain;
      border-radius: 0.4rem;
      flex: 0 0 auto;
    }
    .kq-mark-empty {
      display: inline-block;
      width: 1.75rem;
      height: 1.75rem;
      flex: 0 0 auto;
      border-radius: 0.4rem;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .card.theme-light .kq-mark-empty {
      background: rgba(0,0,0,0.04);
      border-color: rgba(0,0,0,0.08);
    }
    .kq-title {
      font-size: 0.95rem;
      font-weight: 800;
      line-height: 1.2;
      min-width: 0;
      word-break: break-word;
    }
    .kq-caption {
      font-size: 0.72rem;
      font-weight: 600;
      line-height: 1.25;
      opacity: 0.88;
      max-width: 13.5rem;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }
    .kq-caption:empty,
    .kq-meta:empty {
      display: none;
    }
    .kq-meta {
      font-family: ui-monospace, Consolas, monospace;
      font-size: 0.64rem;
      opacity: 0.72;
      word-break: break-all;
      max-width: 100%;
      line-height: 1.2;
    }
    .brand-big {
      font-size: clamp(1.2rem, 3.5vw, 1.7rem);
      font-weight: 800;
      line-height: 1.15;
      max-width: 100%;
      word-break: break-word;
    }
    .brand {
      font-size: 0.85rem;
      font-weight: 700;
    }
    .addr {
      font-family: ui-monospace, Consolas, monospace;
      font-size: 0.7rem;
      opacity: 0.75;
      word-break: break-all;
      max-width: 100%;
    }
    .how-body {
      font-size: 0.92rem;
      font-weight: 600;
      line-height: 1.4;
      opacity: 0.95;
      max-width: 13.5rem;
    }
    .how-list {
      margin: 0.35rem 0 0;
      padding: 0;
      list-style: none;
      font-size: 0.78rem;
      opacity: 0.85;
      line-height: 1.45;
    }
    /* Non-QR info slides: same width, quieter vertical rhythm */
    .slide-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      width: 100%;
      min-height: calc(var(--qr, 176px) + 3.4rem);
      justify-content: center;
    }
    .empty {
      padding: 0.5rem;
      color: inherit;
      opacity: 0.8;
      font-size: 0.88rem;
    }
    .eco-mark {
      width: 34px;
      height: 34px;
      display: block;
      animation: pf-mark-glow 2.4s ease-in-out infinite;
    }
    .foot {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.16rem;
      padding: 0.22rem 0.62rem 0.22rem 0.32rem;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(0, 40, 72, 0.55), rgba(40, 8, 56, 0.5));
      border: 1px solid rgba(0, 234, 255, 0.42);
      box-shadow:
        0 0 0 1px rgba(128, 0, 255, 0.18),
        0 0 22px rgba(0, 180, 255, 0.28),
        inset 0 0 14px rgba(0, 234, 255, 0.1);
    }
    .foot-word {
      font-size: 1.22rem;
      font-weight: 900;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      line-height: 1;
      background: linear-gradient(90deg, #7dfff6, #00eaff, #b44dff, #ff4d9a, #00eaff, #7dfff6);
      background-size: 240% 100%;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      animation: pf-word-shine 3s linear infinite;
      filter: drop-shadow(0 0 8px rgba(0, 234, 255, 0.45));
    }
    .card.theme-light .foot {
      background: rgba(255, 255, 255, 0.72);
      border-color: rgba(0, 120, 200, 0.35);
      box-shadow: 0 4px 16px rgba(0, 40, 80, 0.12);
    }
    .card.theme-light .foot-word {
      filter: none;
    }
    .card.theme-dark .foot {
      background: rgba(8, 14, 22, 0.72);
      border-color: rgba(255, 255, 255, 0.16);
    }
    @keyframes pf-word-shine {
      0% { background-position: 0% 50%; }
      100% { background-position: 100% 50%; }
    }
    @keyframes pf-mark-glow {
      0%, 100% { filter: drop-shadow(0 0 3px rgba(0, 234, 255, 0.45)); }
      50% { filter: drop-shadow(0 0 11px rgba(180, 70, 255, 0.85)); }
    }
    .dots {
      display: flex;
      gap: 0.35rem;
      margin-top: 0.35rem;
      min-height: 0.4rem;
    }
    .dots span {
      width: 0.35rem;
      height: 0.35rem;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.28;
    }
    .dots span.on { opacity: 0.9; }
    .card:not(.is-carousel) .dots { display: none; }

    /* eco strip inside card */
    .eco {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 0.45rem 0.55rem;
      margin-top: 0.15rem;
    }
    .eco-item {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .eco-img {
      width: 1.35rem;
      height: 1.35rem;
      object-fit: contain;
    }
    .eco-label {
      font-size: 0.58rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      opacity: 0.85;
    }
    .size-sm .eco-label { display: none; }
    /* legacy aliases if custom HTML still uses these */
    .im-logo { width: 1.75rem; height: 1.75rem; object-fit: contain; border-radius: 0.4rem; }
    .im-url {
      font-family: ui-monospace, Consolas, monospace;
      font-size: 0.68rem;
      opacity: 0.72;
      word-break: break-all;
    }
    .menu-list {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.32rem;
      margin-top: 0.2rem;
      text-align: left;
    }
    .menu-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      grid-template-rows: auto auto;
      column-gap: 0.45rem;
      row-gap: 0.2rem;
      align-items: center;
      padding: 0.32rem 0.4rem 0.35rem;
      border-radius: 8px;
      background: rgba(255,255,255,0.06);
    }
    .card.theme-light .menu-row {
      background: rgba(0,0,0,0.05);
    }
    .menu-row.is-featured {
      outline: 1px solid rgba(0, 200, 255, 0.45);
    }
    .menu-solo.is-featured .menu-solo-name {
      color: #7dffef;
    }
    .menu-name {
      grid-column: 1;
      grid-row: 1;
      font-size: 0.78rem;
      font-weight: 700;
      line-height: 1.2;
      min-width: 0;
    }
    .menu-note {
      display: block;
      font-size: 0.62rem;
      font-weight: 600;
      opacity: 0.7;
      margin-top: 0.08rem;
    }
    .menu-toy {
      font-size: 0.88rem;
      font-weight: 800;
      line-height: 1.15;
      margin: 0.1rem 0 0.05rem;
    }
    .menu-page {
      font-size: 0.62rem;
      opacity: 0.65;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .menu-sub {
      font-size: 0.72rem;
      opacity: 0.78;
      font-weight: 600;
      margin: 0 0 0.1rem;
    }
    .menu-amt {
      grid-column: 2;
      grid-row: 1;
      font-family: ui-monospace, Consolas, monospace;
      font-size: 0.78rem;
      font-weight: 800;
      white-space: nowrap;
      justify-self: end;
    }
    .menu-qr {
      grid-column: 3;
      grid-row: 1 / span 2;
      width: 3.1rem;
      height: 3.1rem;
      border-radius: 6px;
      overflow: hidden;
      background: #fff;
      align-self: center;
    }
    .menu-qr svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    .card.theme-pulse .menu-amt {
      color: #7dffef;
    }
    .menu-viz {
      grid-column: 1 / -1;
      grid-row: 2;
      height: 1.35rem;
      border-radius: 5px;
      overflow: hidden;
      background: rgba(0,0,0,0.28);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .card.theme-light .menu-viz {
      background: rgba(0,0,0,0.06);
      border-color: rgba(0,0,0,0.08);
    }
    .menu-viz-svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    .menu-viz-svg-hd {
      overflow: visible;
    }
    .menu-viz-base {
      stroke: rgba(180, 200, 220, 0.28);
      stroke-width: 1;
    }
    .menu-viz-path {
      stroke: rgba(0, 220, 255, 0.55);
      stroke-width: 1.2;
      stroke-linejoin: round;
      stroke-linecap: round;
    }
    .menu-viz-path-hd {
      stroke-width: 2.6;
      stroke-linejoin: round;
      stroke-linecap: round;
    }
    .menu-bar-hd {
      opacity: 0.95;
    }
    .menu-viz-fill {
      fill: url(#pv-bar);
      opacity: 0.2;
    }
    .menu-bar {
      fill: rgba(0, 200, 255, 0.62);
    }
    .card.theme-light .menu-bar {
      fill: rgba(0, 120, 200, 0.55);
    }
    .card.theme-light .menu-viz-path {
      stroke: rgba(0, 100, 180, 0.5);
    }
    .menu-solo {
      width: 100%;
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.32rem;
      text-align: center;
    }
    .menu-solo-price {
      width: 100%;
      flex: 0 0 auto;
      background: rgba(0, 200, 255, 0.14);
      border-radius: 7px;
      padding: 0.38rem 0.55rem 0.34rem;
      box-sizing: border-box;
    }
    .menu-solo-amt {
      font-family: ui-monospace, Consolas, monospace;
      font-size: 1.28rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      line-height: 1.05;
      flex: 0 0 auto;
    }
    .menu-solo-sym {
      margin-top: 0.38rem;
      font-size: 0.68rem;
      font-weight: 600;
      opacity: 0.76;
      letter-spacing: 0.03em;
    }
    .card.theme-pulse .menu-solo-amt {
      color: #7dffef;
    }
    .menu-solo-viz {
      width: 92%;
      height: 1.85rem;
      border-radius: 12px;
      overflow: hidden;
      background: linear-gradient(180deg, rgba(0, 48, 72, 0.5), rgba(0, 0, 0, 0.42));
      border: 1px solid rgba(0, 220, 255, 0.28);
      box-shadow: inset 0 0 12px rgba(0, 200, 255, 0.12);
      margin-top: auto;
      padding: 0.12rem 0.2rem;
      box-sizing: border-box;
      flex: 0 0 auto;
    }
    .card.theme-light .menu-solo-viz {
      background: linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.08));
      border-color: rgba(0,0,0,0.08);
      box-shadow: none;
    }
    .menu-solo .qr-wrap {
      flex: 1 1 auto;
      width: 100%;
      max-width: 11.5rem;
      height: auto;
      margin: 0.08rem auto 0.12rem;
      padding: 0.32rem;
      box-shadow: 0 8px 20px rgba(0, 8, 24, 0.35);
    }
    .menu-solo .qr-wrap svg,
    .menu-solo .qr-wrap .qr-img {
      width: 100%;
      height: auto;
      aspect-ratio: 1;
      max-width: 11.5rem;
    }

  </style>
</head>
<body>
  <div id="stage" class="pos-bottom-right">
    <div class="card theme-pulse size-md" id="card" hidden>
      <div class="viewport" id="viewport"></div>
      <div class="dots" id="dots" aria-hidden="true"></div>
      <div class="foot"><img class="eco-mark" src="/brand/pulsechain-mark.svg" alt="" width="34" height="34" /><span class="foot-word">PulseChain</span></div>
    </div>
  </div>
  <script>
    const stage = document.getElementById('stage')
    const card = document.getElementById('card')
    const viewport = document.getElementById('viewport')
    const dots = document.getElementById('dots')
    let state = null
    let idx = 0
    let timer = 0
    let leaveTimer = 0
    var lookTheme = 'cyan'

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    function offerVizHtml(row, tall) {
      if (row && row.barsSvg && String(row.barsSvg).indexOf('<svg') === 0) return row.barsSvg
      var steps = (row && row.strengths) || []
      var hd = !!tall
      var w = hd ? 720 : 180
      var h = hd ? 64 : 26
      var n = Math.max(1, Math.min(24, steps.length || 3))
      var padX = hd ? 18 : 3
      var padY = hd ? 10 : 3
      var gapRatio = hd ? 0.38 : 0.16
      var gap = Math.max(hd ? 6 : 1, Math.min(hd ? 14 : 2.5, ((w - padX * 2) / n) * gapRatio))
      var barW = Math.min(hd ? 32 : 10, Math.max(hd ? 8 : 2, (w - padX * 2 - gap * (n - 1)) / n))
      var groupW = n * barW + (n - 1) * gap
      var originX = (w - groupW) / 2
      var rx = hd ? barW / 2 : Math.min(1.2, barW / 2)
      var baseY = h - padY
      var path = ''
      var bars = ''
      var pts = []
      for (var i = 0; i < n; i++) {
        var raw = i < steps.length ? Number(steps[i]) : [2, 4, 3][i]
        var v = Math.max(0, Math.min(8, Number.isFinite(raw) ? raw : 2))
        var bx = originX + i * (barW + gap)
        var cx = bx + barW / 2
        var barH = ((h - padY * 2) * v) / 8
        var y = baseY - barH
        pts.push({ x: cx, y: y })
        if (v > 0) {
          var bh = Math.max(hd ? 3 : 1.4, barH)
          var by = baseY - bh
          bars += '<rect class="' + (hd ? 'menu-bar-hd' : 'menu-bar') + '" x="' + bx.toFixed(2) + '" y="' + by.toFixed(2) + '" width="' + barW.toFixed(2) + '" height="' + bh.toFixed(2) + '" rx="' + rx.toFixed(2) + '"' + (hd ? ' fill="url(#pv-bar)"' : '') + '/>'
        }
      }
      if (hd && pts.length) {
        path = 'M' + pts[0].x.toFixed(2) + ' ' + pts[0].y.toFixed(2)
        for (var pi = 0; pi < pts.length - 1; pi++) {
          var p0 = pts[pi - 1] || pts[pi]
          var p1 = pts[pi]
          var p2 = pts[pi + 1]
          var p3 = pts[pi + 2] || p2
          var c1x = p1.x + (p2.x - p0.x) / 6
          var c1y = p1.y + (p2.y - p0.y) / 6
          var c2x = p2.x - (p3.x - p1.x) / 6
          var c2y = p2.y - (p3.y - p1.y) / 6
          path += 'C' + c1x.toFixed(2) + ' ' + c1y.toFixed(2) + ' ' + c2x.toFixed(2) + ' ' + c2y.toFixed(2) + ' ' + p2.x.toFixed(2) + ' ' + p2.y.toFixed(2)
        }
      } else {
        for (var j = 0; j < pts.length; j++) {
          path += (j === 0 ? 'M' : 'L') + pts[j].x.toFixed(1) + ' ' + pts[j].y.toFixed(1) + ' '
        }
        path = path.trim()
      }
      var defs = hd
        ? '<defs><linearGradient id="pv-bar" x1="0" y1="' + padY + '" x2="0" y2="' + baseY + '" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="var(--viz-hi,#b8fff6)"/><stop offset="100%" stop-color="var(--viz-lo,#1a7dff)"/></linearGradient><linearGradient id="pv-path" x1="' + padX + '" y1="0" x2="' + (w - padX) + '" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="var(--viz-hi,#b8fff6)"/><stop offset="100%" stop-color="var(--viz-path,#7dffef)"/></linearGradient></defs>'
        : ''
      var area = ''
      if (hd && pts.length) {
        var last = pts[pts.length - 1]
        area = '<path class="menu-viz-fill" d="' + path + ' L' + last.x.toFixed(2) + ' ' + baseY.toFixed(2) + ' L' + pts[0].x.toFixed(2) + ' ' + baseY.toFixed(2) + ' Z"/>'
      }
      var pathEl = hd
        ? '<path class="menu-viz-path-hd" d="' + path + '" fill="none" stroke="url(#pv-path)"/>'
        : '<path class="menu-viz-path" d="' + path + '" fill="none"/>'
      return (
        '<svg class="menu-viz-svg' + (hd ? ' menu-viz-svg-hd' : '') + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="' + (hd ? 'xMidYMid meet' : 'none') + '" shape-rendering="geometricPrecision" aria-hidden="true">' +
          defs +
          '<line class="menu-viz-base" x1="' + padX + '" y1="' + baseY + '" x2="' + (w - padX) + '" y2="' + baseY + '"/>' +
          area +
          bars +
          pathEl +
        '</svg>'
      )
    }

    /* strip script closers from operator HTML (OBS inject) */
    function safeTpl(s) {
      return String(s || '').replace(/<\\/script/gi, '<\\\\/script')
    }

    function applySlideTemplate(tpl, builtin, q, pack) {
      var brandOr =
        String(q.brand || q.label || ${brandFallback}).trim() || ${brandFallback}
      var mapRaw = {
        default: builtin || '',
        qrSvg: q.qrSvg || '',
        ecoHtml: q.ecoHtml || '',
        packQrSvg: (pack && pack.qrSvg) || '',
        packLogo: pack && pack.logo
          ? '<img class="kq-mark" src="' + esc(pack.logo) + '" alt="" width="28" height="28" />'
          : '<span class="kq-mark kq-mark-empty" aria-hidden="true"></span>',
      }
      var mapEsc = {
        label: q.label || '',
        brand: q.brand || '',
        brandOrLabel: brandOr,
        address: q.address || '',
        shortAddress: q.shortAddress || '',
        menuSymbol: q.menuSymbol || 'PLS',
        packLabel: (pack && pack.label) || '',
        packBlurb: (pack && pack.blurb) || '',
        packEyebrow: (pack && pack.eyebrow) || '',
        packHost: (pack && pack.host) || '',
        packUrl: (pack && pack.url) || '',
      }
      var out = safeTpl(tpl)
      out = out.replace(/\\{\\{default\\}\\}/g, function () { return mapRaw.default })
      out = out.replace(/\\{\\{qrSvg\\}\\}/g, function () { return mapRaw.qrSvg })
      out = out.replace(/\\{\\{ecoHtml\\}\\}/g, function () { return mapRaw.ecoHtml })
      out = out.replace(/\\{\\{packQrSvg\\}\\}/g, function () { return mapRaw.packQrSvg })
      out = out.replace(/\\{\\{packLogo\\}\\}/g, function () { return mapRaw.packLogo })
      Object.keys(mapEsc).forEach(function (k) {
        out = out.replace(new RegExp('\\\\{\\\\{' + k + '\\\\}\\\\}', 'g'), esc(mapEsc[k]))
      })
      return out
    }

    function slideCustomKey(id) {
      if (id === 'qr' || id === 'brand' || id === 'eco' || id === 'how' || id === 'menu') return id
      if (typeof id === 'string' && id.indexOf('menu:') === 0) return 'menu'
      if (id === 'internetMoney' || id === 'tipWallet') return 'pack:tipWallet'
      if (typeof id === 'string' && id.indexOf('pack:') === 0) {
        return id === 'pack:internetMoney' ? 'pack:tipWallet' : id
      }
      return id
    }

    function packMeta(id, q) {
      var packId = null
      if (id === 'internetMoney' || id === 'tipWallet') packId = 'tipWallet'
      else if (typeof id === 'string' && id.indexOf('pack:') === 0) {
        packId = id.slice(5)
        if (packId === 'internetMoney') packId = 'tipWallet'
      }
      if (!packId) return null
      var meta = (q.packQrs && q.packQrs[packId]) || null
      if (!meta && packId === 'tipWallet') {
        return {
          label: 'Tip Wallet',
          blurb: 'Android EIP-681 PulseChain wallet for QR tips',
          url: q.tipWalletUrl || 'https://github.com/ihelpmaybe/Tip-wallet/releases/tag/0.1.0',
          host: (q.tipWalletUrl || 'https://github.com/ihelpmaybe/Tip-wallet/releases/tag/0.1.0').replace(/^https?:\\/\\//, '').replace(/\\/$/, ''),
          logo: '',
          eyebrow: 'Get a wallet',
          qrSvg: q.tipWalletQrSvg || '',
        }
      }
      return meta
    }

    function qrCardHtml(opts) {
      var eye = String(opts.eye || '').trim()
      var title = String(opts.title || '').trim()
      var caption = String(opts.caption || '').trim()
      var meta = String(opts.meta || '').trim()
      var logo = opts.logo
        ? '<img class="kq-mark" src="' + esc(opts.logo) + '" alt="" width="28" height="28" />'
        : '<span class="kq-mark kq-mark-empty" aria-hidden="true"></span>'
      return (
        '<div class="kq">' +
          '<div class="label">' + esc(eye || 'QR') + '</div>' +
          '<div class="kq-head">' +
            logo +
            '<div class="kq-title">' + esc(title || 'Scan') + '</div>' +
          '</div>' +
          (opts.qrSvg ? '<div class="qr-wrap">' + opts.qrSvg + '</div>' : '') +
          '<div class="kq-caption">' + esc(caption) + '</div>' +
          '<div class="kq-meta">' + esc(meta) + '</div>' +
        '</div>'
      )
    }

    function builtinSlideHtml(id, q) {
      if (id === 'qr') {
        if (!q.qrSvg) {
          return '<div class="slide-info"><div class="empty">Set a receive wallet on Home to show the tip QR.</div></div>'
        }
        return qrCardHtml({
          eye: 'Creator wallet',
          title: (q.brand || 'Tip wallet').trim(),
          logo: '/brand/pulsechain-mark.svg',
          qrSvg: q.qrSvg,
          caption: q.tipAmountLabel
            ? q.tipAmountLabel + ' · pays your receive wallet'
            : 'Scan → your receive wallet · not a token contract',
          meta: q.showAddress && q.shortAddress ? q.shortAddress : '',
        })
      }
      if (id === 'brand') {
        var name = (q.brand || q.label || ${brandFallback}).trim()
        return (
          '<div class="slide-info">' +
            '<div class="label">' + esc(q.label || 'Live tips') + '</div>' +
            '<div class="brand-big">' + esc(name) + '</div>' +
            '<div class="kq-caption">Crypto tips on PulseChain</div>' +
          '</div>'
        )
      }
      if (id === 'eco') {
        return (
          '<div class="slide-info">' +
            '<div class="label">Ecosystem</div>' +
            (q.ecoHtml || '') +
            '<div class="kq-caption">PLS · PulseX · HEX · PLSX</div>' +
          '</div>'
        )
      }
      /* Tip menu patterns — id "menu" or "menu:0", "menu:1", … */
      var menuPage = null
      if (id === 'menu') menuPage = 0
      else if (typeof id === 'string' && id.indexOf('menu:') === 0) {
        var mp = Number(id.slice(5))
        if (Number.isFinite(mp) && mp >= 0) menuPage = Math.floor(mp)
      }
      if (menuPage !== null) {
        var pages = q.menuPages || []
        var offers = pages[menuPage]
        if (!offers || !offers.length) {
          var flat = q.menuOffers || []
          if (flat.length) {
            var ps = 1
            offers = flat.slice(menuPage * ps, menuPage * ps + ps)
          }
        }
        if (!offers || !offers.length) {
          return (
            '<div class="slide-info">' +
              '<div class="label">Tip menu</div>' +
              '<div class="empty">No patterns offered yet — enable items on Tip menu.</div>' +
            '</div>'
          )
        }
        if (offers.length === 1) {
          var one = offers[0]
          var viz = '<div class="menu-solo-viz">' + offerVizHtml(one, true) + '</div>'
          var qrInner = one.qrSvg || q.qrSvg || ''
          var amtLabel = String(one.amountLabel || one.amount || '').trim()
          var amtParts = amtLabel.split(/\\s+/)
          var symTok = amtParts.length > 1 ? amtParts.pop() : (q.menuSymbol || 'PLS')
          var priceNum = amtParts.join(' ') || String(one.amount)
          var dur = one.timeSec > 0 ? Math.round(one.timeSec) + 's' : ''
          var symLine = [symTok, dur].filter(Boolean).join(' · ')
          return (
            '<div class="menu-solo' + (one.featured ? ' is-featured' : '') + '">' +
              '<div class="menu-solo-price">' +
                '<div class="menu-solo-amt">' + esc(priceNum) + '</div>' +
                (symLine ? '<div class="menu-solo-sym">' + esc(symLine) + '</div>' : '') +
              '</div>' +
              (qrInner ? '<div class="qr-wrap">' + qrInner + '</div>' : '') +
              viz +
            '</div>'
          )
        }
        var pageN = (pages.length || 1)
        /* One shared toy for the page → header only; mixed toys keep per-row notes */
        var sharedToy = ''
        var allSameToy = true
        for (var ti = 0; ti < offers.length; ti++) {
          var tn = String(offers[ti].note || '').trim()
          if (!tn) { allSameToy = false; break }
          if (!sharedToy) sharedToy = tn
          else if (tn !== sharedToy) { allSameToy = false; break }
        }
        if (!allSameToy) sharedToy = ''
        var head =
          '<div class="label">Tip menu</div>' +
          (sharedToy ? '<div class="menu-toy">' + esc(sharedToy) + '</div>' : '') +
          (pageN > 1
            ? '<div class="menu-page">Page ' + (menuPage + 1) + ' / ' + pageN + '</div>'
            : sharedToy
              ? ''
              : '<div class="menu-sub">Scan each QR · send the amount shown to this wallet</div>')
        var rows = offers.map(function (row) {
          var feat = row.featured ? ' is-featured' : ''
          var note = (!sharedToy && row.note)
            ? '<span class="menu-note">' + esc(row.note) + '</span>'
            : ''
          var viz = '<div class="menu-viz">' + offerVizHtml(row, false) + '</div>'
          var mini = row.qrSvg
            ? '<div class="menu-qr">' + row.qrSvg + '</div>'
            : ''
          var pitch = String(row.sellPitch || '').trim() || row.name
          return (
            '<div class="menu-row' + feat + '">' +
              '<div class="menu-name">' + esc(pitch) + note + '</div>' +
              '<div class="menu-amt">' + esc(row.amountLabel || row.amount) + '</div>' +
              mini +
              viz +
            '</div>'
          )
        }).join('')
        return head + '<div class="menu-list">' + rows + '</div>'
      }
      /* PulseChain pack QR: pack:<itemId> or legacy internetMoney → tipWallet */
      var packId = null
      if (id === 'internetMoney' || id === 'tipWallet') packId = 'tipWallet'
      else if (typeof id === 'string' && id.indexOf('pack:') === 0) {
        packId = id.slice(5)
        if (packId === 'internetMoney') packId = 'tipWallet'
      }
      if (packId) {
        var meta = (q.packQrs && q.packQrs[packId]) || null
        var pkSvg = meta && meta.qrSvg
          ? meta.qrSvg
          : (packId === 'tipWallet' ? (q.tipWalletQrSvg || '') : '')
        var pkUrl = meta && meta.url
          ? meta.url
          : (q.tipWalletUrl || 'https://github.com/ihelpmaybe/Tip-wallet/releases/tag/0.1.0')
        var pkLabel = meta && meta.label ? meta.label : 'Tip Wallet'
        var pkBlurb = meta && meta.blurb ? meta.blurb : 'Android EIP-681 PulseChain wallet for QR tips'
        var pkEye = meta && meta.eyebrow ? meta.eyebrow : 'Get a wallet'
        var pkHost = meta && meta.host
          ? meta.host
          : pkUrl.replace(/^https?:\\/\\//, '').replace(/\\/$/, '')
        var pkLogo = meta && meta.logo ? meta.logo : ''
        if (!pkSvg) {
          return '<div class="slide-info"><div class="empty">QR unavailable.</div></div>'
        }
        return qrCardHtml({
          eye: pkEye,
          title: pkLabel,
          logo: pkLogo || '',
          qrSvg: pkSvg,
          caption: 'Website link · ' + pkBlurb,
          meta: pkHost,
        })
      }
      // how
      return (
        '<div class="slide-info">' +
          '<div class="label">How to tip</div>' +
          '<div class="how-body">Menu shows the treats. This QR is the buy button.</div>' +
          '<ul class="how-list">' +
            '<li>Read the tip menu on stream (time · feel · price)</li>' +
            '<li>When this carousel shows a treat, scan that QR</li>' +
            '<li>Send the exact amount on PulseChain — that row buzzes</li>' +
          '</ul>' +
        '</div>'
      )
    }

    function slideHtml(id, q) {
      var builtin = builtinSlideHtml(id, q)
      var key = slideCustomKey(id)
      var map = q.slideHtml || {}
      var tpl = map[key]
      if (!tpl || !String(tpl).trim()) return builtin
      return applySlideTemplate(String(tpl).trim(), builtin, q, packMeta(id, q))
    }

    function applyCustomCss(css) {
      var el = document.getElementById('user-qr-css')
      if (!el) {
        el = document.createElement('style')
        el.id = 'user-qr-css'
        document.head.appendChild(el)
      }
      el.textContent = String(css || '').slice(0, 24000)
    }

    function stopCarousel() {
      clearTimeout(timer)
      clearTimeout(leaveTimer)
    }

    function renderDots(ids, active) {
      if (!ids || ids.length < 2) {
        dots.innerHTML = ''
        return
      }
      dots.innerHTML = ids.map(function (_, i) {
        return '<span class="' + (i === active ? 'on' : '') + '"></span>'
      }).join('')
    }

    function showSlide(i, animate) {
      if (!state || !state.slideIds || !state.slideIds.length) return
      var ids = state.slideIds
      idx = ((i % ids.length) + ids.length) % ids.length
      var id = ids[idx]
      var next = document.createElement('div')
      next.className = 'slide active'
      next.dataset.id = id
      next.innerHTML = slideHtml(id, state)

      var prev = viewport.querySelector('.slide.active')
      if (prev && animate && ids.length > 1) {
        prev.classList.remove('active')
        prev.classList.add('leaving')
        leaveTimer = setTimeout(function () {
          if (prev.parentNode) prev.parentNode.removeChild(prev)
        }, 400)
        viewport.appendChild(next)
      } else {
        viewport.innerHTML = ''
        viewport.appendChild(next)
      }
      renderDots(ids, idx)
      publishMenuFocus(id, state)
    }

    function menuOfferForSlide(id, q) {
      var menuPage = null
      if (id === 'menu') menuPage = 0
      else if (typeof id === 'string' && id.indexOf('menu:') === 0) {
        var mp = Number(id.slice(5))
        if (Number.isFinite(mp) && mp >= 0) menuPage = Math.floor(mp)
      }
      if (menuPage === null) return null
      var pages = (q && q.menuPages) || []
      var offers = pages[menuPage]
      if (!offers || !offers.length) {
        var flat = (q && q.menuOffers) || []
        offers = flat.slice(menuPage, menuPage + 1)
      }
      return offers && offers[0] ? offers[0] : null
    }

    function publishMenuFocus(id, q) {
      var offer = menuOfferForSlide(id, q)
      var body = offer
        ? { name: offer.name, amountLabel: offer.amountLabel || String(offer.amount || '') }
        : {}
      fetch('/api/overlay/focus', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(function () {})
    }

    function scheduleNext() {
      stopCarousel()
      if (!state || state.carousel === false || !state.slideIds || state.slideIds.length < 2) return
      // Use operator dwellSec directly (min/max enforced in normalizeOverlayQr).
      var dwell = Math.min(20, Math.max(1, Number(state.dwellSec) || 7)) * 1000
      timer = setTimeout(function () {
        showSlide(idx + 1, true)
        scheduleNext()
      }, dwell)
    }

    var loadTimer = 0
    var loadInFlight = false
    var esLive = null
    var esGen = 0

    function applyLookTheme(theme) {
      var t = String(theme || '')
      lookTheme = (t === 'pink' || t === 'gold' || t === 'soft' || t === 'cyan') ? t : lookTheme
      if (!card) return
      card.classList.remove('look-cyan', 'look-pink', 'look-gold', 'look-soft')
      if (lookTheme) card.classList.add('look-' + lookTheme)
    }

    function paint(q) {
      if (!q || typeof q !== 'object') return
      /* Slim SSE notice is { rev } — fetch the full payload instead. */
      if (q.rev != null && !('slideIds' in q) && !('qrSvg' in q)) return
      stopCarousel()
      var ids = (q.slideIds && q.slideIds.length) ? q.slideIds : []
      if (q.enabled === false || !ids.length) {
        card.hidden = true
        card.setAttribute('hidden', '')
        viewport.innerHTML = ''
        dots.innerHTML = ''
        publishMenuFocus('', q)
        return
      }
      state = q
      applyCustomCss(q.customCss)
      stage.className = 'pos-' + (q.position || 'bottom-right')
      card.className = 'card theme-' + (q.theme || 'pulse') + ' size-' + (q.size || 'md')
      applyLookTheme(lookTheme)
      if (q.carousel !== false && q.slideIds && q.slideIds.length > 1) {
        card.classList.add('is-carousel')
      }
      card.hidden = false
      card.removeAttribute('hidden')
      idx = 0
      showSlide(0, false)
      scheduleNext()
    }

    function retryLoad() {
      clearTimeout(loadTimer)
      loadTimer = setTimeout(loadQr, 1200)
    }

    function loadQr() {
      if (loadInFlight) return
      loadInFlight = true
      fetch('/api/overlay/qr?t=' + Date.now(), { cache: 'no-store' }).then(function (r) {
        return r.json()
      }).then(function (j) {
        loadInFlight = false
        if (j && j.qr) paint(j.qr)
        else retryLoad()
      }).catch(function () {
        loadInFlight = false
        retryLoad()
      })
    }

    function connect() {
      if (esLive) {
        try { esLive.close() } catch (e) {}
        esLive = null
      }
      var gen = ++esGen
      var es = new EventSource('/api/overlay/stream')
      esLive = es
      es.addEventListener('open', function () { loadQr() })
      es.addEventListener('qr', function (ev) {
        try {
          var d = JSON.parse(ev.data)
          if (d && (d.slideIds || d.qrSvg)) paint(d)
          else loadQr()
        } catch (e) {
          loadQr()
        }
      })
      es.addEventListener('style', function (ev) {
        try {
          var s = JSON.parse(ev.data)
          if (s && typeof s === 'object') {
            applyLookTheme(s.theme)
          }
        } catch (e) {}
      })
      es.addEventListener('menuStyle', function (ev) {
        try {
          var ms = JSON.parse(ev.data)
          if (ms && ms.theme) applyLookTheme(ms.theme)
        } catch (e) {}
      })
      // Tip pop-ups live on /overlay only — do not render tip SSE on the carousel.
      es.onerror = function () {
        if (gen !== esGen) return
        try { es.close() } catch (e) {}
        if (esLive === es) esLive = null
        setTimeout(function () {
          if (gen === esGen) connect()
        }, 1500)
      }
    }

    loadQr()
    fetch('/api/overlay/style', { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (j) {
      if (j && j.style) applyLookTheme(j.style.theme)
    }).catch(function () {})
    fetch('/api/overlay/menu-style', { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (j) {
      if (j && j.style && j.style.theme) applyLookTheme(j.style.theme)
    }).catch(function () {})
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
