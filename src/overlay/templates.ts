/**
 * Ready-made custom window packs for stream tip alerts.
 * Tokens: {{title}} {{subtitle}} {{eyebrow}} {{brand}} {{amount}} {{symbol}} {{source}}
 */
import type { OverlayPosition, OverlaySize } from './style'

export type OverlayTemplate = {
  id: string
  name: string
  blurb: string
  position?: OverlayPosition
  size?: OverlaySize
  html: string
  css: string
}

/** Scope reset so each pack owns the chrome. */
const SHELL = `.alert.theme-custom {
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  max-width: min(32rem, 92vw);
}`

export const OVERLAY_TEMPLATES: OverlayTemplate[] = [
  {
    id: 'rose-window',
    name: 'Rose window',
    blurb: 'Pink frame · gradient bar title strip',
    size: 'normal',
    html: `<div class="t-rose">
  <div class="t-rose-bar">{{brand}}</div>
  <div class="t-rose-body">
    <div class="t-rose-eye">{{eyebrow}}</div>
    <div class="t-rose-title">{{title}}</div>
    <div class="t-rose-sub">{{subtitle}}</div>
  </div>
</div>`,
    css: `${SHELL}
.t-rose {
  border: 3px solid #f0a0c0;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(160deg, #2a1020 0%, #120818 100%);
  box-shadow: 0 12px 40px rgba(0,0,0,.55), 0 0 0 1px rgba(255,180,210,.2);
}
.t-rose-bar {
  padding: .35rem .75rem;
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #120818;
  background: linear-gradient(90deg, #f0a0c0, #ffd0e0);
  min-height: 1.4rem;
}
.t-rose-bar:empty { display: none; }
.t-rose-body { padding: .85rem 1.1rem 1rem; }
.t-rose-eye {
  font-size: .7rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #f0a0c0;
  font-weight: 700;
  margin-bottom: .25rem;
}
.t-rose-title {
  font-size: clamp(1.5rem, 3.5vw, 2.2rem);
  font-weight: 800;
  color: #fff5fa;
  line-height: 1.1;
}
.t-rose-sub {
  margin-top: .35rem;
  font-size: .95rem;
  color: #e0b0c8;
  font-weight: 600;
}
.t-rose-sub:empty { display: none; }
`,
  },
  {
    id: 'neon-cyan',
    name: 'Neon cyan',
    blurb: 'Cyber glow · thin neon rim',
    size: 'normal',
    html: `<div class="t-neon">
  <div class="t-neon-brand">{{brand}}</div>
  <div class="t-neon-eye">{{eyebrow}}</div>
  <div class="t-neon-title">{{title}}</div>
  <div class="t-neon-sub">{{subtitle}}</div>
</div>`,
    css: `${SHELL}
.t-neon {
  padding: 1rem 1.25rem 1.1rem;
  border-radius: 4px;
  border: 1px solid #3de0ff;
  background: rgba(2, 12, 22, 0.92);
  box-shadow:
    0 0 0 1px rgba(61, 224, 255, 0.25),
    0 0 28px rgba(0, 200, 255, 0.35),
    inset 0 0 40px rgba(0, 120, 180, 0.12);
  font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
}
.t-neon-brand {
  font-size: .7rem;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: #3de0ff;
  margin-bottom: .35rem;
  text-shadow: 0 0 12px rgba(61, 224, 255, 0.8);
}
.t-neon-brand:empty { display: none; }
.t-neon-eye {
  font-size: .65rem;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: #7a9aac;
  margin-bottom: .3rem;
}
.t-neon-title {
  font-size: clamp(1.55rem, 3.6vw, 2.3rem);
  font-weight: 700;
  color: #e8fbff;
  text-shadow: 0 0 18px rgba(61, 224, 255, 0.55);
  line-height: 1.1;
}
.t-neon-sub {
  margin-top: .4rem;
  font-size: .88rem;
  color: #7ec8d8;
}
.t-neon-sub:empty { display: none; }
`,
  },
  {
    id: 'gold-vip',
    name: 'Gold VIP',
    blurb: 'Plaque · heavy gold edge',
    size: 'large',
    html: `<div class="t-vip">
  <div class="t-vip-seal">{{eyebrow}}</div>
  <div class="t-vip-brand">{{brand}}</div>
  <div class="t-vip-title">{{title}}</div>
  <div class="t-vip-sub">{{subtitle}}</div>
</div>`,
    css: `${SHELL}
.t-vip {
  padding: 1.15rem 1.5rem 1.2rem;
  border-radius: 6px;
  border: 2px solid #e8c060;
  background:
    linear-gradient(145deg, rgba(48, 36, 12, 0.95), rgba(18, 14, 6, 0.96));
  box-shadow:
    0 0 0 4px rgba(0,0,0,.35),
    0 16px 40px rgba(80, 50, 0, 0.45),
    inset 0 1px 0 rgba(255, 230, 160, 0.25);
  text-align: center;
}
.t-vip-seal {
  display: inline-block;
  padding: .2rem .65rem;
  margin-bottom: .45rem;
  font-size: .62rem;
  font-weight: 800;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: #1a1204;
  background: linear-gradient(90deg, #c9a045, #f0d878, #c9a045);
  border-radius: 999px;
}
.t-vip-brand {
  font-size: .8rem;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #f0d878;
  margin-bottom: .35rem;
}
.t-vip-brand:empty { display: none; }
.t-vip-title {
  font-size: clamp(1.75rem, 4vw, 2.6rem);
  font-weight: 800;
  color: #fff8e8;
  line-height: 1.05;
  text-shadow: 0 2px 0 rgba(0,0,0,.4);
}
.t-vip-sub {
  margin-top: .45rem;
  font-size: .95rem;
  color: #d4b878;
  font-weight: 600;
}
.t-vip-sub:empty { display: none; }
`,
  },
  {
    id: 'soft-glass',
    name: 'Soft glass',
    blurb: 'Frosted panel · quiet stream chrome',
    size: 'normal',
    html: `<div class="t-glass">
  <div class="t-glass-brand">{{brand}}</div>
  <div class="t-glass-eye">{{eyebrow}}</div>
  <div class="t-glass-title">{{title}}</div>
  <div class="t-glass-sub">{{subtitle}}</div>
</div>`,
    css: `${SHELL}
.t-glass {
  padding: 1rem 1.35rem 1.05rem;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.22);
  background: rgba(18, 22, 32, 0.55);
  backdrop-filter: blur(14px);
  box-shadow: 0 12px 36px rgba(0,0,0,.35);
}
.t-glass-brand {
  font-size: .78rem;
  font-weight: 600;
  color: rgba(255,255,255,0.7);
  margin-bottom: .2rem;
}
.t-glass-brand:empty { display: none; }
.t-glass-eye {
  font-size: .68rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: rgba(200, 220, 240, 0.75);
  margin-bottom: .3rem;
}
.t-glass-title {
  font-size: clamp(1.5rem, 3.4vw, 2.15rem);
  font-weight: 700;
  color: #f4f7fb;
  line-height: 1.12;
}
.t-glass-sub {
  margin-top: .35rem;
  font-size: .92rem;
  color: rgba(210, 220, 230, 0.85);
}
.t-glass-sub:empty { display: none; }
`,
  },
  {
    id: 'lower-third',
    name: 'Lower third',
    blurb: 'News ticker strip · bottom of frame',
    position: 'bottom',
    size: 'compact',
    html: `<div class="t-lt">
  <div class="t-lt-accent"></div>
  <div class="t-lt-inner">
    <span class="t-lt-eye">{{eyebrow}}</span>
    <span class="t-lt-brand">{{brand}}</span>
    <span class="t-lt-title">{{title}}</span>
    <span class="t-lt-sub">{{subtitle}}</span>
  </div>
</div>`,
    css: `${SHELL}
.alert.theme-custom { max-width: min(48rem, 94vw); }
.t-lt {
  display: flex;
  min-height: 3.1rem;
  border-radius: 2px;
  overflow: hidden;
  box-shadow: 0 8px 28px rgba(0,0,0,.5);
}
.t-lt-accent {
  width: 8px;
  flex-shrink: 0;
  background: linear-gradient(180deg, #ff4d6d, #c9184a);
}
.t-lt-inner {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .35rem .75rem;
  padding: .55rem 1rem;
  background: linear-gradient(90deg, #0c1018 0%, #141c28 100%);
}
.t-lt-eye {
  font-size: .65rem;
  font-weight: 800;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: #ff6b88;
}
.t-lt-brand {
  font-size: .75rem;
  font-weight: 700;
  color: #9eb0c4;
}
.t-lt-brand:empty { display: none; }
.t-lt-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: #fff;
}
.t-lt-sub {
  font-size: .85rem;
  color: #8a9bb0;
  width: 100%;
}
.t-lt-sub:empty { display: none; }
`,
  },
  {
    id: 'pulse-coin',
    name: 'Pulse coin',
    blurb: 'Round badge · amount-first',
    size: 'compact',
    html: `<div class="t-coin">
  <div class="t-coin-ring">
    <div class="t-coin-eye">{{eyebrow}}</div>
    <div class="t-coin-amt">{{amount}}</div>
    <div class="t-coin-sym">{{symbol}}</div>
  </div>
  <div class="t-coin-side">
    <div class="t-coin-brand">{{brand}}</div>
    <div class="t-coin-sub">{{subtitle}}</div>
  </div>
</div>`,
    css: `${SHELL}
.t-coin {
  display: flex;
  align-items: center;
  gap: .85rem;
  padding: .35rem .5rem .35rem .35rem;
  border-radius: 999px;
  background: rgba(6, 16, 28, 0.9);
  border: 1px solid rgba(0, 200, 255, 0.4);
  box-shadow: 0 10px 32px rgba(0,40,80,.45);
}
.t-coin-ring {
  width: 5.5rem;
  height: 5.5rem;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 35% 30%, #3a8fd0, #062038 70%);
  border: 3px solid #6ec8ff;
  box-shadow: inset 0 0 18px rgba(0,0,0,.4), 0 0 16px rgba(0,180,255,.35);
}
.t-coin-eye {
  font-size: .55rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #8fd4ff;
  font-weight: 700;
}
.t-coin-amt {
  font-size: 1.15rem;
  font-weight: 800;
  color: #fff;
  line-height: 1.1;
}
.t-coin-sym {
  font-size: .65rem;
  font-weight: 700;
  color: #6ec8ff;
}
.t-coin-side { padding-right: .65rem; min-width: 0; }
.t-coin-brand {
  font-size: .8rem;
  font-weight: 700;
  color: #a8d8f0;
}
.t-coin-brand:empty { display: none; }
.t-coin-sub {
  font-size: .85rem;
  color: #7aa8c0;
  margin-top: .15rem;
}
.t-coin-sub:empty { display: none; }
`,
  },
  {
    id: 'chat-bubble',
    name: 'Chat bubble',
    blurb: 'Speech balloon · casual live chat feel',
    size: 'normal',
    html: `<div class="t-bub">
  <div class="t-bub-brand">{{brand}}</div>
  <div class="t-bub-eye">{{eyebrow}}</div>
  <div class="t-bub-title">{{title}}</div>
  <div class="t-bub-sub">{{subtitle}}</div>
  <div class="t-bub-tail" aria-hidden="true"></div>
</div>`,
    css: `${SHELL}
.t-bub {
  position: relative;
  padding: 1rem 1.2rem 1.15rem;
  border-radius: 18px 18px 18px 4px;
  background: #1e2430;
  border: 2px solid #3d4a60;
  box-shadow: 0 10px 28px rgba(0,0,0,.4);
  max-width: min(26rem, 88vw);
}
.t-bub-brand {
  font-size: .78rem;
  font-weight: 700;
  color: #8eb4ff;
  margin-bottom: .15rem;
}
.t-bub-brand:empty { display: none; }
.t-bub-eye {
  font-size: .65rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #8898b0;
  margin-bottom: .25rem;
}
.t-bub-title {
  font-size: clamp(1.4rem, 3.2vw, 2rem);
  font-weight: 800;
  color: #f0f4fa;
  line-height: 1.15;
}
.t-bub-sub {
  margin-top: .35rem;
  font-size: .9rem;
  color: #a0b0c8;
}
.t-bub-sub:empty { display: none; }
.t-bub-tail {
  position: absolute;
  left: 18px;
  bottom: -12px;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 12px solid #3d4a60;
}
.t-bub-tail::after {
  content: "";
  position: absolute;
  left: -8px;
  top: -14px;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 10px solid #1e2430;
}
`,
  },
  {
    id: 'ticket-stub',
    name: 'Ticket stub',
    blurb: 'Perforated admit-one look',
    size: 'normal',
    html: `<div class="t-tix">
  <div class="t-tix-main">
    <div class="t-tix-eye">{{eyebrow}}</div>
    <div class="t-tix-title">{{title}}</div>
    <div class="t-tix-sub">{{subtitle}}</div>
  </div>
  <div class="t-tix-side">
    <div class="t-tix-admit">ADMIT</div>
    <div class="t-tix-brand">{{brand}}</div>
  </div>
</div>`,
    css: `${SHELL}
.t-tix {
  display: flex;
  border-radius: 10px;
  overflow: hidden;
  background: #f4efe4;
  color: #1a1410;
  box-shadow: 0 12px 32px rgba(0,0,0,.4);
  font-family: "Segoe UI", system-ui, sans-serif;
}
.t-tix-main {
  flex: 1;
  padding: .9rem 1.1rem;
  border-right: 2px dashed #b8a890;
  min-width: 0;
}
.t-tix-eye {
  font-size: .65rem;
  font-weight: 800;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: #a06040;
  margin-bottom: .25rem;
}
.t-tix-title {
  font-size: clamp(1.35rem, 3vw, 1.9rem);
  font-weight: 800;
  line-height: 1.1;
  color: #1a1410;
}
.t-tix-sub {
  margin-top: .3rem;
  font-size: .85rem;
  color: #5a5048;
}
.t-tix-sub:empty { display: none; }
.t-tix-side {
  width: 5.5rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .35rem;
  background: #1a1410;
  color: #f4efe4;
  padding: .5rem;
  text-align: center;
}
.t-tix-admit {
  font-size: .6rem;
  font-weight: 800;
  letter-spacing: .18em;
  color: #e8c060;
}
.t-tix-brand {
  font-size: .7rem;
  font-weight: 700;
  word-break: break-word;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  max-height: 5rem;
}
.t-tix-brand:empty::after { content: "ONE"; writing-mode: horizontal-tb; transform: none; }
`,
  },
  {
    id: 'matrix-term',
    name: 'Matrix term',
    blurb: 'Terminal green · on-chain vibe',
    size: 'normal',
    html: `<div class="t-mat">
  <div class="t-mat-head">root@pulse · tip</div>
  <div class="t-mat-line"><span class="t-mat-k">brand</span> {{brand}}</div>
  <div class="t-mat-line"><span class="t-mat-k">type</span> {{eyebrow}}</div>
  <div class="t-mat-line t-mat-hi"><span class="t-mat-k">amt</span> {{title}}</div>
  <div class="t-mat-line"><span class="t-mat-k">note</span> {{subtitle}}</div>
  <div class="t-mat-line"><span class="t-mat-k">src</span> {{source}}</div>
</div>`,
    css: `${SHELL}
.t-mat {
  padding: .85rem 1rem;
  border: 1px solid #1a5c2a;
  border-radius: 2px;
  background: #040a06;
  color: #3dff7a;
  font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
  font-size: .88rem;
  box-shadow: 0 0 24px rgba(20, 120, 50, 0.25), inset 0 0 40px rgba(0,40,10,.4);
  line-height: 1.45;
}
.t-mat-head {
  color: #1a8c40;
  margin-bottom: .45rem;
  padding-bottom: .35rem;
  border-bottom: 1px dashed #1a5c2a;
  font-size: .75rem;
}
.t-mat-k {
  display: inline-block;
  width: 3.2rem;
  color: #1a8c40;
  margin-right: .35rem;
}
.t-mat-hi { font-size: 1.15rem; font-weight: 700; color: #7dffb0; text-shadow: 0 0 10px rgba(61,255,122,.4); }
.t-mat-line { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`,
  },
  {
    id: 'arcade-cab',
    name: 'Arcade cab',
    blurb: '8‑bit score popup energy',
    size: 'normal',
    html: `<div class="t-arc">
  <div class="t-arc-score">HIGH SCORE</div>
  <div class="t-arc-brand">{{brand}}</div>
  <div class="t-arc-title">{{title}}</div>
  <div class="t-arc-sub">{{subtitle}}</div>
  <div class="t-arc-eye">{{eyebrow}}</div>
</div>`,
    css: `${SHELL}
.t-arc {
  padding: 1rem 1.15rem;
  border: 4px solid #fff;
  outline: 4px solid #ff2e63;
  background: #0d0221;
  box-shadow: 8px 8px 0 #08f7fe;
  text-align: center;
  font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
  image-rendering: pixelated;
}
.t-arc-score {
  font-size: .65rem;
  letter-spacing: .25em;
  color: #ff2e63;
  margin-bottom: .35rem;
}
.t-arc-brand {
  font-size: .75rem;
  color: #08f7fe;
  margin-bottom: .25rem;
}
.t-arc-brand:empty { display: none; }
.t-arc-title {
  font-size: clamp(1.5rem, 3.5vw, 2.2rem);
  font-weight: 800;
  color: #fff;
  line-height: 1.1;
  text-shadow: 3px 3px 0 #ff2e63;
}
.t-arc-sub {
  margin-top: .4rem;
  font-size: .8rem;
  color: #b0a0d0;
}
.t-arc-sub:empty { display: none; }
.t-arc-eye {
  margin-top: .55rem;
  font-size: .6rem;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: #08f7fe;
}
`,
  },
  {
    id: 'polaroid',
    name: 'Polaroid',
    blurb: 'Photo frame · caption under shot',
    size: 'normal',
    html: `<div class="t-pol">
  <div class="t-pol-shot">
    <div class="t-pol-eye">{{eyebrow}}</div>
    <div class="t-pol-title">{{title}}</div>
  </div>
  <div class="t-pol-cap">
    <span class="t-pol-brand">{{brand}}</span>
    <span class="t-pol-sub">{{subtitle}}</span>
  </div>
</div>`,
    css: `${SHELL}
.t-pol {
  width: min(18rem, 78vw);
  padding: .65rem .65rem 0;
  background: #f2f0ea;
  box-shadow: 0 14px 36px rgba(0,0,0,.45), 0 0 0 1px rgba(0,0,0,.08);
  transform: rotate(-1.5deg);
}
.t-pol-shot {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #1a2838, #0c141c);
  color: #fff;
  padding: 1rem;
  text-align: center;
}
.t-pol-eye {
  font-size: .65rem;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: #8ab4d0;
  margin-bottom: .4rem;
}
.t-pol-title {
  font-size: clamp(1.4rem, 3.2vw, 1.9rem);
  font-weight: 800;
  line-height: 1.1;
}
.t-pol-cap {
  min-height: 2.6rem;
  padding: .65rem .4rem .85rem;
  display: flex;
  flex-direction: column;
  gap: .15rem;
  text-align: center;
  color: #2a241c;
  font-family: Georgia, "Times New Roman", serif;
}
.t-pol-brand { font-size: .85rem; font-weight: 700; }
.t-pol-brand:empty { display: none; }
.t-pol-sub { font-size: .78rem; color: #5a5048; }
.t-pol-sub:empty { display: none; }
`,
  },
  {
    id: 'ribbon-banner',
    name: 'Ribbon banner',
    blurb: 'Wide streamer ribbon · top or bottom',
    position: 'top',
    size: 'compact',
    html: `<div class="t-rib">
  <div class="t-rib-fold" aria-hidden="true"></div>
  <div class="t-rib-main">
    <span class="t-rib-eye">{{eyebrow}}</span>
    <span class="t-rib-title">{{title}}</span>
    <span class="t-rib-sub">{{subtitle}}</span>
  </div>
  <div class="t-rib-fold t-rib-fold-r" aria-hidden="true"></div>
</div>`,
    css: `${SHELL}
.alert.theme-custom { max-width: min(40rem, 92vw); }
.t-rib {
  display: flex;
  align-items: stretch;
  filter: drop-shadow(0 8px 16px rgba(0,0,0,.4));
}
.t-rib-fold {
  width: 18px;
  background: #7a1238;
  clip-path: polygon(100% 0, 100% 100%, 0 50%);
}
.t-rib-fold-r {
  clip-path: polygon(0 0, 0 100%, 100% 50%);
  background: #7a1238;
}
.t-rib-main {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: .35rem .75rem;
  padding: .55rem 1.25rem;
  background: linear-gradient(180deg, #e83e6e, #b21e4b);
  color: #fff;
  text-align: center;
}
.t-rib-eye {
  font-size: .65rem;
  font-weight: 800;
  letter-spacing: .16em;
  text-transform: uppercase;
  opacity: .9;
}
.t-rib-title {
  font-size: 1.2rem;
  font-weight: 800;
}
.t-rib-sub {
  font-size: .8rem;
  opacity: .88;
  width: 100%;
}
.t-rib-sub:empty { display: none; }
`,
  },
  {
    id: 'esports-hud',
    name: 'Esports HUD',
    blurb: 'Angular competitive banner',
    size: 'normal',
    html: `<div class="t-es">
  <div class="t-es-tag">{{eyebrow}}</div>
  <div class="t-es-body">
    <div class="t-es-brand">{{brand}}</div>
    <div class="t-es-title">{{title}}</div>
    <div class="t-es-sub">{{subtitle}}</div>
  </div>
</div>`,
    css: `${SHELL}
.t-es {
  display: flex;
  clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px));
  background: linear-gradient(120deg, #0a0e16, #121a28);
  border: 1px solid #3d8bfd;
  box-shadow: 0 0 0 1px rgba(61,139,253,.2), 0 12px 32px rgba(0,0,0,.5);
}
.t-es-tag {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  padding: .5rem .35rem;
  background: #3d8bfd;
  color: #041018;
  font-size: .65rem;
  font-weight: 800;
  letter-spacing: .14em;
  text-transform: uppercase;
  text-align: center;
}
.t-es-body {
  padding: .85rem 1.25rem .9rem 1rem;
  min-width: 0;
}
.t-es-brand {
  font-size: .72rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #3d8bfd;
  margin-bottom: .2rem;
}
.t-es-brand:empty { display: none; }
.t-es-title {
  font-size: clamp(1.45rem, 3.3vw, 2.1rem);
  font-weight: 800;
  color: #f0f6ff;
  line-height: 1.1;
}
.t-es-sub {
  margin-top: .3rem;
  font-size: .88rem;
  color: #8aa4c0;
}
.t-es-sub:empty { display: none; }
`,
  },
  {
    id: 'chain-receipt',
    name: 'Chain receipt',
    blurb: 'Mini tx receipt · explorer-ish',
    size: 'normal',
    html: `<div class="t-rx">
  <div class="t-rx-top">
    <span class="t-rx-ok">CONFIRMED</span>
    <span class="t-rx-eye">{{eyebrow}}</span>
  </div>
  <div class="t-rx-title">{{title}}</div>
  <div class="t-rx-row"><span>Brand</span><span>{{brand}}</span></div>
  <div class="t-rx-row"><span>Detail</span><span>{{subtitle}}</span></div>
  <div class="t-rx-row"><span>Source</span><span>{{source}}</span></div>
  <div class="t-rx-row"><span>Asset</span><span>{{amount}} {{symbol}}</span></div>
</div>`,
    css: `${SHELL}
.t-rx {
  width: min(22rem, 90vw);
  padding: .9rem 1rem;
  border-radius: 8px;
  background: #0f1419;
  border: 1px solid #2a3544;
  box-shadow: 0 12px 32px rgba(0,0,0,.5);
  font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
  font-size: .8rem;
  color: #c8d4e0;
}
.t-rx-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: .55rem;
}
.t-rx-ok {
  font-size: .65rem;
  font-weight: 800;
  letter-spacing: .1em;
  color: #0d1a12;
  background: #3dff9a;
  padding: .15rem .4rem;
  border-radius: 3px;
}
.t-rx-eye {
  font-size: .65rem;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: #6a7a8c;
}
.t-rx-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: .65rem;
  font-family: "Segoe UI", system-ui, sans-serif;
}
.t-rx-row {
  display: flex;
  justify-content: space-between;
  gap: .75rem;
  padding: .28rem 0;
  border-top: 1px solid #1e2834;
}
.t-rx-row span:first-child { color: #6a7a8c; }
.t-rx-row span:last-child {
  text-align: right;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`,
  },
  {
    id: 'heart-drop',
    name: 'Heart drop',
    blurb: 'Cute tip heart · soft pastel',
    size: 'compact',
    html: `<div class="t-hrt">
  <div class="t-hrt-icon" aria-hidden="true">♥</div>
  <div class="t-hrt-body">
    <div class="t-hrt-eye">{{eyebrow}}</div>
    <div class="t-hrt-title">{{title}}</div>
    <div class="t-hrt-sub">{{subtitle}}</div>
    <div class="t-hrt-brand">{{brand}}</div>
  </div>
</div>`,
    css: `${SHELL}
.t-hrt {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .7rem .95rem .7rem .75rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff0f5, #ffe4ec);
  border: 2px solid #ff9ebd;
  box-shadow: 0 10px 28px rgba(180, 40, 90, 0.25);
  color: #4a1830;
}
.t-hrt-icon {
  width: 2.6rem;
  height: 2.6rem;
  flex-shrink: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 1.25rem;
  color: #fff;
  background: linear-gradient(145deg, #ff6b9d, #e83e6e);
  box-shadow: 0 4px 12px rgba(232, 62, 110, 0.4);
}
.t-hrt-eye {
  font-size: .62rem;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #c04070;
}
.t-hrt-title {
  font-size: 1.2rem;
  font-weight: 800;
  line-height: 1.15;
  color: #3a1228;
}
.t-hrt-sub {
  font-size: .8rem;
  color: #8a4060;
  margin-top: .1rem;
}
.t-hrt-sub:empty { display: none; }
.t-hrt-brand {
  font-size: .72rem;
  font-weight: 700;
  color: #b05070;
  margin-top: .1rem;
}
.t-hrt-brand:empty { display: none; }
`,
  },
  {
    id: 'midnight-card',
    name: 'Midnight card',
    blurb: 'Deep card · left accent rail',
    size: 'normal',
    html: `<div class="t-mid">
  <div class="t-mid-rail"></div>
  <div class="t-mid-body">
    <div class="t-mid-brand">{{brand}}</div>
    <div class="t-mid-eye">{{eyebrow}}</div>
    <div class="t-mid-title">{{title}}</div>
    <div class="t-mid-sub">{{subtitle}}</div>
  </div>
</div>`,
    css: `${SHELL}
.t-mid {
  display: flex;
  border-radius: 12px;
  overflow: hidden;
  background: #12141c;
  border: 1px solid #2a2e3c;
  box-shadow: 0 14px 36px rgba(0,0,0,.5);
}
.t-mid-rail {
  width: 6px;
  background: linear-gradient(180deg, #7c5cff, #3d8bfd);
  flex-shrink: 0;
}
.t-mid-body { padding: .95rem 1.2rem 1rem; min-width: 0; }
.t-mid-brand {
  font-size: .78rem;
  font-weight: 700;
  color: #9b8cff;
  margin-bottom: .15rem;
}
.t-mid-brand:empty { display: none; }
.t-mid-eye {
  font-size: .65rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: #6a7088;
  margin-bottom: .3rem;
}
.t-mid-title {
  font-size: clamp(1.5rem, 3.4vw, 2.2rem);
  font-weight: 800;
  color: #eef0f8;
  line-height: 1.1;
}
.t-mid-sub {
  margin-top: .35rem;
  font-size: .9rem;
  color: #8a90a8;
}
.t-mid-sub:empty { display: none; }
`,
  },
  {
    id: 'minimal-sash',
    name: 'Minimal sash',
    blurb: 'Bare amount + one line · low distraction',
    size: 'compact',
    html: `<div class="t-min">
  <span class="t-min-eye">{{eyebrow}}</span>
  <span class="t-min-title">{{title}}</span>
  <span class="t-min-sub">{{subtitle}}</span>
</div>`,
    css: `${SHELL}
.t-min {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: .35rem .65rem;
  padding: .45rem .9rem;
  border-radius: 999px;
  background: rgba(0,0,0,0.72);
  border: 1px solid rgba(255,255,255,0.18);
  box-shadow: 0 8px 24px rgba(0,0,0,.4);
}
.t-min-eye {
  font-size: .65rem;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.55);
}
.t-min-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
}
.t-min-sub {
  font-size: .8rem;
  color: rgba(255,255,255,0.65);
}
.t-min-sub:empty { display: none; }
`,
  },
  {
    id: 'fire-streak',
    name: 'Fire streak',
    blurb: 'Warm ember edge · big tip energy',
    size: 'large',
    html: `<div class="t-fire">
  <div class="t-fire-eye">{{eyebrow}}</div>
  <div class="t-fire-brand">{{brand}}</div>
  <div class="t-fire-title">{{title}}</div>
  <div class="t-fire-sub">{{subtitle}}</div>
</div>`,
    css: `${SHELL}
.t-fire {
  padding: 1.15rem 1.4rem 1.2rem;
  border-radius: 14px;
  background:
    linear-gradient(160deg, #2a0c08 0%, #120604 55%, #1a0a04 100%);
  border: 1px solid #ff6b35;
  box-shadow:
    0 0 0 1px rgba(255, 120, 40, 0.25),
    0 0 48px rgba(255, 80, 20, 0.28),
    0 16px 40px rgba(0,0,0,.5);
  text-align: center;
}
.t-fire-eye {
  font-size: .68rem;
  font-weight: 800;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: #ff9a5c;
  margin-bottom: .25rem;
}
.t-fire-brand {
  font-size: .8rem;
  font-weight: 700;
  color: #ffc090;
  margin-bottom: .3rem;
}
.t-fire-brand:empty { display: none; }
.t-fire-title {
  font-size: clamp(1.9rem, 4.5vw, 2.8rem);
  font-weight: 900;
  color: #fff5ee;
  line-height: 1.05;
  text-shadow: 0 0 24px rgba(255, 100, 40, 0.55);
}
.t-fire-sub {
  margin-top: .4rem;
  font-size: 1rem;
  color: #e0a080;
  font-weight: 600;
}
.t-fire-sub:empty { display: none; }
`,
  },
]

export function getOverlayTemplate(id: string): OverlayTemplate | undefined {
  return OVERLAY_TEMPLATES.find((t) => t.id === id)
}

/** Default “Load sample” pack (rose window). */
export const SAMPLE_CUSTOM_HTML = OVERLAY_TEMPLATES[0]!.html
export const SAMPLE_CUSTOM_CSS = OVERLAY_TEMPLATES[0]!.css
