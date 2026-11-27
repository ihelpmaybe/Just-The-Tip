/**
 * User-facing model reassignment for mislabeled BLE toys
 * (e.g. LVS-N0104 is often Gemini, not a distinct product name).
 */

export type ToyIdentityOverride = {
  /** Canonical product id; empty = use auto detect */
  product: string
  /** Optional display name (defaults to product title) */
  label?: string
}

export type ToyProductProfile = {
  id: string
  title: string
  motors: number
  rotate: boolean
  thrust: boolean
  air: boolean
  pump: boolean
}

/**
 * Lovense factory / DeviceType codes → canonical product id.
 * Applied automatically when Model is left on Auto.
 */
export const MODEL_CODE_PRODUCTS: Record<string, string> = {
  // Gemini nipple clamps advertise as LVS-N0104 / DeviceType N0104:…
  N0104: 'gemini',
}

/** Normalize LVS-N0104 / n0104 → N0104. */
export function normalizeModelCode(
  raw: string | null | undefined,
): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/^LVS-?/i, '')
    .replace(/[^A-Z0-9]/g, '')
}

/** Look up a known product id from a factory / BLE model code. */
export function productIdFromModelCode(
  raw: string | null | undefined,
): string | null {
  const code = normalizeModelCode(raw)
  if (!code) return null
  return MODEL_CODE_PRODUCTS[code] || null
}

/**
 * Infer product from model code, advertised name, or toyType
 * (e.g. name "N0104" / "LVS-N0104" → gemini).
 */
export function productIdFromToyHints(toy: {
  name?: string | null
  toyType?: string | null
  modelCode?: string | null
  extra?: Record<string, string | number | boolean | null> | null
}): string | null {
  const codeHints = [
    toy.modelCode,
    toy.extra?.modelCode != null ? String(toy.extra.modelCode) : '',
    toy.name,
    toy.toyType,
  ]
  for (const hint of codeHints) {
    const id = productIdFromModelCode(hint)
    if (id) return id
  }
  const blob = `${toy.name || ''} ${toy.toyType || ''}`.toUpperCase()
  const m = blob.match(/\bN0\d{3}\b/)
  return m ? productIdFromModelCode(m[0]) : null
}

/** Known Lovense-style profiles for identity UI + feature bits. */
export const TOY_PRODUCT_PROFILES: ToyProductProfile[] = [
  {
    id: 'nora',
    title: 'Nora',
    motors: 1,
    rotate: true,
    thrust: false,
    air: false,
    pump: false,
  },
  {
    id: 'lush',
    title: 'Lush',
    motors: 1,
    rotate: false,
    thrust: false,
    air: false,
    pump: false,
  },
  {
    id: 'edge',
    title: 'Edge',
    motors: 2,
    rotate: false,
    thrust: false,
    air: false,
    pump: false,
  },
  {
    id: 'gemini',
    title: 'Gemini',
    motors: 2,
    rotate: false,
    thrust: false,
    air: false,
    pump: false,
  },
  {
    id: 'max',
    title: 'Max',
    motors: 1,
    rotate: false,
    thrust: false,
    air: true,
    pump: true,
  },
  {
    id: 'hush',
    title: 'Hush',
    motors: 1,
    rotate: false,
    thrust: false,
    air: false,
    pump: false,
  },
  {
    id: 'domi',
    title: 'Domi',
    motors: 1,
    rotate: false,
    thrust: false,
    air: false,
    pump: false,
  },
  {
    id: 'osci',
    title: 'Osci',
    motors: 1,
    rotate: true,
    thrust: false,
    air: false,
    pump: false,
  },
  {
    id: 'solace',
    title: 'Solace',
    motors: 1,
    rotate: false,
    thrust: true,
    air: false,
    pump: false,
  },
  {
    id: 'ambi',
    title: 'Ambi',
    motors: 1,
    rotate: false,
    thrust: false,
    air: false,
    pump: false,
  },
  {
    id: 'ferri',
    title: 'Ferri',
    motors: 1,
    rotate: false,
    thrust: false,
    air: false,
    pump: false,
  },
  {
    id: 'gush',
    title: 'Gush',
    motors: 1,
    rotate: true,
    thrust: false,
    air: false,
    pump: false,
  },
  {
    id: 'flexer',
    title: 'Flexer',
    motors: 1,
    rotate: false,
    thrust: true,
    air: false,
    pump: false,
  },
  {
    id: 'gravity',
    title: 'Gravity',
    motors: 1,
    rotate: false,
    thrust: true,
    air: false,
    pump: false,
  },
  {
    id: 'dolce',
    title: 'Dolce',
    motors: 2,
    rotate: false,
    thrust: false,
    air: false,
    pump: false,
  },
  {
    id: 'calor',
    title: 'Calor',
    motors: 1,
    rotate: false,
    thrust: false,
    air: false,
    pump: false,
  },
  {
    id: 'hyphy',
    title: 'Hyphy',
    motors: 1,
    rotate: false,
    thrust: false,
    air: false,
    pump: false,
  },
  {
    id: 'lapis',
    title: 'Lapis',
    motors: 2,
    rotate: false,
    thrust: false,
    air: false,
    pump: false,
  },
  {
    id: 'mission',
    title: 'Mission',
    motors: 1,
    rotate: true,
    thrust: true,
    air: false,
    pump: false,
  },
  {
    id: 'vulse',
    title: 'Vulse',
    motors: 1,
    rotate: true,
    thrust: false,
    air: false,
    pump: false,
  },
]

const byId = new Map(
  TOY_PRODUCT_PROFILES.map((p) => [p.id, p] as const),
)

export function toyProductProfile(
  product: string | null | undefined,
): ToyProductProfile | null {
  const id = String(product || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
  if (!id || id === 'auto') return null
  return byId.get(id) || null
}

export function functionsForProfile(p: ToyProductProfile): string[] {
  const out = ['Vibrate']
  if (p.motors > 1) {
    for (let m = 1; m <= p.motors; m++) out.push(`Vibrate${m}`)
  }
  if (p.rotate) out.push('Rotate')
  if (p.thrust) out.push('Thrust')
  if (p.air) out.push('Air')
  if (p.pump) out.push('Pump')
  return out
}

/** Capability row for menu/catalog filtering without a live device. */
export function capabilityFromProductProfile(p: ToyProductProfile): {
  id: string
  name: string
  toyType: string
  motors: number
  functions: string[]
  secondary: {
    rotate: boolean
    air: boolean
    pump: boolean
    thrust: boolean
  }
} {
  return {
    id: p.id,
    name: p.title,
    toyType: p.id,
    motors: p.motors,
    functions: functionsForProfile(p),
    secondary: {
      rotate: p.rotate,
      air: p.air,
      pump: p.pump,
      thrust: p.thrust,
    },
  }
}

export type IdentityShape = {
  id: string
  name: string
  toyType?: string
  motors?: number
  functions?: string[]
  secondary?: {
    rotate?: boolean
    air?: boolean
    pump?: boolean
    thrust?: boolean
  }
  extra?: Record<string, string | number | boolean | null>
}

/**
 * Apply a user product override onto an inventory row.
 * Keys for lookup: id and optional MAC (both stored when user reassigns).
 * With no override, known factory codes (N0104 → Gemini) still apply.
 */
export function applyToyIdentity<T extends IdentityShape>(
  toy: T,
  identity: Record<string, ToyIdentityOverride> | null | undefined,
): T {
  if (!toy.id) return toy
  const mac =
    toy.extra && toy.extra.mac != null
      ? String(toy.extra.mac).toLowerCase().replace(/[^0-9a-f]/g, '')
      : ''
  const ovr =
    (identity &&
      (identity[toy.id] ||
        (mac ? identity[`mac:${mac}`] : undefined))) ||
    null

  if (ovr?.product) {
    const profile = toyProductProfile(ovr.product)
    if (!profile) {
      // Freeform product string: rename only
      const label = (ovr.label || ovr.product).trim()
      if (!label) return toy
      return {
        ...toy,
        name: label,
        toyType: label.toLowerCase(),
        extra: {
          ...(toy.extra || {}),
          autoName: toy.name,
          identityProduct: ovr.product,
          identityManual: true,
        },
      }
    }

    const label = (ovr.label || profile.title).trim() || profile.title
    return {
      ...toy,
      name: label,
      toyType: profile.id,
      motors: profile.motors,
      functions: functionsForProfile(profile),
      secondary: {
        rotate: profile.rotate,
        air: profile.air,
        pump: profile.pump,
        thrust: profile.thrust,
      },
      extra: {
        ...(toy.extra || {}),
        autoName: toy.name,
        autoType: toy.toyType || null,
        identityProduct: profile.id,
        identityManual: true,
      },
    }
  }

  // Auto: factory codes like N0104 → Gemini (Model left on Auto).
  const autoId = productIdFromToyHints({
    name: toy.name,
    toyType: toy.toyType,
    modelCode:
      toy.extra?.modelCode != null ? String(toy.extra.modelCode) : null,
    extra: toy.extra,
  })
  if (!autoId) return toy
  const profile = toyProductProfile(autoId)
  if (!profile) return toy
  // Already classified — keep operator rename if they only changed display.
  if (
    String(toy.toyType || '').toLowerCase() === profile.id &&
    Number(toy.motors) === profile.motors
  ) {
    return {
      ...toy,
      extra: {
        ...(toy.extra || {}),
        identityProduct: profile.id,
        identityManual: false,
      },
    }
  }
  return {
    ...toy,
    name: profile.title,
    toyType: profile.id,
    motors: profile.motors,
    functions: functionsForProfile(profile),
    secondary: {
      rotate: profile.rotate,
      air: profile.air,
      pump: profile.pump,
      thrust: profile.thrust,
    },
    extra: {
      ...(toy.extra || {}),
      autoName: toy.name,
      autoType: toy.toyType || null,
      identityProduct: profile.id,
      identityManual: false,
    },
  }
}

export function normalizeToyIdentity(
  v: unknown,
): Record<string, ToyIdentityOverride> {
  if (!v || typeof v !== 'object') return {}
  const out: Record<string, ToyIdentityOverride> = {}
  for (const [k, raw] of Object.entries(v as Record<string, unknown>)) {
    const key = String(k || '').trim()
    if (!key) continue
    if (typeof raw === 'string') {
      const product = raw.trim().toLowerCase()
      if (product && product !== 'auto') out[key] = { product }
      continue
    }
    if (!raw || typeof raw !== 'object') continue
    const o = raw as { product?: string; label?: string }
    const product = String(o.product || '')
      .trim()
      .toLowerCase()
    if (!product || product === 'auto') continue
    const label = o.label != null ? String(o.label).trim() : undefined
    out[key] = label ? { product, label } : { product }
  }
  return out
}

/** Keys to write when the user reassigns a toy (id + mac alias). */
export function identityKeysForToy(toy: {
  id?: string
  extra?: Record<string, string | number | boolean | null>
}): string[] {
  const keys: string[] = []
  if (toy.id) keys.push(toy.id)
  const mac =
    toy.extra && toy.extra.mac != null
      ? String(toy.extra.mac).toLowerCase().replace(/[^0-9a-f]/g, '')
      : ''
  if (mac.length >= 8) keys.push(`mac:${mac}`)
  return keys
}
