/**
 * Inline tip-menu overlay preview for Stream Alerts (shadow DOM).
 */
import {
  OVERLAY_MENU_CSS,
  overlayMenuPanelHtml,
  overlayMenuStageClass,
} from './menuRender'
import {
  defaultOverlayMenuStyle,
  type OverlayMenuStyle,
} from './menuStyle'
import type { OverlayLadderRow } from './stage'

const PREVIEW_WRAP_CSS = `
:host { display: block; }
* { box-sizing: border-box; }
.frame {
  position: relative;
  min-height: 14.5rem;
  border-radius: calc(var(--radius, 14px) - 2px);
  border: 1px solid rgba(0, 200, 255, 0.18);
  background: #0a0e14;
  overflow: hidden;
}
.menu-stage {
  position: absolute;
  inset: 0;
  padding: 0.7rem 0.65rem;
}
.thumb {
  min-height: 6.4rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: #0a0e14;
  overflow: hidden;
  position: relative;
}
.thumb .menu-stage { padding: 0.45rem 0.4rem; }
.thumb .menu-panel { max-width: 100%; }
.thumb .menu-title { font-size: 0.72rem; }
.thumb .menu-name, .thumb .menu-amt, .thumb .menu-hold { font-size: 0.68rem; }
.thumb .menu-cols-head { font-size: 0.48rem; }
.thumb .menu-wave-svg { width: 2.6rem; height: 0.8rem; }
`

export type MenuPreviewHandle = {
  refresh: (style: OverlayMenuStyle, rows: OverlayLadderRow[]) => void
}

function mountFrame(host: HTMLElement, extraClass: string): MenuPreviewHandle {
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = `
    <style>${OVERLAY_MENU_CSS}${PREVIEW_WRAP_CSS}</style>
    <div class="${extraClass}">
      <div class="menu-stage layout-waves pos-top-left size-normal theme-cyan" id="stage"></div>
    </div>
  `
  const stage = shadow.getElementById('stage')!

  return {
    refresh(style, rows) {
      const s = style || defaultOverlayMenuStyle
      stage.className = overlayMenuStageClass(s)
      stage.innerHTML = overlayMenuPanelHtml(rows, s)
    },
  }
}

export function mountMenuPreview(host: HTMLElement): MenuPreviewHandle {
  return mountFrame(host, 'frame')
}

export function mountMenuThumb(host: HTMLElement): MenuPreviewHandle {
  return mountFrame(host, 'thumb')
}
