import { writeFileSync } from 'node:fs'
import { MENU } from '../../chain-haptic/src/menu.mjs'

function presetViz(preset) {
  switch (String(preset || '').toLowerCase()) {
    case 'wave':
      return [1, 3, 5, 7, 6, 4, 2, 1, 3, 5, 7, 5, 3, 2]
    case 'pulse':
      return [0, 6, 0, 6, 0, 7, 0, 6, 0, 7, 0, 6]
    case 'fireworks':
      return [2, 8, 1, 0, 4, 8, 2, 0, 3, 8, 0, 5, 8, 0]
    case 'earthquake':
      return [4, 7, 8, 6, 8, 7, 8, 5, 8, 7, 6, 8, 5]
    default:
      return [3, 5, 4, 6, 3, 5]
  }
}

/** @type {object[]} */
const patterns = []

for (const m of MENU) {
  let strengths
  let intervalMs
  if (m.kind === 'pattern' && m.strengths) {
    strengths = m.strengths
    intervalMs = m.intervalMs || 400
  } else if (m.kind === 'pulse') {
    const i = Math.max(1, Math.min(8, Number(m.intensity) || 3))
    strengths = [0, i, i, 0]
    intervalMs = Math.max(
      120,
      Math.round(((Number(m.timeSec) || 2) * 1000) / strengths.length),
    )
  } else if (m.kind === 'preset') {
    strengths = presetViz(m.preset)
    intervalMs = 280
  } else {
    strengths = [4]
    intervalMs = 400
  }

  /** @type {Record<string, unknown>} */
  const row = {
    id: m.id,
    name: m.name,
    blurb: m.blurb,
    price: Number(m.price),
    tag: m.tag || '',
    kind: m.kind,
    timeSec: m.timeSec,
    intervalMs,
    strengths,
  }
  if (m.preset) row.preset = m.preset
  if (m.intensity != null) row.intensity = m.intensity
  patterns.push(row)
}

const header = `/**
 * Vibration patterns from chain-haptic/src/menu.mjs (MENU).
 * Strength steps 0–8. Regenerated: scripts/import-chain-haptic-patterns.mjs
 */

export type PatternKind = 'pattern' | 'preset' | 'pulse'

export type PatternDef = {
  id: string
  name: string
  blurb: string
  /** Listed tip amount (native units) from chain-haptic */
  price: number
  tag: string
  kind: PatternKind
  timeSec: number
  intervalMs: number
  /** 0–8 strength strip */
  strengths: number[]
  /** Lovense named preset when kind is preset */
  preset?: string
  /** Absolute intensity 1–8 for simple pulses */
  intensity?: number
}

export type PatternId = string

export const PATTERNS: PatternDef[] = ${JSON.stringify(patterns, null, 2)} as PatternDef[]

export const PATTERN_IDS = PATTERNS.map((x) => x.id)

const byId = new Map(PATTERNS.map((x) => [x.id, x]))

export function getPattern(id: unknown): PatternDef | undefined {
  if (typeof id !== 'string') return undefined
  return byId.get(id)
}

export function isPatternId(v: unknown): v is PatternId {
  return typeof v === 'string' && byId.has(v)
}

export function patternLabel(id: PatternId): string {
  return getPattern(id)?.name ?? id
}

export type PatternSegment = {
  /** 0–1 intensity for this slice */
  level: number
  ms: number
}

/**
 * Expand catalog pattern into vibration segments.
 * @param peak01 peak scale 0–1 from tip package / feel curve
 * @param durationMs optional override length (tests trim/stretch)
 */
export function expandPattern(
  id: PatternId,
  peak01 = 1,
  durationMs?: number,
): PatternSegment[] {
  const item = getPattern(id)
  const peak = Math.min(1, Math.max(0.05, peak01))
  if (!item) {
    const total = Math.max(400, Math.round(durationMs ?? 2500))
    return [{ level: peak, ms: total }]
  }
  const iv = Math.max(80, Math.min(2000, item.intervalMs || 400))
  let steps = item.strengths.slice()
  if (!steps.length) steps = [4]

  if (durationMs != null && durationMs > 0) {
    const want = Math.max(1, Math.round(durationMs / iv))
    if (want < steps.length) steps = steps.slice(0, want)
    else if (want > steps.length) {
      const out: number[] = []
      while (out.length < want) out.push(...steps)
      steps = out.slice(0, want)
    }
  }

  return steps.map((s) => ({
    level: (Math.max(0, Math.min(8, Number(s) || 0)) / 8) * peak,
    ms: iv,
  }))
}

export function patternDurationMs(id: PatternId): number {
  const item = getPattern(id)
  if (!item) return 2500
  if (item.timeSec > 0) return Math.round(item.timeSec * 1000)
  return expandPattern(id).reduce((a, s) => a + s.ms, 0)
}

export function patternPeak01(id: PatternId): number {
  const item = getPattern(id)
  if (!item?.strengths?.length) return 0.5
  return Math.max(...item.strengths.map(Number)) / 8
}
`

writeFileSync(new URL('../src/utils/patterns.ts', import.meta.url), header, 'utf8')
console.log('Imported', patterns.length, 'chain-haptic patterns')
