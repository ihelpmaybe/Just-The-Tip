/**
 * Map the tip-alert look onto the QR carousel (and leftover menu-style SSE).
 * Uses existing theme enums only — no new operator settings.
 */
import type { OverlayStyle } from './style'
import {
  normalizeOverlayMenuStyle,
  type OverlayMenuStyle,
  type OverlayMenuTheme,
} from './menuStyle'

/** Template packs → nearest built-in overlay palette. */
export const TEMPLATE_OVERLAY_THEME: Record<string, OverlayMenuTheme> = {
  'rose-window': 'pink',
  'neon-cyan': 'cyan',
  'gold-vip': 'gold',
  'soft-glass': 'soft',
  'lower-third': 'cyan',
  'pulse-coin': 'cyan',
  'chat-bubble': 'pink',
  'ticket-stub': 'gold',
  'matrix-term': 'cyan',
  'arcade-cab': 'gold',
  'polaroid': 'soft',
  'ribbon-banner': 'pink',
  'esports-hud': 'cyan',
  'chain-receipt': 'cyan',
  'heart-drop': 'pink',
  'midnight-card': 'soft',
  'minimal-sash': 'soft',
  'fire-streak': 'gold',
}

export function cohesiveMenuTheme(
  style: OverlayStyle,
  templateId?: string,
): OverlayMenuTheme {
  const t = String(style?.theme || '')
  if (t === 'pink' || t === 'gold' || t === 'soft' || t === 'cyan') return t
  const fromPack = templateId
    ? TEMPLATE_OVERLAY_THEME[templateId]
    : undefined
  return fromPack || 'cyan'
}

/** Copy alert look onto the always-on menu board (no extra operator controls). */
export function menuStyleFromAlert(
  menu: OverlayMenuStyle,
  style: OverlayStyle,
  templateId?: string,
): OverlayMenuStyle {
  const brand = String(style.brand || '').trim().slice(0, 48)
  return normalizeOverlayMenuStyle({
    ...menu,
    layout: 'waves',
    theme: cohesiveMenuTheme(style, templateId),
    size: style.size,
    brand,
    headline: brand || 'Tip menu',
    featuredFirst: false,
    showNote: false,
    showBlurb: false,
  })
}
