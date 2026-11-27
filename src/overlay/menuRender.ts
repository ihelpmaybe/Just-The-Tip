/**
 * Shared tip-menu overlay markup + CSS (OBS page and operator preview).
 */
import {
  defaultOverlayMenuStyle,
  type OverlayMenuStyle,
} from './menuStyle'
import {
  filterVisibleOverlayRows,
  slimOverlayLadder,
  sortOverlayRowsByToy,
  type OverlayLadderRow,
} from './stage'
import { overlayHoldLabel, overlayWaveIconSvg } from './waveIcon'

export function escapeMenuHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function overlayMenuStageClass(style: OverlayMenuStyle): string {
  const s = style || defaultOverlayMenuStyle
  return [
    'menu-stage',
    `layout-${s.layout}`,
    `pos-${s.position}`,
    `size-${s.size}`,
    `theme-${s.theme}`,
  ].join(' ')
}

export function prepareOverlayMenuRows(
  raw: unknown,
  style: OverlayMenuStyle,
): OverlayLadderRow[] {
  const rows = slimOverlayLadder(raw, {
    limit: style.maxRows,
    featuredFirst: false,
  })
  const visible = filterVisibleOverlayRows(rows, style.visibleOfferIds)
  return sortOverlayRowsByToy(visible)
}

function coinOf(row: OverlayLadderRow): string {
  const parts = row.amountLabel.trim().split(/\s+/)
  return parts.length > 1 ? parts[parts.length - 1]! : ''
}

export function groupOverlayMenuRows(
  rows: OverlayLadderRow[],
): Array<{ title: string; rows: OverlayLadderRow[] }> {
  if (!rows.length) return []
  const map = new Map<string, OverlayLadderRow[]>()
  for (const row of rows) {
    const key = row.note || coinOf(row) || 'Tips'
    const list = map.get(key) || []
    list.push(row)
    map.set(key, list)
  }
  return [...map.entries()].map(([title, group]) => ({ title, rows: group }))
}

function rowMetaHtml(row: OverlayLadderRow, style: OverlayMenuStyle): string {
  const bits: string[] = []
  if (style.showNote && row.note) {
    bits.push(`<span class="menu-note">${escapeMenuHtml(row.note)}</span>`)
  }
  if (style.showBlurb && row.name) {
    bits.push(`<span class="menu-tag">${escapeMenuHtml(row.name)}</span>`)
  }
  return bits.length ? `<p class="menu-meta">${bits.join(' · ')}</p>` : ''
}

function waveRowHtml(row: OverlayLadderRow, style: OverlayMenuStyle): string {
  const feat = row.featured ? ' feat' : ''
  const key = `${row.name.toLowerCase()}|${row.amountLabel.toLowerCase()}`
  return `<li class="menu-row${feat}" data-focus="${escapeMenuHtml(key)}"><span class="menu-amt">${escapeMenuHtml(row.amountLabel)}<span class="menu-cta">Scan</span></span><span class="menu-hold">${escapeMenuHtml(overlayHoldLabel(row))}</span><span class="menu-wave">${overlayWaveIconSvg(row.strengths)}</span>${rowMetaHtml(row, style)}</li>`
}

function waveHeadHtml(): string {
  return '<div class="menu-cols-head" aria-hidden="true"><span>Price</span><span>Time</span><span>Feel</span></div>'
}

function headHtml(style: OverlayMenuStyle): string {
  const brand = String(style.brand || '').trim()
  const headline = String(style.headline || '').trim()
  if (!brand && !headline) return ''
  return `<header class="menu-head">${
    brand ? `<p class="menu-brand">${escapeMenuHtml(brand)}</p>` : ''
  }${headline ? `<h1 class="menu-title">${escapeMenuHtml(headline)}</h1>` : ''}</header>`
}

export function overlayMenuInnerHtml(
  rows: OverlayLadderRow[],
  style: OverlayMenuStyle,
): string {
  if (!rows.length) {
    return `${headHtml(style)}<p class="menu-empty">Tick treats below to show them on stream</p>`
  }
  const groups = groupOverlayMenuRows(rows)
  const body = groups
    .map((g) => {
      const h = g.title
        ? `<h2 class="menu-group-title">${escapeMenuHtml(g.title)}</h2>`
        : ''
      return `<section class="menu-group">${h}<ol class="menu-list">${g.rows.map((r) => waveRowHtml(r, style)).join('')}</ol></section>`
    })
    .join('')
  return `${headHtml(style)}${waveHeadHtml()}${body}`
}

export function overlayMenuPanelHtml(
  raw: unknown,
  style: OverlayMenuStyle,
): string {
  const rows = prepareOverlayMenuRows(raw, style)
  return `<div class="menu-panel" style="--menu-panel-a:${style.opacity}">${overlayMenuInnerHtml(rows, style)}</div>`
}

/** OBS + preview stylesheet. Panel uses --menu-panel-a; text stays opaque. */
export const OVERLAY_MENU_CSS = `
.menu-stage {
  position: fixed;
  inset: 0;
  pointer-events: none;
  display: flex;
  padding: 4.5vh 3.2vw;
  font-family: "Segoe UI", system-ui, sans-serif;
  color: #f4f8fc;
  --menu-accent: #7ad7ff;
  --menu-line: rgba(122, 215, 255, 0.32);
  --menu-feat: #ffe08a;
}
.menu-stage.pos-bottom { align-items: flex-end; justify-content: center; }
.menu-stage.pos-top { align-items: flex-start; justify-content: center; }
.menu-stage.pos-bottom-left { align-items: flex-end; justify-content: flex-start; }
.menu-stage.pos-bottom-right { align-items: flex-end; justify-content: flex-end; }
.menu-stage.pos-top-left { align-items: flex-start; justify-content: flex-start; }
.menu-stage.pos-top-right { align-items: flex-start; justify-content: flex-end; }

.menu-stage.theme-cyan { --menu-accent: #7ad7ff; --menu-line: rgba(122, 215, 255, 0.32); --menu-feat: #ffe08a; }
.menu-stage.theme-pink { --menu-accent: #ff9ad4; --menu-line: rgba(255, 154, 212, 0.34); --menu-feat: #ffd0ea; }
.menu-stage.theme-gold { --menu-accent: #f0c36a; --menu-line: rgba(240, 195, 106, 0.36); --menu-feat: #ffe9b0; }
.menu-stage.theme-soft { --menu-accent: #c8d4e4; --menu-line: rgba(200, 212, 228, 0.28); --menu-feat: #ffffff; }

.menu-panel {
  pointer-events: none;
  min-width: 11.5rem;
  max-width: min(28rem, 92vw);
  padding: 0.55rem 0.7rem 0.6rem;
  border-radius: 12px;
  border: 1px solid var(--menu-line);
  background: rgba(6, 14, 24, var(--menu-panel-a, 0.78));
  color: #f4f8fc;
}
.menu-stage.size-compact .menu-panel { max-width: 16.5rem; padding: 0.42rem 0.55rem 0.48rem; }
.menu-stage.size-large .menu-panel { max-width: min(36rem, 94vw); padding: 0.7rem 0.85rem 0.75rem; }
.menu-stage.layout-cols .menu-panel,
.menu-stage.layout-cards .menu-panel,
.menu-stage.layout-grouped .menu-panel { max-width: min(34rem, 94vw); }
.menu-stage.layout-waves .menu-panel { min-width: 13.2rem; max-width: 18.8rem; }

.menu-cols-head {
  display: grid;
  grid-template-columns: minmax(4.4rem, 1fr) 2.5rem 3.7rem;
  column-gap: 0.4rem;
  margin: 0 0 0.18rem;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(220, 230, 240, 0.42);
}

.menu-head { margin: 0 0 0.4rem; }
.menu-brand {
  margin: 0 0 0.08rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--menu-accent);
  opacity: 0.92;
}
.menu-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 750;
  letter-spacing: 0.02em;
  color: #f7fbff;
}
.menu-stage.size-compact .menu-title { font-size: 0.8rem; }
.menu-stage.size-large .menu-title { font-size: 1.08rem; }

.menu-empty {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.35;
  color: rgba(230, 240, 250, 0.78);
  max-width: 16rem;
}

.menu-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}
.menu-stage.layout-cols .menu-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 1.1rem;
  row-gap: 0.12rem;
}

.menu-row,
.menu-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  column-gap: 0.75rem;
  row-gap: 0.05rem;
  padding: 0.12rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.menu-row:last-child,
.menu-card:last-child { border-bottom: none; }
.menu-stage.layout-waves .menu-row {
  grid-template-columns: minmax(4.4rem, 1fr) 2.5rem 3.7rem;
  align-items: center;
  column-gap: 0.4rem;
}
.menu-hold {
  font-size: 0.82rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: #e8eef6;
}
.menu-wave {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: #f4f8fc;
}
.menu-wave-svg {
  display: block;
  width: 3.4rem;
  height: 1.05rem;
}
.menu-stage.layout-waves .menu-amt {
  justify-self: start;
  font-size: 0.82rem;
}
.menu-row.feat .menu-hold,
.menu-row.feat .menu-wave { color: var(--menu-feat); }
.menu-name {
  min-width: 0;
  font-size: 0.92rem;
  font-weight: 650;
  color: #f4f8fc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.menu-amt {
  font-size: 0.88rem;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
  color: var(--menu-accent);
  white-space: nowrap;
}
.menu-row.feat .menu-name,
.menu-card.feat .menu-name { color: var(--menu-feat); }
.menu-badge {
  display: inline-block;
  margin-right: 0.35rem;
  padding: 0.05rem 0.28rem;
  border-radius: 4px;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  vertical-align: 0.08em;
  color: #1a1408;
  background: var(--menu-feat);
}
.menu-cta {
  display: none;
  margin-left: 0.35rem;
  padding: 0.04rem 0.28rem;
  border-radius: 4px;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #041018;
  background: var(--menu-accent);
}
.menu-row.is-focus,
.menu-card.is-focus {
  border-color: var(--menu-accent);
  background: rgba(122, 215, 255, 0.12);
}
.menu-row.is-focus .menu-cta,
.menu-card.is-focus .menu-cta { display: inline; }
.menu-meta {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 0.68rem;
  line-height: 1.25;
  color: rgba(220, 230, 240, 0.72);
}
.menu-note { font-weight: 650; }
.menu-tag { font-weight: 500; opacity: 0.85; }

.menu-stage.size-compact .menu-name { font-size: 0.8rem; }
.menu-stage.size-compact .menu-amt { font-size: 0.76rem; }
.menu-stage.size-compact .menu-hold { font-size: 0.72rem; }
.menu-stage.size-compact .menu-wave-svg { width: 2.8rem; height: 0.9rem; }
.menu-stage.size-large .menu-name { font-size: 1.08rem; }
.menu-stage.size-large .menu-amt { font-size: 1rem; }
.menu-stage.size-large .menu-hold { font-size: 0.95rem; }
.menu-stage.size-large .menu-wave-svg { width: 4rem; height: 1.2rem; }

.menu-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.4rem;
}
.menu-stage.size-large.layout-cards .menu-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.menu-card {
  margin: 0;
  padding: 0.4rem 0.48rem 0.42rem;
  border: 1px solid var(--menu-line);
  border-radius: 8px;
  background: rgba(4, 10, 18, 0.35);
}

.menu-group { margin: 0 0 0.55rem; }
.menu-group:last-child { margin-bottom: 0; }
.menu-group-title {
  margin: 0 0 0.22rem;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--menu-accent);
}
`
