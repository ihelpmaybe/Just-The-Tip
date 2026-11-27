/**
 * Direct Lovense Web Bluetooth for desktop browsers.
 * ASCII UART (same protocol as Lovense BLE UART toys).
 *
 * Web Bluetooth only exposes services listed at requestDevice time.
 * Buttplug recommends gen1 + gen2 + 32 gen‑3 variants (34 total).
 * @see https://buttplug.io/stpihkal/protocols/lovense/
 */

import { agentDbg } from '../debugAgentLog'

const GEN1 = '0000fff0-0000-1000-8000-00805f9b34fb'
const GEN2 = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
const GEN3_TAIL = '4bd4-bbd5-a6920e4c5653'

/**
 * optionalServices for requestDevice.
 * Keep this modest and well-known — oversized / exotic lists have been observed
 * to fail requestDevice on Chromium (instant NotFoundError "cancelled").
 *
 * Fixed services from buttplug-device-config + stpihkal XY×Z pattern (32 gen‑3).
 */
function optionalServiceUuids(): string[] {
  const out = new Set<string>([
    GEN1,
    GEN2,
    // From buttplug-device-config lovense.btle.services
    '50300001-0024-4bd4-bbd5-a6920e4c5653',
    '57300001-0023-4bd4-bbd5-a6920e4c5653',
    '5a300001-0024-4bd4-bbd5-a6920e4c5653',
    '50300001-0023-4bd4-bbd5-a6920e4c5653',
    '53300001-0023-4bd4-bbd5-a6920e4c5653',
    '5a300001-0023-4bd4-bbd5-a6920e4c5653',
    '4f300001-0023-4bd4-bbd5-a6920e4c5653',
    '42300001-0023-4bd4-bbd5-a6920e4c5653',
    '43300001-0023-4bd4-bbd5-a6920e4c5653',
  ])
  // stpihkal: X∈{4,5}, Y∈0–f, Z∈{3,4} → 64 variants (recommended approx 32+)
  for (const x of ['4', '5']) {
    for (let y = 0; y < 16; y++) {
      const xy = `${x}${y.toString(16)}`
      for (const z of ['3', '4']) {
        out.add(`${xy}300001-002${z}-${GEN3_TAIL}`)
      }
    }
  }
  return [...out]
}

const OPTIONAL_SERVICES = optionalServiceUuids()

/** Minimal filters — namePrefix only (service filters optional). */
const NAME_FILTERS: BluetoothLEScanFilter[] = [
  { namePrefix: 'LVS-' },
  { namePrefix: 'LVS' },
  { namePrefix: 'LOVE-' },
]

/** Options for requestDevice — call from a user-activation click. */
export function blePickerOptions(): RequestDeviceOptions {
  return {
    filters: NAME_FILTERS,
    optionalServices: OPTIONAL_SERVICES,
  }
}

function canWrite(ch: BluetoothRemoteGATTCharacteristic): boolean {
  const p = ch.properties
  return Boolean(p.write || p.writeWithoutResponse)
}

function preferWrite(
  chs: BluetoothRemoteGATTCharacteristic[],
): BluetoothRemoteGATTCharacteristic | null {
  if (!chs.length) return null
  return (
    chs.find((c) => /0002|fff2/i.test(c.uuid) && canWrite(c)) ||
    chs.find((c) => c.properties.writeWithoutResponse) ||
    chs.find((c) => c.properties.write) ||
    chs[0] ||
    null
  )
}

function firstGroupTail(uuid: string): string {
  const first = uuid.toLowerCase().split('-')[0] || ''
  return first.length >= 4 ? first.slice(-4) : first
}

function isLovenseGen3Service(uuid: string): boolean {
  const s = uuid.toLowerCase()
  return (
    s.includes('4bd4-bbd5') ||
    s.endsWith('a6920e4c5653') ||
    s.endsWith('a6921c11fcad') ||
    (firstGroupTail(s) === '0001' && s.includes('-002'))
  )
}

/** Pull a Bluetooth MAC out of a chooser / DeviceType string when present. */
export function extractMacAddress(raw: string): string | null {
  const text = String(raw || '')
  const colon = text.match(
    /\b([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5})\b/,
  )
  if (colon) return colon[1]!.toUpperCase()
  const dashed = text.match(
    /\b([0-9A-Fa-f]{2}(?:-[0-9A-Fa-f]{2}){5})\b/,
  )
  if (dashed) return dashed[1]!.replace(/-/g, ':').toUpperCase()
  const packed = text.match(/\b([0-9A-Fa-f]{12})\b/)
  if (packed) {
    return (
      packed[1]!.match(/.{1,2}/g)?.join(':').toUpperCase() || null
    )
  }
  return null
}

/** Strip trailing "(AA:BB:…)" Windows sometimes appends for duplicate names. */
function stripMacFromName(raw: string): string {
  return String(raw || '')
    .replace(/\s*\((?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\)\s*$/i, '')
    .replace(/\s*\([0-9A-Fa-f]{12}\)\s*$/i, '')
    .trim()
}

function buildInfo(id: string, rawName: string): WebBleToyInfo {
  const macFromName = extractMacAddress(rawName)
  const cleaned = stripMacFromName(rawName)
  const name = cleaned.replace(/^LVS-/i, '') || cleaned || rawName || 'Toy'
  const lower = `${rawName} ${name}`.toLowerCase()
  const fromCode = productIdFromModelCode(name) || productIdFromModelCode(rawName)
  const productHint = fromCode || (/\bnora\b/i.test(lower) ? 'nora' : '')
  const rotate =
    productHint === 'nora' ||
    /\bnora\b|\bmax\b|\bedge\b|\bosci|\bsolace|\bmission|\bgush|\bflexer|\bvulse/.test(
      lower,
    )
  const thrust = /\bmission|\bsolace|\bgravity|\bflexer/.test(lower)
  const air = /\bmax\b|\bair\b|\bpump\b/.test(lower)
  const dual =
    Boolean(fromCode && fromCode !== 'nora' && fromCode !== 'max') ||
    /\bedge\b|\bgemini\b|\bdolce\b|\blapis\b/.test(lower)
  // Max is 1 vibe + air — do not treat as dual from the old broad regex.
  const motors = dual ? 2 : 1
  const functions = ['Vibrate']
  if (motors > 1) {
    for (let m = 1; m <= motors; m++) functions.push(`Vibrate${m}`)
  }
  if (rotate) functions.push('Rotate')
  if (thrust) functions.push('Thrust')
  if (air) functions.push('Air')
  const displayName =
    fromCode === 'gemini'
      ? 'Gemini'
      : fromCode
        ? fromCode.charAt(0).toUpperCase() + fromCode.slice(1)
        : name
  return {
    id: id || 'ble',
    name: displayName,
    toyType: productHint || (/\bnora\b/i.test(lower) ? 'nora' : name),
    connected: true,
    secondary: { rotate, air, pump: air, thrust },
    functions,
    motors,
    battery: null,
    firmware: null,
    modelCode: fromCode ? normalizeModelCode(name) || normalizeModelCode(rawName) : null,
    mac: macFromName,
    typeRaw: null,
    deviceStatus: null,
    batch: null,
  }
}

import { productIdFromModelCode, normalizeModelCode } from '../utils/toyIdentity'

/** Map DeviceType letter / name / factory code to display product. */
function productFromTypeReply(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  const known = [
    'nora',
    'lush',
    'edge',
    'solace',
    'hush',
    'domi',
    'max',
    'gemini',
    'dolce',
    'osci',
    'ambi',
    'ferri',
    'gush',
    'hyphy',
    'flexer',
    'ridge',
    'lapis',
    'gravity',
    'calor',
  ]
  const low = t.toLowerCase()
  for (const k of known) {
    if (low.includes(k)) return k.charAt(0).toUpperCase() + k.slice(1)
  }
  const code = t.split(/[:;]/)[0]?.trim().toUpperCase()
  const fromFactory = productIdFromModelCode(code)
  if (fromFactory) {
    return fromFactory.charAt(0).toUpperCase() + fromFactory.slice(1)
  }
  const map: Record<string, string> = {
    A: 'Nora',
    C: 'Nora',
    B: 'Max',
    L: 'Ambi',
    S: 'Lush',
    Z: 'Hush',
    W: 'Domi',
    P: 'Edge',
    O: 'Osci',
    H: 'Solace',
  }
  if (code && map[code]) return map[code]!
  return ''
}

function applyProductName(info: WebBleToyInfo, product: string): WebBleToyInfo {
  if (!product) return info
  const rebuilt = buildInfo(info.id, product)
  return {
    ...rebuilt,
    id: info.id,
    name: product,
    toyType: product.toLowerCase(),
    battery: info.battery,
    firmware: info.firmware,
    modelCode: info.modelCode,
    mac: info.mac,
    typeRaw: info.typeRaw,
    deviceStatus: info.deviceStatus,
    batch: info.batch,
    connected: info.connected,
  }
}

function preferNotify(
  chs: BluetoothRemoteGATTCharacteristic[],
): BluetoothRemoteGATTCharacteristic | null {
  if (!chs.length) return null
  return (
    chs.find((c) => /0003|fff1/i.test(c.uuid) && c.properties.notify) ||
    chs.find((c) => c.properties.notify) ||
    chs.find((c) => c.properties.indicate) ||
    null
  )
}

function canNotify(ch: BluetoothRemoteGATTCharacteristic): boolean {
  return Boolean(ch.properties.notify || ch.properties.indicate)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Race a GATT promise so a powered-off toy cannot hang the whole panel. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  return Promise.race([
    p.finally(() => {
      if (timer !== undefined) clearTimeout(timer)
    }),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(label)), ms)
    }),
  ])
}

/** Lovense firmware misspells "unknown" as "unkown" on unsupported cmds. */
function isGarbageModelCode(code: string | null | undefined): boolean {
  return Boolean(code && /^unkn?own$/i.test(code.trim()))
}

/** Reject Status:/GetBatch: error replies mistaken for DeviceType. */
function looksLikeDeviceTypeReply(part: string): boolean {
  const bits = part.split(':').map((s) => s.trim()).filter(Boolean)
  if (!bits.length) return false
  if (isGarbageModelCode(bits[0])) return false
  const second = (bits[1] || '').toLowerCase()
  if (second === 'status' || second === 'getbatch' || second === 'battery') {
    return false
  }
  return true
}

/** Chrome NotFoundError / user closed the Bluetooth chooser. */
export function isBlePickerCancel(e: unknown): boolean {
  const name = e instanceof Error ? e.name : ''
  const msg = e instanceof Error ? e.message : String(e)
  return (
    name === 'NotFoundError' ||
    /cancel|choos|no device selected|no device/i.test(msg)
  )
}

function blePickerPromptName(): string {
  try {
    const ua =
      typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : ''
    if (/\bElectron\//i.test(ua)) return 'Bluetooth'
    return 'Chrome Bluetooth'
  } catch {
    return 'Bluetooth'
  }
}

function mapBleError(e: unknown, fallback: string): Error {
  const name = e instanceof Error ? e.name : ''
  const msg = e instanceof Error ? e.message : String(e)
  if (isBlePickerCancel(e)) {
    return new Error(
      `Cancelled · keep the toy on and nearby, then Link toy again (${blePickerPromptName()} pick)`,
    )
  }
  if (name === 'SecurityError' || /secure|permission|blocked/i.test(msg)) {
    return new Error(msg || 'Bluetooth blocked')
  }
  if (
    name === 'NetworkError' ||
    /connection failed|gatt|link timed out|NetworkError/i.test(msg)
  ) {
    return new Error('Link failed · close Windows Bluetooth pairing and retry')
  }
  if (/No write characteristic/i.test(msg)) {
    return new Error(msg)
  }
  return new Error(msg || fallback)
}

export function webBluetoothShellBlocked(): string | null {
  try {
    const ua =
      typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : ''
    // Cursor Simple Browser exposes navigator.bluetooth but never wires the
    // OS chooser — requestDevice rejects in ~10ms. Just The Tip's Electron
    // shell handles select-bluetooth-device, so leave Electron alone.
    if (/\bCursor\//i.test(ua)) {
      return 'Open Just The Tip in Chrome, Edge, or the desktop app to use Bluetooth'
    }
    return null
  } catch {
    return null
  }
}

export function webBluetoothSupported(): boolean {
  try {
    if (webBluetoothShellBlocked()) return false
    return Boolean(
      typeof navigator !== 'undefined' &&
        navigator.bluetooth &&
        typeof navigator.bluetooth.requestDevice === 'function',
    )
  } catch {
    return false
  }
}

export function webBluetoothUnavailableMessage(): string {
  return (
    webBluetoothShellBlocked() ||
    'Bluetooth is not available in this browser'
  )
}

/**
 * Per-device key. `device.id` is unique when present; the old name-based
 * fallback collided for two units of the same model (second Nora evicted
 * the first from the bound map).
 */
const fallbackIds = new WeakMap<BluetoothDevice, string>()
let fallbackSeq = 0

function stableDeviceId(device: BluetoothDevice): string {
  if (device.id) return device.id
  const existing = fallbackIds.get(device)
  if (existing) return existing
  const made = `ble-${(device.name || 'toy').replace(/\s+/g, '-')}-${++fallbackSeq}`
  fallbackIds.set(device, made)
  return made
}

/** Chrome flag that enables navigator.bluetooth.getDevices(). */
export const BLE_PERSIST_FLAG_URL =
  'chrome://flags/#enable-web-bluetooth-new-permissions-backend'

/**
 * Can the page re-open toys after a refresh without the chooser?
 * Needs getDevices(), which Chrome keeps behind a flag on desktop.
 */
export function bleSilentReconnectSupported(): boolean {
  try {
    if (typeof navigator === 'undefined' || !navigator.bluetooth) return false
    const bt = navigator.bluetooth as Bluetooth & {
      getDevices?: () => Promise<BluetoothDevice[]>
    }
    return typeof bt.getDevices === 'function'
  } catch {
    return false
  }
}

export type WebBleToyInfo = {
  id: string
  name: string
  toyType: string
  connected: boolean
  secondary: {
    rotate: boolean
    air: boolean
    pump: boolean
    thrust: boolean
  }
  functions: string[]
  motors: number
  /** 0–100 from Battery; */
  battery: number | null
  /** FW field from DeviceType; */
  firmware: string | null
  /** Model letter (A/C Nora, S Lush…) */
  modelCode: string | null
  /** MAC from DeviceType; */
  mac: string | null
  /** Raw DeviceType; reply */
  typeRaw: string | null
  /** From Status:1; */
  deviceStatus: string | null
  /** From GetBatch; */
  batch: string | null
}

export type BleConnectHooks = {
  /** After user picks a device in the browser chooser, before GATT. */
  onPicked?: (name: string) => void
}

type Bound = {
  device: BluetoothDevice
  server: BluetoothRemoteGATTServer
  tx: BluetoothRemoteGATTCharacteristic
  rx: BluetoothRemoteGATTCharacteristic | null
  info: WebBleToyInfo
  onLost: () => void
  onRx: (ev: Event) => void
  rxBuf: string
}

export class LovenseWebBluetooth {
  private bounds = new Map<string, Bound>()
  private onLost: (() => void) | null = null
  /** Called when probe replies update battery/type/etc. */
  private onInfo: (() => void) | null = null
  /** Suppress onLost for an id while that id's attach is in flight (not global). */
  private attachingIds = new Set<string>()
  /**
   * Windows often keeps OS “Connected” after GATT dies, and Chrome sometimes
   * never fires gattserverdisconnected until the next write. Poll so the app
   * inventory matches the real browser link.
   */
  private linkWatch: ReturnType<typeof setInterval> | null = null
  /** In-flight silent reconnect — boot + tab-focus must join, not run a second pass. */
  private reconnectInflight: Promise<{
    permitted: number
    linked: number
    names: string[]
    permittedNames: string[]
  }> | null = null
  /** Last known UART service UUID per Chrome device id (speeds reload). */
  private rememberedService = new Map<string, string>()
  /** Bumped by disconnect so an in-flight reconnect cannot reseat toys. */
  private linkGen = 0
  /** Live advertisement AbortControllers — must die on refresh or Chrome spins. */
  private adStops = new Set<() => void>()
  /** Devices mid-GATT attach (not in bounds yet) so unload can still drop them. */
  private attachingDevices = new Map<string, BluetoothDevice>()
  private unloadBound = false
  /** One GATT attach at a time — parallel connect failed Lush on Windows. */
  private attachMutex: Promise<void> = Promise.resolve()
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null
  private recoveryUntil = 0

  constructor() {
    this.bindPageUnload()
  }

  get reconnecting(): boolean {
    return this.reconnectInflight != null || this.recoveryUntil > Date.now()
  }

  get linked(): boolean {
    for (const b of this.bounds.values()) {
      if (b.server.connected && b.tx) return true
    }
    return false
  }

  get count(): number {
    let n = 0
    for (const b of this.bounds.values()) {
      if (b.server.connected && b.tx) n++
    }
    return n
  }

  /** First linked toy (legacy). Prefer `allInfo`. */
  get info(): WebBleToyInfo | null {
    return this.allInfo()[0] || null
  }

  allInfo(): WebBleToyInfo[] {
    this.sweepDeadLinks()
    const out: WebBleToyInfo[] = []
    for (const b of this.bounds.values()) {
      out.push({
        ...b.info,
        connected: Boolean(b.server.connected),
      })
    }
    return out
  }

  setOnLost(cb: (() => void) | null) {
    this.onLost = cb
  }

  setOnInfo(cb: (() => void) | null) {
    this.onInfo = cb
  }

  private emitInfo() {
    this.onInfo?.()
  }

  private ensureLinkWatch() {
    if (this.linkWatch != null) return
    this.linkWatch = setInterval(() => {
      if (!this.bounds.size) {
        this.clearLinkWatch()
        return
      }
      this.sweepDeadLinks()
    }, 2_500)
  }

  private clearLinkWatch() {
    if (this.linkWatch == null) return
    clearInterval(this.linkWatch)
    this.linkWatch = null
  }

  /** Drop bounds whose GATT already reports disconnected. */
  private sweepDeadLinks() {
    const dead: string[] = []
    for (const [id, b] of this.bounds) {
      if (this.attachingIds.has(id)) continue
      let up = false
      try {
        up = Boolean(b.server.connected)
      } catch {
        up = false
      }
      if (!up) dead.push(id)
    }
    for (const id of dead) this.dropBound(id)
  }

  private dropBound(id: string) {
    const b = this.bounds.get(id)
    if (!b) return
    try {
      b.device.removeEventListener('gattserverdisconnected', b.onLost)
    } catch {
      /* ignore */
    }
    if (b.rx) {
      try {
        b.rx.removeEventListener('characteristicvaluechanged', b.onRx)
      } catch {
        /* ignore */
      }
      try {
        void b.rx.stopNotifications()
      } catch {
        /* ignore */
      }
    }
    this.bounds.delete(id)
    if (!this.bounds.size) this.clearLinkWatch()
    if (!this.attachingIds.has(id)) this.onLost?.()
  }

  /**
   * Open the browser BLE chooser, then bind GATT.
   * Prefer openPickerFromUserGesture from a click for max gesture fidelity.
   */
  async connectFromPicker(hooks?: BleConnectHooks): Promise<WebBleToyInfo> {
    if (!webBluetoothSupported()) {
      throw new Error(webBluetoothUnavailableMessage())
    }
    const pick = this.openPickerFromUserGesture()
    try {
      const device = await pick
      hooks?.onPicked?.(device.name || 'Toy')
      return await this.attach(device)
    } catch (e) {
      throw mapBleError(e, 'Link failed')
    }
  }

  /**
   * Start requestDevice synchronously from a user click (returns its Promise).
   * Do not await anything before calling this from the click stack.
   */
  openPickerFromUserGesture(): Promise<BluetoothDevice> {
    const shellBlock = webBluetoothShellBlocked()
    if (shellBlock) {
      return Promise.reject(new Error(shellBlock))
    }
    if (
      typeof navigator === 'undefined' ||
      !navigator.bluetooth ||
      typeof navigator.bluetooth.requestDevice !== 'function'
    ) {
      return Promise.reject(new Error(webBluetoothUnavailableMessage()))
    }
    const bluetooth = navigator.bluetooth
    let req: Promise<BluetoothDevice>
    try {
      req = bluetooth.requestDevice(blePickerOptions())
    } catch (syncErr) {
      return Promise.reject(mapBleError(syncErr, 'Device selection failed'))
    }
    return req.catch((e) => {
      throw mapBleError(e, 'No device selected')
    })
  }

  /** GATT-bind a device already chosen via Web Bluetooth picker (keeps other toys). */
  async attachChosenDevice(
    device: BluetoothDevice,
    hooks?: BleConnectHooks,
  ): Promise<WebBleToyInfo> {
    hooks?.onPicked?.(device.name || 'Toy')
    try {
      return await this.attach(device)
    } catch (e) {
      throw mapBleError(e, 'Link failed')
    }
  }

  /**
   * Start scanning without awaiting watchAdvertisements() — that promise can
   * sit for seconds on Windows after ads are already arriving. Do not abort
   * sibling watches until every toy has advertised (Chrome shares one scanner).
   */
  private beginAdvertisementWatch(device: BluetoothDevice): {
    t0: number
    seen: Promise<void>
    gotAd: () => boolean
    stop: () => void
  } | null {
    if (device.gatt?.connected) return null
    if (typeof device.watchAdvertisements !== 'function') {
      // #region agent log
      agentDbg('F', 'webBluetooth.ts:waitForAdvertisement', 'no watchAdvertisements', {
        name: device.name || '',
      })
      // #endregion
      return null
    }
    const t0 = Date.now()
    const abort = new AbortController()
    let gotAd = false
    const seen = new Promise<void>((resolve) => {
      const onAd = () => {
        if (gotAd) return
        gotAd = true
        device.removeEventListener('advertisementreceived', onAd)
        // #region agent log
        agentDbg('F', 'webBluetooth.ts:waitForAdvertisement', 'ad event', {
          name: device.name || '',
          ms: Date.now() - t0,
        })
        // #endregion
        resolve()
      }
      device.addEventListener('advertisementreceived', onAd)
      abort.signal.addEventListener('abort', () => {
        device.removeEventListener('advertisementreceived', onAd)
        resolve()
      })
    })
    void device.watchAdvertisements({ signal: abort.signal }).catch((e) => {
      // #region agent log
      agentDbg('F', 'webBluetooth.ts:waitForAdvertisement', 'watch fail', {
        name: device.name || '',
        err: e instanceof Error ? e.message : String(e),
        ms: Date.now() - t0,
      })
      // #endregion
    })
    const stop = () => {
      this.adStops.delete(stop)
      try {
        abort.abort()
      } catch {
        /* ignore */
      }
    }
    this.adStops.add(stop)
    return {
      t0,
      seen,
      gotAd: () => gotAd,
      stop,
    }
  }

  private isBoundLive(device: BluetoothDevice): boolean {
    const b = this.bounds.get(stableDeviceId(device))
    try {
      return Boolean(b?.server.connected && b.tx)
    } catch {
      return false
    }
  }

  async tryReconnectKnown(opts?: {
    waitForAds?: boolean
  }): Promise<{
    permitted: number
    linked: number
    names: string[]
    permittedNames: string[]
  }> {
    if (this.reconnectInflight) {
      // #region agent log
      agentDbg('G', 'webBluetooth.ts:tryReconnectKnown', 'join inflight', {
        waitForAds: opts?.waitForAds,
      })
      // #endregion
      return this.reconnectInflight
    }
    this.reconnectInflight = this.tryReconnectKnownInner(opts).finally(() => {
      this.reconnectInflight = null
    })
    return this.reconnectInflight
  }

  private async tryReconnectKnownInner(opts?: {
    waitForAds?: boolean
  }): Promise<{
    permitted: number
    linked: number
    names: string[]
    permittedNames: string[]
  }> {
    const empty = {
      permitted: 0,
      linked: 0,
      names: [] as string[],
      permittedNames: [] as string[],
    }
    if (!webBluetoothSupported()) return empty
    const bluetooth = navigator.bluetooth as Bluetooth & {
      getDevices?: () => Promise<BluetoothDevice[]>
    }
    if (!bluetooth.getDevices) {
      // #region agent log
      agentDbg('A', 'webBluetooth.ts:tryReconnectKnownInner', 'getDevices missing')
      // #endregion
      return empty
    }
    let known: BluetoothDevice[] = []
    try {
      known = await bluetooth.getDevices()
    } catch {
      return empty
    }
    const permittedNames = known
      .map((d) => d.name || 'Toy')
      .filter(Boolean)
    // #region agent log
    agentDbg('A', 'webBluetooth.ts:tryReconnectKnownInner', 'getDevices result', {
      waitForAds: opts?.waitForAds,
      permitted: known.length,
      names: permittedNames,
      gattUp: known.map((d) => ({
        name: d.name || '',
        gatt: Boolean(d.gatt?.connected),
        id: d.id?.slice(0, 8),
      })),
    })
    // #endregion
    if (!known.length) return { ...empty, permittedNames }

    for (const row of LovenseWebBluetooth.loadRememberedToys()) {
      if (row.id && row.service) this.rememberedService.set(row.id, row.service)
    }

    const score = (d: BluetoothDevice) => {
      const n = (d.name || '').toUpperCase()
      if (n.includes('LVS') || n.includes('NORA') || n.includes('LOVE')) return 3
      if (n) return 1
      return 0
    }
    const ordered = [...known].sort((a, b) => score(b) - score(a))
    const gen = this.linkGen

    const attachOne = async (d: BluetoothDevice) => {
      if (this.isBoundLive(d) || gen !== this.linkGen) return
      const prev = this.attachMutex
      let release!: () => void
      this.attachMutex = new Promise<void>((r) => {
        release = r
      })
      await prev
      try {
        if (this.isBoundLive(d) || gen !== this.linkGen) return
        const t0 = Date.now()
        try {
          await this.attach(d, {
            forceFresh: Boolean(d.gatt?.connected),
            quick: true,
            recover: true,
          })
          // #region agent log
          agentDbg('B', 'webBluetooth.ts:attachOne', 'attach ok', {
            name: d.name || '',
            id: d.id?.slice(0, 8),
            ms: Date.now() - t0,
          })
          // #endregion
        } catch (e) {
          // #region agent log
          agentDbg('B', 'webBluetooth.ts:attachOne', 'attach fail', {
            name: d.name || '',
            id: d.id?.slice(0, 8),
            err: e instanceof Error ? e.message : String(e),
            ms: Date.now() - t0,
          })
          // #endregion
        }
      } finally {
        release()
      }
    }

    // Ads stay live into background recovery. Do not wait on them here.
    const watches: {
      d: BluetoothDevice
      w: NonNullable<ReturnType<LovenseWebBluetooth['beginAdvertisementWatch']>>
    }[] = []
    if (opts?.waitForAds !== false && gen === this.linkGen) {
      for (const d of ordered) {
        if (this.isBoundLive(d) || d.gatt?.connected) continue
        const w = this.beginAdvertisementWatch(d)
        if (w) watches.push({ d, w })
      }
    }

    // One fail-fast pass. First live toy returns; the rest recover off-thread.
    // #region agent log
    agentDbg('G', 'webBluetooth.ts:tryReconnectKnownInner', 'attach batch', {
      mode: 'first-live-then-background',
      n: ordered.filter((d) => !this.isBoundLive(d)).length,
    })
    // #endregion
    for (const d of ordered) {
      if (gen !== this.linkGen) break
      await attachOne(d)
      if (this.linked) break
    }

    const stillMissing = ordered.filter((d) => !this.isBoundLive(d))
    if (stillMissing.length && gen === this.linkGen) {
      this.startBackgroundRecovery(stillMissing, gen, watches)
    } else {
      for (const { w } of watches) w.stop()
    }

    const names = this.allInfo()
      .filter((t) => t.connected !== false)
      .map((t) => t.name)
      .filter(Boolean)
    return {
      permitted: known.length,
      linked: names.length,
      names,
      permittedNames,
    }
  }

  private startBackgroundRecovery(
    devices: BluetoothDevice[],
    gen: number,
    watches: {
      d: BluetoothDevice
      w: NonNullable<ReturnType<LovenseWebBluetooth['beginAdvertisementWatch']>>
    }[] = [],
  ) {
    this.clearBackgroundRecovery(false)
    this.recoveryUntil = Date.now() + 90_000
    let pass = 0
    const stopWatches = () => {
      for (const { w } of watches) w.stop()
    }
    const tick = async () => {
      if (gen !== this.linkGen) {
        stopWatches()
        this.clearBackgroundRecovery()
        return
      }
      const missing = devices.filter((d) => !this.isBoundLive(d))
      if (!missing.length || Date.now() > this.recoveryUntil) {
        stopWatches()
        this.clearBackgroundRecovery()
        this.emitInfo()
        return
      }
      const advertised = missing.filter((d) =>
        watches.some((row) => row.d === d && row.w.gotAd()),
      )
      const target = advertised[0] || missing[0]!
      pass += 1
      try {
        await this.attach(target, {
          quick: true,
          recover: pass <= 3,
        })
      } catch {
        /* still out — next tick */
      }
      this.emitInfo()
      this.recoveryTimer = setTimeout(() => void tick(), advertised.length ? 200 : 800)
    }
    this.recoveryTimer = setTimeout(() => void tick(), 50)
  }

  private clearBackgroundRecovery(resetUntil = true) {
    if (this.recoveryTimer != null) {
      clearTimeout(this.recoveryTimer)
      this.recoveryTimer = null
    }
    if (resetUntil) this.recoveryUntil = 0
  }

  /** Compact last-session inventory (survives refresh). */
  static rememberedKey = 'pulsefans.ble.remembered.v3'
  static rememberedKeyLegacy = [
    'pulsefans.ble.remembered.v2',
    'pulsefans.ble.remembered.v1',
  ] as const

  static loadRememberedToys(): {
    name: string
    mac: string
    tag: string
    id: string
    service?: string
  }[] {
    try {
      const keys = [
        LovenseWebBluetooth.rememberedKey,
        ...LovenseWebBluetooth.rememberedKeyLegacy,
      ]
      let best: {
        name: string
        mac: string
        tag: string
        id: string
        service?: string
      }[] = []
      for (const key of keys) {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const parsed = JSON.parse(raw) as unknown
        if (!Array.isArray(parsed) || !parsed.length) continue
        const out: {
          name: string
          mac: string
          tag: string
          id: string
          service?: string
        }[] = []
        for (const row of parsed) {
          if (typeof row === 'string' && row.trim()) {
            out.push({
              name: row.trim().slice(0, 48),
              mac: '',
              tag: '',
              id: '',
            })
            continue
          }
          if (!row || typeof row !== 'object') continue
          const r = row as Record<string, unknown>
          const name =
            typeof r.name === 'string' ? r.name.trim().slice(0, 48) : ''
          if (!name) continue
          const id = typeof r.id === 'string' ? r.id.trim().slice(0, 64) : ''
          const mac =
            typeof r.mac === 'string'
              ? r.mac.trim().toUpperCase()
              : extractMacAddress(String(r.mac || '')) || ''
          const tag =
            typeof r.tag === 'string'
              ? r.tag.trim().toUpperCase().slice(0, 8)
              : mac
                ? mac.replace(/[^0-9A-F]/gi, '').slice(-4).toUpperCase()
                : ''
          const service =
            typeof r.service === 'string' && r.service.includes('-')
              ? r.service.trim().toLowerCase().slice(0, 64)
              : ''
          out.push({ name, mac, tag, id, ...(service ? { service } : {}) })
        }
        const cleaned = LovenseWebBluetooth.dedupeRemembered(out)
        if (cleaned.length > best.length) best = cleaned
      }
      return best.slice(0, 12)
    } catch {
      return []
    }
  }

  /** Collapse the duplicate Nora/Domi spam from older builds. */
  static dedupeRemembered(
    list: { name: string; mac: string; tag: string; id: string; service?: string }[],
  ): { name: string; mac: string; tag: string; id: string; service?: string }[] {
    type Row = {
      name: string
      mac: string
      tag: string
      id: string
      service?: string
    }
    const merge = (a: Row, b: Row): Row => ({
      name: a.name || b.name,
      mac: a.mac || b.mac,
      tag: a.tag || b.tag,
      id: a.id || b.id,
      service: a.service || b.service,
    })
    const byId = new Map<string, Row>()
    const rest: Row[] = []
    for (const toy of list) {
      if (toy.id) {
        const prev = byId.get(toy.id)
        byId.set(toy.id, prev ? merge(prev, toy) : toy)
      } else {
        rest.push(toy)
      }
    }
    const byMac = new Map<string, Row>()
    const out: Row[] = []
    const take = (toy: Row) => {
      if (toy.mac) {
        const prev = byMac.get(toy.mac)
        if (prev) {
          const i = out.indexOf(prev)
          const next = merge(prev, toy)
          byMac.set(toy.mac, next)
          if (i >= 0) out[i] = next
          return
        }
        byMac.set(toy.mac, toy)
      }
      const nameKey = toy.name.toLowerCase()
      if (
        !toy.mac &&
        !toy.id &&
        out.some(
          (t) =>
            !t.mac &&
            !t.id &&
            t.name.toLowerCase() === nameKey &&
            (t.tag || '') === (toy.tag || ''),
        )
      ) {
        return
      }
      out.push(toy)
    }
    for (const toy of byId.values()) take(toy)
    for (const toy of rest) take(toy)
    return out
  }

  static loadRememberedNames(): string[] {
    return LovenseWebBluetooth.loadRememberedToys().map((t) =>
      t.tag ? `${t.name} ${t.tag}` : t.name,
    )
  }

  /**
   * Snapshot linked toys into last-session storage.
   * Union with the previous list so a partial reconnect cannot wipe the rest.
   */
  private persistRemembered() {
    try {
      const live = this.allInfo().map((t) => {
        const mac = (t.mac || extractMacAddress(t.name) || '').toUpperCase()
        const tag = mac
          ? mac.replace(/[^0-9A-F]/gi, '').slice(-4).toUpperCase()
          : ''
        const service = t.id ? this.rememberedService.get(t.id) : ''
        return {
          name: stripMacFromName(t.name).replace(/^LVS-/i, '') || t.name,
          mac,
          tag,
          id: t.id || '',
          ...(service ? { service } : {}),
        }
      })
      if (!live.length) return
      const prev = LovenseWebBluetooth.loadRememberedToys()
      const cleaned = LovenseWebBluetooth.dedupeRemembered([...live, ...prev])
      localStorage.setItem(
        LovenseWebBluetooth.rememberedKey,
        JSON.stringify(cleaned.slice(0, 12)),
      )
      for (const key of LovenseWebBluetooth.rememberedKeyLegacy) {
        try {
          localStorage.removeItem(key)
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
  }

  /** Drop last-session BLE names so leftover cards can disappear. */
  static clearRemembered() {
    try {
      localStorage.removeItem(LovenseWebBluetooth.rememberedKey)
      for (const key of LovenseWebBluetooth.rememberedKeyLegacy) {
        localStorage.removeItem(key)
      }
    } catch {
      /* ignore */
    }
  }

  private async attach(
    device: BluetoothDevice,
    opts?: { forceFresh?: boolean; quick?: boolean; recover?: boolean },
  ): Promise<WebBleToyInfo> {
    const id = stableDeviceId(device)
    this.attachingIds.add(id)
    this.attachingDevices.set(id, device)
    const recover = Boolean(opts?.recover)
    const gen = this.linkGen
    try {
      // Replace only the same device; keep other linked toys
      if (this.bounds.has(id)) {
        await this.disconnectOne(id, true)
      }

      const gatt = device.gatt
      if (!gatt) throw new Error('No GATT on this device')

      // After a page refresh Chrome may still report gatt.connected with a
      // dead document session — characteristics then fail. Only reseat if up.
      if (gatt.connected) {
        try {
          gatt.disconnect()
        } catch {
          /* ignore */
        }
        await sleep(recover ? 20 : opts?.quick ? 250 : 160)
      }

      let server: BluetoothRemoteGATTServer | null = null
      let lastErr: unknown = null
      const attempts = recover ? 1 : opts?.quick ? 2 : 3
      const connectMs = recover ? 1_400 : opts?.quick ? 8_000 : 18_000
      for (let attempt = 0; attempt < attempts; attempt++) {
        if (gen !== this.linkGen) throw new Error('Reconnect cancelled')
        if (attempt) await sleep(recover ? 80 : 400 * attempt)
        try {
          server = await withTimeout(gatt.connect(), connectMs, 'Link timed out')
          break
        } catch (e) {
          lastErr = e
          try {
            if (gatt.connected) gatt.disconnect()
          } catch {
            /* ignore */
          }
        }
      }
      if (!server) throw lastErr || new Error('Link failed')
      if (gen !== this.linkGen) {
        try {
          server.disconnect()
        } catch {
          /* ignore */
        }
        throw new Error('Reconnect cancelled')
      }

      if (!recover) await sleep(opts?.quick ? 80 : 120)

      const preferService = this.rememberedService.get(id)
      let pair: {
        tx: BluetoothRemoteGATTCharacteristic
        rx: BluetoothRemoteGATTCharacteristic | null
      } | null = null
      const pairTries = recover ? 1 : opts?.quick ? 2 : 6
      for (let attempt = 0; attempt < pairTries; attempt++) {
        if (gen !== this.linkGen) throw new Error('Reconnect cancelled')
        if (attempt) await sleep(recover ? 80 : 150 * attempt)
        if (!server.connected) {
          try {
            server = await withTimeout(
              gatt.connect(),
              recover ? 2_000 : opts?.quick ? 2_500 : 8_000,
              'Link timed out',
            )
          } catch {
            /* retry find next loop */
          }
        }
        pair = await this.findPair(server, preferService, {
          quick: Boolean(opts?.quick || recover),
          recover,
        })
        if (pair) break
      }
      if (!pair) {
        try {
          server.disconnect()
        } catch {
          /* ignore */
        }
        throw new Error(`No write characteristic on ${device.name || 'device'}`)
      }

      const serviceUuid = pair.tx.service?.uuid
      if (serviceUuid) this.rememberedService.set(id, serviceUuid.toLowerCase())

      const info = buildInfo(id, device.name || 'Toy')
      const onLost = () => this.dropBound(id)
      const bound: Bound = {
        device,
        server,
        tx: pair.tx,
        rx: pair.rx,
        info,
        onLost,
        onRx: () => {},
        rxBuf: '',
      }
      bound.onRx = (ev: Event) => this.handleRxEvent(id, ev)
      device.removeEventListener('gattserverdisconnected', onLost)
      device.addEventListener('gattserverdisconnected', onLost)
      this.bounds.set(id, bound)

      if (pair.rx) {
        try {
          pair.rx.addEventListener('characteristicvaluechanged', bound.onRx)
          const notify = withTimeout(
            pair.rx.startNotifications(),
            recover ? 400 : 3_000,
            'Notify start timed out',
          )
          if (recover) void notify.catch(() => {})
          else await notify
        } catch {
          /* some firmwares still answer without notify; probes may no-op */
        }
      }

      if (recover) void this.probeToy(id, 0)
      else void this.probeToy(id)
      this.persistRemembered()
      this.ensureLinkWatch()
      this.emitInfo()
      return { ...info, connected: true }
    } finally {
      this.attachingIds.delete(id)
      this.attachingDevices.delete(id)
    }
  }

  private handleRxEvent(id: string, ev: Event) {
    const b = this.bounds.get(id)
    if (!b) return
    const target = ev.target as BluetoothRemoteGATTCharacteristic | null
    const view = target?.value
    if (!view) return
    const chunk = new TextDecoder('utf-8').decode(view.buffer)
    if (!chunk) return
    b.rxBuf += chunk
    let buf = b.rxBuf
    while (true) {
      const semi = buf.indexOf(';')
      if (semi < 0) {
        if (buf.length > 220) buf = buf.slice(-48)
        b.rxBuf = buf
        break
      }
      const part = buf.slice(0, semi).trim()
      buf = buf.slice(semi + 1)
      b.rxBuf = buf
      if (part) this.handleReply(id, part)
    }
  }

  private handleReply(id: string, part: string) {
    const b = this.bounds.get(id)
    if (!b) return
    const low = part.toLowerCase()
    if (low === 'ok' || low === 'err') return

    let changed = false

    // Batch codes are 5–8 digits (e.g. 190124)
    if (/^\d{5,8}$/.test(part) && !part.includes(':')) {
      b.info = { ...b.info, batch: part }
      changed = true
    } else if (
      (part.includes(':') && looksLikeDeviceTypeReply(part)) ||
      productFromTypeReply(part)
    ) {
      // DeviceType → TYPE:FW:MAC  (or name:…)
      const product = productFromTypeReply(part)
      const bits = part.split(':').map((s) => s.trim()).filter(Boolean)
      const modelCode = bits[0] || null
      // Skip garbage codes like "unknown"/"unkown" from unsupported cmds
      const cleanCode =
        modelCode && !isGarbageModelCode(modelCode)
          ? modelCode
          : b.info.modelCode
      const firmware =
        bits[1] && !/^status$/i.test(bits[1]) && !/^getbatch$/i.test(bits[1])
          ? bits[1]
          : b.info.firmware
      let mac =
        extractMacAddress(part) ||
        (bits[2] && bits[2].length >= 12 ? bits[2] : null) ||
        b.info.mac
      if (mac && mac.length === 12 && !mac.includes(':')) {
        mac = mac.match(/.{1,2}/g)?.join(':').toUpperCase() || mac
      }
      let next: WebBleToyInfo = {
        ...b.info,
        typeRaw: product || cleanCode ? part : b.info.typeRaw,
        modelCode: cleanCode,
        firmware: firmware || null,
        mac,
      }
      if (product) next = applyProductName(next, product)
      b.info = next
      changed = true
    } else if (/^\d{1,3}$/.test(part)) {
      const n = Number(part)
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        /* ignore */
      } else if (b.info.battery == null || low.includes('battery')) {
        // First bare number after link is almost always Battery;
        b.info = { ...b.info, battery: n }
        changed = true
      } else if (n <= 20) {
        b.info = {
          ...b.info,
          deviceStatus: n === 2 ? 'normal' : String(n),
        }
        changed = true
      } else {
        b.info = { ...b.info, battery: n }
        changed = true
      }
    } else if (/battery/i.test(part)) {
      const m = part.match(/(\d{1,3})/)
      const n = m ? Number(m[1]) : NaN
      if (Number.isFinite(n) && n >= 0 && n <= 100) {
        b.info = { ...b.info, battery: n }
        changed = true
      }
    }

    if (changed) {
      this.persistRemembered()
      this.emitInfo()
    }
  }

  private async probeToy(id: string, delayMs = 400) {
    const b = this.bounds.get(id)
    if (!b?.server.connected || !b.tx) return
    // Type then Battery; also status + batch for the panel
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs))
    try {
      await this.writeCmds(b.tx, [
        'DeviceType;',
        'Battery;',
        'Status:1;',
        'GetBatch;',
      ])
    } catch {
      /* ignore */
    }
  }

  private async findPair(
    server: BluetoothRemoteGATTServer,
    preferUuid?: string,
    opts?: { quick?: boolean; recover?: boolean },
  ): Promise<{
    tx: BluetoothRemoteGATTCharacteristic
    rx: BluetoothRemoteGATTCharacteristic | null
  } | null> {
    const deadline = Date.now() + (opts?.recover ? 1_200 : opts?.quick ? 4_000 : 12_000)
    const tryService = async (su: string) => {
      if (Date.now() > deadline) return null
      try {
        const svc = await withTimeout(
          server.getPrimaryService(su),
          opts?.recover ? 350 : opts?.quick ? 800 : 1_500,
          'Service lookup timed out',
        )
        const chs = await withTimeout(
          svc.getCharacteristics(),
          opts?.recover ? 350 : opts?.quick ? 800 : 1_500,
          'Characteristics timed out',
        )
        const writes = chs.filter(canWrite)
        const preferred = preferWrite(writes)
        if (!preferred) return null
        const rx =
          preferNotify(chs.filter(canNotify).filter((c) => c !== preferred)) ||
          preferNotify(chs.filter(canNotify))
        return { tx: preferred, rx }
      } catch {
        return null
      }
    }

    const hadPrefer = Boolean(preferUuid)
    if (preferUuid) {
      const hit = await tryService(preferUuid)
      if (hit) return hit
    }
    for (const su of [GEN1, GEN2]) {
      const hit = await tryService(su)
      if (hit) return hit
    }
    // Reconnect: skip the 70-UUID spray (that was ~12s×retries after refresh).
    if (!opts?.quick && !opts?.recover) {
      for (const su of OPTIONAL_SERVICES) {
        if (Date.now() > deadline) break
        if (su === GEN1 || su === GEN2) continue
        const hit = await tryService(su)
        if (hit) return hit
      }
    }

    // Show recovery with a remembered UART: fail fast and retry on the next ad.
    if (opts?.recover && hadPrefer) return null

    if (Date.now() > deadline) return null
    try {
      const services = await withTimeout(
        server.getPrimaryServices(),
        2_500,
        'Primary services timed out',
      )
      const ranked = [...services].sort((a, b) => {
        const score = (u: string) => {
          if (/fff0|6e400001/i.test(u)) return 0
          if (isLovenseGen3Service(u)) return 1
          return 2
        }
        return score(a.uuid) - score(b.uuid)
      })
      for (const svc of ranked) {
        if (Date.now() > deadline) break
        const uuid = svc.uuid.toLowerCase()
        if (uuid.includes('1800') || uuid.includes('1801')) continue
        try {
          const chs = await withTimeout(
            svc.getCharacteristics(),
            1_500,
            'Characteristics timed out',
          )
          const writes = chs.filter(canWrite)
          if (!writes.length) continue
          let tx: BluetoothRemoteGATTCharacteristic | null = null
          if (isLovenseGen3Service(uuid) || /fff0|6e400001/i.test(uuid)) {
            tx =
              writes.find((c) => firstGroupTail(c.uuid) === '0002') ||
              preferWrite(writes)
          } else {
            const notis = chs.filter((c) => c.properties.notify)
            if (writes.length && notis.length) tx = preferWrite(writes)
            else tx = preferWrite(writes)
          }
          if (!tx) continue
          const rx =
            preferNotify(chs.filter(canNotify).filter((c) => c !== tx)) ||
            preferNotify(chs.filter(canNotify))
          return { tx, rx }
        } catch {
          /* skip */
        }
      }
    } catch {
      /* ignore */
    }
    return null
  }

  private targets(toyIds?: string[]): Bound[] {
    if (toyIds?.length) {
      return toyIds
        .map((id) => this.bounds.get(id))
        .filter((b): b is Bound => Boolean(b?.server.connected && b.tx))
    }
    return [...this.bounds.values()].filter(
      (b) => b.server.connected && b.tx,
    )
  }

  private async writeCmds(
    tx: BluetoothRemoteGATTCharacteristic,
    cmds: string[],
    timeoutMs = 2_000,
  ) {
    const enc = new TextEncoder()
    for (const c of cmds) {
      const u8 = enc.encode(c)
      const bytes = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)
      const modes: Array<'without' | 'with'> = tx.properties.writeWithoutResponse
        ? ['without', 'with', 'without']
        : ['with', 'without']
      let lastErr: unknown = null
      let wrote = false
      for (const mode of modes) {
        try {
          if (mode === 'without') {
            await withTimeout(
              tx.writeValueWithoutResponse(bytes),
              timeoutMs,
              'BLE write timed out',
            )
          } else {
            await withTimeout(
              tx.writeValueWithResponse(bytes),
              timeoutMs,
              'BLE write timed out',
            )
          }
          wrote = true
          break
        } catch (e) {
          lastErr = e
          // Hung GATT (powered-off toy): do not burn more timeouts on retries.
          if (e instanceof Error && /timed out/i.test(e.message)) throw e
        }
      }
      if (!wrote) {
        throw lastErr instanceof Error
          ? lastErr
          : new Error('BLE write failed')
      }
      await new Promise((r) => setTimeout(r, 30))
    }
  }

  /** Drop a bound that stopped answering GATT writes (powered off mid-session). */
  private evictUnresponsive(b: Bound) {
    try {
      if (b.server.connected) b.server.disconnect()
    } catch {
      /* ignore */
    }
    this.dropBound(b.info.id)
  }

  private buildCmds(
    vibe01: number,
    opts?: {
      rotate01?: number
      thrust01?: number
      air01?: number
      /** 1-based vibe motors. Empty/omit = all motors. */
      motors?: number[]
      /** Per-motor 0–1 levels (index 0 = M1) for split-lane patterns. */
      motorLevels?: number[]
    },
  ): string[] {
    const level = (x: number) =>
      Math.max(0, Math.min(20, Math.round(Math.max(0, Math.min(1, x)) * 20)))
    const v = level(vibe01)
    const r = level(opts?.rotate01 ?? 0)
    const t = level(opts?.thrust01 ?? 0)
    const a = level(opts?.air01 ?? 0)
    const motorMask = (opts?.motors || [])
      .map((n) => Math.round(Number(n)))
      .filter((m) => m >= 1 && m <= 3)
    const allMotors = !motorMask.length

    // Split lanes: each motor keeps its own level in the same write.
    const lanes = opts?.motorLevels || []
    if (lanes.length > 1 && r === 0 && t === 0 && a === 0) {
      const perMotor = [1, 2, 3].map((m) => {
        if (!allMotors && !motorMask.includes(m)) return 0
        const raw = lanes[m - 1]
        return raw == null ? 0 : level(raw)
      })
      if (perMotor.some((x) => x > 0)) {
        return perMotor.map((lv, i) => `Vibrate${i + 1}:${lv};`)
      }
    }

    if (v > 0 && r === 0 && t === 0 && a === 0) {
      // Partial mask must NOT include bare Vibrate:n — Gemini treats that as both.
      if (allMotors) {
        return [`Vibrate1:${v};`, `Vibrate2:${v};`, `Vibrate:${v};`]
      }
      return [1, 2, 3].map(
        (m) => `Vibrate${m}:${motorMask.includes(m) ? v : 0};`,
      )
    }
    if (r > 0 && v === 0 && t === 0 && a === 0) {
      return [`Rotate:${r};`]
    }
    if (t > 0 && v === 0 && r === 0 && a === 0) {
      return [`Thrusting:${t};`]
    }
    if (a > 0 && v === 0 && r === 0 && t === 0) {
      const air03 = Math.max(1, Math.min(3, Math.round((a / 20) * 3)))
      return [`Air:Level:${air03};`, `Air:${air03};`]
    }
    if (v === 0 && r === 0 && t === 0 && a === 0) {
      return [
        'Vibrate:0;',
        'Vibrate1:0;',
        'Vibrate2:0;',
        'Vibrate3:0;',
        'Rotate:0;',
        'Thrusting:0;',
      ]
    }
    const cmds: string[] = []
    if (allMotors) {
      cmds.push(`Vibrate:${v};`, `Vibrate1:${v};`, `Vibrate2:${v};`)
    } else {
      for (const m of [1, 2, 3]) {
        cmds.push(`Vibrate${m}:${motorMask.includes(m) ? v : 0};`)
      }
    }
    cmds.push(`Rotate:${r};`)
    if (t > 0) cmds.push(`Thrusting:${t};`)
    if (a > 0) {
      const air03 = Math.max(1, Math.min(3, Math.round((a / 20) * 3)))
      cmds.push(`Air:Level:${air03};`)
    }
    return cmds
  }

  async drive(
    vibe01: number,
    opts?: {
      rotate01?: number
      thrust01?: number
      air01?: number
      toyIds?: string[]
      motors?: number[]
      motorLevels?: number[]
    },
  ) {
    const targets = this.targets(opts?.toyIds)
    if (!targets.length) {
      throw new Error('Not connected')
    }
    const cmds = this.buildCmds(vibe01, opts)
    await Promise.all(
      targets.map(async (b) => {
        try {
          await this.writeCmds(b.tx, cmds)
        } catch {
          this.evictUnresponsive(b)
        }
      }),
    )
    if (![...this.bounds.values()].some((b) => b.server.connected && b.tx)) {
      throw new Error('Not connected')
    }
  }

  async stop(toyIds?: string[]) {
    const targets = this.targets(toyIds)
    if (!targets.length) return
    const cmds = [
      'Vibrate:0;',
      'Vibrate1:0;',
      'Vibrate2:0;',
      'Vibrate3:0;',
      'Rotate:0;',
      'Thrusting:0;',
    ]
    await Promise.all(
      targets.map(async (b) => {
        try {
          await this.writeCmds(b.tx, cmds, 1_200)
        } catch {
          this.evictUnresponsive(b)
        }
      }),
    )
  }

  async disconnectOne(id: string, silent = false) {
    const b = this.bounds.get(id)
    if (!b) return
    // Tear down listeners / map first so a hung GATT write cannot block recovery.
    this.bounds.delete(id)
    try {
      b.device.removeEventListener('gattserverdisconnected', b.onLost)
    } catch {
      /* ignore */
    }
    if (b.rx) {
      try {
        b.rx.removeEventListener('characteristicvaluechanged', b.onRx)
      } catch {
        /* ignore */
      }
    }
    // Best-effort stop + notify teardown — never wait long on a dead radio.
    const courtesy = async () => {
      try {
        if (b.server.connected && b.tx) {
          await this.writeCmds(b.tx, ['Vibrate:0;'], 800)
        }
      } catch {
        /* ignore */
      }
      if (b.rx) {
        try {
          await withTimeout(
            b.rx.stopNotifications(),
            800,
            'stopNotifications timed out',
          )
        } catch {
          /* ignore */
        }
      }
      try {
        if (b.server.connected) b.server.disconnect()
      } catch {
        /* ignore */
      }
    }
    await courtesy()
    if (!silent) this.onLost?.()
  }

  async disconnect(silent = false) {
    this.linkGen++
    const ids = [...this.bounds.keys()]
    await Promise.allSettled(ids.map((id) => this.disconnectOne(id, true)))
    this.disconnectSync()
    if (!silent) this.onLost?.()
  }

  /**
   * Chrome on Windows can spin the tab spinner forever on refresh if GATT
   * or watchAdvertisements is still live. Drop radios synchronously — no
   * courtesy writes — so navigation can finish.
   */
  disconnectSync() {
    this.linkGen++
    this.reconnectInflight = null
    this.clearBackgroundRecovery()
    for (const stop of [...this.adStops]) {
      try {
        stop()
      } catch {
        /* ignore */
      }
    }
    this.adStops.clear()
    this.clearLinkWatch()
    for (const device of this.attachingDevices.values()) {
      try {
        device.gatt?.disconnect()
      } catch {
        /* ignore */
      }
    }
    this.attachingDevices.clear()
    this.attachingIds.clear()
    const rows = [...this.bounds.values()]
    this.bounds.clear()
    for (const b of rows) {
      try {
        b.device.removeEventListener('gattserverdisconnected', b.onLost)
      } catch {
        /* ignore */
      }
      if (b.rx) {
        try {
          b.rx.removeEventListener('characteristicvaluechanged', b.onRx)
        } catch {
          /* ignore */
        }
      }
      try {
        if (b.server.connected) b.server.disconnect()
      } catch {
        /* ignore */
      }
      try {
        if (b.device.gatt?.connected) b.device.gatt.disconnect()
      } catch {
        /* ignore */
      }
    }
  }

  private bindPageUnload() {
    if (this.unloadBound || typeof window === 'undefined') return
    this.unloadBound = true
    const tearDown = () => this.disconnectSync()
    // Capture so Chrome can finish navigation before GATT/ad-watch stall the tab spinner.
    window.addEventListener('pagehide', tearDown, { capture: true })
    window.addEventListener('beforeunload', tearDown, { capture: true })
    document.addEventListener('freeze', tearDown)
  }
}
