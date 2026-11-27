/**
 * Full-scope Lovense check through the same path the UI uses:
 *   DeviceController → POST /api/lovense → lovense-node → Connect (emu or real)
 *
 * No direct Function HTTP to :20010. Failures are hard fails (missing tokens, zero live level on emu).
 */

import type { LovenseConnectClient, LovenseToy } from './lovense'

export type ScopeCheckStep = {
  id: string
  name: string
  expect: string[]
  action: string
  ok: boolean
  detail: string
  liveLevel?: number | null
}

export type ScopeCheckResult = {
  ok: boolean
  base: string
  steps: ScopeCheckStep[]
  summary: string
}

const LOCAL_EMU = /127\.0\.0\.1|localhost/i

export function isLovenseLocalEmuBase(base: string): boolean {
  if (!base) return false
  try {
    const u = new URL(base.includes('://') ? base : `http://${base}`)
    const port = u.port || (u.protocol === 'https:' ? '443' : '80')
    return LOCAL_EMU.test(u.hostname) && (port === '20010' || base.includes('20010'))
  } catch {
    return /127\.0\.0\.1:20010|localhost:20010/i.test(base)
  }
}

function toyBlob(t: LovenseToy): string {
  return `${t.name} ${t.toyType} ${(t.functions || []).join(' ')}`.toLowerCase()
}

function pickRepresentatives(toys: LovenseToy[]): LovenseToy[] {
  const out: LovenseToy[] = []
  const add = (pred: (t: LovenseToy) => boolean) => {
    const t = toys.find((x) => pred(x) && !out.some((o) => o.id === x.id))
    if (t) out.push(t)
  }
  add((t) => /solace/.test(toyBlob(t)))
  add((t) => t.secondary.thrust || /thrust/.test(toyBlob(t)))
  add((t) => t.secondary.rotate || /rotate|nora/.test(toyBlob(t)))
  add((t) => t.secondary.air || /\bair\b|\bmax\b|pump/.test(toyBlob(t)))
  add((t) => (t.motors || 1) >= 2)
  add(
    (t) =>
      (t.motors || 1) === 1 &&
      !t.secondary.thrust &&
      !t.secondary.rotate &&
      !t.secondary.air,
  )
  // Fill out full-scope breadth when catalog is large (emu)
  for (const t of toys) {
    if (out.length >= 8) break
    if (!out.some((o) => o.id === t.id)) out.push(t)
  }
  return out
}

function expectedTokens(t: LovenseToy): string[] {
  const expect = ['Vibrate']
  if ((t.motors || 1) >= 2) expect.push('Vibrate1')
  const blob = toyBlob(t)
  if (t.secondary.rotate || /rotate|nora/.test(blob)) expect.push('Rotate')
  if (t.secondary.air || t.secondary.pump || /\bair\b|\bmax\b|pump/.test(blob)) {
    expect.push('Air')
  }
  if (t.secondary.thrust || /thrust|solace/.test(blob)) expect.push('Thrusting')
  return expect
}

function actionHas(action: string, token: string): boolean {
  return new RegExp(`\\b${token}\\s*:`, 'i').test(action)
}

export async function runFullScopeLovenseCheck(
  client: LovenseConnectClient,
  opts?: { intensity?: number; durationSec?: number },
): Promise<ScopeCheckResult> {
  const base = client.base
  if (!base) {
    return {
      ok: false,
      base: '',
      steps: [],
      summary: 'Not connected — Connect Lovense first',
    }
  }

  const isEmu = isLovenseLocalEmuBase(base)
  const intensity = opts?.intensity ?? 0.7
  const durationSec = opts?.durationSec ?? 1.2

  let pool = client.toys.filter((t) => t.connected !== false)
  if (!pool.length) pool = [...client.toys]
  if (!pool.length) {
    pool = await client.refreshToys()
  }
  if (!pool.length) {
    return {
      ok: false,
      base,
      steps: [],
      summary: 'No toys from bridge — is Connect/emu up?',
    }
  }

  const targets = pickRepresentatives(pool)
  const steps: ScopeCheckStep[] = []

  steps.push({
    id: 'catalog',
    name: 'Catalog',
    expect: [],
    action: '',
    ok: pool.length >= 1,
    detail: `${pool.length} toy(s) @ ${base}${isEmu ? ' · local emu base' : ' · live Connect'}`,
  })

  if (isEmu && pool.length < 5) {
    steps.push({
      id: 'emu-catalog',
      name: 'Emu full catalog',
      expect: [],
      action: '',
      ok: false,
      detail: `expected wide virtual catalog (≥5), got ${pool.length}`,
    })
  }

  for (const toy of targets) {
    const expect = expectedTokens(toy)
    try {
      const result = await client.drive(
        intensity,
        durationSec,
        (t) => t.id === toy.id,
      )
      const action = String(result.action || '')
      const missing = expect.filter((tok) => !actionHas(action, tok))

      await sleep(120)
      const live = await client.refreshToys()
      const row = live.find((x) => x.id === toy.id)
      const liveLevel =
        row?.liveLevel != null && Number.isFinite(row.liveLevel)
          ? Number(row.liveLevel)
          : null

      // On emu, demand non-zero live level for a real Function (not inventory-only theater)
      const liveOk = !isEmu || (liveLevel != null && liveLevel > 0)
      const tokensOk = missing.length === 0
      const ok = tokensOk && liveOk

      let detail = ''
      if (!tokensOk) {
        detail = `missing ${missing.join(', ')} in «${action}»`
      } else if (!liveOk) {
        detail = `bridge action ok but live level ${liveLevel} (emu GetToys _emu)`
      } else {
        detail = `channels ${expect.join('+')}${liveLevel != null ? ` · live ${liveLevel}/20` : ''}`
      }

      steps.push({
        id: toy.id,
        name: toy.name || toy.id,
        expect,
        action,
        ok,
        detail,
        liveLevel,
      })
    } catch (e) {
      steps.push({
        id: toy.id,
        name: toy.name || toy.id,
        expect,
        action: '',
        ok: false,
        detail: e instanceof Error ? e.message : String(e),
      })
    }
  }

  try {
    const fleet = await client.drive(0.45, 2)
    const action = String(fleet.action || '')
    const names = (fleet.toys || []).length
    steps.push({
      id: 'fleet',
      name: 'All toys pulse',
      expect: ['Vibrate'],
      action,
      ok: actionHas(action, 'Vibrate') || names > 0,
      detail: names
        ? `${names} target(s) · ${action.slice(0, 90)}`
        : action.slice(0, 100) || 'no action string',
    })
  } catch (e) {
    steps.push({
      id: 'fleet',
      name: 'All toys pulse',
      expect: ['Vibrate'],
      action: '',
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    })
  }

  try {
    await client.stop()
    if (isEmu) {
      await sleep(150)
      const after = await client.refreshToys()
      const stillHot = after.filter(
        (t) => t.liveLevel != null && t.liveLevel > 0,
      )
      steps.push({
        id: 'stop',
        name: 'Stop all',
        expect: [],
        action: 'Stop',
        ok: stillHot.length === 0,
        detail:
          stillHot.length === 0
            ? 'all toys live level 0'
            : `still hot: ${stillHot.map((t) => t.name).join(', ')}`,
      })
    } else {
      steps.push({
        id: 'stop',
        name: 'Stop all',
        expect: [],
        action: 'Stop',
        ok: true,
        detail: 'stop op completed (real Connect has no _emu levels)',
      })
    }
  } catch (e) {
    steps.push({
      id: 'stop',
      name: 'Stop all',
      expect: [],
      action: '',
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    })
  }

  const failed = steps.filter((s) => !s.ok)
  const ok = failed.length === 0
  return {
    ok,
    base,
    steps,
    summary: ok
      ? `Full scope pass · ${steps.length} checks · ${pool.length} toys @ ${base}`
      : `Full scope FAIL · ${failed.length}/${steps.length} · ${failed.map((f) => f.name).join(', ')}`,
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
