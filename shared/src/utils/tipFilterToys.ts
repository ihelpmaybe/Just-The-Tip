/**
 * Tip-menu filter toys: full Lovense catalog as tiles (desktop parity).
 * Live Connect inventory is merged when present; catalog fills the rest.
 */
import type { DeviceToy } from '../types/device'
import {
  catalogSecondary,
  LOVENSE_CATALOG,
  type LovenseCatalogEntry,
} from './lovenseCatalog'

function catalogToDeviceToy(e: LovenseCatalogEntry): DeviceToy {
  return {
    id: `filter:${e.id}`,
    name: e.name,
    toyType: e.toyType,
    connected: true,
    status: 'catalog',
    motors: e.vibrationMotors,
    functions: e.f
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    secondary: catalogSecondary(e.f),
    source: 'preview',
  }
}

/** Full catalog as tip-menu filter tiles (stable `filter:` ids). */
export const TIP_FILTER_TOYS: DeviceToy[] =
  LOVENSE_CATALOG.map(catalogToDeviceToy)

/** Hardware inventory we keep across reload (not catalog / preview). */
export function isPersistedHardwareToy(toy: DeviceToy | undefined | null): boolean {
  if (!toy?.id) return false
  if (toy.id === 'preview' || toy.id.startsWith('filter:')) return false
  if (toy.source === 'preview') return false
  return String(toy.status || '').toLowerCase() !== 'catalog'
}

export function toyDedupeKey(toy: DeviceToy): string {
  const mac = String(toy.extra?.mac || '')
    .replace(/[^0-9A-Fa-f]/g, '')
    .toUpperCase()
  if (mac.length >= 8) return `mac:${mac}`
  const id = String(toy.id || '').trim().toLowerCase()
  if (id) return `id:${id}`
  const name = String(toy.name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  const type = String(toy.toyType || '')
    .toLowerCase()
    .trim()
  return name ? `name:${type}:${name}` : 'id:'
}

export function snapshotSavedToy(toy: DeviceToy): DeviceToy {
  const extra: DeviceToy['extra'] = {}
  const src = toy.extra || {}
  for (const key of ['mac', 'modelCode', 'firmware', 'typeRaw'] as const) {
    const value = src[key]
    if (value != null && value !== '') extra[key] = value
  }
  const online = toy.connected !== false
  return {
    id: toy.id,
    name: toy.name,
    nickName: toy.nickName,
    toyType: toy.toyType,
    connected: online,
    status: online ? toy.status || 'online' : 'offline',
    motors: toy.motors,
    functions: Array.isArray(toy.functions) ? toy.functions.slice(0, 12) : undefined,
    secondary: toy.secondary,
    extra: Object.keys(extra).length ? extra : undefined,
    source: toy.source === 'preview' ? 'bluetooth' : toy.source,
  }
}

export function normalizeSavedToys(value: unknown): DeviceToy[] {
  if (!Array.isArray(value)) return []
  const out: DeviceToy[] = []
  const seen = new Set<string>()
  for (const row of value) {
    if (!row || typeof row !== 'object') continue
    const r = row as Partial<DeviceToy>
    const id = typeof r.id === 'string' ? r.id.trim() : ''
    const name = typeof r.name === 'string' ? r.name.trim() : ''
    if (!id || !name) continue
    const source =
      r.source === 'lovense' ||
      r.source === 'intiface' ||
      r.source === 'bluetooth' ||
      r.source === 'ble'
        ? r.source === 'ble'
          ? 'bluetooth'
          : r.source
        : 'bluetooth'
    const toy = snapshotSavedToy({
      id,
      name: name.slice(0, 48),
      nickName: typeof r.nickName === 'string' ? r.nickName.slice(0, 48) : undefined,
      toyType: typeof r.toyType === 'string' ? r.toyType.slice(0, 32) : undefined,
      connected: r.connected !== false,
      status: typeof r.status === 'string' ? r.status : undefined,
      motors: Number(r.motors) || undefined,
      functions: Array.isArray(r.functions)
        ? r.functions.filter((x): x is string => typeof x === 'string')
        : undefined,
      secondary: r.secondary,
      extra: r.extra,
      source,
    })
    if (!isPersistedHardwareToy(toy)) continue
    const key = toyDedupeKey(toy)
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ...toy, connected: false, status: 'offline' })
    if (out.length >= 12) break
  }
  return out
}

/**
 * Live hardware wins. Saved / remembered toys fill gaps as offline so a
 * reload does not wipe Home or tip-menu tabs before reconnect.
 */
export function mergeLiveWithSavedToys(
  live: DeviceToy[],
  saved: DeviceToy[],
): DeviceToy[] {
  const out: DeviceToy[] = []
  const seen = new Set<string>()
  const take = (toy: DeviceToy, offline: boolean) => {
    if (!toy.id) return
    const key = toyDedupeKey(toy)
    if (seen.has(key) || seen.has(`id:${toy.id.toLowerCase()}`)) return
    seen.add(key)
    seen.add(`id:${toy.id.toLowerCase()}`)
    out.push(
      offline
        ? { ...snapshotSavedToy(toy), connected: false, status: 'offline' }
        : toy,
    )
  }
  for (const toy of live) take(toy, false)
  for (const toy of saved) {
    if (!isPersistedHardwareToy(toy)) continue
    take(toy, true)
  }
  return out
}

/** Keep last-seen hardware; never replace a roster with an empty live poll. */
export function upsertSavedToys(
  live: DeviceToy[],
  previous: DeviceToy[],
): DeviceToy[] {
  const hardware = live.filter(isPersistedHardwareToy)
  if (!hardware.length) {
    return previous.map((toy) => ({
      ...snapshotSavedToy(toy),
      connected: false,
      status: 'offline',
    }))
  }
  return mergeLiveWithSavedToys(hardware, previous)
    .map((toy) =>
      hardware.some((row) => row.id === toy.id)
        ? snapshotSavedToy(toy)
        : { ...snapshotSavedToy(toy), connected: false, status: 'offline' },
    )
    .slice(0, 12)
}

export function savedToysEqual(a: DeviceToy[], b: DeviceToy[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Union of live + last-session hardware + full catalog.
 * Live toys win when the same product id or name+type is already present.
 */
export function toysForTipMenu(
  live: DeviceToy[],
  saved: DeviceToy[] = [],
): DeviceToy[] {
  const connected = mergeLiveWithSavedToys(
    live.filter((t) => t.id),
    saved,
  )
  const catalog = TIP_FILTER_TOYS

  if (!connected.length) return catalog.slice()

  const out: DeviceToy[] = [...connected]
  const seenIds = new Set(connected.map((t) => t.id))
  const seenKeys = new Set(
    connected.map((t) => productKey(t.name, t.toyType, t.id)),
  )

  for (const p of catalog) {
    if (seenIds.has(p.id)) continue
    const key = productKey(p.name, p.toyType, p.id)
    if (seenKeys.has(key)) continue
    const bare = p.id.replace(/^filter:/, '')
    if (connected.some((t) => t.id === bare || t.id?.endsWith(bare))) continue
    out.push(p)
    seenKeys.add(key)
  }
  return out
}

/**
 * Which tip-menu tick ids match currently linked (Connect / BLE) toys.
 * Hardware device ids only — never catalog `filter:…` stand-ins.
 */
export function importLinkedFilterIds(
  live: DeviceToy[],
  menuToys: DeviceToy[] = toysForTipMenu(live),
): string[] {
  const linked = live.filter(
    (t) =>
      isPersistedHardwareToy(t) &&
      t.connected !== false &&
      String(t.status || '').toLowerCase() !== 'catalog',
  )
  if (!linked.length) return []

  const known = new Set(
    menuToys.map((t) => t.id).filter((id): id is string => Boolean(id)),
  )
  const out: string[] = []
  const seen = new Set<string>()
  for (const t of linked) {
    if (!t.id || seen.has(t.id)) continue
    // Prefer the live id when it is already on the menu (normal path).
    if (known.has(t.id)) {
      out.push(t.id)
      seen.add(t.id)
      continue
    }
    // Live id missing from menuToys (rare) — keep it anyway so Import still
    // selects the connected device; paint will merge it via toysForTipMenu.
    out.push(t.id)
    seen.add(t.id)
  }
  return out
}

/** Connected hardware ids present on a tip-menu toy list. */
export function connectedHardwareFilterIds(
  menuToys: DeviceToy[],
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const t of menuToys) {
    if (!t.id || seen.has(t.id)) continue
    if (!isPersistedHardwareToy(t)) continue
    if (t.connected === false) continue
    if (String(t.status || '').toLowerCase() === 'catalog') continue
    out.push(t.id)
    seen.add(t.id)
  }
  return out
}

/**
 * null filter = currently connected hardware only (never the full catalog).
 * [] = none. Explicit ids = that selection (stale ids fall back to connected).
 */
export function resolvedFilterToyIds(
  menuToys: DeviceToy[],
  menuFilterToyIds: string[] | null,
): string[] {
  const known = new Set(
    menuToys.map((t) => t.id).filter((id): id is string => Boolean(id)),
  )
  if (menuFilterToyIds === null) {
    return connectedHardwareFilterIds(menuToys)
  }
  const kept = menuFilterToyIds.filter((id) => known.has(id))
  // Stale Bluetooth ids after re-link must not expand to the whole catalog.
  if (!kept.length && menuFilterToyIds.length > 0) {
    return connectedHardwareFilterIds(menuToys)
  }
  return kept
}

/** Ticked toys for pattern list + export (same as desktop menuFitToys). */
export function menuFitToys(
  live: DeviceToy[],
  menuFilterToyIds: string[] | null,
): DeviceToy[] {
  const menuToys = toysForTipMenu(live)
  const ids = new Set(resolvedFilterToyIds(menuToys, menuFilterToyIds))
  return menuToys.filter((t) => t.id && ids.has(t.id))
}

/**
 * Map catalog (`filter:…`) or offline menu ids → currently linked Connect id.
 * Returns undefined when nothing linked can play that product.
 */
export function resolveLiveToyId(
  id: string | undefined | null,
  live: DeviceToy[],
  menuToys?: DeviceToy[],
): string | undefined {
  if (!id) return undefined
  const connected = live.filter(
    (t) =>
      t.id &&
      (t.source === 'lovense' ||
        t.source === 'ble' ||
        t.source === 'bluetooth' ||
        t.source === 'intiface' ||
        t.id === 'preview') &&
      t.connected !== false &&
      String(t.status || '').toLowerCase() !== 'catalog',
  )
  if (connected.some((t) => t.id === id)) return id

  const menu = menuToys || toysForTipMenu(live)
  const source =
    menu.find((t) => t.id === id) || connected.find((t) => t.id === id)
  if (!source) {
    // Bare catalog product id without filter: prefix
    const bare = id.replace(/^filter:/, '')
    const byBare = connected.find(
      (t) => t.id === bare || t.id?.endsWith(bare),
    )
    if (byBare?.id) return byBare.id
    return undefined
  }

  const key = productKey(source.name, source.toyType, source.id)
  const match = connected.find(
    (t) => productKey(t.name, t.toyType, t.id) === key,
  )
  if (match?.id) return match.id

  // Same toyType (e.g. nora) if only one linked of that type
  const type = String(source.toyType || '')
    .toLowerCase()
    .trim()
  if (type) {
    const sameType = connected.filter(
      (t) => String(t.toyType || '').toLowerCase().trim() === type,
    )
    if (sameType.length === 1 && sameType[0]!.id) return sameType[0]!.id
  }
  return undefined
}

/**
 * Live (or preview) toys that should receive tips — tip-menu filter ∩ inventory.
 * Empty filter ticks → empty list (no “under the table” buzz of unticked toys).
 * null filter (first run) → all linked toys (resolvedFilterToyIds = all menu ids;
 * only live ones can buzz).
 */
export function tipBuzzToys(
  live: DeviceToy[],
  menuFilterToyIds: string[] | null,
  disabledToys: string[] = [],
): DeviceToy[] {
  const disabled = new Set(disabledToys)
  const fit = menuFitToys(live, menuFilterToyIds)
  const out: DeviceToy[] = []
  const seen = new Set<string>()

  for (const t of fit) {
    if (!t.id || disabled.has(t.id)) continue
    const liveId = resolveLiveToyId(t.id, live) || t.id
    if (disabled.has(liveId)) continue
    const device =
      live.find((x) => x.id === liveId) ||
      (t.id === 'preview' || t.source === 'preview' || t.source === 'ble'
        ? t
        : null)
    if (!device?.id) {
      // Catalog-only tick: allow for ladder planning only when no live match
      if (String(t.status || '').toLowerCase() === 'catalog' || t.id.startsWith('filter:')) {
        if (!seen.has(t.id)) {
          out.push(t)
          seen.add(t.id)
        }
      }
      continue
    }
    if (device.connected === false) continue
    if (seen.has(device.id)) continue
    out.push({ ...device, id: device.id })
    seen.add(device.id)
  }
  return out
}

/**
 * When storing a per-toy price against a catalog id, also write the live id key
 * so planBuzz (live ids) finds the same price.
 */
export function dualKeyToyPriceMap(
  map: Record<string, Record<string, number>>,
  toyId: string,
  patternId: string,
  price: number,
  live: DeviceToy[],
): Record<string, Record<string, number>> {
  const n = Math.max(0, Number(price) || 0)
  const next = { ...map }
  const keys = new Set<string>([toyId])
  const liveId = resolveLiveToyId(toyId, live)
  if (liveId) keys.add(liveId)
  if (toyId.startsWith('filter:')) keys.add(toyId.replace(/^filter:/, ''))
  for (const k of keys) {
    next[k] = { ...(next[k] || {}), [patternId]: n }
  }
  return next
}

function productKey(
  name?: string,
  toyType?: string,
  id?: string,
): string {
  const n = String(name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  const t = String(toyType || '')
    .toLowerCase()
    .trim()
  if (n && t) return `${t}::${n}`
  if (n) return `n::${n}`
  return `id::${id || ''}`
}

export function shortToyFilterLabel(
  name: string,
  toyType?: string,
  id?: string,
): string {
  const n = (name || '').trim()
  if (n) return n.slice(0, 28)
  const t = (toyType || '').trim()
  if (t) return t.slice(0, 28)
  return (id || 'toy').replace(/^filter:/, '').slice(0, 12)
}
