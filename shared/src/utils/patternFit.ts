/**
 * Pattern ↔ toy capabilities for the tip menu.
 *
 * Specialty patterns stay gated: rotate only with rotate (Nora), thrust only
 * thrusters, multi only dual-motor.
 *
 * Vibe (no special needs) patterns appear on **any toy that can vibrate** —
 * including Nora (rotate+vibe), Max (air+vibe), Gemini. Users do not need a
 * second catalog “vibe only” toy to get the standard ladder on Nora.
 *
 * Simultaneous packages (tag `combo` / “sync” Nora lines) still `needs` the
 * specialty axis for menu fit, but play with driveAxis `full` so Connect gets
 * both channels (e.g. Vibrate+Rotate) in one Function step.
 *
 *  Pattern.needs                  Typical toys
 *  []                             Lush, Nora, Max, Gemini (vibe motor)
 *  ['multi']                      Edge, Dolce, Gemini
 *  ['rotate']                     Nora (head only, or combo with tag combo)
 *  ['air']                        Max
 *  ['thrust']                     Solace
 */

export type ChannelNeed = 'multi' | 'rotate' | 'air' | 'thrust'

/** Primary product family used for tip-menu matching. */
export type ToyFamily = 'vibe' | 'multi' | 'rotate' | 'air' | 'thrust'

export const CHANNEL_NEEDS: {
  id: ChannelNeed
  label: string
}[] = [
  { id: 'multi', label: 'multi' },
  { id: 'rotate', label: 'rotate' },
  { id: 'air', label: 'air' },
  { id: 'thrust', label: 'thrust' },
]

export type CapabilitySource = {
  id?: string
  motors?: number
  secondary?: {
    rotate?: boolean
    air?: boolean
    pump?: boolean
    thrust?: boolean
  }
  functions?: string[]
  name?: string
  toyType?: string
  connected?: boolean
}

/** Channels a toy can drive beyond base vibrate. */
export function toyChannels(toy: CapabilitySource): Set<ChannelNeed> {
  const out = new Set<ChannelNeed>()
  const blob =
    `${toy.name || ''} ${toy.toyType || ''} ${(toy.functions || []).join(' ')}`.toLowerCase()
  const motors = Math.max(1, Number(toy.motors) || 1)
  if (motors >= 2) out.add('multi')
  // Connect/BLE sometimes report motors:1 for known dual vibes — trust the model name.
  if (
    /gemini|edge|dolce|lapis|magnet|clamp|twin|dual|n0104/.test(blob) &&
    !/\bnora\b|\bmax\b|\bsolace\b/.test(blob)
  ) {
    out.add('multi')
  }
  if (toy.secondary?.rotate || /rotate|\bnora\b/.test(blob)) out.add('rotate')
  if (
    toy.secondary?.air ||
    toy.secondary?.pump ||
    /\bair\b|pump|suction|\bmax\b/.test(blob)
  ) {
    out.add('air')
  }
  if (toy.secondary?.thrust || /thrust|\bsolace\b/.test(blob)) {
    out.add('thrust')
  }
  return out
}

/**
 * Toy reports a vibration function (default yes for Lovense inventory).
 */
export function toyCanVibrate(toy: CapabilitySource): boolean {
  const f = (toy.functions || []).map((x) => String(x).toLowerCase())
  if (f.some((x) => /vibrat|all/.test(x))) return true
  const blob = `${toy.name || ''} ${toy.toyType || ''}`.toLowerCase()
  if (/\bnora\b|\bmax\b|lush|edge|gemini|dolce|ferri|ambi|domi|hush|osci/.test(blob)) {
    return true
  }
  // Unknown specialty list still almost always has a vibe motor
  if (!f.length) return true
  if (f.some((x) => /rotate|air|thrust|pump/.test(x))) return true
  return true
}

/**
 * One primary family per toy. Specialty axes win over multi/vibe so Solace
 * is thrust even if dual-motor.
 */
export function toyFamily(toy: CapabilitySource): ToyFamily {
  const c = toyChannels(toy)
  if (c.has('thrust')) return 'thrust'
  if (c.has('rotate')) return 'rotate'
  if (c.has('air')) return 'air'
  if (c.has('multi')) return 'multi'
  return 'vibe'
}

/** Every pattern family a toy can run (vibe + specialty channels). */
export function toyMenuFamilies(toy: CapabilitySource): ToyFamily[] {
  const out: ToyFamily[] = []
  if (toyCanVibrate(toy)) out.push('vibe')
  const ch = toyChannels(toy)
  if (ch.has('multi')) out.push('multi')
  if (ch.has('rotate')) out.push('rotate')
  if (ch.has('air')) out.push('air')
  if (ch.has('thrust')) out.push('thrust')
  return out.length ? out : ['vibe']
}

/** Pattern family from its required channels (empty = vibe catalog). */
export function patternFamily(needs: ChannelNeed[]): ToyFamily {
  if (needs.includes('thrust')) return 'thrust'
  if (needs.includes('rotate')) return 'rotate'
  if (needs.includes('air')) return 'air'
  if (needs.includes('multi')) return 'multi'
  return 'vibe'
}

/**
 * True when play should drive every available channel (not a single axis).
 * Nora “sync/combo” packages send Vibrate + Rotate together; Solace combos
 * send vibe + thrust; pure rotate / thrust / air tips stay single-axis.
 */
export function patternUsesFullDrive(meta: {
  id?: string
  name?: string
  blurb?: string
  tag?: string
  needs?: ChannelNeed[]
}): boolean {
  const needs = normalizeNeeds(meta.needs)
  if (
    needs.includes('thrust') &&
    (needs.includes('multi') || needs.length > 1)
  ) {
    return true
  }
  if (needs.includes('rotate') && needs.length > 1) return true
  if (needs.includes('air') && needs.length > 1) return true

  const blob =
    `${meta.id || ''} ${meta.name || ''} ${meta.blurb || ''} ${meta.tag || ''}`.toLowerCase()
  // Explicit dual-channel packages (prefer tag/id so rotate-only “spin” stays pure).
  if (
    /\bsync\b|\bcombo\b|simult|dual.?channel|vibe\s*[+&·/]\s*rotate|rotate\s*[+&·/]\s*vibe|vibe\s*[+&·/]\s*air|vibe\s*[+&·/]\s*thrust/.test(
      blob,
    )
  ) {
    return true
  }
  return false
}

export function familyLabel(f: ToyFamily): string {
  switch (f) {
    case 'vibe':
      return 'vibe'
    case 'multi':
      return 'multi-motor'
    case 'rotate':
      return 'rotate'
    case 'air':
      return 'air'
    case 'thrust':
      return 'thrust'
  }
}

/** Human channel summary: "vibe · rotate" for Nora. */
export function toyChannelLabels(toy: CapabilitySource): string {
  const c = toyChannels(toy)
  const parts: string[] = []
  if (toyCanVibrate(toy)) parts.push('vibe')
  if (c.has('multi')) parts.push('multi')
  if (c.has('rotate')) parts.push('rotate')
  if (c.has('air')) parts.push('air')
  if (c.has('thrust')) parts.push('thrust')
  return parts.length ? parts.join(' · ') : familyLabel(toyFamily(toy))
}

export function normalizeNeeds(raw: unknown): ChannelNeed[] {
  if (!Array.isArray(raw)) return []
  const out: ChannelNeed[] = []
  for (const x of raw) {
    if (
      (x === 'multi' ||
        x === 'rotate' ||
        x === 'air' ||
        x === 'thrust') &&
      !out.includes(x)
    ) {
      out.push(x)
    }
  }
  return out
}

/** Infer needs from text when not stored on the pattern. */
export function inferPatternNeeds(meta: {
  id?: string
  name?: string
  blurb?: string
  needs?: ChannelNeed[]
  tag?: string
}): ChannelNeed[] {
  if (meta.needs?.length) return normalizeNeeds(meta.needs)
  const b =
    `${meta.id || ''} ${meta.name || ''} ${meta.blurb || ''} ${meta.tag || ''}`.toLowerCase()
  const needs: ChannelNeed[] = []
  if (/thrust|solace|stroke.?depth|linear/.test(b)) needs.push('thrust')
  if (/rotat|spin|nora|head.?nudge/.test(b)) needs.push('rotate')
  if (/\bair\b|suction|pump|\bmax\b/.test(b)) needs.push('air')
  if (
    /multi.?motor|dual.?motor|both motors|v1.?v2|two.?motor|\bedge\s*2\b|gemini|dolce/.test(
      b,
    )
  ) {
    needs.push('multi')
  }
  return needs
}

/** Normalize product / model tokens for affinity matching. */
export function productToken(raw: string | null | undefined): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

/**
 * True when the toy matches an optional product allow-list
 * (`forProducts` on a pattern). Empty / missing list → any product.
 */
export function toyMatchesProducts(
  toy: CapabilitySource,
  forProducts?: string[] | null,
): boolean {
  if (!forProducts?.length) return true
  const keys = new Set(
    [toy.id, toy.toyType, toy.name]
      .map((s) => productToken(s))
      .filter(Boolean),
  )
  const blob = `${toy.id || ''} ${toy.toyType || ''} ${toy.name || ''}`.toLowerCase()
  return forProducts.some((p) => {
    const id = productToken(p)
    if (!id) return false
    if (keys.has(id)) return true
    return blob.includes(id)
  })
}

/**
 * Whether this pattern should show for this inventory toy.
 *
 * - Vibe catalog (no specialty needs): any toy with a vibe motor (Nora, Gemini…)
 * - Specialty catalogs: toy must expose every required channel
 * - Optional forProducts: body-part / brand puns stay on the right models
 */
export function patternFitsToy(
  needs: ChannelNeed[],
  toy: CapabilitySource,
  forProducts?: string[] | null,
): boolean {
  if (!toyMatchesProducts(toy, forProducts)) return false

  const have = toyChannels(toy)
  const pf = patternFamily(needs)

  if (pf === 'vibe') {
    return toyCanVibrate(toy)
  }

  if (needs.length) {
    return needs.every((n) => have.has(n))
  }
  if (pf === 'multi') return have.has('multi')
  if (pf === 'rotate') return have.has('rotate')
  if (pf === 'air') return have.has('air')
  if (pf === 'thrust') return have.has('thrust')
  return toyCanVibrate(toy)
}

/**
 * Show pattern when it fits ≥1 selected toy.
 * `toys === null` → show all (legacy full catalog).
 * `toys === []` → show none.
 */
export function patternFitsSelectedToys(
  needs: ChannelNeed[],
  toys: CapabilitySource[] | null,
  forProducts?: string[] | null,
): boolean {
  if (toys === null) return true
  if (!toys.length) return false
  return toys.some((t) => patternFitsToy(needs, t, forProducts))
}

export function channelLabel(id: ChannelNeed): string {
  return CHANNEL_NEEDS.find((c) => c.id === id)?.label || id
}
