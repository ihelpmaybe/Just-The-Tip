/**
 * Lovense Connect LAN Standard API — node-side.
 * Served from Vite middleware so the browser never talks to Connect directly.
 */
import http from 'node:http'
import https from 'node:https'
import os from 'node:os'

const DEFAULT_TIMEOUT_MS = 5000
const DISCOVER_TIMEOUT_MS = 450
const DISCOVER_CONCURRENCY = 40

export function stripLocalIpLabel(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^Local\s*IP:\s*/i, '')
    .replace(/\/GetToys\/?$/i, '')
    .replace(/\/+$/, '')
}

export function fixPort(port: string | number): number {
  const p = String(port)
  // Connect’s box often drops a zero: 3010 → 30010, 2001 → 20010
  if (p === '3001' || p === '3010') return 30010
  if (p === '2001' || p === '2010') return 20010
  const n = Number(p)
  return Number.isFinite(n) && n > 0 ? n : 20010
}

export function dashedHostToIp(hostname: string): string | null {
  const m = String(hostname).match(
    /^(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})\.lovense\.club$/i,
  )
  return m ? `${m[1]}.${m[2]}.${m[3]}.${m[4]}` : null
}

export type LovenseEndpoint = {
  base: string
  host: string
  port: number
  https: boolean
}

/** Parse Connect Local IP paste or bare host[:port] into endpoints to try. */
export function candidateEndpoints(raw: string): LovenseEndpoint[] {
  let s = stripLocalIpLabel(raw)
  const ipLine = s.match(/Local\s*IP\s*:?\s*(\S+)/i)
  if (ipLine) s = stripLocalIpLabel(ipLine[1])
  else s = stripLocalIpLabel(s.split(/\r?\n/)[0] || s)
  s = s.replace(/APPID\s*:?\s*[A-Za-z0-9_-]+/gi, '').trim()
  const out: LovenseEndpoint[] = []
  const add = (host: string, port: number, useHttps: boolean) => {
    const base = `${useHttps ? 'https' : 'http'}://${host}:${port}`
    if (!out.some((e) => e.base === base)) {
      out.push({ base, host, port, https: useHttps })
    }
  }

  if (!s) return out

  let host = ''
  let port = 20010
  let httpsFlag = false

  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s)
      host = u.hostname
      port = fixPort(u.port || (u.protocol === 'https:' ? 30010 : 20010))
      httpsFlag = u.protocol === 'https:'
    } catch {
      return out
    }
  } else {
    const m = s.match(/^([^:/]+)(?::(\d+))?/)
    if (!m) return out
    host = m[1]
    port = fixPort(m[2] || 20010)
    httpsFlag = port === 30010 || host.includes('lovense.club')
  }

  const ip = dashedHostToIp(host) || (/^\d+\.\d+\.\d+\.\d+$/.test(host) ? host : null)

  // Prefer Standard API HTTPS (Remote / PC) before legacy LAN HTTP probes
  if (ip) {
    add(`${ip.replace(/\./g, '-')}.lovense.club`, 30010, true)
    add(ip, 20010, false)
    add(ip, 30010, false)
  }
  add(host, port, httpsFlag)
  if (port === 3001) add(host.includes('lovense') ? host : host, 30010, true)

  return out
}

/**
 * Remote Game Mode endpoints — SSL-first, skip empty HTTP :20010 as a dead end.
 * Kept separate so Connect (`candidateEndpoints`) stays unchanged.
 */
export function candidateEndpointsRemote(raw: string): LovenseEndpoint[] {
  let s = stripLocalIpLabel(raw)
  const ipLine = s.match(/Local\s*IP\s*:?\s*(\S+)/i)
  if (ipLine) s = stripLocalIpLabel(ipLine[1])
  else s = stripLocalIpLabel(s.split(/\r?\n/)[0] || s)
  s = s.replace(/APPID\s*:?\s*[A-Za-z0-9_-]+/gi, '').trim()
  const out: LovenseEndpoint[] = []
  const add = (host: string, port: number, useHttps: boolean) => {
    const base = `${useHttps ? 'https' : 'http'}://${host}:${port}`
    if (!out.some((e) => e.base === base)) {
      out.push({ base, host, port, https: useHttps })
    }
  }

  if (!s) return out

  let host = ''
  let port = 30010
  let httpsFlag = true

  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s)
      host = u.hostname
      port = fixPort(u.port || (u.protocol === 'https:' ? 30010 : 20010))
      httpsFlag = u.protocol === 'https:'
    } catch {
      return out
    }
  } else {
    const m = s.match(/^([^:/]+)(?::(\d+))?/)
    if (!m) return out
    host = m[1]
    port = fixPort(m[2] || 30010)
    httpsFlag = port !== 20010 || host.includes('lovense.club')
  }

  const ip = dashedHostToIp(host) || (/^\d+\.\d+\.\d+\.\d+$/.test(host) ? host : null)

  if (ip) {
    add(`${ip.replace(/\./g, '-')}.lovense.club`, 30010, true)
    add(ip, 30010, true)
    add(ip, 30010, false)
    add(ip, 20010, false)
  }
  add(host, port, httpsFlag)

  return out
}

function requestJson(
  base: string,
  pathWithQuery: string,
  init: { method?: string; body?: string; timeoutMs?: number } = {},
): Promise<{ status: number; data: unknown; text: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(
      pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`,
      base.endsWith('/') ? base : `${base}/`,
    )
    const lib = url.protocol === 'https:' ? https : http
    const method = init.method || 'GET'
    const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const headers: Record<string, string | number> = {
      Accept: 'application/json, text/plain, */*',
      'User-Agent': 'JustTheTip/1.0',
      'X-platform': 'just-the-tip',
    }
    if (init.body) {
      headers['Content-Type'] = 'application/json'
      headers['Content-Length'] = Buffer.byteLength(init.body)
    }

    let settled = false
    let killer: ReturnType<typeof setTimeout> | undefined
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      if (killer) clearTimeout(killer)
      fn()
    }

    const req = lib.request(
      url,
      {
        method,
        headers,
        rejectUnauthorized: false,
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          let data: unknown = text
          try {
            data = JSON.parse(text)
          } catch {
            /* plain */
          }
          finish(() =>
            resolve({ status: res.statusCode || 0, data, text }),
          )
        })
      },
    )

    killer = setTimeout(() => {
      req.destroy()
      finish(() => reject(new Error(`timeout ${timeoutMs}ms ${url}`)))
    }, timeoutMs)

    req.on('timeout', () => {
      req.destroy()
      finish(() => reject(new Error(`timeout ${timeoutMs}ms ${url}`)))
    })
    req.on('error', (e) => finish(() => reject(e)))
    if (init.body) req.write(init.body)
    req.end()
  })
}

function isPrivateIpv4(ip: string): boolean {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return false
  const a = Number(m[1])
  const b = Number(m[2])
  if (a === 10) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  return false
}

function looksLikeConnectPayload(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const o = data as Record<string, unknown>
  const code = o.code
  if (code === 200 || code === 0 || code === '200' || code === '0') return true
  if (typeof o.type === 'string' && /^(ok|success)$/i.test(o.type.trim())) {
    return true
  }
  if (o.data != null && typeof o.data === 'object') return true
  if (o.toys != null && typeof o.toys === 'object') return true
  return false
}

/** Private LAN IPv4s to probe for Connect HTTP :20010 (own host first). */
export function lanConnectScanHosts(): string[] {
  const nets = os.networkInterfaces()
  const prefixes: string[] = []
  const own: string[] = []
  for (const addrs of Object.values(nets)) {
    for (const a of addrs || []) {
      const family = String(a.family)
      if (family !== 'IPv4' && family !== '4') continue
      if (a.internal) continue
      const ip = a.address
      if (ip.startsWith('169.254.')) continue
      if (!isPrivateIpv4(ip)) continue
      own.push(ip)
      const parts = ip.split('.')
      const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`
      if (!prefixes.includes(prefix)) prefixes.push(prefix)
    }
  }

  const hosts: string[] = []
  const seen = new Set<string>()
  const add = (ip: string) => {
    if (seen.has(ip)) return
    seen.add(ip)
    hosts.push(ip)
  }
  // Connect on this PC advertises the LAN address, not 127.0.0.1
  for (const ip of own) add(ip)
  for (const prefix of prefixes) add(`${prefix}.1`)
  for (const prefix of prefixes.slice(0, 3)) {
    for (let i = 1; i <= 254; i++) add(`${prefix}.${i}`)
  }
  return hosts
}

async function pingConnectHttp(host: string, timeoutMs: number): Promise<boolean> {
  const base = `http://${host}:20010`
  try {
    const res = await requestJson(base, '/command', {
      method: 'POST',
      body: JSON.stringify({ command: 'GetToys', apiVer: 1 }),
      timeoutMs,
    })
    if (res.status < 200 || res.status >= 300) return false
    return looksLikeConnectPayload(res.data)
  } catch {
    return false
  }
}

export type ToySecondary = {
  rotate: boolean
  air: boolean
  pump: boolean
  /** Linear thrust / thrusting channel (e.g. Solace) */
  thrust: boolean
}

/** Full per-toy snapshot from Connect GetToys (plus inferred fields). */
export type ToyRow = {
  id: string
  name: string
  nickName: string
  toyType: string
  connected: boolean
  status: string
  battery: number | null
  motors: number
  functions: string[]
  secondary: ToySecondary
  /** Every other field Connect returned (JSON-safe scalars / stringified). */
  extra: Record<string, string | number | boolean | null>
  /** Present when Connect (or external lovense-connect-emulator) reports live Function state. */
  liveLevel?: number | null
  liveAction?: string | null
  /**
   * 1-based motors to drive (e.g. [1] or [2] or [1,2]).
   * Omit / empty = all motors. Only used when sending Function.
   */
  motorMask?: number[]
  /**
   * Per-motor 0–20 levels (index 0 = M1) when a pattern runs a different lane
   * on each motor. Overrides the single level for vibration channels.
   */
  motorLevels?: number[]
  /**
   * Pattern channel focus for tip/test play.
   * `rotate` / `thrust` / `air` → specialty-only (e.g. Nora head, not shaft vibe).
   * `vibe` → motors only (no secondaries). Omit/`full` → every channel.
   */
  driveAxis?: 'full' | 'vibe' | 'rotate' | 'air' | 'thrust'
}

const MULTI_MOTOR_HINT =
  /gemini|edge|flexer|gravity|gravstar|lapis|solace|diamo|dolce|exomoon|mission|gush|ridge|tenera|hyphy|vulse|ferri|osci|amaze|domi\s*2|lush\s*2|hush\s*2|max\s*2|clamp|clamps|nipple|panty|bloom|twin|dual|n0104/i

const KNOWN_KEYS = new Set([
  'id',
  'toyId',
  'toy',
  'status',
  'connected',
  'nickName',
  'nickname',
  'name',
  'toyName',
  'toyType',
  'type',
  'battery',
  'batteryLevel',
  'f',
  'function',
  'functions',
  'features',
  'fullFunction',
  'fullFeatures',
  'supportFunction',
  'vibrationMotors',
  'vibeMotors',
  'motorCount',
  'motors',
  'vMotors',
])

function featureBlob(t: Record<string, unknown>): string {
  return [
    t.f,
    t.function,
    t.functions,
    t.features,
    t.fullFunction,
    t.fullFeatures,
    t.supportFunction,
  ]
    .map((x) =>
      x == null ? '' : typeof x === 'string' ? x : JSON.stringify(x),
    )
    .join(' ')
}

function extractFunctions(t: Record<string, unknown>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const add = (s: string) => {
    const v = s.trim()
    if (!v || seen.has(v.toLowerCase())) return
    seen.add(v.toLowerCase())
    out.push(v)
  }

  for (const key of [
    'f',
    'function',
    'functions',
    'features',
    'fullFunction',
    'fullFeatures',
    'supportFunction',
  ]) {
    const val = t[key]
    if (val == null) continue
    if (typeof val === 'string') {
      for (const part of val.split(/[,;|]+/)) add(part)
      continue
    }
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'string') add(item)
        else if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>
          add(String(o.name || o.type || o.function || JSON.stringify(item)))
        }
      }
      continue
    }
    if (typeof val === 'object') {
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (v === true || v === 1 || v === '1') add(k)
        else if (typeof v === 'string' && v) add(`${k}:${v}`)
        else if (v != null && typeof v !== 'object') add(`${k}:${String(v)}`)
        else add(k)
      }
    }
  }
  return out
}

function inferMotors(t: Record<string, unknown>, name: string, toyType: string): number {
  for (const key of [
    'vibrationMotors',
    'vibeMotors',
    'motorCount',
    'motors',
    'vMotors',
  ]) {
    if (t[key] != null && Number(t[key]) >= 1) {
      return Math.min(3, Math.max(1, Math.round(Number(t[key]))))
    }
  }
  const blob = featureBlob(t).toLowerCase()
  if (blob) {
    if (/vibrate3|v3:/.test(blob) || (blob.match(/vibrate\d/g) || []).length >= 3) {
      return 3
    }
    const dual =
      (/vibrate1|v1:/.test(blob) && /vibrate2|v2:/.test(blob)) ||
      (blob.match(/vibrate\d/g) || []).length >= 2
    if (dual) return 2
    // Explicit feature string without multi numbering → single vibe + secondaries
    if (/vibrate|rotate|air|thrust|pump/.test(blob)) {
      // gemini clamps always two vibrators even if `f` is a short string
      if (/gemini|edge|dolce|lapis|magnet|clamp|twin|dual|n0104/.test(`${toyType} ${name}`.toLowerCase())) {
        return 2
      }
      return 1
    }
  }
  const label = `${toyType} ${name}`
  if (MULTI_MOTOR_HINT.test(label)) {
    if (/\bmax\b/i.test(label)) return 1
    if (/\bnora\b/i.test(label)) return 1
    if (/\bsolace\b/i.test(label) && !/pro/i.test(label)) return 1
    return 2
  }
  return 1
}

function inferSecondary(
  t: Record<string, unknown>,
  name: string,
  toyType: string,
): ToySecondary {
  const label =
    `${toyType} ${name} ${featureBlob(t)}`.toLowerCase()
  return {
    rotate: /rotate|\bnora\b/.test(label),
    air: /\bair\b|pump|suction|\bmax\b/.test(label),
    pump: /pump|suction/.test(label),
    // Solace-class linear thrust (and explicit "thrust" feature strings)
    thrust: /thrust|\bsolace\b/.test(label),
  }
}

function scalarExtra(
  t: Record<string, unknown>,
): Record<string, string | number | boolean | null> {
  const extra: Record<string, string | number | boolean | null> = {}
  for (const [k, v] of Object.entries(t)) {
    if (KNOWN_KEYS.has(k)) continue
    if (v == null) {
      extra[k] = null
      continue
    }
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      extra[k] = v
      continue
    }
    try {
      extra[k] = JSON.stringify(v)
    } catch {
      extra[k] = String(v)
    }
  }
  return extra
}

export function normalizeToys(raw: unknown): ToyRow[] {
  if (!raw || typeof raw !== 'object') return []
  const root = raw as { data?: unknown; toys?: unknown }
  let data: unknown = root.data != null ? root.data : raw

  // Standard API wraps toys under data.toys (often a JSON string).
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const bag = data as Record<string, unknown>
    if (bag.toys != null) {
      let toys: unknown = bag.toys
      if (typeof toys === 'string') {
        try {
          toys = JSON.parse(toys)
        } catch {
          toys = null
        }
      }
      if (toys && typeof toys === 'object') data = toys
    }
  } else if (root.toys != null) {
    let toys: unknown = root.toys
    if (typeof toys === 'string') {
      try {
        toys = JSON.parse(toys)
      } catch {
        toys = null
      }
    }
    if (toys && typeof toys === 'object') data = toys
  }

  const entries: Array<Record<string, unknown>> = []
  if (Array.isArray(data)) {
    for (const v of data) {
      if (v && typeof v === 'object') entries.push(v as Record<string, unknown>)
    }
  } else if (data && typeof data === 'object') {
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      if (v && typeof v === 'object') {
        entries.push({ id: (v as { id?: string }).id || k, ...(v as object) })
      }
    }
  }
  return entries
    .map((t) => {
      const id = String(t.id || t.toyId || t.toy || '').trim()
      if (!id) return null
      const statusRaw = t.status
      const status = statusRaw == null ? '' : String(statusRaw)
      const connected =
        statusRaw === 1 ||
        statusRaw === '1' ||
        statusRaw === true ||
        t.connected === true ||
        ['on', 'online'].includes(status.toLowerCase())
      const nickName = String(t.nickName || t.nickname || '').trim()
      const toyType = String(t.toyType || t.type || '').trim()
      const name =
        nickName ||
        String(t.name || t.toyName || '').trim() ||
        toyType ||
        'toy'
      let battery: number | null = null
      if (t.battery != null && Number.isFinite(Number(t.battery))) {
        battery = Number(t.battery)
      } else       if (t.batteryLevel != null && Number.isFinite(Number(t.batteryLevel))) {
        battery = Number(t.batteryLevel)
      }
      let liveLevel: number | null = null
      let liveAction: string | null = null
      const emu = t._emu
      if (emu && typeof emu === 'object') {
        const e = emu as Record<string, unknown>
        if (e.level != null && Number.isFinite(Number(e.level))) {
          liveLevel = Number(e.level)
        }
        if (e.action != null) liveAction = String(e.action)
      }
      return {
        id,
        name,
        nickName,
        toyType: toyType || 'lovense',
        connected,
        status: status || (connected ? 'online' : 'offline'),
        battery,
        motors: inferMotors(t, name, toyType),
        functions: extractFunctions(t),
        secondary: inferSecondary(t, name, toyType),
        extra: scalarExtra(t),
        liveLevel,
        liveAction,
      } satisfies ToyRow
    })
    .filter((t): t is ToyRow => t != null)
}

/** Which VibrateN channels to hit. null = all motors at level. */
function motorSelection(
  motorCount: number,
  mask?: number[] | null,
): Set<number> | null {
  const n = Math.max(1, Math.min(3, motorCount))
  if (!mask || !mask.length) return null
  const selected = new Set(
    mask
      .map((x) => Math.round(Number(x)))
      .filter((m) => m >= 1 && m <= n),
  )
  if (!selected.size || selected.size >= n) return null
  return selected
}

/** Menu/tip scale 0–20. Builds a Function `action` for every channel the toy reports. */
export function buildAction(
  level020: number,
  motorsOrToy:
    | number
    | Pick<
        ToyRow,
        | 'motors'
        | 'secondary'
        | 'functions'
        | 'name'
        | 'toyType'
        | 'motorMask'
        | 'motorLevels'
        | 'driveAxis'
      > = 1,
): string {
  const raw = Math.max(0, Math.min(20, Math.round(level020)))
  const level = raw
  const parts: string[] = []

  const toy =
    typeof motorsOrToy === 'object' && motorsOrToy
      ? motorsOrToy
      : null

  const axis = toy?.driveAxis || 'full'
  // Specialty tip lines (Nora rotate, Solace thrust, Max air) drive that axis only.
  // Pure secondary actions — pairing Vibrate:0 often becomes an LED blink only on Connect.
  if (axis === 'rotate') {
    return `Rotate:${level}`
  }
  if (axis === 'thrust') {
    return `Thrusting:${level}`
  }
  if (axis === 'air') {
    const air03 =
      level <= 0 ? 0 : Math.max(1, Math.min(3, Math.ceil((level / 20) * 3)))
    return level > 0
      ? `Air:${air03},AbsoluteAir:${level}`
      : `Air:0,AbsoluteAir:0`
  }

  let n = Math.max(
    1,
    Math.min(3, toy ? toy.motors || 1 : Number(motorsOrToy) || 1),
  )

  // Gemini / dual clamps often report incomplete motor counts from Connect;
  // always drive V1+V2 or motors stay silent while the toy still "lists".
  if (toy) {
    const label = `${toy.toyType || ''} ${toy.name || ''} ${(toy.functions || []).join(' ')}`.toLowerCase()
    if (/gemini|edge|dolce|lapis|magnet|clamp|twin|dual/.test(label)) {
      n = Math.max(n, 2)
    }
  }

  const only = motorSelection(n, toy?.motorMask)
  const lanes = toy?.motorLevels?.length ? toy.motorLevels : null

  // Vibration — dual/triple get numbered motors + master.
  // Standard API multi-action separator is comma (not semicolon — that is for Pattern).
  // Subset mask: e.g. M1 only → Vibrate1:level,Vibrate2:0 (no master Vibrate).
  // Split lanes: each motor carries its own level, so never send master Vibrate.
  if (n > 1 && lanes && level > 0) {
    for (let m = 1; m <= n; m++) {
      const on = !only || only.has(m)
      const lane = Math.max(0, Math.min(20, Math.round(Number(lanes[m - 1]) || 0)))
      parts.push(`Vibrate${m}:${on ? lane : 0}`)
    }
  } else if (n > 1) {
    for (let m = 1; m <= n; m++) {
      const on = !only || only.has(m)
      parts.push(`Vibrate${m}:${on ? level : 0}`)
    }
    if (!only) parts.push(`Vibrate:${level}`)
  } else {
    parts.push(`Vibrate:${level}`)
  }

  // `vibe` axis: motors only (no head rotate / air / thrust on multi-feature toys).
  if (toy && !only && axis !== 'vibe') {
    const blob =
      `${toy.toyType || ''} ${toy.name || ''} ${(toy.functions || []).join(' ')}`.toLowerCase()
    const sec = toy.secondary || {
      rotate: false,
      air: false,
      pump: false,
      thrust: false,
    }
    // Secondary axes on same tip curve (demo + real multi-feature toys).
    if (sec.rotate || /\brotate\b/.test(blob) || /\bnora\b/.test(blob)) {
      parts.push(`Rotate:${level}`)
    }
    if (
      sec.air ||
      sec.pump ||
      /\bair\b/.test(blob) ||
      /\bpump\b/.test(blob) ||
      /\bmax\b/.test(blob)
    ) {
      // Standard API Air is often 0–3; AbsoluteAir holds a 0–20 scale when supported.
      const air03 =
        level <= 0 ? 0 : Math.max(1, Math.min(3, Math.ceil((level / 20) * 3)))
      parts.push(`Air:${air03}`)
      parts.push(`AbsoluteAir:${level}`)
    }
    if (
      sec.thrust ||
      /\bthrust/.test(blob) ||
      /\bsolace\b/.test(blob)
    ) {
      parts.push(`Thrusting:${level}`)
    }
  }

  return [...new Set(parts)].join(',')
}

export function buildStop(
  motorsOrToy:
    | number
    | Pick<
        ToyRow,
        'motors' | 'secondary' | 'functions' | 'name' | 'toyType' | 'motorMask'
      > = 1,
): string {
  // Zero every channel we might have driven (safe over-zero; Connect ignores unknowns).
  const zero = buildAction(0, motorsOrToy)
    .split(/[,;]+/)
    .map((p) => p.replace(/:\d+\s*$/, ':0'))
  const extras = [
    'Vibrate:0',
    'Vibrate1:0',
    'Vibrate2:0',
    'Vibrate3:0',
    'All:0',
    'Rotate:0',
    'Air:0',
    'AbsoluteAir:0',
    'Thrusting:0',
  ]
  return [...new Set([...zero, ...extras])].join(',')
}

/**
 * Lovense Standard API: timeSec 0 = run until next command;
 * finite values must be greater than 1 (sub-second / ~1s → LED flash, no motor).
 * Never emit 0 < t ≤ 1.
 */
export function lovenseTimeSec(durationSec: number): number {
  const d = Number(durationSec)
  if (!Number.isFinite(d) || d <= 0) return 0
  if (d < 1.1) return 0
  return Math.min(600, Math.round(d * 10) / 10)
}

/** Single-feature test actions (one motor, thruster, air, etc.). */
export type LovenseChannel =
  | 'vibrate'
  | 'vibrate1'
  | 'vibrate2'
  | 'vibrate3'
  | 'rotate'
  | 'thrust'
  | 'air'
  | 'pump'
  | 'all'

export function buildChannelAction(
  channel: string,
  level020: number,
  motorCount = 2,
): string {
  const level = Math.max(0, Math.min(20, Math.round(level020)))
  const n = Math.max(1, Math.min(3, Math.round(Number(motorCount) || 1)))
  const ch = String(channel || 'vibrate')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')

  const zeroOtherVibes = (on: number) => {
    const parts: string[] = []
    for (let m = 1; m <= n; m++) {
      parts.push(`Vibrate${m}:${m === on ? level : 0}`)
    }
    return parts.join(',')
  }

  if (ch === 'vibrate1' || ch === 'm1' || ch === 'motor1') {
    return n > 1 ? zeroOtherVibes(1) : `Vibrate:${level}`
  }
  if (ch === 'vibrate2' || ch === 'm2' || ch === 'motor2') {
    return n > 1 ? zeroOtherVibes(2) : `Vibrate:${level}`
  }
  if (ch === 'vibrate3' || ch === 'm3' || ch === 'motor3') {
    return n > 2 ? zeroOtherVibes(3) : n > 1 ? zeroOtherVibes(1) : `Vibrate:${level}`
  }
  if (ch === 'rotate') return `Rotate:${level}`
  if (ch === 'thrust' || ch === 'thrusting') return `Thrusting:${level}`
  if (ch === 'air' || ch === 'absoluteair') {
    const air03 =
      level <= 0 ? 0 : Math.max(1, Math.min(3, Math.ceil((level / 20) * 3)))
    return `Air:${air03},AbsoluteAir:${level}`
  }
  if (ch === 'pump') {
    const p =
      level <= 0 ? 0 : Math.max(1, Math.min(3, Math.ceil((level / 20) * 3)))
    return `Pump:${p}`
  }
  // Nora vibe+rotate, Max vibe+air, etc. — drive every channel together
  if (ch === 'both' || ch === 'combo') {
    const parts = [`Vibrate:${level}`, `Rotate:${level}`, `Thrusting:${level}`]
    const air03 =
      level <= 0 ? 0 : Math.max(1, Math.min(3, Math.ceil((level / 20) * 3)))
    parts.push(`Air:${air03}`, `AbsoluteAir:${level}`, `All:${level}`)
    return parts.join(',')
  }
  if (ch === 'all') return `All:${level}`
  // all vibe motors on one toy
  if (n > 1) {
    const parts: string[] = []
    for (let m = 1; m <= n; m++) parts.push(`Vibrate${m}:${level}`)
    parts.push(`Vibrate:${level}`)
    return parts.join(',')
  }
  return `Vibrate:${level}`
}

/** Hold one channel on one (or all listed) toys. */
export async function channelTestOnBase(
  base: string,
  channel: string,
  intensity020: number,
  durationSec: number,
  toys: ToyRow[] = [],
  toyId?: string,
): Promise<{ ok: boolean; action: string; toys: string[] }> {
  const level = Math.max(0, Math.min(20, Math.round(intensity020)))
  const t = lovenseTimeSec(
    Number.isFinite(durationSec) ? durationSec : 3,
  )
  if (level <= 0) {
    await stopOnBase(base, toys)
    return { ok: true, action: 'Stop', toys: [] }
  }

  let list = toys
  if (!list.length) {
    try {
      list = (await getToys(base)).list
    } catch {
      list = []
    }
  }
  if (toyId) {
    list = list.filter((x) => x.id === toyId)
    if (!list.length) {
      // still send targeted command even if inventory stale
      list = [
        {
          id: toyId,
          name: toyId,
          nickName: '',
          toyType: '',
          connected: true,
          status: 'online',
          battery: null,
          motors: 2,
          functions: [],
          secondary: { rotate: false, air: false, pump: false, thrust: false },
          extra: {},
        },
      ]
    }
  }

  const online = list.filter((x) => x.connected)
  const pool = online.length ? online : list
  if (!pool.length) {
    const action = buildChannelAction(channel, level, 2)
    await lovenseCommand(base, {
      command: 'Function',
      action,
      timeSec: t,
      stopPrevious: 1,
    })
    return { ok: true, action, toys: [] }
  }

  const actionsUsed: string[] = []
  for (const toy of pool) {
    if (!toy.id) continue
    let motors = Math.max(1, toy.motors || 1)
    const label = `${toy.toyType} ${toy.name}`.toLowerCase()
    if (/gemini|edge|dolce|lapis|magnet|clamp|twin|dual/.test(label)) {
      motors = Math.max(motors, 2)
    }
    const action = buildChannelAction(channel, level, motors)
    actionsUsed.push(action)
    await lovenseCommand(base, {
      command: 'Function',
      action,
      timeSec: t,
      // Targeted channel test — don't cascade stopPrevious onto other toys
      stopPrevious: 0,
      toy: toy.id,
    })
  }
  if (!actionsUsed.length) {
    throw new Error('No toy id for channel test')
  }
  return {
    ok: true,
    action: actionsUsed.join(' | '),
    toys: pool.map((x) => x.name || x.id),
  }
}

export async function lovenseGet(
  base: string,
  path: string,
  query: Record<string, string | number> = {},
): Promise<unknown> {
  const u = new URL(path.startsWith('/') ? path : `/${path}`, base + '/')
  for (const [k, v] of Object.entries(query)) {
    if (v != null && v !== '') u.searchParams.set(k, String(v))
  }
  const pathQ = u.pathname + u.search
  const res = await requestJson(base, pathQ)
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`GET ${pathQ} HTTP ${res.status}: ${res.text.slice(0, 160)}`)
  }
  return res.data
}

export async function lovenseCommand(
  base: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const payload = JSON.stringify({ apiVer: 1, ...body })
  const res = await requestJson(base, '/command', {
    method: 'POST',
    body: payload,
  })
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`POST /command HTTP ${res.status}: ${res.text.slice(0, 160)}`)
  }
  assertLovensePayload(res.data, 'POST /command')
  return res.data
}

/** Connect sometimes returns HTTP 200 with a non-OK code in the body. */
function assertLovensePayload(data: unknown, where: string) {
  if (data == null || typeof data !== 'object') return
  const o = data as Record<string, unknown>
  if (o.code == null && o.type == null && o.result == null) return
  const code = o.code != null ? Number(o.code) : null
  // 200 / 0 = success across Connect versions
  if (code != null && Number.isFinite(code) && code !== 200 && code !== 0) {
    const detail =
      String(o.message || o.type || o.msg || '').trim() || `code ${code}`
    throw new Error(`Lovense ${where}: ${detail}`)
  }
  if (typeof o.type === 'string') {
    const t = o.type.toUpperCase()
    if (t && t !== 'OK' && t !== 'SUCCESS' && !t.includes('OK')) {
      // Only fail clear error types — leave ambiguous types alone
      if (/ERR|ERROR|FAIL|INVALID/.test(t)) {
        throw new Error(`Lovense ${where}: ${o.type}`)
      }
    }
  }
}

/**
 * Standard API GetToys: POST https://{domain}:{port}/command
 * Body: { "command": "GetToys" } — no GET /GetToys or GET /command fallbacks.
 */
export async function getToys(base: string): Promise<{ raw: unknown; list: ToyRow[] }> {
  const raw = await lovenseCommand(base, { command: 'GetToys' })
  return { raw, list: normalizeToys(raw) }
}

export async function probeLocalIp(raw: string): Promise<{
  ok: boolean
  base?: string
  list?: ToyRow[]
  detail?: string
  error?: string
  tried?: string[]
}> {
  const tried: string[] = []
  const errs: string[] = []
  for (const ep of candidateEndpoints(raw)) {
    tried.push(ep.base)
    try {
      const { list } = await getToys(ep.base)
      const online = list.filter((t) => t.connected)
      const labels = (online.length ? online : list).map((t) => t.name)
      return {
        ok: true,
        base: ep.base,
        list,
        tried,
        detail:
          list.length === 0
            ? `Connect reached @ ${ep.base} · no toys paired`
            : `ok @ ${ep.base} · ${online.length || list.length} toy(s): ${labels.join(', ')}`,
      }
    } catch (e) {
      errs.push(`${ep.base}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return {
    ok: false,
    tried,
    error:
      errs.slice(0, 4).join(' | ') ||
      'No Local IP to try — paste host like 192.168.1.20 or Connect Local IP',
  }
}

/** Remote Game Mode probe — skips empty :20010 hits and keeps trying SSL. */
export async function probeLocalIpRemote(raw: string): Promise<{
  ok: boolean
  base?: string
  list?: ToyRow[]
  detail?: string
  error?: string
  tried?: string[]
}> {
  const tried: string[] = []
  const errs: string[] = []
  let emptyHit: { base: string; list: ToyRow[] } | null = null

  for (const ep of candidateEndpointsRemote(raw)) {
    tried.push(ep.base)
    try {
      const { list } = await getToys(ep.base)
      if (!list.length) {
        if (!emptyHit) emptyHit = { base: ep.base, list }
        continue
      }
      const online = list.filter((t) => t.connected)
      const labels = (online.length ? online : list).map((t) => t.name)
      return {
        ok: true,
        base: ep.base,
        list,
        tried,
        detail: `ok @ ${ep.base} · ${online.length || list.length} toy(s): ${labels.join(', ')}`,
      }
    } catch (e) {
      errs.push(`${ep.base}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  if (emptyHit) {
    return {
      ok: true,
      base: emptyHit.base,
      list: emptyHit.list,
      tried,
      detail: `Remote reached @ ${emptyHit.base} · no toys paired`,
    }
  }

  return {
    ok: false,
    tried,
    error:
      errs.slice(0, 4).join(' | ') ||
      'No Local IP to try — paste Remote Game Mode Local IP (Enable LAN)',
  }
}

export type DiscoverConnectResult = {
  ok: boolean
  localIp?: string
  base?: string
  error?: string
  scanned?: number
}

/** Scan private /24s on HTTP :20010 GetToys. Empty IP on Connect should call this. */
export async function discoverConnect(): Promise<DiscoverConnectResult> {
  const hosts = lanConnectScanHosts()
  if (!hosts.length) {
    return {
      ok: false,
      scanned: 0,
      error:
        'No Wi‑Fi/LAN on this PC — join the same network as Lovense Connect, then paste the Local IP it shows',
    }
  }

  let found: string | null = null
  let scanned = 0
  for (let i = 0; i < hosts.length && !found; i += DISCOVER_CONCURRENCY) {
    const batch = hosts.slice(i, i + DISCOVER_CONCURRENCY)
    scanned += batch.length
    const hits = await Promise.all(
      batch.map(async (host) =>
        (await pingConnectHttp(host, DISCOVER_TIMEOUT_MS)) ? host : null,
      ),
    )
    found = hits.find((h): h is string => Boolean(h)) || null
  }

  if (!found) {
    return {
      ok: false,
      scanned,
      error:
        'No Lovense Connect on this Wi‑Fi. Open Connect on the phone or PC, then paste the Local IP it shows',
    }
  }

  return {
    ok: true,
    localIp: found,
    base: `http://${found}:20010`,
    scanned,
  }
}

export async function vibrateOnBase(
  base: string,
  intensity020: number,
  durationSec: number,
  toys: ToyRow[] = [],
): Promise<{ ok: boolean; action: string; toys: string[] }> {
  const level = Math.max(0, Math.min(20, Math.round(intensity020)))
  // Pattern steps are often <1s; use 0 (indefinite) so Connect keeps motors on until Stop.
  const t = lovenseTimeSec(
    Number.isFinite(durationSec) ? durationSec : 3,
  )
  // Caller passed an explicit toy list (session target) — never fall back to all-device broadcast
  const targeted = toys.length > 0
  if (level <= 0) {
    await stopOnBase(base, toys)
    return { ok: true, action: 'Stop', toys: [] }
  }

  let list = toys
  if (!list.length) {
    try {
      list = (await getToys(base)).list
    } catch {
      list = []
    }
  }

  const online = list.filter((x) => x.connected)
  const pool = online.length ? online : list
  const errors: string[] = []
  const actionsUsed = new Set<string>()

  async function sendFunction(
    action: string,
    toyId?: string,
  ): Promise<void> {
    actionsUsed.add(action)
    const stopPrevious = toyId ? 0 : 1
    // #region agent log
    try {
      const { agentLog } = await import('./debugSessionLog.ts')
      agentLog(
        'lovense-node.ts:sendFunction',
        'bridge_function',
        {
          action: String(action).slice(0, 100),
          toyId: toyId || null,
          timeSec: t,
          stopPrevious,
          poolSize: pool.length,
          targeted,
        },
        !toyId ? 'H-A' : 'H-C',
      )
    } catch {
      /* ignore */
    }
    // #endregion
    await lovenseCommand(base, {
      command: 'Function',
      action,
      timeSec: t,
      // With a toy id: stopPrevious:0 avoids Connect flashing/stopping OTHER toys
      // (Gemini LED blink during a Nora-only rotate tip).
      stopPrevious,
      ...(toyId ? { toy: toyId } : {}),
    })
  }

  // Prefer multi-channel build first, then simpler fallbacks (mask-aware when given).
  // Specialty axes must not fall through to Vibrate-only — that is what silenced Nora rotate tips.
  const actionCandidates = (toy?: ToyRow): string[] => {
    const axis = toy?.driveAxis || 'full'
    if (axis === 'rotate') {
      return [
        buildAction(level, toy || { motors: 1, driveAxis: 'rotate' } as ToyRow),
        `Rotate:${level}`,
      ]
    }
    if (axis === 'thrust') {
      return [
        buildAction(level, toy || { motors: 1, driveAxis: 'thrust' } as ToyRow),
        `Thrusting:${level}`,
      ]
    }
    if (axis === 'air') {
      return [buildAction(level, toy || { motors: 1, driveAxis: 'air' } as ToyRow)]
    }

    const multi = toy
      ? buildAction(level, toy)
      : buildAction(level, 2)
    const mask = toy?.motorMask
    const only =
      mask && mask.length === 1
        ? Math.round(Number(mask[0]))
        : 0
    const list = [multi]
    const lanes = toy?.motorLevels
    if (lanes?.length && level > 0) {
      const lane = (m: number) =>
        Math.max(0, Math.min(20, Math.round(Number(lanes[m - 1]) || 0)))
      list.push(`Vibrate1:${lane(1)},Vibrate2:${lane(2)}`)
      return list.filter((a, i, arr) => arr.indexOf(a) === i)
    }
    if (only === 1) {
      list.push(`Vibrate1:${level},Vibrate2:0`, `Vibrate1:${level}`)
    } else if (only === 2) {
      list.push(`Vibrate1:0,Vibrate2:${level}`, `Vibrate2:${level}`)
    } else {
      list.push(
        `Vibrate1:${level},Vibrate2:${level}`,
        `Vibrate:${level}`,
        `All:${level}`,
      )
    }
    return list.filter((a, i, arr) => arr.indexOf(a) === i)
  }

  if (!pool.length) {
    // Untargeted inventory-empty path only — never used when a session toy list was passed empty intentionally
    if (targeted) {
      throw new Error('Target toy offline or missing from Connect inventory')
    }
    let ok = false
    for (const action of actionCandidates()) {
      try {
        await sendFunction(action)
        ok = true
        break
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e))
      }
    }
    if (!ok) {
      throw new Error(errors.join('; ') || 'vibrate failed')
    }
    return { ok: true, action: [...actionsUsed].join(' | '), toys: [] }
  }

  for (const toy of pool) {
    let toyOk = false
    let lastErr = ''
    if (!toy.id) {
      errors.push(`${toy.name || 'toy'}: missing id — refusing all-device broadcast`)
      continue
    }
    for (const action of actionCandidates(toy)) {
      try {
        await sendFunction(action, toy.id)
        toyOk = true
        break
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e)
      }
    }
    if (!toyOk) {
      errors.push(`${toy.name || toy.id}: ${lastErr || 'vibrate failed'}`)
    }
  }

  // Broadcast vibe hits EVERY paired toy (Gemini LED on Nora-only tips). Never do it
  // when the app passed an explicit target list.
  if (!targeted && errors.length >= pool.length) {
    try {
      await sendFunction(`Vibrate:${level}`)
      errors.length = 0
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e))
    }
  }
  if (errors.length && errors.length >= Math.max(1, pool.length || 1)) {
    throw new Error(errors.join('; ') || 'vibrate failed')
  }
  return {
    ok: true,
    action: [...actionsUsed].join(' | ') || buildAction(level, 1),
    toys: pool.map((x) => x.name || x.id),
  }
}

export async function stopOnBase(base: string, toys: ToyRow[] = []) {
  let list = toys
  if (!list.length) {
    try {
      list = (await getToys(base)).list
    } catch {
      list = []
    }
  }
  const online = list.filter((x) => x.connected)
  const pool = online.length ? online : list
  if (!pool.length) {
    // No inventory: must broadcast stop (caller already chose all toys)
    try {
      await lovenseCommand(base, {
        command: 'Function',
        action: 'Stop',
        timeSec: 0,
        stopPrevious: 1,
      })
    } catch {
      /* ignore */
    }
    return
  }

  for (const toy of pool) {
    if (!toy.id) continue
    // Session-scoped stop only — timeSec 0 + Stop (timeSec 1 zero-spams → LED flash peers).
    try {
      await lovenseCommand(base, {
        command: 'Function',
        action: 'Stop',
        timeSec: 0,
        stopPrevious: 0,
        toy: toy.id,
      })
    } catch {
      try {
        await lovenseCommand(base, {
          command: 'Function',
          action: buildStop(toy),
          timeSec: 0,
          stopPrevious: 0,
          toy: toy.id,
        })
      } catch {
        /* ignore */
      }
    }
  }
}
