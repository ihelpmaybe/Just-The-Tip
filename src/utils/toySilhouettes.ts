/**
 * Stylized SVG silhouettes for tip-menu toy tiles — not official product art.
 */

export function toyShapeKind(toyType: string, name: string): string {
  const blob = `${toyType} ${name}`.toLowerCase()
  if (/clamp|magnet|nipple|gemini/.test(blob)) return 'clamps'
  if (/panty|flexer|ferri/.test(blob)) return 'wearable'
  if (/machine|sex machine/.test(blob)) return 'machine'
  if (/solace|thrust|gravity|ridge|gush/.test(blob)) return 'thrust'
  if (/max|air|pump/.test(blob)) return 'max'
  if (/nora|rotate/.test(blob)) return 'nora'
  if (/edge|dolce|lapis|vulse/.test(blob)) return 'dual'
  if (
    /domi|ambi|osci|hyphy|exomoon|calor|tenera|mission|amaze|bloom|diamo/.test(
      blob,
    )
  ) {
    return 'wand'
  }
  if (/hush|plug/.test(blob)) return 'plug'
  if (/lush|bullet|egg/.test(blob)) return 'egg'
  return 'egg'
}

/** Minimal inline SVG glyph for a shape family (viewBox 0 0 80 120). */
export function silhouetteSvg(kind: string): string {
  const fill = 'var(--sil-c1, #e8a070)'
  const fill2 = 'var(--sil-c2, #c45c4a)'
  switch (kind) {
    case 'wand':
      return `<svg class="sil" viewBox="0 0 80 120" aria-hidden="true"><rect x="32" y="8" width="16" height="52" rx="8" fill="${fill}"/><ellipse cx="40" cy="78" rx="22" ry="28" fill="${fill2}"/><circle cx="40" cy="74" r="8" fill="rgba(255,255,255,0.25)"/></svg>`
    case 'plug':
      return `<svg class="sil" viewBox="0 0 80 120" aria-hidden="true"><ellipse cx="40" cy="28" rx="18" ry="22" fill="${fill}"/><path d="M22 40 C22 70 28 88 40 100 C52 88 58 70 58 40 Z" fill="${fill2}"/><rect x="28" y="98" width="24" height="10" rx="4" fill="${fill2}"/></svg>`
    case 'egg':
      return `<svg class="sil" viewBox="0 0 80 120" aria-hidden="true"><ellipse cx="40" cy="48" rx="22" ry="32" fill="${fill}"/><path d="M40 78 V104" stroke="${fill2}" stroke-width="3" stroke-linecap="round" opacity="0.7"/><circle cx="40" cy="40" r="6" fill="rgba(255,255,255,0.28)"/></svg>`
    case 'dual':
      return `<svg class="sil" viewBox="0 0 80 120" aria-hidden="true"><path d="M20 30 C18 55 22 80 28 100 L36 100 C34 78 32 50 34 30 Z" fill="${fill}"/><path d="M60 30 C62 55 58 80 52 100 L44 100 C46 78 48 50 46 30 Z" fill="${fill2}"/><ellipse cx="40" cy="24" rx="24" ry="12" fill="${fill2}"/></svg>`
    case 'nora':
      return `<svg class="sil" viewBox="0 0 80 120" aria-hidden="true"><ellipse cx="36" cy="52" rx="16" ry="40" fill="${fill}" transform="rotate(-12 36 52)"/><circle cx="58" cy="36" r="16" fill="${fill2}"/><circle cx="60" cy="34" r="5" fill="rgba(255,255,255,0.3)" class="rotor"/></svg>`
    case 'max':
      return `<svg class="sil" viewBox="0 0 80 120" aria-hidden="true"><path d="M22 28 C20 50 22 78 28 104 L52 104 C58 78 60 50 58 28 Z" fill="${fill}"/><ellipse cx="40" cy="32" rx="20" ry="12" fill="${fill2}"/><path d="M30 48 Q40 58 50 48" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="3" class="air"/></svg>`
    case 'thrust':
      return `<svg class="sil" viewBox="0 0 80 120" aria-hidden="true"><rect x="28" y="18" width="24" height="70" rx="12" fill="${fill}" class="shaft"/><rect x="22" y="88" width="36" height="18" rx="6" fill="${fill2}"/><circle cx="40" cy="36" r="7" fill="rgba(255,255,255,0.3)"/></svg>`
    case 'clamps':
      return `<svg class="sil" viewBox="0 0 80 120" aria-hidden="true"><circle cx="24" cy="44" r="14" fill="${fill}"/><circle cx="56" cy="44" r="14" fill="${fill2}"/><path d="M28 56 C34 72 46 72 52 56" fill="none" stroke="${fill2}" stroke-width="4"/><rect x="18" y="70" width="12" height="28" rx="4" fill="${fill2}"/><rect x="50" y="70" width="12" height="28" rx="4" fill="${fill2}"/></svg>`
    case 'wearable':
      return `<svg class="sil" viewBox="0 0 80 120" aria-hidden="true"><ellipse cx="40" cy="50" rx="28" ry="16" fill="${fill}"/><ellipse cx="40" cy="50" rx="14" ry="10" fill="rgba(0,0,0,0.2)"/><path d="M18 58 Q40 88 62 58" fill="none" stroke="${fill2}" stroke-width="4"/></svg>`
    case 'machine':
      return `<svg class="sil" viewBox="0 0 80 120" aria-hidden="true"><rect x="12" y="70" width="56" height="32" rx="6" fill="${fill2}"/><rect x="34" y="24" width="12" height="52" rx="4" fill="${fill}" class="shaft"/><circle cx="40" cy="22" r="10" fill="${fill}"/></svg>`
    default:
      return silhouetteSvg('egg')
  }
}

/** Short display name for tiles (strip “ · family” suffixes). */
export function shortToyLabel(name: string, toyType?: string, id?: string): string {
  const raw = (name || toyType || id || 'Toy').trim()
  const head = raw.split(/\s*·\s*/)[0]?.trim() || raw
  return head
}
