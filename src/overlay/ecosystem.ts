/**
 * PulseChain ecosystem logos for stream tip alerts.
 * Sourced from the free PulseChain pack (see pulseBundle.ts).
 */

import {
  pulsePackEcoItems,
  type PulsePackItem,
} from './pulseBundle'

export type EcoLogoItem = {
  id: string
  label: string
  /** Public path under site root */
  src: string
  href: string
}

function toEco(it: PulsePackItem): EcoLogoItem | null {
  if (!it.logo) return null
  return {
    id: it.id,
    label: it.label,
    src: it.logo,
    href: it.url,
  }
}

export const ECOSYSTEM_LOGOS: EcoLogoItem[] = pulsePackEcoItems()
  .map(toEco)
  .filter((x): x is EcoLogoItem => Boolean(x))

export function ecosystemLogoItems(): EcoLogoItem[] {
  return ECOSYSTEM_LOGOS
}

/** HTML strip for tip alerts / templates (`{{eco}}`). Size CSS-controlled. */
export function ecosystemLogosHtml(size = 22): string {
  const items = ECOSYSTEM_LOGOS.map(
    (it) =>
      `<span class="eco-item" title="${it.label}" data-eco="${it.id}">` +
      `<img class="eco-img" src="${it.src}" width="${size}" height="${size}" alt="${it.label}" decoding="async" />` +
      `<span class="eco-label">${it.label}</span>` +
      `</span>`,
  ).join('')
  return `<div class="eco" aria-label="PulseChain ecosystem">${items}</div>`
}

/** @deprecated use ecosystemLogosHtml — kept for callers expecting inline SVG */
export function pulsechainMarkSvg(size = 22): string {
  return `<img class="eco-img" src="/brand/pulsechain-mark.svg" width="${size}" height="${size}" alt="PulseChain" decoding="async" />`
}
