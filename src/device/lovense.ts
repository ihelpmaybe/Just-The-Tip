/**
 * Browser client for Lovense Connect via the local Node bridge (`POST /api/lovense`).
 * Never hardcodes a real Local IP or APPID.
 */

export function stripLovenseLocalIpLabel(raw: string): string {
  return raw
    .trim()
    .replace(/^Local\s*IP:\s*/i, '')
    .trim()
}

/** Shape of Connect’s Local IP line — Xs only, never a real host. */
export const LOVENSE_LOCAL_IP_PLACEHOLDER =
  'https://XXX-XXX-X-XXX.lovense.club:XXXXX/GetToys'

const PLACEHOLDER_LOCAL_IP =
  /^https?:\/\/x+(?:-x+)*\.lovense\.club(?::x+)?(?:\/GetToys)?\/?$/i

/** Bare scheme or the example pattern still means “search Wi‑Fi”. */
export function isEmptyLovenseLocalIp(raw: string): boolean {
  const original = String(raw || '').trim()
  if (!original) return true
  if (/^https?:\/\/$/i.test(original)) return true
  if (PLACEHOLDER_LOCAL_IP.test(original)) return true
  const s = stripLovenseLocalIpLabel(original)
  return !s || /^https?:\/\/$/i.test(s) || PLACEHOLDER_LOCAL_IP.test(s)
}

export function lovenseLocalIpFieldValue(raw: string): string {
  return isEmptyLovenseLocalIp(raw)
    ? LOVENSE_LOCAL_IP_PLACEHOLDER
    : stripLovenseLocalIpLabel(raw)
}

export function stripLovenseAppIdLabel(raw: string): string {
  return raw
    .trim()
    .replace(/^APPID:\s*/i, '')
    .trim()
}

/**
 * Split a paste from Connect’s “Good Network Connection” box.
 * Accepts the labeled Local IP / APPID lines or a lone URL. No sample secrets.
 */
export function parseConnectPopupPaste(raw: string): {
  localIp: string
  appId: string
} {
  const text = String(raw || '')
    .replace(/\u00a0/g, ' ')
    .trim()
  if (!text) return { localIp: '', appId: '' }

  let appId = ''
  const appHit = text.match(/APPID\s*:?\s*([A-Za-z0-9_-]+)/i)
  if (appHit) appId = stripLovenseAppIdLabel(appHit[1])

  let localIp = text
  const ipHit = text.match(/Local\s*IP\s*:?\s*(\S+)/i)
  if (ipHit) {
    localIp = ipHit[1]
  } else {
    localIp = text
      .replace(/APPID\s*:?\s*[A-Za-z0-9_-]+/gi, ' ')
      .replace(/^[\s\S]*?\bLocal\s*IP\s*:?\s*/i, '')
      .split(/\r?\n/)[0]
      .trim()
  }

  return {
    localIp: stripLovenseLocalIpLabel(localIp),
    appId,
  }
}

export type LovenseSecondary = {
  rotate: boolean
  air: boolean
  pump: boolean
  thrust: boolean
}

/** Full toy inventory from Connect GetToys (bridge-normalized). */
export type LovenseToy = {
  id: string
  name: string
  nickName: string
  toyType: string
  connected: boolean
  status: string
  battery: number | null
  motors: number
  functions: string[]
  secondary: LovenseSecondary
  extra: Record<string, string | number | boolean | null>
  liveLevel?: number | null
  liveAction?: string | null
  /** 1-based motors to drive; omit = all */
  motorMask?: number[]
  /** Per-motor 0–20 levels (index 0 = M1) for split-lane patterns. */
  motorLevels?: number[]
  /**
   * Tip pattern channel focus (see server buildAction).
   * `rotate` → Nora head only, not shaft vibe.
   */
  driveAxis?: 'full' | 'vibe' | 'rotate' | 'air' | 'thrust'
}

export type ProbeResult = {
  ok: boolean
  base?: string
  list?: LovenseToy[]
  detail?: string
  error?: string
  tried?: string[]
}

async function api(body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch('/api/lovense', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let data: unknown = text
  try {
    data = JSON.parse(text)
  } catch {
    /* plain */
  }
  if (!res.ok) {
    const err =
      typeof data === 'object' && data && 'error' in data
        ? String((data as { error: string }).error)
        : text.slice(0, 200)
    throw new Error(err || `HTTP ${res.status}`)
  }
  return data
}

export class LovenseConnectClient {
  base = ''
  toys: LovenseToy[] = []
  rawLocalIp = ''

  setLocalIp(raw: string) {
    this.rawLocalIp = stripLovenseLocalIpLabel(raw)
  }

  async probe(
    localIp?: string,
    opts?: { mode?: 'connect' | 'remote' },
  ): Promise<ProbeResult> {
    const ip = stripLovenseLocalIpLabel(localIp || this.rawLocalIp)
    if (!ip) throw new Error('Local IP missing')
    const result = (await api({
      op: 'probe',
      localIp: ip,
      ...(opts?.mode === 'remote' ? { mode: 'remote' } : {}),
    })) as ProbeResult
    if (result.ok && result.base) {
      this.base = result.base
      this.toys = (result.list || []).map(coerceToy)
    } else {
      this.base = ''
      this.toys = []
    }
    return result
  }

  /** Search this PC's Wi‑Fi/LAN for Lovense Connect HTTP :20010. */
  async discover(): Promise<{
    ok: boolean
    localIp?: string
    base?: string
    error?: string
  }> {
    return (await api({ op: 'discover' })) as {
      ok: boolean
      localIp?: string
      base?: string
      error?: string
    }
  }

  /** Refresh inventory via bridge only (same GetToys path as Connect). */
  async refreshToys(): Promise<LovenseToy[]> {
    if (!this.base) throw new Error('Not connected')
    const data = (await api({ op: 'toys', base: this.base })) as {
      ok?: boolean
      list?: LovenseToy[]
      error?: string
    }
    if (!data.ok) throw new Error(data.error || 'GetToys failed')
    this.toys = (data.list || []).map(coerceToy)
    return this.toys
  }

  /** @param intensity01 0–1 → Lovense Standard API 0–20 on all reported channels (vibe + secondary). */
  async drive(
    intensity01: number,
    durationSec: number,
    toyFilter?: (t: LovenseToy) => boolean,
    motorMasks?: Record<string, number[]>,
    driveAxis?: LovenseToy['driveAxis'],
    /** Per-motor 0–1 levels (index 0 = M1) for split-lane patterns. */
    motorLevels?: number[],
  ) {
    if (!this.base) throw new Error('Not connected')
    const intensity020 = Math.max(0, Math.min(20, Math.round(intensity01 * 20)))
    const lanes020 = motorLevels?.length
      ? motorLevels.map((x) =>
          Math.max(0, Math.min(20, Math.round((Number(x) || 0) * 20))),
        )
      : undefined
    const picked = toyFilter
      ? this.toys.filter(toyFilter)
      : this.toys
    const toys = picked.map((t) => {
      const mask = motorMasks?.[t.id]
      const row: LovenseToy = { ...t }
      if (mask?.length) row.motorMask = mask
      if (lanes020) row.motorLevels = lanes020
      if (driveAxis) row.driveAxis = driveAxis
      return row
    })
    return (await api({
      op: 'vibrate',
      base: this.base,
      intensity: intensity020,
      durationSec,
      toys,
    })) as { action?: string; toys?: string[]; ok?: boolean }
  }

  /** @deprecated prefer drive() — same call (all toy features). */
  async vibrate(
    intensity01: number,
    durationSec: number,
    toyFilter?: (t: LovenseToy) => boolean,
    motorMasks?: Record<string, number[]>,
  ) {
    return this.drive(intensity01, durationSec, toyFilter, motorMasks)
  }

  /**
   * Drive one channel on one toy (M1, rotate, thrust…).
   * Used by feature Test buttons, bypasses global motor masks.
   */
  async testChannel(
    toyId: string,
    channel: string,
    intensity01 = 0.9,
    durationSec = 3,
  ) {
    if (!this.base) throw new Error('Not connected')
    const intensity020 = Math.max(0, Math.min(20, Math.round(intensity01 * 20)))
    const toy = this.toys.find((t) => t.id === toyId)
    return (await api({
      op: 'channel',
      base: this.base,
      channel,
      intensity: intensity020,
      durationSec,
      toyId,
      toys: toy ? [toy] : [],
    })) as { action?: string; toys?: string[]; ok?: boolean }
  }

  async stop(toyFilter?: (t: LovenseToy) => boolean) {
    if (!this.base) return
    const toys = toyFilter ? this.toys.filter(toyFilter) : this.toys
    await this.stopOn(this.base, toys)
  }

  /** Stop motors on a Connect base even after this client has been cleared. */
  async stopOn(base: string, toys: LovenseToy[] = []) {
    if (!base) return
    await api({ op: 'stop', base, toys })
  }

  clear() {
    this.base = ''
    this.toys = []
  }
}

function coerceToy(t: Partial<LovenseToy> & { id?: string; name?: string }): LovenseToy {
  return {
    id: String(t.id || ''),
    name: String(t.name || t.nickName || t.toyType || 'toy'),
    nickName: String(t.nickName || ''),
    toyType: String(t.toyType || 'lovense'),
    connected: Boolean(t.connected),
    status: String(t.status || (t.connected ? 'online' : 'offline')),
    battery:
      t.battery != null && Number.isFinite(Number(t.battery))
        ? Number(t.battery)
        : null,
    motors: Math.max(1, Number(t.motors) || 1),
    functions: Array.isArray(t.functions) ? t.functions.map(String) : [],
    secondary: {
      rotate: Boolean(t.secondary?.rotate),
      air: Boolean(t.secondary?.air),
      pump: Boolean(t.secondary?.pump),
      thrust: Boolean(t.secondary?.thrust),
    },
    extra:
      t.extra && typeof t.extra === 'object'
        ? (t.extra as LovenseToy['extra'])
        : {},
    liveLevel:
      t.liveLevel != null && Number.isFinite(Number(t.liveLevel))
        ? Number(t.liveLevel)
        : null,
    liveAction: t.liveAction != null ? String(t.liveAction) : null,
  }
}

export const LOVENSE_APPID_PLACEHOLDER = 'optional'

export const LOVENSE_EMU_LOCAL_IP = '127.0.0.1'

export const LOVENSE_HINT =
  'Open Lovense Connect on your phone (same Wi‑Fi), then click Connect.'

export const LOVENSE_REMOTE_HINT =
  'Lovense Remote → Discover → Game Mode → Enable LAN. Paste Local IP, then click Connect.'

/** Official Lovense page that hosts Connect PC/Mac (step 2) — not Stream Master. */
export const LOVENSE_CONNECT_DOWNLOAD_URL =
  'https://www.lovense.com/cam-model/extension'
