import {
  ButtplugBrowserWebsocketClientConnector,
  ButtplugClient,
  DeviceOutput,
  OutputType,
  type ButtplugClientDevice,
} from 'buttplug'
import {
  LovenseConnectClient,
  isEmptyLovenseLocalIp,
  type LovenseToy,
} from './lovense'
import {
  LovenseWebBluetooth,
  webBluetoothSupported,
  webBluetoothUnavailableMessage,
  type WebBleToyInfo,
} from './webBluetooth'
import { agentDbg } from '../debugAgentLog'
import {
  expandPattern,
  getPattern,
  patternNeeds,
  combineMotorMasks,
  type PatternId,
  type PatternSegment,
} from '../utils/patterns'
import { patternFitsToy, patternFamily, patternUsesFullDrive } from '../utils/patternFit'
import {
  applyToyIdentity,
  type ToyIdentityOverride,
} from '../utils/toyIdentity'
import {
  isLovenseLocalEmuBase,
  runFullScopeLovenseCheck,
  type ScopeCheckResult,
} from './fullScopeCheck'
import type { DeviceToy as SharedDeviceToy } from '@pulsefans/domain/types/device'

  /**
   * - bluetooth - Web Bluetooth
   * - intiface - Buttplug / Intiface Central
   * - lovense - Lovense Connect LAN
   * - emu - legacy settings only (disabled)
   */
export type DeviceBackend =
  | 'bluetooth'
  | 'emu'
  | 'intiface'
  | 'lovense'
  | 'lovense-remote'

/** Optional Lovense Connect / Remote LAN bridge (or legacy emu id) */
export function isLovenseBridgeBackend(b: DeviceBackend): boolean {
  return b === 'emu' || b === 'lovense' || b === 'lovense-remote'
}

export function isBluetoothBackend(b: DeviceBackend): boolean {
  return b === 'bluetooth'
}

/** UI-facing toy inventory (Lovense full row, or simplified for other backends). */
export type DeviceToy = SharedDeviceToy

export type DeviceStatus = {
  backend: DeviceBackend
  connected: boolean
  /** Short names for pills / status */
  devices: string[]
  /** Full inventory for Linked toys panel */
  toys: DeviceToy[]
  /** Lovense Connect base URL when linked */
  endpoint?: string
  message: string
}

function lovenseToDeviceToys(
  toys: LovenseToy[],
  identity?: Record<string, ToyIdentityOverride> | null,
): DeviceToy[] {
  return toys.map((t) =>
    applyToyIdentity(
      {
        id: t.id,
        name: t.name,
        nickName: t.nickName,
        toyType: t.toyType,
        connected: t.connected,
        status: t.status,
        battery: t.battery,
        motors: t.motors,
        functions: t.functions,
        secondary: t.secondary,
        extra: t.extra,
        source: 'lovense' as const,
      },
      identity,
    ),
  )
}

function channelLabel(channel: string): string {
  const c = String(channel || '').toLowerCase()
  if (c === 'vibrate1' || c === 'm1') return 'M1'
  if (c === 'vibrate2' || c === 'm2') return 'M2'
  if (c === 'vibrate3' || c === 'm3') return 'M3'
  if (c === 'vibrate') return 'Vibe'
  if (c === 'rotate') return 'Rotate'
  if (c === 'thrust' || c === 'thrusting') return 'Thrust'
  if (c === 'air') return 'Air'
  if (c === 'pump') return 'Pump'
  if (c === 'all') return 'All'
  return channel
}

/** Map pattern family -> Lovense drive axis (rotate tips must not only vibe Nora). */
function driveAxisForPattern(
  patternId?: PatternId,
): LovenseToy['driveAxis'] {
  if (!patternId) return 'full'
  const def = getPattern(patternId)
  if (!def) return 'full'
  const needs = patternNeeds(def)
  if (
    patternUsesFullDrive({
      id: def.id,
      name: def.name,
      blurb: def.blurb,
      tag: def.tag,
      needs,
    })
  ) {
    return 'full'
  }
  switch (patternFamily(needs)) {
    case 'rotate':
      return 'rotate'
    case 'thrust':
      return 'thrust'
    case 'air':
      return 'air'
    case 'vibe':
      return 'vibe'
    default:
      return 'full'
  }
}

/**
 * Lovense Function under ~1s often only blinks the LED on specialty axes.
 * Stretch each step to a min hold - do NOT peak-merge windows (that erased
 * pulse/soft variety into the same loud flat strip).
 */
function thickenSpecialtySegments(
  segs: PatternSegment[],
): PatternSegment[] {
  const MIN = 1400
  if (!segs.length) return [{ level: 0.7, ms: 3000 }]
  return segs.map((s) => {
    const level = s.level < 0.04 ? 0 : s.level
    const seg: PatternSegment = {
      level,
      ms: Math.max(MIN, Math.max(1, s.ms)),
    }
    if (s.motorMask?.length) seg.motorMask = s.motorMask
    if (s.motorLevels?.length) seg.motorLevels = s.motorLevels
    return seg
  })
}

type PlaySession = {
  id: number
  toyId: string
  name: string
  driveAxis: LovenseToy['driveAxis'] | null
  stopAt: number
  timer: ReturnType<typeof setTimeout> | null
  waitResolve: (() => void) | null
}

/** Links toys: Bluetooth · Intiface · Lovense Connect. */
export class DeviceController {
  private client: ButtplugClient | null = null
  private ble = new LovenseWebBluetooth()
  private backend: DeviceBackend = 'lovense'
  private lovenseRaw = ''
  private lovense = new LovenseConnectClient()
  private intifaceUrl = 'ws://127.0.0.1:12345'
  private onStatus: (s: DeviceStatus) => void
  /** Bumped by Stop / disconnect so every in-flight pattern exits. */
  private stopGen = 0
  private playSeq = 0
  /** Live pattern per toy — different toys can play at the same time. */
  private plays = new Map<string, PlaySession>()
  /** Orb level from concurrent plays (max). */
  private pulseLevels = new Map<string, number>()
  /** Toy ids that should not receive buzz (Lovense bridge) */
  private disabledToyIds = new Set<string>()
  /** Per-toy motor subset (1-based). Missing id = all motors. */
  private toyMotorMasks = new Map<string, number[]>()
  /** Global + per-toy max vibe strength (1–8 scale). */
  private menuMaxVibe = 8
  private toyMaxVibe = new Map<string, number>()
  /** BLE device id / mac → user product reassignment */
  private toyIdentity: Record<string, ToyIdentityOverride> = {}
  /** Round-robin index so concurrent multi-toy setups share load fairly */
  private buzzRr = 0

  constructor(onStatus: (s: DeviceStatus) => void) {
    this.onStatus = onStatus
    this.ble.setOnLost(() => {
      if (this.backend === 'bluetooth') {
        if (this.ble.linked) {
          const names = this.ble
            .allInfo()
            .map((t) => t.name)
            .filter(Boolean)
          this.push(`Linked · ${names.join(' · ')}`)
        } else {
          this.push('Disconnected')
        }
      }
    })
    this.ble.setOnInfo(() => {
      if (this.backend !== 'bluetooth') return
      if (!this.ble.linked) {
        if (this.ble.reconnecting) this.push('Reconnecting toys…')
        return
      }
      const names = this.ble
        .allInfo()
        .map((t) => t.name)
        .filter(Boolean)
      // #region agent log
      agentDbg('D', 'controller.ts:onInfo', 'ui paint', {
        n: names.length,
        names,
      })
      // #endregion
      this.push(`Linked · ${names.join(' · ')}`)
    })
  }

  get activeBackend() {
    return this.backend
  }

  get isReconnecting() {
    return this.backend === 'bluetooth' && this.ble.reconnecting
  }

  get isConnected() {
    if (this.backend === 'bluetooth') return this.ble.linked
    if (this.backend === 'intiface') return !!this.client?.connected
    if (isLovenseBridgeBackend(this.backend)) return !!this.lovense.base
    return false
  }

  setIntifaceUrl(url: string) {
    this.intifaceUrl = url.trim() || 'ws://127.0.0.1:12345'
  }

  setLovenseLocalIp(localIp: string) {
    this.lovenseRaw = isEmptyLovenseLocalIp(localIp) ? '' : localIp.trim()
    this.lovense.setLocalIp(this.lovenseRaw)
  }

  get lovenseLocalIp() {
    return this.lovenseRaw
  }

  /** APPID is optional browser storage only; LAN Connect does not use it. */
  setLovenseAppId(_appId: string) {
    /* no-op for device layer */
  }

  setDisabledToys(ids: string[]) {
    this.disabledToyIds = new Set(
      (ids || []).filter((x) => typeof x === 'string' && x.trim()),
    )
  }

  /**
   * Which motors to drive on a multi-motor toy (1-based).
   * Empty / omit = both (all). Example: [1] = motor 1 only.
   */
  setToyMotorMasks(masks: Record<string, number[]>) {
    this.toyMotorMasks.clear()
    for (const [id, arr] of Object.entries(masks || {})) {
      if (!id || !Array.isArray(arr)) continue
      const motors = [
        ...new Set(
          arr
            .map((n) => Math.round(Number(n)))
            .filter((m) => m >= 1 && m <= 3),
        ),
      ].sort()
      if (motors.length) this.toyMotorMasks.set(id, motors)
    }
  }

  /** Cap pattern peak strength (1–8) globally and per linked toy. */
  setMaxVibeCaps(menuMax: number, perToy: Record<string, number>) {
    const global = Math.min(8, Math.max(1, Math.round(Number(menuMax) || 8)))
    this.menuMaxVibe = global
    this.toyMaxVibe.clear()
    for (const [id, raw] of Object.entries(perToy || {})) {
      if (!id) continue
      const n = Math.min(8, Math.max(1, Math.round(Number(raw) || global)))
      this.toyMaxVibe.set(id, n)
    }
  }

  private maxVibeScale(toyId?: string): number {
    const cap =
      toyId && this.toyMaxVibe.has(toyId)
        ? this.toyMaxVibe.get(toyId)!
        : this.menuMaxVibe
    return Math.min(8, Math.max(1, cap)) / 8
  }

  /** User model reassignment (N0104 → Gemini). Empty product clears override. */
  setToyIdentity(map: Record<string, ToyIdentityOverride>) {
    this.toyIdentity = { ...(map || {}) }
  }

  /** Re-emit Linked inventory after identity/mask changes. */
  refreshToys() {
    if (this.backend === 'bluetooth') {
      if (!this.ble.linked) {
        this.push('Not connected')
        return
      }
      const names = this.bleToys()
        .map((t) => t.name)
        .filter(Boolean)
      this.push(
        names.length ? `Linked · ${names.join(' · ')}` : 'Not connected',
      )
      return
    }
    if (isLovenseBridgeBackend(this.backend) && this.lovense.base) {
      this.push(this.lovense.base)
      return
    }
    // fallthrough: re-notify current status paint path
    this.push('Ready')
  }

  private masksForApi(stepMask?: number[], toyId?: string): Record<string, number[]> {
    const out: Record<string, number[]> = {}
    const ids = new Set<string>()
    for (const t of this.buzzableInventory()) {
      if (t.id) ids.add(t.id)
    }
    if (toyId) ids.add(toyId)
    // Lovense inventory when not yet filtered
    if (isLovenseBridgeBackend(this.backend)) {
      for (const t of this.lovense.toys) {
        if (t.id && this.toyIsBuzzable(t.id)) ids.add(t.id)
      }
    }
    for (const id of ids) {
      const toyMask = this.toyMotorMasks.get(id)
      const combined = combineMotorMasks(toyMask, stepMask)
      if (combined) out[id] = combined
    }
    return out
  }

  private toyIsBuzzable(id: string): boolean {
    return Boolean(id) && !this.disabledToyIds.has(id)
  }

  /** Connected inventory that is allowed to buzz. */
  private buzzableInventory(): DeviceToy[] {
    if (this.backend === 'bluetooth') {
      return this.bleToys().filter((t) => this.toyIsBuzzable(t.id))
    }
    if (isLovenseBridgeBackend(this.backend)) {
      return lovenseToDeviceToys(this.lovense.toys, this.toyIdentity).filter(
        (t) =>
          this.toyIsBuzzable(t.id) && t.connected !== false,
      )
    }
    if (this.backend === 'intiface' && this.client?.connected) {
      return [...this.client.devices.values()]
        .filter((d) => this.deviceHasAnyOutput(d))
        .map((d) => ({
          id: String(d.index),
          name: d.displayName || d.name,
          source: 'intiface' as const,
        }))
        .filter((t) => this.toyIsBuzzable(t.id))
    }
    return []
  }

  private bleToys(): DeviceToy[] {
    const identity = this.toyIdentity
    return this.ble
      .allInfo()
      .filter((info) => info.connected !== false)
      .map((info) => {
      const base: DeviceToy = {
        id: info.id || 'ble',
        name: info.name || 'Toy',
        toyType: info.toyType || 'lovense',
        connected: true,
        status: 'online',
        motors: info.motors || 1,
        functions: info.functions || ['Vibrate'],
        battery:
          info.battery != null && Number.isFinite(info.battery)
            ? info.battery
            : null,
        secondary: info.secondary || {
          rotate: false,
          air: false,
          pump: false,
          thrust: false,
        },
        source: 'bluetooth' as const,
        extra: {
          firmware: info.firmware,
          modelCode: info.modelCode,
          mac: info.mac,
          typeRaw: info.typeRaw,
          deviceStatus: info.deviceStatus,
          batch: info.batch,
        },
      }
      return applyToyIdentity(base, identity)
    })
  }

  /**
   * One physical toy per buzz. Prefer pattern-capable toys so a vibe tip
   * never also fires thrusters/rotators as free extras.
   * Round-robins when several match.
   */
  private pickSessionToy(opts?: {
    patternId?: PatternId
    toyId?: string
  }): { id: string; name: string } | null {
    // Explicit column / feature target - one tip-unit toy
    if (opts?.toyId && this.toyIsBuzzable(opts.toyId)) {
      const hit = this.buzzableInventory().find((t) => t.id === opts.toyId)
      if (hit) return { id: hit.id, name: hit.name || hit.id }
      if (isLovenseBridgeBackend(this.backend)) {
        const t = this.lovense.toys.find((x) => x.id === opts.toyId)
        if (t) {
          return {
            id: t.id,
            name: String(t.name || t.nickName || t.id),
          }
        }
      }
      return { id: opts.toyId, name: opts.toyId }
    }

    let pool = this.buzzableInventory()
    if (opts?.patternId) {
      const def = getPattern(opts.patternId)
      if (def) {
        const needs = patternNeeds(def)
        const fit = pool.filter((t) =>
          patternFitsToy(needs, t, def.forProducts),
        )
        if (fit.length) pool = fit
        else {
          // No family match - refuse multi-cast dump onto wrong toys
          return null
        }
      }
    }

    if (!pool.length) return null
    const pick = pool[this.buzzRr % pool.length]!
    this.buzzRr = (this.buzzRr + 1) % 1_000_000
    return { id: pick.id, name: pick.name || pick.id }
  }

  private wakePlay(session: PlaySession) {
    if (session.timer) {
      clearTimeout(session.timer)
      session.timer = null
    }
    if (session.waitResolve) {
      const resolve = session.waitResolve
      session.waitResolve = null
      resolve()
    }
  }

  private abortAllPlays() {
    this.stopGen++
    for (const session of this.plays.values()) this.wakePlay(session)
    this.plays.clear()
    this.pulseLevels.clear()
    document.documentElement.classList.remove('is-buzzing')
    document.documentElement.style.setProperty('--pulse-level', '0')
  }

  private isLive(session: PlaySession): boolean {
    return (
      session.stopAt === this.stopGen &&
      this.plays.get(session.toyId)?.id === session.id
    )
  }

  private replacePlay(
    toyId: string,
    name: string,
    driveAxis: LovenseToy['driveAxis'] | null,
  ): PlaySession {
    const prev = this.plays.get(toyId)
    if (prev) this.wakePlay(prev)
    const session: PlaySession = {
      id: ++this.playSeq,
      toyId,
      name,
      driveAxis,
      stopAt: this.stopGen,
      timer: null,
      waitResolve: null,
    }
    this.plays.set(toyId, session)
    return session
  }

  private beginPlay(opts?: {
    patternId?: PatternId
    toyId?: string
  }): PlaySession {
    const driveAxis = driveAxisForPattern(opts?.patternId)
    const pick = this.pickSessionToy(opts)
    if (!pick) {
      if (opts?.patternId) {
        throw new Error(
          `No enabled toy can play -${opts.patternId}- - turn buzz On on a matching Linked toy`,
        )
      }
      throw new Error(
        'No toys enabled for buzz - turn buzz On on a Linked toy (or Scan again)',
      )
    }
    return this.replacePlay(pick.id, pick.name, driveAxis)
  }

  private endPlay(session: PlaySession) {
    if (this.plays.get(session.toyId)?.id === session.id) {
      this.plays.delete(session.toyId)
    }
    this.pulseLevels.delete(session.toyId)
    this.syncPulseUi()
  }

  private syncPulseUi() {
    let max = 0
    for (const level of this.pulseLevels.values()) {
      if (level > max) max = level
    }
    document.documentElement.style.setProperty('--pulse-level', String(max))
    document.documentElement.classList.toggle('is-buzzing', max > 0.02)
  }

  get lovenseBase() {
    return this.lovense.base
  }

  get isLocalEmu() {
    return (
      this.backend === 'emu' ||
      (isLovenseBridgeBackend(this.backend) && isLovenseLocalEmuBase(this.lovense.base))
    )
  }

/**
 * Full-scope check via app bridge (probe → Function → GetToys).
 */
  async runFullScopeCheck(): Promise<ScopeCheckResult> {
    if (!isLovenseBridgeBackend(this.backend) || !this.lovense.base) {
      throw new Error(
        'Connect Lovense Connect first',
      )
    }
    this.push('Full-scope check running...')
    const result = await runFullScopeLovenseCheck(this.lovense)
    this.push(result.summary)
    return result
  }

  /**
   * Start BLE picker from a click handler (user activation).
   * Must call openPickerFromUserGesture with nothing awaited before it.
   * Electron multi-select sets window.__jttBlePendingLinks for chained picks.
   */
  openBluetoothPicker(): Promise<WebBleToyInfo> {
    if (!webBluetoothSupported()) {
      return Promise.reject(new Error(webBluetoothUnavailableMessage()))
    }
    this.backend = 'bluetooth'
    // requestDevice on the same tick as the click (no status paint before).
    const pick = this.ble.openPickerFromUserGesture()
    return pick
      .then((device) =>
        this.ble.attachChosenDevice(device, {
          onPicked: (name) => {
            const label = String(name || 'device').replace(/^LVS-/i, '')
            this.push(`Connecting · ${label}…`)
          },
        }),
      )
      .then(async (info) => {
        // Desktop picker may have queued more deviceIds — each needs its own
        // requestDevice round (Web Bluetooth returns one device per call).
        const extraRaw = (window as unknown as { __jttBlePendingLinks?: unknown })
          .__jttBlePendingLinks
        let extra = Math.max(0, Math.floor(Number(extraRaw) || 0))
        ;(window as unknown as { __jttBlePendingLinks?: number }).__jttBlePendingLinks = 0
        const errors: string[] = []
        while (extra > 0) {
          extra -= 1
          try {
            const next = await this.ble.openPickerFromUserGesture()
            await this.ble.attachChosenDevice(next, {
              onPicked: (name) => {
                const label = String(name || 'device').replace(/^LVS-/i, '')
                this.push(`Connecting · ${label}…`)
              },
            })
          } catch (e) {
            errors.push(e instanceof Error ? e.message : String(e))
            // Drain remaining chooser rounds so the modal can close.
            while (extra > 0) {
              extra -= 1
              try {
                await this.ble.openPickerFromUserGesture()
              } catch {
                /* ignore */
              }
            }
            break
          }
        }
        const names = this.ble
          .allInfo()
          .map((t) => t.name)
          .filter(Boolean)
        this.push(
          names.length > 1
            ? `Linked · ${names.join(' · ')}`
            : `Linked · ${info.name}`,
        )
        if (errors.length && names.length) {
          this.push(`Some toys failed · ${errors[0]}`)
        } else if (errors.length) {
          throw new Error(errors[0] || 'Link failed')
        }
        return info
      })
      .catch((e) => {
        // Keep remaining toys; only show disconnected if none left
        if (!this.ble.linked) this.push('Not connected')
        else {
          const names = this.ble
            .allInfo()
            .map((t) => t.name)
            .filter(Boolean)
          this.push(`Linked · ${names.join(' · ')}`)
        }
        throw e
      })
  }

  async connect(backend: DeviceBackend, opts?: { skipPicker?: boolean; waitForAds?: boolean }) {
    if (backend === 'bluetooth') {
      if (this.backend !== 'bluetooth') {
        await this.disconnect(true)
      }
      if (!webBluetoothSupported()) {
        this.backend = 'bluetooth'
        this.push('Not connected')
        throw new Error(webBluetoothUnavailableMessage())
      }
      this.backend = 'bluetooth'
      if (opts?.skipPicker) {
        if (!this.ble.reconnecting && !this.ble.linked) {
          this.push('Reconnecting toys…')
        }
        const result = await this.ble.tryReconnectKnown({
          waitForAds: opts.waitForAds,
        })
        // #region agent log
        agentDbg('C', 'controller.ts:connect skipPicker', 'reconnect finished', {
          waitForAds: opts.waitForAds,
          linked: result.linked,
          permitted: result.permitted,
          names: result.names,
          permittedNames: result.permittedNames,
        })
        // #endregion
        if (result.linked > 0) {
          const extra =
            result.permitted > result.linked
              ? ` · recovering ${result.permitted - result.linked}`
              : ''
          this.push(`Linked · ${result.names.join(' · ')}${extra}`)
          return
        }
        const remembered = LovenseWebBluetooth.loadRememberedNames()
        if (result.permitted > 0) {
          this.push(
            this.ble.reconnecting
              ? 'Reconnecting toys…'
              : `Browser still remembers ${result.permitted} · power toys on, then Connect again`,
          )
          return
        }
        if (remembered.length > 0) {
          // OS “Paired” list ≠ page permission. User must pick each toy once per session
          // when getDevices() is empty (common on Windows Chrome).
          this.push(
            this.ble.reconnecting
              ? 'Reconnecting toys…'
              : `After refresh: Connect, then Add toy for each other paired toy · had ${remembered.length}`,
          )
          return
        }
        this.push('Not connected')
        return
      }
      // Prefer openBluetoothPicker from UI; this path still works
      this.push('Selecting device…')
      try {
        const info = await this.ble.connectFromPicker()
        this.push(`Linked · ${info.name}`)
        return
      } catch (e) {
        this.push('Not connected')
        throw e
      }
    }

    await this.disconnect(true)
    this.backend = backend

    if (backend === 'intiface') {
      const client = new ButtplugClient('Just The Tip')
      const connector = new ButtplugBrowserWebsocketClientConnector(
        this.intifaceUrl,
      )
      client.addListener('deviceadded', () => this.refreshIntiface())
      client.addListener('deviceremoved', () => this.refreshIntiface())
      try {
        await client.connect(connector)
      } catch (e) {
        this.backend = 'intiface'
        const msg = e instanceof Error ? e.message : String(e)
        this.push('Not connected')
        throw new Error(`Intiface unavailable (${msg})`)
      }
      this.client = client
      await client.startScanning()
      this.refreshIntiface('Intiface connected')
      return
    }

    if (backend === 'emu') {
      this.backend = 'lovense'
      this.push('Unavailable')
      throw new Error('Local emulator is disabled')
    }

    const bridge: DeviceBackend =
      backend === 'lovense-remote' ? 'lovense-remote' : 'lovense'
    const remote = bridge === 'lovense-remote'

    if (isEmptyLovenseLocalIp(this.lovenseRaw)) {
      if (remote) {
        this.backend = bridge
        this.push('Local IP needed')
        throw new Error(
          'Paste the Local IP from Lovense Remote → Game Mode (Enable LAN)',
        )
      }
      this.backend = 'lovense'
      this.push('Searching this Wi‑Fi…')
      const found = await this.lovense.discover()
      if (!found.ok || !found.localIp) {
        this.push('Not found')
        throw new Error(
          found.error ||
            'Open Lovense Connect on this Wi‑Fi, then paste the Local IP it shows',
        )
      }
      this.setLovenseLocalIp(found.localIp)
    }

    const rawIp = this.lovenseRaw.trim()
    const isLoopback =
      /^127\.0\.0\.1\b/i.test(rawIp) ||
      /^localhost\b/i.test(rawIp) ||
      /\/\/127\.0\.0\.1\b/i.test(rawIp) ||
      /\/\/localhost\b/i.test(rawIp)
    if (isLoopback) {
      this.backend = bridge
      this.push('Invalid endpoint')
      throw new Error(
        remote
          ? 'Local IP must be the phone/PC running Remote Game Mode on the LAN'
          : 'Local IP must be the Connect host on the LAN',
      )
    }

    this.push('Connecting…')
    const result = await this.lovense.probe(
      this.lovenseRaw,
      remote ? { mode: 'remote' } : undefined,
    )
    if (!result.ok || !result.base) {
      this.backend = bridge
      this.lovense.clear()
      this.push('Offline')
      throw new Error(
        [
          remote
            ? 'Could not reach Lovense Remote'
            : 'Could not reach Lovense Connect',
          result.error || '',
        ]
          .filter(Boolean)
          .join(' — '),
      )
    }

    this.backend = bridge
    this.push(result.detail || `Linked · ${result.base}`)
  }

  async disconnect(silent = false) {
    this.abortAllPlays()
    const lovenseBase = isLovenseBridgeBackend(this.backend)
      ? this.lovense.base
      : ''
    const lovenseToys = lovenseBase ? [...this.lovense.toys] : []
    // Drop the local link first so Disconnect is instant even if Connect hangs.
    if (lovenseBase) this.lovense.clear()

    if (this.backend === 'bluetooth' || this.ble.linked) {
      try {
        await Promise.race([
          this.ble.disconnect(true),
          new Promise<void>((r) => setTimeout(r, 2_000)),
        ])
      } catch {
        /* ignore */
      }
    }
    if (this.client?.connected) {
      try {
        await Promise.race([
          (async () => {
            await this.client?.stopAllDevices()
            await this.client?.disconnect()
          })(),
          new Promise<void>((r) => setTimeout(r, 2_000)),
        ])
      } catch {
        /* ignore */
      }
    }
    if (lovenseBase) {
      void Promise.race([
        this.lovense.stopOn(lovenseBase, lovenseToys),
        new Promise<void>((r) => setTimeout(r, 2_000)),
      ]).catch(() => {})
    }
    // Keep backend selection when disconnecting so Scan/Connect stay on Bluetooth
    const prevBackend = this.backend
    this.client = null
    this.backend =
      prevBackend === 'bluetooth' ||
      prevBackend === 'intiface' ||
      prevBackend === 'lovense' ||
      prevBackend === 'lovense-remote'
        ? prevBackend
        : 'lovense'
    if (!silent) this.push('Disconnected')
  }

  async scan(preferred?: DeviceBackend) {
    const path = preferred || this.backend
    if (path === 'bluetooth') {
      await this.openBluetoothPicker()
      return
    }
    if (isLovenseBridgeBackend(path)) {
      this.backend = path
      const remote = path === 'lovense-remote'
      if (isEmptyLovenseLocalIp(this.lovenseRaw)) {
        if (remote) {
          this.push('Local IP needed')
          throw new Error(
            'Paste the Local IP from Lovense Remote → Game Mode (Enable LAN)',
          )
        }
        this.push('Searching this Wi‑Fi…')
        const found = await this.lovense.discover()
        if (!found.ok || !found.localIp) {
          this.push('Not found')
          throw new Error(
            found.error ||
              'Open Lovense Connect on this Wi‑Fi, then paste the Local IP it shows',
          )
        }
        this.setLovenseLocalIp(found.localIp)
      }
      this.push('Refreshing toys...')
      const result = await this.lovense.probe(
        this.lovenseRaw,
        remote ? { mode: 'remote' } : undefined,
      )
      if (!result.ok) throw new Error(result.error || 'Probe failed')
      this.push(result.detail || 'ok')
      return
    }
    if (this.client?.connected) {
      await this.client.startScanning()
      this.refreshIntiface('Scanning...')
      return
    }
    throw new Error('Not connected')
  }

  /**
   * Solid full-power hold — motor sanity check (Home Test uses the full tip path instead).
   * One toy only (round-robin among buzz-on toys).
   */
  async solidBuzz(intensity: number, durationMs = 4000) {
    const level = Math.min(1, Math.max(0, intensity))
    const hold = Math.max(1500, Math.min(30000, Math.round(durationMs) || 4000))
    const target = this.beginPlay()
    this.push(
      `Solid buzz · ${target.name} · ${(level * 100).toFixed(0)}% · ${hold}ms`,
    )
    try {
      if (!this.isLive(target)) return
      await this.setLevel(level, hold, undefined, undefined, target)
      await this.waitMs(target, hold)
    } finally {
      if (this.isLive(target)) {
        try {
          await this.setLevel(0, 1000, undefined, undefined, target)
        } catch {
          /* toy may already be gone */
        }
        this.endPlay(target)
        if (
          isLovenseBridgeBackend(this.backend) ||
          this.backend === 'bluetooth'
        ) {
          this.push('Idle')
        } else {
          this.refreshIntiface('Idle')
        }
      }
    }
  }

  /**
   * Fire one feature on one toy (motor 1, thruster, rotate...).
   * Always targets that toy id regardless of -Buzz off-.
   */
  async testFeature(
    toyId: string,
    channel: string,
    durationMs = 3000,
    intensity = 0.95,
  ) {
    const hold = Math.max(1500, Math.min(15000, Math.round(durationMs) || 3000))
    const level = Math.min(1, Math.max(0.1, intensity))
    const label = channelLabel(channel)
    const ch = String(channel || '').toLowerCase()
    let driveAxis: LovenseToy['driveAxis'] = 'full'
    if (ch === 'rotate') driveAxis = 'rotate'
    else if (ch === 'thrust' || ch === 'thrusting') driveAxis = 'thrust'
    else if (ch === 'air' || ch === 'pump') driveAxis = 'air'
    else if (/^vibrate\d*$/.test(ch) || ch === 'm1' || ch === 'm2' || ch === 'm3')
      driveAxis = 'vibe'
    const play = this.replacePlay(toyId, toyId, driveAxis)
    this.push(`Test ${label} · ${hold}ms`)

    if (isLovenseBridgeBackend(this.backend)) {
      if (!this.lovense.base) {
        this.endPlay(play)
        throw new Error('Not connected')
      }
      if (!toyId) {
        this.endPlay(play)
        throw new Error('Toy id required')
      }
      try {
        if (!this.isLive(play)) return
        // Finite ≥1.2s (Connect ignores/LED-only below 1s)
        const sec = Math.max(1.2, Math.min(30, hold / 1000 + 0.25))
        await this.lovense.testChannel(toyId, channel, level, sec)
        await this.waitMs(play, hold)
      } finally {
        if (this.isLive(play)) {
          try {
            await this.lovense.stop((t) => t.id === toyId)
          } catch {
            /* ignore */
          }
          this.endPlay(play)
          this.push('Idle')
        }
      }
      return
    }

    // Bluetooth: drive one channel on one toy with true motor isolation
    if (this.backend === 'bluetooth') {
      if (!this.ble.linked) {
        this.endPlay(play)
        throw new Error('Not connected')
      }
      if (!toyId) {
        this.endPlay(play)
        throw new Error('Toy id required')
      }
      try {
        if (!this.isLive(play)) return
        await this.bleDriveChannel(toyId, ch, level)
        await this.waitMs(play, hold)
      } finally {
        if (this.isLive(play)) {
          try {
            await this.ble.stop([toyId])
          } catch {
            /* ignore */
          }
          this.endPlay(play)
          this.push('Idle')
        }
      }
      return
    }

    // Intiface: setLevel maps axis
    try {
      if (!this.isLive(play)) return
      await this.setLevel(level, hold, undefined, undefined, play)
      await this.waitMs(play, hold)
    } finally {
      if (this.isLive(play)) {
        try {
          await this.setLevel(0, 1000, undefined, undefined, play)
        } catch {
          /* ignore */
        }
        this.endPlay(play)
        this.refreshIntiface('Idle')
      }
    }
  }

  /** BLE single-channel test (M1/M2 independent, rotate, thrust…). */
  private async bleDriveChannel(
    toyId: string,
    channel: string,
    level01: number,
  ) {
    const ids = [toyId]
    const v = Math.min(1, Math.max(0, level01))
    if (channel === 'rotate') {
      await this.ble.drive(0, { rotate01: v, toyIds: ids })
      return
    }
    if (channel === 'thrust' || channel === 'thrusting') {
      await this.ble.drive(0, { thrust01: v, toyIds: ids })
      return
    }
    if (channel === 'air' || channel === 'pump') {
      await this.ble.drive(0, { air01: v, toyIds: ids })
      return
    }
    // Motor slots: vibrate1 / M1 / vibrate2 / both / all / vibrate
    let motors: number[] | undefined
    const m = channel.match(/^vibrate(\d)$/i) || channel.match(/^m(\d)$/i)
    if (m) {
      motors = [Number(m[1])]
    } else if (channel === 'both' || channel === 'all' || channel === 'vibrate') {
      motors = undefined // all
    } else if (channel === 'vibrate') {
      motors = undefined
    }
    await this.ble.drive(v, { toyIds: ids, motors })
  }

  /**
   * Play a tip/test pattern on one matching toy.
   * Other toys keep playing — Stop still halts every device.
   */
  async buzz(
    intensity: number,
    durationMs: number,
    pattern: PatternId = 'spark',
    targetToyId?: string,
  ) {
    const play = this.beginPlay({
      patternId: pattern,
      toyId: targetToyId,
    })
    const capScale = this.maxVibeScale(play.toyId)
    const level = Math.min(1, Math.max(0, intensity)) * capScale
    // Honor durationMs whenever provided so Special Commands can stretch
    // catalog patterns (e.g. 10s wave) and Basic Levels can hold a steady vibe.
    const def = getPattern(pattern)
    let segments = expandPattern(
      pattern,
      level,
      durationMs > 0 ? durationMs : undefined,
    )
    // Connect: sub-1s Function = LED blink only. Specialty axes (rotate...)
    // and simultaneous combo packages need long finite holds.
    const dualFull =
      Boolean(def) &&
      play.driveAxis === 'full' &&
      patternUsesFullDrive({
        id: def!.id,
        name: def!.name,
        blurb: def!.blurb,
        tag: def!.tag,
        needs: patternNeeds(def!),
      })
    if (
      isLovenseBridgeBackend(this.backend) &&
      play.driveAxis &&
      play.driveAxis !== 'vibe' &&
      (play.driveAxis !== 'full' || dualFull)
    ) {
      segments = thickenSpecialtySegments(segments)
    }
    const totalMs = segments.reduce((a, s) => a + s.ms, 0)
    this.push(
      `Buzz ${pattern} · ${play.name}${
        dualFull
          ? ' · vibe+rotate'
          : play.driveAxis && play.driveAxis !== 'full'
            ? ` · ${play.driveAxis}`
            : ''
      } · ${(level * 100).toFixed(0)}%${
        capScale < 0.999 ? ` · cap ${Math.round(capScale * 8)}/8` : ''
      } · ${totalMs}ms`,
    )

    try {
      for (const seg of segments) {
        if (!this.isLive(play)) return
        if (seg.level < 0.04) {
          await this.setLevel(0, 1000, undefined, undefined, play)
          await this.waitMs(play, seg.ms)
        } else {
          // Specialty single-axis: slight floor so head/thrust actually moves.
          // Dual combo keeps written levels so soft ≠ max ≠ pulse.
          const out =
            play.driveAxis === 'rotate' ||
            play.driveAxis === 'thrust' ||
            play.driveAxis === 'air'
              ? Math.max(0.28, seg.level)
              : seg.level
          await this.setLevel(out, seg.ms, seg.motorMask, seg.motorLevels, play)
          await this.waitMs(play, seg.ms)
        }
      }
    } finally {
      if (this.isLive(play)) {
        try {
          await this.setLevel(0, 1000, undefined, undefined, play)
        } catch {
          /* toy may already be gone */
        }
        this.endPlay(play)
        if (this.plays.size === 0) {
          if (
            isLovenseBridgeBackend(this.backend) ||
            this.backend === 'bluetooth'
          ) {
            this.push('Idle')
          } else {
            this.refreshIntiface('Idle')
          }
        }
      }
    }
  }

  private async setLevel(
    level: number,
    holdMs = 1000,
    stepMotorMask?: number[],
    /** Per-motor 0–1 levels (index 0 = M1) when the pattern runs split lanes. */
    motorLevels?: number[],
    play?: PlaySession,
  ) {
    const v = Math.min(1, Math.max(0, level))
    const lanes = motorLevels?.length
      ? motorLevels.map((x) => Math.min(1, Math.max(0, Number(x) || 0)))
      : undefined
    const sessionId = play?.toyId
    const driveAxis = play?.driveAxis || 'full'

    if (this.backend === 'bluetooth') {
      if (!this.ble.linked) {
        throw new Error('Not connected')
      }
      if (sessionId) {
        if (v > 0.02) this.pulseLevels.set(sessionId, v)
        else this.pulseLevels.delete(sessionId)
      }
      this.syncPulseUi()

      const blist = this.ble.allInfo().filter((t) => t.connected !== false)
      let ids: string[] = []
      if (sessionId) {
        if (blist.some((t) => t.id === sessionId) && this.toyIsBuzzable(sessionId)) {
          ids = [sessionId]
        }
      } else {
        ids = blist.filter((t) => this.toyIsBuzzable(t.id)).map((t) => t.id)
      }

      if (!ids.length) {
        throw new Error(
          'No toys enabled for buzz - turn buzz On on a Linked toy',
        )
      }

      if (v < 0.04) {
        await this.ble.stop(ids)
        return
      }

      const axis = driveAxis
      const masks = this.masksForApi(stepMotorMask, sessionId)

      for (const id of ids) {
        const motors = masks[id]
        const toy = this.bleToys().find((t) => t.id === id)
        const rotate = Boolean(toy?.secondary?.rotate)
        if (axis === 'rotate') {
          await this.ble.drive(0, { rotate01: v, toyIds: [id] })
        } else if (axis === 'thrust') {
          await this.ble.drive(0, { thrust01: v, toyIds: [id] })
        } else if (axis === 'air') {
          await this.ble.drive(0, { air01: v, toyIds: [id] })
        } else if (axis === 'vibe') {
          await this.ble.drive(v, {
            toyIds: [id],
            motors: motors?.length ? motors : undefined,
            motorLevels: lanes,
          })
        } else if (rotate) {
          await this.ble.drive(v, {
            rotate01: v,
            toyIds: [id],
            motors: motors?.length ? motors : undefined,
            motorLevels: lanes,
          })
        } else {
          await this.ble.drive(v, {
            toyIds: [id],
            motors: motors?.length ? motors : undefined,
            motorLevels: lanes,
          })
        }
      }
      return
    }

    if (isLovenseBridgeBackend(this.backend)) {
      if (!this.lovense.base) {
        throw new Error('Not connected')
      }
      const filter = sessionId
        ? (t: { id: string }) => t.id === sessionId
        : (t: { id: string }) => this.toyIsBuzzable(t.id)
      if (v < 0.04) {
        await this.lovense.stop(filter)
        return
      }
      const active = this.lovense.toys.filter(filter)
      if (!active.length) {
        throw new Error(
          'No toys enabled for buzz - turn buzz On on a Linked toy (or Scan again)',
        )
      }
      // Toy lock ∩ pattern step: empty mask = silence this step
      const masks = this.masksForApi(stepMotorMask, sessionId)
      if (sessionId) {
        const combined = masks[sessionId]
        if (Array.isArray(combined) && combined.length === 0) {
          await this.lovense.stop(filter)
          return
        }
      }
      /**
       * Connect motor vs LED:
       * - timeSec 0 = hold until next command (safe for ~400ms vibe steps)
       * - finite must be ≥ ~1.2s or you only get an LED blink
       * Specialty axes use thickened ms ≥ 1400 so finite holds work.
       */
      let sec = 0
      if (holdMs >= 1200) {
        sec = Math.max(1.2, Math.min(120, holdMs / 1000 + 0.2))
      }
      await this.lovense.drive(
        v,
        sec,
        filter,
        masks,
        driveAxis || undefined,
        lanes,
      )
      return
    }

    if (!this.client?.connected) {
      throw new Error('Intiface not connected')
    }
    const devices = [...this.client.devices.values()]
    const capable = devices.filter((d) => this.deviceHasAnyOutput(d))
    const allCapable = capable.length ? capable : devices
    if (!allCapable.length) {
      throw new Error('No toys found - pair in Intiface Central')
    }

    const targets = sessionId
      ? allCapable.filter((d) => String(d.index) === sessionId)
      : allCapable.filter((d) => this.toyIsBuzzable(String(d.index)))

    if (v < 0.04) {
      if (sessionId) {
        const d = targets[0]
        if (d) {
          try {
            await d.stop()
          } catch {
            /* ignore */
          }
        }
      } else {
        try {
          await this.client.stopAllDevices()
        } catch {
          /* ignore */
        }
      }
      return
    }

    if (!targets.length) {
      throw new Error(
        'No toys enabled for buzz - turn buzz On on a Linked toy',
      )
    }

    await this.driveIntifaceDevice(
      targets[0]!,
      v,
      driveAxis || 'full',
      lanes,
    )
  }

  async stopAll() {
    this.abortAllPlays()

    if (this.backend === 'bluetooth') {
      try {
        await Promise.race([
          this.ble.stop(),
          new Promise<void>((r) => setTimeout(r, 4_000)),
        ])
      } catch {
        /* ignore */
      }
      this.push('Stopped')
      return
    }

    if (isLovenseBridgeBackend(this.backend)) {
      try {
        await this.lovense.stop()
      } catch {
        /* ignore */
      }
      this.push('Stopped')
      return
    }

    if (this.client?.connected) {
      try {
        await this.client.stopAllDevices()
      } catch {
        /* ignore */
      }
      this.refreshIntiface('Stopped')
    }
  }

  private deviceHasAnyOutput(d: ButtplugClientDevice): boolean {
    const types = [
      OutputType.Vibrate,
      OutputType.Rotate,
      OutputType.Oscillate,
      OutputType.Constrict,
      OutputType.Inflate,
      OutputType.Position,
    ]
    if (types.some((t) => d.hasOutput(t))) return true
    for (const f of d.features.values()) {
      if (types.some((t) => f.hasOutput(t))) return true
    }
    return false
  }

  /** Drive device outputs; specialty axes focus rotate/thrust when pattern needs them. */
  private async driveIntifaceDevice(
    d: ButtplugClientDevice,
    v: number,
    axis: LovenseToy['driveAxis'] = 'full',
    motorLevels?: number[],
  ) {
    const ctors = [
      DeviceOutput.Vibrate,
      DeviceOutput.Rotate,
      DeviceOutput.Oscillate,
      DeviceOutput.Constrict,
      DeviceOutput.Inflate,
      DeviceOutput.Position,
    ] as const
    const types = [
      OutputType.Vibrate,
      OutputType.Rotate,
      OutputType.Oscillate,
      OutputType.Constrict,
      OutputType.Inflate,
      OutputType.Position,
    ] as const

    const allow = (type: (typeof types)[number]): boolean => {
      if (axis === 'rotate') return type === OutputType.Rotate
      if (axis === 'thrust') {
        return type === OutputType.Position || type === OutputType.Oscillate
      }
      if (axis === 'air') {
        return (
          type === OutputType.Constrict || type === OutputType.Inflate
        )
      }
      if (axis === 'vibe') return type === OutputType.Vibrate
      return true
    }

    let anyOk = false

    // Split lanes: give each vibrate feature its own level in feature order.
    let lanesDone = false
    if (motorLevels?.length && (axis === 'full' || axis === 'vibe')) {
      const vibeFeatures = [...d.features.values()].filter((f) =>
        f.hasOutput(OutputType.Vibrate),
      )
      if (vibeFeatures.length > 1) {
        for (let i = 0; i < vibeFeatures.length; i++) {
          const raw = motorLevels[i] ?? motorLevels[motorLevels.length - 1] ?? v
          const lv = Math.min(1, Math.max(0, raw))
          try {
            await vibeFeatures[i]!.runOutput(DeviceOutput.Vibrate.percent(lv))
            anyOk = true
            lanesDone = true
          } catch {
            try {
              await vibeFeatures[i]!.runOutput(DeviceOutput.Vibrate.value(lv))
              anyOk = true
              lanesDone = true
            } catch {
              /* feature rejected the split level */
            }
          }
        }
      }
    }

    for (let i = 0; i < ctors.length; i++) {
      const type = types[i]!
      if (!allow(type)) continue
      if (lanesDone && type === OutputType.Vibrate) continue
      const ctor = ctors[i]!
      if (!d.hasOutput(type)) {
        let featureOk = false
        for (const f of d.features.values()) {
          if (f.hasOutput(type)) {
            featureOk = true
            break
          }
        }
        if (!featureOk) continue
      }
      try {
        await d.runOutput(ctor.percent(v))
        anyOk = true
      } catch {
        try {
          await d.runOutput(ctor.value(v))
          anyOk = true
        } catch {
          /* channel unsupported at runtime */
        }
      }
    }
    if (!anyOk) {
      try {
        await d.runOutput(DeviceOutput.Vibrate.percent(v))
        anyOk = true
      } catch {
        try {
          await d.runOutput(DeviceOutput.Vibrate.value(v))
          anyOk = true
        } catch {
          /* fall through */
        }
      }
    }
    if (!anyOk) {
      throw new Error(
        `Toy -${d.displayName || d.name}- listed but rejected all motor commands - check Intiface device control / pairing`,
      )
    }
  }

  private refreshIntiface(message?: string) {
    const devices = this.client
      ? [...this.client.devices.values()].map((d) => d.displayName || d.name)
      : []
    this.push(
      message ??
      devices.length
          ? `Ready · ${devices.length} device(s)`
          : 'Connected — no devices',
    )
  }

  private intifaceToys(): DeviceToy[] {
    if (!this.client) return []
    return [...this.client.devices.values()].map((d) => {
      const functions: string[] = []
      const secondary = {
        rotate: false,
        air: false,
        pump: false,
        thrust: false,
      }
      let motors = 0
      const pushType = (type: OutputType) => {
        switch (type) {
          case OutputType.Vibrate:
            motors++
            functions.push(motors > 1 ? `Vibrate${motors}` : 'Vibrate')
            break
          case OutputType.Rotate:
            secondary.rotate = true
            functions.push('Rotate')
            break
          case OutputType.Oscillate:
            secondary.thrust = true
            functions.push('Oscillate')
            break
          case OutputType.Constrict:
          case OutputType.Inflate:
            secondary.air = true
            secondary.pump = true
            functions.push(String(type))
            break
          case OutputType.Position:
            secondary.thrust = true
            functions.push('Position')
            break
          default:
            functions.push(String(type))
        }
      }

      if (d.hasOutput(OutputType.Vibrate)) pushType(OutputType.Vibrate)
      if (d.hasOutput(OutputType.Rotate)) pushType(OutputType.Rotate)
      if (d.hasOutput(OutputType.Oscillate)) pushType(OutputType.Oscillate)
      if (d.hasOutput(OutputType.Constrict)) pushType(OutputType.Constrict)
      if (d.hasOutput(OutputType.Inflate)) pushType(OutputType.Inflate)
      if (d.hasOutput(OutputType.Position)) pushType(OutputType.Position)

      for (const f of d.features.values()) {
        for (const type of f.outputs.keys()) {
          pushType(type)
        }
      }

      return {
        id: String(d.index),
        name: d.displayName || d.name,
        toyType: d.name,
        connected: true,
        status: 'online',
        motors: Math.max(1, motors || 1),
        functions: [...new Set(functions)],
        secondary,
        extra: {},
        source: 'intiface' as const,
      }
    })
  }

  /** Cancellable delay; Stop / a newer play on this toy ends it early. */
  private waitMs(session: PlaySession, ms: number): Promise<void> {
    return new Promise((resolve) => {
      session.waitResolve = resolve
      session.timer = setTimeout(() => {
        session.timer = null
        session.waitResolve = null
        resolve()
      }, Math.max(0, ms))
    })
  }

  private push(message: string) {
    let toys: DeviceToy[] = []
    if (this.backend === 'bluetooth') {
      toys = this.bleToys()
    } else if (isLovenseBridgeBackend(this.backend)) {
      toys = lovenseToDeviceToys(this.lovense.toys, this.toyIdentity)
    } else if (this.backend === 'intiface') {
      toys = this.intifaceToys()
    }

    this.onStatus({
      backend: this.backend,
      connected: this.isConnected,
      devices: toys.map((t) => t.name),
      toys,
      endpoint:
        isLovenseBridgeBackend(this.backend) && this.lovense.base
          ? this.lovense.base
          : this.backend === 'intiface'
            ? this.intifaceUrl
            : undefined,
      message,
    })
  }
}

