/**
 * Vibration patterns from chain-haptic/src/menu.mjs (MENU).
 * Strength steps 0–8. Regenerated: scripts/import-chain-haptic-patterns.mjs
 */

import {
  inferPatternNeeds,
  normalizeNeeds,
  productToken,
  type ChannelNeed,
} from './patternFit'
import { applyHapticArchetypes } from './patternArchetypes'

export type PatternKind = 'pattern' | 'preset' | 'pulse'

/**
 * Per-step motor side for multi-motor toys (aligns with strengths[] index).
 * 0 = both / all motors · 1 = M1 (left) · 2 = M2 (right) · 3 = M3
 */
export type StepMotorCode = 0 | 1 | 2 | 3

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
  /**
   * Optional motor side per strength step (same length as strengths).
   * Omit or all-zeros → both motors at every step.
   */
  stepMotors?: StepMotorCode[]
  /**
   * Independent 0–8 strength lanes, one per motor (lane 0 = M1, lane 1 = M2).
   * Each lane is the same length as strengths.
   * Omit → every motor follows strengths, gated by stepMotors.
   */
  motorStrengths?: number[][]
  /** Lovense named preset when kind is preset */
  preset?: string
  /** Absolute intensity 1–8 for simple pulses */
  intensity?: number
  /**
   * Extra device channels (family): empty → vibe catalog only.
   * thrust / rotate / air / multi → only matching toy families.
   */
  needs?: ChannelNeed[]
  /**
   * Optional product affinity (toy profile ids, e.g. `gemini`).
   * When set, the pattern only shows for those products so body-part /
   * brand puns do not leak onto unrelated toys.
   */
  forProducts?: string[]
}

export type PatternId = string

/** Build L/R alternating codes matching a strengths length. */
export function alternateStepMotors(
  length: number,
  start: StepMotorCode = 1,
): StepMotorCode[] {
  const n = Math.max(0, Math.min(32, Math.round(length) || 0))
  const out: StepMotorCode[] = []
  let side: StepMotorCode = start === 2 ? 2 : 1
  for (let i = 0; i < n; i++) {
    out.push(side)
    side = side === 1 ? 2 : 1
  }
  return out
}

export function normalizeStepMotors(
  raw: unknown,
  length: number,
): StepMotorCode[] | undefined {
  const n = Math.max(0, Math.min(32, Math.round(length) || 0))
  if (!n || !Array.isArray(raw)) return undefined
  const out: StepMotorCode[] = []
  for (let i = 0; i < n; i++) {
    const c = Math.round(Number(raw[i]) || 0)
    if (c === 1 || c === 2 || c === 3) out.push(c)
    else out.push(0)
  }
  if (out.every((c) => c === 0)) return undefined
  return out
}

export function normalizeMotorStrengths(
  raw: unknown,
  length: number,
): number[][] | undefined {
  const n = Math.max(0, Math.min(32, Math.round(length) || 0))
  if (!n || !Array.isArray(raw)) return undefined
  const lanes: number[][] = []
  for (const laneRaw of raw.slice(0, 3)) {
    if (!Array.isArray(laneRaw)) continue
    const lane: number[] = []
    for (let i = 0; i < n; i++) {
      lane.push(Math.max(0, Math.min(8, Math.round(Number(laneRaw[i]) || 0))))
    }
    lanes.push(lane)
  }
  if (lanes.length < 2) return undefined
  if (lanes.every((lane) => lane.every((v) => v === 0))) return undefined
  return lanes
}

/**
 * Strength lane per motor, 0–8.
 * Uses motorStrengths when the pattern carries independent lanes, otherwise
 * spreads strengths across motors and gates each step with stepMotors.
 */
export function patternMotorLanes(
  p: {
    strengths: number[]
    intensity?: number
    stepMotors?: number[]
    motorStrengths?: number[][]
  },
  motorCount: number,
): number[][] {
  const n = Math.max(1, Math.min(3, Math.round(Number(motorCount) || 1)))
  let steps = (p.strengths || []).map((v) => Number(v) || 0)
  if (!steps.length) {
    const i = Math.max(1, Math.min(8, Number(p.intensity) || 4))
    steps = [0, i, i, 0]
  }
  if (n <= 1) return [steps]

  const stored = p.motorStrengths
  if (stored?.length) {
    return Array.from({ length: n }, (_, m) => {
      const lane = stored[m] || stored[stored.length - 1] || steps
      return steps.map((_, i) =>
        Math.max(0, Math.min(8, Math.round(Number(lane[i]) || 0))),
      )
    })
  }

  const codes = p.stepMotors || []
  return Array.from({ length: n }, (_, m) =>
    steps.map((v, i) => {
      const code = Math.round(Number(codes[i]) || 0)
      return code === 0 || code === m + 1 ? v : 0
    }),
  )
}

/** Step code → 1-based motor list; undefined = all motors. */
export function stepMotorToMask(code: number | undefined): number[] | undefined {
  const c = Math.round(Number(code) || 0)
  if (c === 1) return [1]
  if (c === 2) return [2]
  if (c === 3) return [3]
  return undefined
}

/**
 * Intersect toy lock + pattern step masks.
 * undefined = unrestricted (all motors).
 * [] = silence (no motors left after intersect).
 */
export function combineMotorMasks(
  ...masks: (number[] | undefined | null)[]
): number[] | undefined {
  let current: number[] | null = null
  for (const m of masks) {
    if (!m || !m.length) continue
    const clean = [
      ...new Set(
        m
          .map((x) => Math.round(Number(x)))
          .filter((x) => x >= 1 && x <= 3),
      ),
    ].sort()
    if (!clean.length) continue
    if (current == null) {
      current = clean
      continue
    }
    const set = new Set(clean)
    current = current.filter((x) => set.has(x))
    if (!current.length) return []
  }
  return current == null ? undefined : current
}

export const CATALOG_PATTERNS: PatternDef[] = [
  {
    "id": "sci-wink",
    "name": "Soft contact",
    "blurb": "science · lowest threshold hello",
    "price": 500,
    "tag": "science",
    "kind": "pulse",
    "timeSec": 2,
    "intervalMs": 500,
    "strengths": [
      0,
      2,
      3,
      2,
      0
    ],
    "intensity": 3
  },
  {
    "id": "sci-krause",
    "name": "Krause band",
    "blurb": "science · steady mid hold (40–80 Hz class)",
    "price": 1500,
    "tag": "science",
    "kind": "pattern",
    "timeSec": 6,
    "intervalMs": 500,
    "strengths": [
      4,
      4,
      5,
      5,
      4,
      5,
      4,
      4,
      5,
      0
    ]
  },
  {
    "id": "sci-clinical",
    "name": "Clinical 10 / 5",
    "blurb": "science · ~10s on · ~5s off (FSAD-style duty)",
    "price": 3000,
    "tag": "science",
    "kind": "pattern",
    "timeSec": 12,
    "intervalMs": 1000,
    "strengths": [
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": "sci-heartbeat",
    "name": "Lub-dub",
    "blurb": "science · paired peaks · full rests",
    "price": 5000,
    "tag": "science",
    "kind": "pattern",
    "timeSec": 6,
    "intervalMs": 280,
    "strengths": [
      5,
      2,
      0,
      0,
      6,
      3,
      0,
      0,
      5,
      2,
      0,
      0,
      6,
      3,
      0
    ]
  },
  {
    "id": "sci-swell",
    "name": "Arousal swell",
    "blurb": "science · slow rise · soft fade (build time)",
    "price": 10000,
    "tag": "science",
    "kind": "pattern",
    "timeSec": 8,
    "intervalMs": 450,
    "strengths": [
      1,
      2,
      3,
      3,
      4,
      4,
      5,
      5,
      6,
      5,
      4,
      3,
      2,
      1,
      0
    ]
  },
  {
    "id": "sci-edge",
    "name": "Edge & hold",
    "blurb": "science · climb · plateau · drop",
    "price": 20000,
    "tag": "science",
    "kind": "pattern",
    "timeSec": 7,
    "intervalMs": 450,
    "strengths": [
      2,
      3,
      4,
      5,
      6,
      6,
      6,
      5,
      3,
      1,
      0
    ]
  },
  {
    "id": "sci-wave",
    "name": "Natural wave",
    "blurb": "science · low-band roll like tissue contact",
    "price": 35000,
    "tag": "science",
    "kind": "pattern",
    "timeSec": 7,
    "intervalMs": 400,
    "strengths": [
      2,
      3,
      5,
      6,
      5,
      3,
      2,
      3,
      5,
      6,
      4,
      2,
      0
    ]
  },
  {
    "id": "sci-build",
    "name": "Long build",
    "blurb": "science · minute-scale arousal arc (bigger swaps)",
    "price": 75000,
    "tag": "science",
    "kind": "pattern",
    "timeSec": 12,
    "intervalMs": 600,
    "strengths": [
      2,
      2,
      3,
      3,
      4,
      4,
      5,
      5,
      5,
      6,
      6,
      5,
      4,
      3,
      2,
      0
    ]
  },
  {
    "id": "sci-release",
    "name": "Peak release",
    "blurb": "science · short peak · quiet recovery",
    "price": 125000,
    "tag": "science",
    "kind": "pattern",
    "timeSec": 8,
    "intervalMs": 350,
    "strengths": [
      3,
      4,
      5,
      6,
      7,
      7,
      5,
      2,
      0,
      0,
      3,
      0,
      0
    ]
  },
  {
    "id": "sci-suite",
    "name": "Response suite",
    "blurb": "science · full arc: contact → duty → swell → edge",
    "price": 250000,
    "tag": "science",
    "kind": "pattern",
    "timeSec": 12,
    "intervalMs": 400,
    "strengths": [
      3,
      4,
      4,
      0,
      0,
      5,
      5,
      5,
      0,
      0,
      2,
      3,
      4,
      5,
      6,
      6,
      5,
      3,
      1,
      0
    ]
  },
  {
    "id": "spark",
    "name": "Spark",
    "blurb": "quick hello · soft tickle",
    "price": 50,
    "tag": "light",
    "kind": "pulse",
    "timeSec": 1.5,
    "intervalMs": 375,
    "strengths": [
      0,
      3,
      3,
      0
    ],
    "intensity": 3
  },
  {
    "id": "wink",
    "name": "Wink",
    "blurb": "two soft peeks",
    "price": 75,
    "tag": "light",
    "kind": "pattern",
    "timeSec": 2.5,
    "intervalMs": 300,
    "strengths": [
      0,
      3,
      0,
      0,
      4,
      0
    ]
  },
  {
    "id": "kiss",
    "name": "Kiss",
    "blurb": "slow warm crest",
    "price": 100,
    "tag": "light",
    "kind": "pattern",
    "timeSec": 3,
    "intervalMs": 500,
    "strengths": [
      2,
      3,
      4,
      3,
      2,
      0
    ]
  },
  {
    "id": "ripple",
    "name": "Ripple",
    "blurb": "tiny waves · calm",
    "price": 150,
    "tag": "light",
    "kind": "pattern",
    "timeSec": 4,
    "intervalMs": 400,
    "strengths": [
      1,
      2,
      3,
      2,
      1,
      2,
      3,
      2,
      1,
      0
    ]
  },
  {
    "id": "nuzzle",
    "name": "Nuzzle",
    "blurb": "long low hum",
    "price": 200,
    "tag": "light",
    "kind": "pattern",
    "timeSec": 4,
    "intervalMs": 600,
    "strengths": [
      2,
      3,
      3,
      4,
      3,
      3,
      2,
      0
    ]
  },
  {
    "id": "tease",
    "name": "Tease",
    "blurb": "on–off flutter",
    "price": 250,
    "tag": "medium",
    "kind": "pattern",
    "timeSec": 4,
    "intervalMs": 350,
    "strengths": [
      0,
      4,
      0,
      5,
      0,
      4,
      0,
      5
    ]
  },
  {
    "id": "heartbeat",
    "name": "Heartbeat",
    "blurb": "lub-dub · lub-dub",
    "price": 350,
    "tag": "medium",
    "kind": "pattern",
    "timeSec": 5,
    "intervalMs": 280,
    "strengths": [
      5,
      2,
      0,
      0,
      6,
      3,
      0,
      0,
      5,
      2,
      0,
      0
    ]
  },
  {
    "id": "wave",
    "name": "Wave",
    "blurb": "Lovense preset · smooth roll",
    "price": 500,
    "tag": "medium",
    "kind": "preset",
    "timeSec": 5,
    "intervalMs": 280,
    "strengths": [
      1,
      3,
      5,
      7,
      6,
      4,
      2,
      1,
      3,
      5,
      7,
      5,
      3,
      2
    ],
    "preset": "wave"
  },
  {
    "id": "bounce",
    "name": "Bounce",
    "blurb": "elastic peaks",
    "price": 600,
    "tag": "medium",
    "kind": "pattern",
    "timeSec": 5,
    "intervalMs": 320,
    "strengths": [
      2,
      5,
      3,
      6,
      2,
      5,
      3,
      7,
      2,
      0
    ]
  },
  {
    "id": "pulse",
    "name": "Pulse train",
    "blurb": "Lovense preset · steady thump",
    "price": 750,
    "tag": "medium",
    "kind": "preset",
    "timeSec": 5,
    "intervalMs": 280,
    "strengths": [
      0,
      6,
      0,
      6,
      0,
      7,
      0,
      6,
      0,
      7,
      0,
      6
    ],
    "preset": "pulse"
  },
  {
    "id": "swell",
    "name": "Swell",
    "blurb": "slow rise · soft fade",
    "price": 900,
    "tag": "medium",
    "kind": "pattern",
    "timeSec": 6,
    "intervalMs": 450,
    "strengths": [
      1,
      2,
      3,
      4,
      5,
      6,
      5,
      4,
      3,
      2,
      1,
      0
    ]
  },
  {
    "id": "edge",
    "name": "Edge",
    "blurb": "climb · hold · drop",
    "price": 1000,
    "tag": "hot",
    "kind": "pattern",
    "timeSec": 5,
    "intervalMs": 450,
    "strengths": [
      2,
      3,
      4,
      5,
      6,
      6,
      4,
      2,
      0
    ]
  },
  {
    "id": "ladder",
    "name": "Ladder",
    "blurb": "step up each bar",
    "price": 1500,
    "tag": "hot",
    "kind": "pattern",
    "timeSec": 5,
    "intervalMs": 400,
    "strengths": [
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      4,
      0
    ]
  },
  {
    "id": "sawtooth",
    "name": "Sawtooth",
    "blurb": "sharp ramps · drop",
    "price": 2000,
    "tag": "hot",
    "kind": "pattern",
    "timeSec": 5,
    "intervalMs": 250,
    "strengths": [
      2,
      4,
      6,
      8,
      0,
      3,
      5,
      7,
      0,
      4,
      6,
      8,
      0
    ]
  },
  {
    "id": "fireworks",
    "name": "Fireworks",
    "blurb": "Lovense preset · bursts",
    "price": 2500,
    "tag": "hot",
    "kind": "preset",
    "timeSec": 6,
    "intervalMs": 280,
    "strengths": [
      2,
      8,
      1,
      0,
      4,
      8,
      2,
      0,
      3,
      8,
      0,
      5,
      8,
      0
    ],
    "preset": "fireworks"
  },
  {
    "id": "double-tap",
    "name": "Double tap",
    "blurb": "pairs of hard hits",
    "price": 3000,
    "tag": "hot",
    "kind": "pattern",
    "timeSec": 5,
    "intervalMs": 220,
    "strengths": [
      7,
      7,
      0,
      0,
      8,
      8,
      0,
      0,
      6,
      6,
      0,
      0,
      8,
      7,
      0
    ]
  },
  {
    "id": "siren",
    "name": "Siren",
    "blurb": "up-down sweep loop",
    "price": 4000,
    "tag": "hot",
    "kind": "pattern",
    "timeSec": 6,
    "intervalMs": 300,
    "strengths": [
      3,
      5,
      7,
      8,
      6,
      4,
      2,
      4,
      6,
      8,
      7,
      5,
      3,
      0
    ]
  },
  {
    "id": "strobe",
    "name": "Strobe",
    "blurb": "fast beats · high energy",
    "price": 5000,
    "tag": "wild",
    "kind": "pattern",
    "timeSec": 5,
    "intervalMs": 200,
    "strengths": [
      6,
      0,
      7,
      0,
      6,
      0,
      8,
      0,
      6,
      0,
      7,
      0
    ]
  },
  {
    "id": "chaos",
    "name": "Chaos",
    "blurb": "irregular hits · no groove",
    "price": 6500,
    "tag": "wild",
    "kind": "pattern",
    "timeSec": 6,
    "intervalMs": 240,
    "strengths": [
      5,
      0,
      8,
      2,
      0,
      7,
      0,
      0,
      6,
      8,
      1,
      0,
      7,
      0,
      8,
      0
    ]
  },
  {
    "id": "quake",
    "name": "Quake",
    "blurb": "deep rumbles · heavy",
    "price": 8000,
    "tag": "wild",
    "kind": "pattern",
    "timeSec": 6,
    "intervalMs": 350,
    "strengths": [
      5,
      6,
      7,
      8,
      7,
      8,
      6,
      8,
      7,
      5,
      0
    ]
  },
  {
    "id": "earthquake",
    "name": "Earthquake",
    "blurb": "Lovense preset · max roll",
    "price": 10000,
    "tag": "wild",
    "kind": "preset",
    "timeSec": 7,
    "intervalMs": 280,
    "strengths": [
      4,
      7,
      8,
      6,
      8,
      7,
      8,
      5,
      8,
      7,
      6,
      8,
      5
    ],
    "preset": "earthquake"
  },
  {
    "id": "machine",
    "name": "Machine",
    "blurb": "industrial thrum",
    "price": 15000,
    "tag": "wild",
    "kind": "pattern",
    "timeSec": 6,
    "intervalMs": 180,
    "strengths": [
      4,
      5,
      4,
      6,
      4,
      5,
      4,
      7,
      4,
      5,
      4,
      6,
      4,
      8,
      0
    ]
  },
  {
    "id": "tornado",
    "name": "Tornado",
    "blurb": "spin up · hold · unravel",
    "price": 25000,
    "tag": "wild",
    "kind": "pattern",
    "timeSec": 7,
    "intervalMs": 280,
    "strengths": [
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      8,
      8,
      7,
      6,
      4,
      2,
      0
    ]
  },
  {
    "id": "whale",
    "name": "Whale tip",
    "blurb": "full show · climb + bursts",
    "price": 50000,
    "tag": "legend",
    "kind": "pattern",
    "timeSec": 8,
    "intervalMs": 400,
    "strengths": [
      3,
      5,
      7,
      8,
      6,
      8,
      4,
      8,
      6,
      3,
      0
    ]
  },
  {
    "id": "meteor",
    "name": "Meteor",
    "blurb": "long approach · impact",
    "price": 75000,
    "tag": "legend",
    "kind": "pattern",
    "timeSec": 8,
    "intervalMs": 350,
    "strengths": [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      8,
      8,
      4,
      0,
      8,
      0
    ]
  },
  {
    "id": "supernova",
    "name": "Supernova",
    "blurb": "build · explode · aftershocks",
    "price": 100000,
    "tag": "legend",
    "kind": "pattern",
    "timeSec": 9,
    "intervalMs": 300,
    "strengths": [
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      0,
      8,
      0,
      8,
      6,
      4,
      8,
      0,
      0
    ]
  },
  {
    "id": "oceanking",
    "name": "Ocean King",
    "blurb": "max suite · waves + strobe finish",
    "price": 250000,
    "tag": "legend",
    "kind": "pattern",
    "timeSec": 10,
    "intervalMs": 250,
    "strengths": [
      3,
      5,
      7,
      6,
      8,
      5,
      7,
      8,
      4,
      0,
      7,
      0,
      8,
      0,
      7,
      0,
      8,
      8,
      6,
      0
    ]
  },
] as PatternDef[]

/**
 * Gemini-themed names for dual-motor nipple clamps.
 * Motors stay synchronized (same waveform on M1+M2), gated to Gemini so
 * Edge / Dolce don't inherit titty / nipple puns.
 */
function syncedGeminiPun(
  id: string,
  name: string,
  blurb: string,
  price: number,
  strengths: number[],
  intervalMs = 400,
): PatternDef {
  return {
    id,
    name,
    blurb,
    price,
    tag: 'gemini',
    kind: 'pattern',
    timeSec: Math.max(1, Math.round((strengths.length * intervalMs) / 1000)),
    intervalMs,
    strengths,
    needs: ['multi'],
    forProducts: ['gemini'],
  }
}

export const GEMINI_PUN_PATTERNS: PatternDef[] = [
  // Mirrored (both motors same waveform) — keep the ones without a split twin.
  syncedGeminiPun('gemini-titty-sprinkles', 'Titty Sprinkles', 'soft sparkles · shared rhythm', 1500, [2, 3, 2, 4, 1, 0], 350),
  syncedGeminiPun('gemini-proof-of-tits', 'Proof of Tits', 'verified pulses · rise then settle', 2500, [2, 4, 6, 4, 2, 0]),
  syncedGeminiPun('gemini-double-staked', 'Double Staked', 'two steady holds · shared motor sync', 3500, [5, 5, 0, 6, 6, 0]),
  syncedGeminiPun('gemini-short-squeeze', 'Short Squeeze', 'quick pressure · sudden release', 12000, [3, 6, 8, 8, 4, 0], 300),
  syncedGeminiPun('gemini-staked-assets', 'Staked Assets', 'slow lock-in hold', 20000, [4, 6, 7, 7, 7, 3, 0], 500),
]

/**
 * Gemini patterns with independent M1 / M2 lanes (not mirrored).
 * strengths = loudest lane per beat (menu price / single-lane readers).
 * Product-gated to Gemini so prostate / dual vibes don't get nipple labels.
 */
function splitGeminiPun(
  id: string,
  name: string,
  blurb: string,
  price: number,
  m1: number[],
  m2: number[],
  intervalMs = 400,
): PatternDef {
  const n = Math.max(m1.length, m2.length)
  const lane1 = Array.from({ length: n }, (_, i) =>
    Math.max(0, Math.min(8, Math.round(Number(m1[i]) || 0))),
  )
  const lane2 = Array.from({ length: n }, (_, i) =>
    Math.max(0, Math.min(8, Math.round(Number(m2[i]) || 0))),
  )
  const strengths = lane1.map((a, i) => Math.max(a, lane2[i]!))
  return {
    id,
    name,
    blurb,
    price,
    tag: 'gemini',
    kind: 'pattern',
    timeSec: Math.max(1, Math.round((n * intervalMs) / 1000)),
    intervalMs,
    strengths,
    motorStrengths: [lane1, lane2],
    needs: ['multi'],
    forProducts: ['gemini'],
  }
}

export const GEMINI_SPLIT_PATTERNS: PatternDef[] = [
  splitGeminiPun(
    'gemini-crossfade',
    'Titty Arbitrage',
    'multi · two peaks · take the spread across M1/M2',
    4500,
    [8, 6, 4, 2, 0, 0],
    [0, 0, 2, 4, 6, 8],
    400,
  ),
  splitGeminiPun(
    'gemini-call-response',
    'Twin Validators',
    'multi · M1 proposes · M2 confirms',
    5500,
    [7, 0, 0, 0, 7, 0, 0],
    [0, 0, 5, 0, 0, 0, 6],
    320,
  ),
  splitGeminiPun(
    'gemini-lead-follow',
    'HEXy Twins',
    'multi · M2 trails M1 by one hex beat',
    6500,
    [2, 4, 6, 8, 6, 4, 0],
    [0, 2, 4, 6, 8, 6, 4],
    360,
  ),
  splitGeminiPun(
    'gemini-hot-cold',
    'Nipple Nodes',
    'multi · M1 warm hold · M2 cold taps',
    7500,
    [5, 5, 5, 5, 5, 5, 0],
    [0, 7, 0, 7, 0, 8, 0],
    340,
  ),
  splitGeminiPun(
    'gemini-scissor',
    'Liquidity Pair',
    'multi · crossing pool pressure',
    8500,
    [1, 3, 5, 7, 5, 3, 1, 0],
    [7, 5, 3, 1, 3, 5, 7, 0],
    350,
  ),
  splitGeminiPun(
    'gemini-stereo-ping',
    'Pulse Pair',
    'multi · left pulse · right pulse',
    9500,
    [8, 0, 6, 0, 8, 0],
    [0, 7, 0, 5, 0, 8],
    300,
  ),
  splitGeminiPun(
    'gemini-orbit',
    'Double HEX',
    'multi · phase-offset hex waves',
    11000,
    [2, 4, 6, 8, 6, 4, 2, 0],
    [6, 4, 2, 0, 2, 4, 6, 8],
    380,
  ),
  splitGeminiPun(
    'gemini-balance-trade',
    'Dual Liquidity',
    'multi · as one rises the other falls',
    13000,
    [8, 7, 5, 3, 1, 0],
    [0, 1, 3, 5, 7, 8],
    400,
  ),
  splitGeminiPun(
    'gemini-heartbeat-echo',
    'Pair of Assets',
    'multi · M1 lub-dub · M2 soft echo',
    15000,
    [0, 7, 3, 0, 7, 3, 0],
    [0, 0, 0, 4, 0, 0, 3],
    320,
  ),
  splitGeminiPun(
    'gemini-twin-peaks',
    'Double Yield',
    'multi · staggered twin climaxes',
    17000,
    [2, 5, 8, 5, 2, 0, 0, 0],
    [0, 0, 0, 2, 5, 8, 5, 0],
    360,
  ),
  splitGeminiPun(
    'gemini-desync',
    'Twin Pumps',
    'multi · desynced pump cadence',
    19000,
    [6, 6, 0, 6, 6, 0, 6, 0],
    [0, 4, 4, 0, 4, 4, 0, 4],
    300,
  ),
  splitGeminiPun(
    'gemini-clamp-release',
    'Pump & Clamp',
    'multi · M1 clamps · M2 flutters',
    21000,
    [8, 8, 8, 3, 8, 8, 0],
    [2, 5, 2, 6, 2, 5, 0],
    340,
  ),
  splitGeminiPun(
    'gemini-liquidity-imbalance',
    'Two Nodes One Chain',
    'multi · uneven node pressure',
    24000,
    [3, 6, 8, 6, 3, 0],
    [7, 4, 1, 4, 7, 0],
    380,
  ),
  splitGeminiPun(
    'gemini-l-solo',
    'L/Rug Pull',
    'multi · left rugs · right silent',
    8000,
    [0, 5, 7, 5, 0, 6, 0],
    [0, 0, 0, 0, 0, 0, 0],
    320,
  ),
  splitGeminiPun(
    'gemini-r-solo',
    'R/Rug Pull',
    'multi · right rugs · left silent',
    8000,
    [0, 0, 0, 0, 0, 0, 0],
    [0, 5, 7, 5, 0, 6, 0],
    320,
  ),
]

/**
 * Stablecoin / peg thrusting puns for Solace-class toys.
 * intervalMs stays ≥1400 so Connect specialty holds survive (no LED blink).
 */
function thrustPegPun(
  id: string,
  name: string,
  blurb: string,
  price: number,
  strengths: number[],
  intervalMs = 1600,
): PatternDef {
  return {
    id,
    name,
    blurb,
    price,
    tag: 'peg',
    kind: 'pattern',
    timeSec: Math.max(1, Math.round((strengths.length * intervalMs) / 1000)),
    intervalMs: Math.max(1400, intervalMs),
    strengths,
    needs: ['thrust'],
  }
}

export const STABLECOIN_THRUST_PATTERNS: PatternDef[] = [
  thrustPegPun('peg-hard', 'Hard Peg', 'thrust · locked deep stroke', 3000, [5, 7, 8, 7, 5, 0]),
  thrustPegPun('peg-pegged-hard', 'Pegged Hard', 'thrust · firm hold then release', 4500, [7, 8, 8, 4, 0]),
  thrustPegPun('peg-maintain', 'Maintain the Peg', 'thrust · steady mid stroke', 5500, [4, 5, 5, 4, 0], 1800),
  thrustPegPun('peg-dont-depeg', 'Don’t Depeg', 'thrust · refuse the drop', 6500, [6, 7, 8, 8, 7, 0]),
  thrustPegPun('peg-recovery', 'Peg Recovery', 'thrust · climb back to par', 7500, [2, 4, 6, 8, 0], 1800),
  thrustPegPun('peg-pressure', 'Peg Pressure', 'thrust · rising pressure pulses', 8500, [0, 6, 0, 7, 0, 8, 0], 1500),
  thrustPegPun('peg-backed-hard', 'Backed Hard', 'thrust · collateral max hold', 10000, [8, 8, 8, 5, 0]),
  thrustPegPun('peg-fully-backed', 'Fully Backed', 'thrust · full-depth reserve stroke', 12000, [5, 7, 8, 8, 6, 0], 1700),
  thrustPegPun('peg-mint-thrust', 'Mint & Thrust', 'thrust · mint pulse then drive', 14000, [0, 8, 0, 7, 0, 8, 0], 1500),
  thrustPegPun('peg-stable-thrust', 'Stable Thrust', 'thrust · even stable cadence', 16000, [4, 6, 4, 6, 4, 0]),
  thrustPegPun('peg-pegorithm', 'Pegorithm', 'thrust · algorithmic rhythm', 18000, [2, 5, 2, 7, 2, 8, 0], 1500),
  thrustPegPun('peg-tethered-tight', 'Tethered Tight', 'thrust · short deep clamps', 20000, [7, 7, 3, 7, 7, 0], 1500),
  thrustPegPun('peg-dai-harder', 'DAI Harder', 'thrust · harder each beat', 22500, [3, 5, 7, 8, 8, 0], 1700),
  thrustPegPun('peg-one-buck-fuck', 'One Buck Peg', 'thrust · dollar-peg punch', 25000, [0, 8, 8, 0, 8, 0], 1500),
  thrustPegPun('peg-thrust-to-par', 'Thrust to Par', 'thrust · climb until $1', 27500, [1, 3, 5, 7, 8, 0], 1800),
  thrustPegPun('peg-emergency-repeg', 'Emergency Repeg', 'thrust · crash · snap back', 30000, [8, 0, 0, 8, 8, 0], 1500),
  thrustPegPun('peg-proof-of-peg', 'Proof of Peg', 'thrust · verified hold at par', 32500, [5, 5, 8, 8, 5, 0]),
  thrustPegPun('peg-proof-of-backing', 'Proof of Backing', 'thrust · reserves on display', 35000, [4, 6, 8, 6, 8, 0], 1700),
  thrustPegPun('peg-one-or-bust', '$1 or Bust', 'thrust · all-in to one dollar', 40000, [2, 4, 6, 8, 8, 8, 0], 1600),
  thrustPegPun('peg-federal-pegserve', 'Federal Pegserve', 'thrust · central bank stroke', 45000, [3, 5, 7, 7, 5, 3, 0], 1800),
]

/**
 * Vibe-catalog puns — single-motor friendly (empty needs = any vibrating toy).
 */
function vibePun(
  id: string,
  name: string,
  blurb: string,
  price: number,
  strengths: number[],
  intervalMs = 400,
): PatternDef {
  return {
    id,
    name,
    blurb,
    price,
    tag: 'vibe',
    kind: 'pattern',
    timeSec: Math.max(1, Math.round((strengths.length * intervalMs) / 1000)),
    intervalMs,
    strengths,
    needs: [],
  }
}

export const VIBE_PUN_PATTERNS: PatternDef[] = [
  vibePun('vibe-proof-of-vibe', 'Proof of Vibe', 'verified soft-to-firm pulses', 2000, [2, 4, 5, 4, 2, 0]),
  vibePun('vibe-high-frequency', 'High Frequency', 'fast ticks · trading cadence', 3500, [0, 5, 0, 5, 0, 6, 0, 6, 0], 220),
  vibePun('vibe-volatility-spike', 'Volatility Spike', 'calm · sudden spike · settle', 5000, [2, 2, 8, 2, 0], 350),
  vibePun('vibe-staked-vibes', 'Staked Vibes', 'locked mid hold · yield drip', 6500, [3, 5, 6, 5, 4, 2, 0], 450),
  vibePun('vibe-genesis-vibe', 'Genesis Vibe', 'first block · warm climb', 8000, [1, 2, 4, 6, 7, 0]),
  vibePun('vibe-vibrafi', 'VibraFi', 'yield farm rhythm', 10000, [3, 5, 3, 6, 3, 7, 0], 360),
  vibePun('vibe-vibrax', 'VibraX', 'cross-chain buzz swap', 12000, [0, 6, 4, 0, 7, 5, 0], 320),
  vibePun('vibe-pump-and-buzz', 'Pump & Buzz', 'pump then buzz dump', 14000, [2, 5, 8, 0, 6, 0], 300),
  vibePun('vibe-vibe-squeeze', 'Vibe Squeeze', 'compress · pop · release', 16000, [3, 6, 8, 8, 2, 0], 300),
  vibePun('vibe-vibenomics', 'Vibenomics', 'compounding little waves', 18000, [2, 3, 5, 4, 6, 5, 7, 6, 0], 380),
  vibePun('vibe-decentralized-vibes', 'Decentralized Vibes', 'many soft nodes · one wave', 22000, [3, 4, 3, 5, 3, 4, 0]),
  vibePun('vibe-permissionless', 'Permissionless Vibration', 'open access · hard finish', 26000, [3, 5, 7, 8, 6, 8, 4, 0], 350),
]

/**
 * Crypto slang that maps cleanly to a physical vibe shape.
 * Vibe-only so Domi / Lush / etc. all see them.
 */
function cryptoPun(
  id: string,
  name: string,
  blurb: string,
  price: number,
  strengths: number[],
  intervalMs = 400,
): PatternDef {
  return {
    id,
    name,
    blurb,
    price,
    tag: 'crypto',
    kind: 'pattern',
    timeSec: Math.max(1, Math.round((strengths.length * intervalMs) / 1000)),
    intervalMs,
    strengths,
    needs: [],
  }
}

export const CRYPTO_PUN_PATTERNS: PatternDef[] = [
  cryptoPun('crypto-god-candle', 'God Candle', 'sudden huge ramp to max', 3000, [1, 2, 4, 8, 8, 0], 300),
  cryptoPun('crypto-green-dildo', 'Green Candle', 'tall repeated green spikes', 4000, [0, 8, 0, 8, 0, 8, 0], 280),
  cryptoPun('crypto-pump-dump', 'Pump & Dump', 'rise hard · fall hard', 5000, [2, 5, 8, 8, 2, 0], 320),
  cryptoPun('crypto-rug-pull', 'Rug Pull', 'max hold · instant drop', 6000, [8, 8, 8, 0, 0], 300),
  cryptoPun('crypto-slow-rug', 'Slow Rug', 'gradual fade to nothing', 7000, [8, 6, 4, 2, 1, 0], 450),
  cryptoPun('crypto-short-squeeze-vibe', 'Squeeze Play', 'tighter · faster · pop', 8000, [3, 5, 6, 7, 8, 8, 0], 260),
  cryptoPun('crypto-liq-cascade', 'Liquidation Cascade', 'escalating repeated hits', 9000, [3, 0, 5, 0, 7, 0, 8, 0, 6, 0], 260),
  cryptoPun('crypto-full-liq', 'Full Liquidation', 'one brutal wipeout', 10000, [8, 8, 8, 8, 1, 0], 350),
  cryptoPun('crypto-dead-cat', 'Dead Cat Bounce', 'drop · surprise comeback', 11000, [7, 1, 0, 5, 3, 0], 340),
  cryptoPun('crypto-long-wick', 'Long Wick', 'one sharp extended peak', 12000, [2, 8, 2, 0], 300),
  cryptoPun('crypto-stop-hunt', 'Stop Hunt', 'tease near peaks · fakeout', 13000, [4, 7, 4, 7, 3, 0], 320),
  cryptoPun('crypto-breakout', 'Breakout', 'sudden intensity jump', 14000, [3, 3, 3, 8, 8, 0], 350),
  cryptoPun('crypto-blow-off', 'Blow-Off Top', 'violent final crescendo', 15000, [4, 5, 6, 8, 8, 8, 0], 300),
  cryptoPun('crypto-volatility', 'Volatility', 'chaotic intensity swings', 16000, [2, 7, 3, 8, 1, 6, 0], 280),
  cryptoPun('crypto-dca', 'DCA', 'even spaced repeated hits', 17000, [0, 4, 0, 5, 0, 6, 0, 5, 0], 400),
  cryptoPun('crypto-halving', 'Halving', 'intensity halves each cycle', 18000, [8, 8, 4, 4, 2, 2, 0], 400),
  cryptoPun('crypto-compounding', 'Compounding', 'every cycle gets stronger', 19000, [2, 3, 4, 5, 6, 7, 8, 0], 360),
  cryptoPun('crypto-rebase', 'Rebase', 'reset baseline · climb again', 20000, [5, 6, 2, 5, 6, 2, 0], 380),
  cryptoPun('crypto-gas-wars', 'Gas Wars', 'frantic rapid pulses', 22000, [6, 7, 6, 8, 6, 8, 0], 200),
  cryptoPun('crypto-block-reward', 'Block Reward', 'pause · burst · pause', 24000, [0, 0, 8, 0, 0, 8, 0], 350),
  cryptoPun('crypto-flash-loan', 'Flash Loan', 'very short max blast', 26000, [0, 8, 0], 250),
  cryptoPun('crypto-100x', '100x Leverage', 'absurdly aggressive', 28000, [8, 8, 7, 8, 8, 6, 0, 8, 0], 260),
  cryptoPun('crypto-max-slip', 'Maximum Slippage', 'irregular sliding intensity', 30000, [7, 5, 8, 3, 6, 2, 0], 300),
  cryptoPun('crypto-price-discovery', 'Price Discovery', 'unpredictable climb', 32000, [2, 5, 3, 7, 4, 8, 0], 340),
  cryptoPun('crypto-capitulation', 'Capitulation', 'brutal peak then collapse', 34000, [6, 8, 8, 8, 1, 0], 350),
  cryptoPun('crypto-full-send', 'Full Send', 'straight to max', 36000, [8, 8, 8, 8, 8, 0], 300),
  cryptoPun('crypto-ath', 'ATH', 'all-time high hold', 38000, [7, 8, 8, 8, 0], 400),
  cryptoPun('crypto-new-ath', 'New ATH', 'beats prior peak each cycle', 40000, [5, 6, 7, 8, 8, 0], 360),
  cryptoPun('crypto-exit-liq', 'Exit Liquidity', 'premium whale exit pattern', 42000, [4, 6, 8, 8, 3, 0], 380),
  cryptoPun('crypto-whale-alert', 'Whale Alert', 'huge sudden burst', 45000, [0, 0, 8, 8, 0], 300),
  cryptoPun('crypto-hard-fork', 'Hard Fork', 'split · hard new path', 16000, [5, 5, 0, 7, 7, 0], 350),
  cryptoPun('crypto-full-node', 'Full Node', 'steady full-stack hold', 18000, [5, 6, 7, 7, 7, 6, 5, 0], 450),
  cryptoPun('crypto-pos', 'Proof of Stake', 'lock in · earn the drip', 20000, [4, 5, 6, 6, 5, 3, 0], 420),
  cryptoPun('crypto-degen-mode', 'Degen Mode', 'no brakes · full degen', 50000, [7, 8, 6, 8, 7, 8, 0], 240),
]

/**
 * Rotate-catalog puns for Nora-class spinning toys.
 * intervalMs stays ≥1400 so Connect specialty holds survive.
 */
function rotatePun(
  id: string,
  name: string,
  blurb: string,
  price: number,
  strengths: number[],
  intervalMs = 1600,
): PatternDef {
  return {
    id,
    name,
    blurb,
    price,
    tag: 'spin',
    kind: 'pattern',
    timeSec: Math.max(1, Math.round((strengths.length * intervalMs) / 1000)),
    intervalMs: Math.max(1400, intervalMs),
    strengths,
    needs: ['rotate'],
  }
}

export const ROTATE_PUN_PATTERNS: PatternDef[] = [
  rotatePun('spin-cycle', 'Spin Cycle', 'rotate · wash-rinse cadence', 3000, [4, 6, 4, 6, 0]),
  rotatePun('spin-proof-of-spin', 'Proof of Spin', 'rotate · verified continuous spin', 4500, [5, 5, 6, 5, 0]),
  rotatePun('spin-full-circle', 'Full Circle', 'rotate · complete lap then rest', 5500, [3, 5, 7, 5, 3, 0], 1700),
  rotatePun('spin-around-the-block', 'Around the Block', 'rotate · lap · pause · lap', 6500, [6, 6, 0, 6, 6, 0], 1500),
  rotatePun('spin-sector-rotation', 'Sector Rotation', 'rotate · shift between speeds', 8000, [3, 6, 3, 7, 3, 0], 1700),
  rotatePun('spin-supercycle', 'Supercycle', 'rotate · long macro climb', 10000, [2, 4, 6, 8, 8, 0], 1800),
  rotatePun('spin-perpetual-motion', 'Perpetual Motion', 'rotate · never-stop mid spin', 12000, [5, 6, 5, 6, 5, 0]),
  rotatePun('spin-infinite-loop', 'Infinite Loop', 'rotate · looped on/off forever feel', 14000, [0, 6, 0, 8, 0, 6, 0, 8, 0], 1500),
  rotatePun('spin-liquidity-loop', 'Liquidity Loop', 'rotate · smooth closed circuit', 16000, [4, 5, 6, 5, 4, 0], 1700),
  rotatePun('spin-token-tornado', 'Token Tornado', 'rotate · spin up · hold · unravel', 18000, [3, 5, 7, 8, 4, 0], 1600),
  rotatePun('spin-vortex', 'Vortex', 'rotate · hard center pull', 20000, [6, 7, 8, 8, 5, 0]),
  rotatePun('spin-death-spiral', 'Death Spiral', 'rotate · accelerate into the drop', 25000, [2, 4, 6, 8, 8, 0, 0], 1500),
  rotatePun('spin-corkscrew', 'Corkscrew', 'rotate · twist in · twist out', 27500, [5, 7, 5, 7, 5, 0], 1500),
  rotatePun('spin-high-turnover', 'High Turnover', 'rotate · quick trade flips', 30000, [0, 8, 0, 8, 0, 7, 0], 1500),
  rotatePun('spin-full-360', 'Full 360', 'rotate · one hard full turn', 35000, [5, 7, 8, 8, 8, 4, 0], 1800),
]

/**
 * Roman Storm / Tornado Cash / privacy-dev shortlist.
 * Rotate-only tribute — Nora-class spinning toys.
 */
function stormSpin(
  id: string,
  name: string,
  blurb: string,
  price: number,
  strengths: number[],
  intervalMs = 1600,
): PatternDef {
  return {
    id,
    name,
    blurb,
    price,
    tag: 'storm',
    kind: 'pattern',
    timeSec: Math.max(1, Math.round((strengths.length * intervalMs) / 1000)),
    intervalMs: Math.max(1400, intervalMs),
    strengths,
    needs: ['rotate'],
  }
}

export const ROMAN_STORM_PATTERNS: PatternDef[] = [
  stormSpin('storm-zk-whirl', 'ZK Whirl', 'rotate · zero-knowledge spin', 4000, [4, 5, 6, 5, 0]),
  stormSpin(
    'storm-open-source',
    'Open Source Spin',
    'rotate · can’t be switched off',
    5500,
    [5, 6, 5, 7, 6, 5, 4, 0],
    1550,
  ),
  stormSpin('storm-peppersec', 'PepperSec', 'rotate · dev-shop cadence', 7000, [4, 4, 6, 7, 6, 4, 3, 0], 1650),
  stormSpin('storm-non-custodial', 'Hands Off', 'rotate · never hold the asset', 8500, [4, 7, 3, 7, 4, 6, 0]),
  stormSpin(
    'storm-privacy-pool',
    'Deposit Whirl',
    'rotate · deposit · spin · exit',
    10000,
    [2, 4, 6, 8, 4, 0],
    1600,
  ),
  stormSpin('storm-immutable', 'Locked Forever', 'rotate · locked forever spin', 12500, [7, 7, 7, 6, 7, 7, 0]),
  stormSpin('storm-tornado-cash', 'Storm Cell', 'rotate · classic mixer whirl', 15000, [2, 4, 6, 7, 8, 5, 3, 0], 1550),
  stormSpin('storm-roman-storm', "Roman's Storm", 'rotate · Seattle whirlwind', 18000, [6, 7, 6, 7, 5, 0]),
  stormSpin('storm-deadlock', 'Hung Jury', 'rotate · split · spin again', 22000, [0, 6, 0, 7, 0, 8, 0], 1500),
  stormSpin(
    'storm-proof-of-privacy',
    'Proof of Privacy',
    'rotate · verified anonymous lap',
    26000,
    [3, 5, 7, 7, 5, 0],
    1700,
  ),
  stormSpin(
    'storm-unlicensed-spin',
    'Unlicensed Spin',
    'rotate · off-book transmitter',
    30000,
    [2, 4, 5, 7, 8, 8, 2, 0],
    1500,
  ),
  stormSpin('storm-circuit-loop', 'Round Trip', 'rotate · delist · relist cadence', 34000, [5, 4, 7, 4, 5, 6, 4, 0], 1750),
]

/**
 * Richard Heart / HEX / Pulse shortlist.
 * Vibe lines stay vibe-only; spin/watch lines stay rotate-gated.
 */
function rhVibe(
  id: string,
  name: string,
  blurb: string,
  price: number,
  strengths: number[],
  intervalMs = 400,
): PatternDef {
  return {
    id,
    name,
    blurb,
    price,
    tag: 'richard',
    kind: 'pattern',
    timeSec: Math.max(1, Math.round((strengths.length * intervalMs) / 1000)),
    intervalMs,
    strengths,
    needs: [],
  }
}

function rhSpin(
  id: string,
  name: string,
  blurb: string,
  price: number,
  strengths: number[],
  intervalMs = 1600,
): PatternDef {
  return {
    id,
    name,
    blurb,
    price,
    tag: 'richard',
    kind: 'pattern',
    timeSec: Math.max(1, Math.round((strengths.length * intervalMs) / 1000)),
    intervalMs: Math.max(1400, intervalMs),
    strengths,
    needs: ['rotate'],
  }
}

export const RICHARD_HEART_PATTERNS: PatternDef[] = [
  rhVibe('rh-richard-hard', 'Richard Hard', 'firm hold · no soft landing', 2500, [6, 7, 7, 6, 0]),
  rhVibe('rh-heart-throbber', 'Heart Throbber', 'heavy pulse · throb cadence', 4000, [0, 7, 0, 7, 0, 8, 0], 320),
  rhVibe('rh-richard-goes-brrrr', 'Richard Goes Brrrr', 'machine-gun buzz run', 5500, [5, 6, 5, 7, 5, 8, 0], 220),
  rhVibe('rh-hexual-heartbeat', 'HEXual Heartbeat', 'hexed lub-dub · climb', 7000, [2, 5, 2, 6, 2, 7, 0], 360),
  rhVibe('rh-hex-me-harder', 'HEX Me Harder', 'each beat hits harder', 9000, [3, 5, 7, 8, 8, 0], 350),
  rhVibe('rh-pulse-my-heart', 'Pulse My Heart', 'pulsechain heartbeat', 11000, [0, 5, 0, 8, 0, 6, 0, 7, 0], 300),
  rhVibe('rh-hard-pulsex', 'Hard PulseX', 'swap hard · hold the peak', 13000, [4, 7, 8, 8, 5, 0]),
  rhVibe('rh-pulsechain-reaction', 'PulseChain Reaction', 'cascade · chain reaction climb', 16000, [2, 4, 6, 8, 6, 8, 0], 340),
  rhVibe('rh-proof-of-heart', 'Proof of Heart', 'verified soft-to-firm heart', 18000, [2, 4, 6, 5, 3, 0]),
  rhVibe('rh-enigma-machine', 'Enigma Machine', 'cipher pulses · decode finish', 24000, [2, 0, 4, 0, 6, 0, 8, 0, 7, 0], 320),
  rhVibe('rh-proof-of-flex', 'Proof of Flex', 'luxury climb · flex hold', 28000, [3, 5, 7, 8, 8, 6, 0], 380),
  rhSpin('rh-spin-cycle', 'Richard’s Spin Cycle', 'rotate · rinse · repeat', 6500, [4, 6, 5, 7, 4, 6, 0], 1550),
  rhSpin('rh-perpetual-richard', 'Perpetual Richard', 'rotate · never-stop mid spin', 12000, [6, 5, 7, 5, 6, 5, 0]),
  rhSpin('rh-automatic-movement', 'Automatic Movement', 'rotate · self-winding rhythm', 15000, [3, 5, 6, 5, 3, 0], 1700),
  rhSpin('rh-555-rpm', '555 RPM', 'rotate · redline spin hold', 22000, [6, 7, 8, 8, 8, 0], 1500),
]

/**
 * Gary Gensler / SEC / enforcement shortlist.
 * Vibe · rotate · thrust stay correctly gated by toy family.
 */
function ggVibe(
  id: string,
  name: string,
  blurb: string,
  price: number,
  strengths: number[],
  intervalMs = 400,
): PatternDef {
  return {
    id,
    name,
    blurb,
    price,
    tag: 'gensler',
    kind: 'pattern',
    timeSec: Math.max(1, Math.round((strengths.length * intervalMs) / 1000)),
    intervalMs,
    strengths,
    needs: [],
  }
}

function ggSpin(
  id: string,
  name: string,
  blurb: string,
  price: number,
  strengths: number[],
  intervalMs = 1600,
): PatternDef {
  return {
    id,
    name,
    blurb,
    price,
    tag: 'gensler',
    kind: 'pattern',
    timeSec: Math.max(1, Math.round((strengths.length * intervalMs) / 1000)),
    intervalMs: Math.max(1400, intervalMs),
    strengths,
    needs: ['rotate'],
  }
}

function ggThrust(
  id: string,
  name: string,
  blurb: string,
  price: number,
  strengths: number[],
  intervalMs = 1600,
): PatternDef {
  return {
    id,
    name,
    blurb,
    price,
    tag: 'gensler',
    kind: 'pattern',
    timeSec: Math.max(1, Math.round((strengths.length * intervalMs) / 1000)),
    intervalMs: Math.max(1400, intervalMs),
    strengths,
    needs: ['thrust'],
  }
}

export const GARY_GENSLER_PATTERNS: PatternDef[] = [
  ggVibe('gg-secstasy', 'SECstasy', 'regulatory bliss · rising waves', 2500, [2, 4, 6, 7, 5, 0]),
  ggVibe('gg-tease-desist', 'Tease & Desist', 'soft tease · hard stop', 3500, [3, 5, 3, 0, 6, 0], 320),
  ggVibe('gg-vibrate-desist', 'Vibrate & Desist', 'buzz · cease · buzz again', 4500, [0, 7, 0, 0, 7, 0], 300),
  ggVibe('gg-gary-goes-brrrr', 'Gary Goes Brrrr', 'enforcement machine-gun', 5500, [4, 7, 5, 8, 6, 7, 8, 0], 200),
  ggVibe('gg-unregistered', 'Unregistered Stimulation', 'off-book buzz · no filing', 7000, [3, 5, 3, 6, 4, 0]),
  ggVibe('gg-reg-by-stim', 'Regulation by Stimulation', 'enforce through the vibe', 8500, [2, 4, 6, 4, 7, 0], 360),
  ggVibe('gg-howey-hard', 'Howey Hard', 'pass the test · hard hold', 10000, [4, 6, 8, 8, 5, 0]),
  ggVibe('gg-pass-the-howey', 'Pass the Howey', 'four-prong climb to pass', 12000, [1, 3, 5, 7, 8, 6, 0], 380),
  ggVibe('gg-expectation', 'Expectation of Pleasure', 'soft promise · efforts of others', 14000, [3, 4, 5, 6, 5, 0], 420),
  ggVibe('gg-wells-notice', 'Gary’s Wells Notice', 'served · respond · peak', 16000, [0, 5, 0, 7, 0, 8, 0], 340),
  ggVibe('gg-full-disclosure', 'Full Disclosure', 'leave nothing undisclosed', 18000, [4, 5, 6, 7, 8, 0]),
  ggVibe('gg-best-execution', 'Best Execution', 'optimal path · clean finish', 20000, [3, 5, 7, 6, 8, 0], 360),
  ggVibe('gg-t69', 'T+69', 'settlement delayed · spicy', 22000, [2, 4, 2, 6, 2, 8, 0], 300),
  ggVibe('gg-reg-pressure', 'Regulatory Pressure', 'rising pressure pulses', 25000, [2, 4, 6, 7, 8, 8, 7, 5, 0], 340),
  ggVibe('gg-enforcement-mode', 'Enforcement Mode', 'steady hard compliance hold', 28000, [7, 7, 8, 7, 6, 7, 0]),
  ggSpin('gg-gensleration', 'Gensleration', 'rotate · next-gen enforcement spin', 6000, [4, 6, 5, 7, 0]),
  ggSpin('gg-sector-rotation', 'SECtor Rotation', 'rotate · sector shift cadence', 9000, [3, 5, 3, 6, 4, 7, 3, 0], 1650),
  ggSpin('gg-gary-spin-cycle', 'Gary’s Spin Cycle', 'rotate · rinse the market', 13000, [6, 4, 8, 4, 6, 0], 1500),
  ggSpin('gg-reg-death-spiral', 'Regulatory Death Spiral', 'rotate · accelerate into the drop', 30000, [1, 2, 4, 6, 8, 8, 7, 0], 1400),
  ggThrust('gg-thrust-desist', 'Thrust & Desist', 'thrust · full stroke then cease', 15000, [0, 8, 0, 0, 8, 0], 1500),
]

/**
 * Specialty catalogs by toy family (separate from vibe CATALOG_PATTERNS).
 *
 * Keep each family SHORT and high-contrast. intervalMs >= 1400 so Connect
 * holds survive (no short LED blink) and thicken does not smear shapes.
 * Archetypes per family: soft · pulse · climb/hold · (optional dual L/R or combo).
 */
export const FEATURE_FOCUS_PATTERNS: PatternDef[] = [
  // —— Thrust (Solace) —— 4 clear feels + 1 dual
  {
    id: 'fx-thrust-soft',
    name: 'Soft stroke',
    blurb: 'thrust · gentle steady in-out',
    price: 2500,
    tag: 'feature',
    kind: 'pattern',
    timeSec: 8,
    intervalMs: 1600,
    strengths: [3, 3, 3, 3, 0],
    needs: ['thrust'],
  },
  {
    id: 'fx-thrust-staccato',
    name: 'Thrust pulse',
    blurb: 'thrust · full stroke then rest',
    price: 7000,
    tag: 'feature',
    kind: 'pattern',
    timeSec: 10,
    intervalMs: 1500,
    strengths: [0, 8, 0, 8, 0, 8, 0],
    needs: ['thrust'],
  },
  {
    id: 'fx-thrust-swell',
    name: 'Thrust climb',
    blurb: 'thrust · slow depth climb',
    price: 12000,
    tag: 'feature',
    kind: 'pattern',
    timeSec: 11,
    intervalMs: 1900,
    strengths: [1, 3, 4, 6, 7, 8, 0],
    needs: ['thrust'],
  },
  {
    id: 'fx-thrust-hold',
    name: 'Depth hold',
    blurb: 'thrust · deep press then drop',
    price: 15000,
    tag: 'feature',
    kind: 'pattern',
    timeSec: 10,
    intervalMs: 1800,
    strengths: [8, 8, 8, 3, 0],
    needs: ['thrust'],
  },
  {
    id: 'fx-solace-combo',
    name: 'Solace dual',
    blurb: 'vibe · thrust · both together (steady)',
    price: 16000,
    tag: 'combo',
    kind: 'pattern',
    timeSec: 10,
    intervalMs: 1600,
    strengths: [4, 6, 6, 7, 5, 0],
    needs: ['thrust', 'multi'],
  },

  // —— Rotate only (Nora head) —— 3 distinct
  {
    id: 'fx-rotate-nudge',
    name: 'Rotate soft',
    blurb: 'rotate · slow quiet head turns',
    price: 3500,
    tag: 'feature',
    kind: 'pattern',
    timeSec: 8,
    intervalMs: 1600,
    strengths: [2, 3, 3, 2, 3, 0],
    needs: ['rotate'],
  },
  {
    id: 'fx-rotate-spin',
    name: 'Rotate full',
    blurb: 'rotate · strong continuous spin',
    price: 9000,
    tag: 'feature',
    kind: 'pattern',
    timeSec: 9,
    intervalMs: 1600,
    strengths: [6, 8, 7, 8, 6, 0],
    needs: ['rotate'],
  },
  {
    id: 'fx-rotate-pulse',
    name: 'Rotate pulse',
    blurb: 'rotate · hard spin then stop',
    price: 11000,
    tag: 'feature',
    kind: 'pattern',
    timeSec: 11,
    intervalMs: 1400,
    strengths: [0, 8, 0, 0, 8, 0, 0, 8, 0],
    needs: ['rotate'],
  },

  // —— Nora vibe + rotate (simultaneous) —— 3 dual packages
  {
    id: 'fx-nora-sync-soft',
    name: 'Dual soft',
    blurb: 'vibe · rotate · low steady both',
    price: 6000,
    tag: 'combo',
    kind: 'pattern',
    timeSec: 8,
    intervalMs: 1550,
    strengths: [2, 4, 3, 4, 3, 4, 2, 0],
    needs: ['rotate'],
  },
  {
    id: 'fx-nora-sync-pulse',
    name: 'Dual pulse',
    blurb: 'vibe · rotate · both on/off together',
    price: 10000,
    tag: 'combo',
    kind: 'pattern',
    timeSec: 11,
    intervalMs: 1450,
    strengths: [0, 7, 2, 8, 0, 7, 2, 8, 0],
    needs: ['rotate'],
  },
  {
    id: 'fx-nora-sync-climb',
    name: 'Dual climb',
    blurb: 'vibe · rotate · slow ramp both axes',
    price: 15000,
    tag: 'combo',
    kind: 'pattern',
    timeSec: 10,
    intervalMs: 1800,
    strengths: [2, 4, 6, 8, 0],
    needs: ['rotate'],
  },

  // —— Air (Max) —— 3
  {
    id: 'fx-air-kiss',
    name: 'Air soft',
    blurb: 'air · light suction hold',
    price: 4000,
    tag: 'feature',
    kind: 'pattern',
    timeSec: 8,
    intervalMs: 1600,
    strengths: [3, 3, 4, 3, 0],
    needs: ['air'],
  },
  {
    id: 'fx-air-pulse',
    name: 'Air pulse',
    blurb: 'air · suck hard then rest',
    price: 8000,
    tag: 'feature',
    kind: 'pattern',
    timeSec: 10,
    intervalMs: 1500,
    strengths: [0, 8, 0, 8, 0, 7, 0],
    needs: ['air'],
  },
  {
    id: 'fx-air-vacuum',
    name: 'Air vacuum',
    blurb: 'air · deep suction hold then drop',
    price: 12000,
    tag: 'feature',
    kind: 'pattern',
    timeSec: 10,
    intervalMs: 1800,
    strengths: [7, 8, 8, 3, 0],
    needs: ['air'],
  },

  // —— Multi-motor (generic dual vibes: Edge, Dolce…) ——
  // Gemini body-part puns live in GEMINI_* packs (forProducts: gemini).
  {
    id: 'fx-dual-soft',
    name: 'Twin soft',
    blurb: 'multi · low both motors',
    price: 3000,
    tag: 'feature',
    kind: 'pattern',
    timeSec: 8,
    intervalMs: 1600,
    strengths: [2, 4, 3, 4, 2, 0],
    needs: ['multi'],
  },
  {
    id: 'fx-dual-pulse',
    name: 'Twin pulse',
    blurb: 'multi · both motors on/off',
    price: 6000,
    tag: 'feature',
    kind: 'pattern',
    timeSec: 11,
    intervalMs: 1400,
    strengths: [0, 7, 0, 8, 0, 7, 0, 8, 0],
    needs: ['multi'],
  },
  {
    id: 'fx-dual-chase',
    name: 'L / R chase',
    blurb: 'multi · alternate left then right',
    price: 10000,
    tag: 'feature',
    kind: 'pattern',
    timeSec: 10,
    intervalMs: 1500,
    strengths: [7, 7, 7, 7, 7, 7, 0],
    stepMotors: [1, 2, 1, 2, 1, 2, 0],
    needs: ['multi'],
  },
  {
    id: 'fx-dual-build',
    name: 'Twin climb',
    blurb: 'multi · both motors step up',
    price: 14000,
    tag: 'feature',
    kind: 'pattern',
    timeSec: 10,
    intervalMs: 1800,
    strengths: [2, 4, 6, 8, 0],
    needs: ['multi'],
  },
  {
    id: 'fx-dual-peak',
    name: 'Twin max',
    blurb: 'multi · hard both motors hold',
    price: 18000,
    tag: 'feature',
    kind: 'pattern',
    timeSec: 9,
    intervalMs: 1600,
    strengths: [7, 8, 8, 8, 6, 0],
    needs: ['multi'],
  },
]


/** Raw factory rows (metadata + legacy strengths); archetypes applied below. */
const RAW_CATALOG_PATTERNS_ALL: PatternDef[] = [
  ...CATALOG_PATTERNS,
  ...GEMINI_PUN_PATTERNS,
  ...GEMINI_SPLIT_PATTERNS,
  ...VIBE_PUN_PATTERNS,
  ...CRYPTO_PUN_PATTERNS,
  ...RICHARD_HEART_PATTERNS,
  ...GARY_GENSLER_PATTERNS,
  ...STABLECOIN_THRUST_PATTERNS,
  ...ROTATE_PUN_PATTERNS,
  ...ROMAN_STORM_PATTERNS,
  ...FEATURE_FOCUS_PATTERNS,
]

/** Built-in ids that can be reset to factory (haptic archetype waveforms). */
export const CATALOG_PATTERNS_ALL: PatternDef[] =
  applyHapticArchetypes(RAW_CATALOG_PATTERNS_ALL)

export const CATALOG_IDS = new Set(CATALOG_PATTERNS_ALL.map((x) => x.id))

/** Live catalog = built-ins (maybe overridden) + customs. */
export let PATTERNS: PatternDef[] = CATALOG_PATTERNS_ALL.map((p) => ({
  ...p,
  strengths: p.strengths.slice(),
  stepMotors: p.stepMotors ? [...p.stepMotors] : undefined,
  // Built-ins declare needs explicitly; never auto-infer vibe catalog blurbs.
  needs: p.needs ? [...p.needs] : [],
  forProducts: p.forProducts ? [...p.forProducts] : undefined,
}))

export let PATTERN_IDS = PATTERNS.map((x) => x.id)

let byId = new Map(PATTERNS.map((x) => [x.id, x]))

export function isCatalogPattern(id: string): boolean {
  return CATALOG_IDS.has(id)
}

export function isCustomPattern(id: string): boolean {
  return id.startsWith('u_') || (!CATALOG_IDS.has(id) && byId.has(id))
}

export function getCatalogPattern(id: string): PatternDef | undefined {
  return CATALOG_PATTERNS_ALL.find((p) => p.id === id)
}

export function patternNeeds(p: PatternDef): ChannelNeed[] {
  // Explicit needs array (including []) wins — empty means vibe-only.
  if (Array.isArray(p.needs)) return normalizeNeeds(p.needs)
  return normalizeNeeds(inferPatternNeeds(p))
}

export function patternIsModified(
  id: string,
  overrides: Record<string, PatternDef>,
  customs: PatternDef[],
): boolean {
  if (isCatalogPattern(id)) return !!overrides[id]
  return customs.some((c) => c.id === id)
}

export function newCustomPatternId(): string {
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function normalizePatternNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function patternWaveKey(p: {
  strengths: number[]
  intervalMs: number
  stepMotors?: number[]
  motorStrengths?: number[][]
  needs?: string[]
}): string {
  const strengths = (p.strengths || [])
    .map((n) => Math.max(0, Math.min(8, Math.round(Number(n) || 0))))
    .join(',')
  const interval = Math.max(80, Math.min(2000, Math.round(Number(p.intervalMs) || 400)))
  const motors = (p.stepMotors || []).map((n) => Math.round(Number(n) || 0)).join(',')
  const lanes = (p.motorStrengths || [])
    .map((lane) =>
      (lane || [])
        .map((n) => Math.max(0, Math.min(8, Math.round(Number(n) || 0))))
        .join('.'),
    )
    .join('|')
  const needs = [...(p.needs || [])].map(String).sort().join('+')
  return `${interval};${strengths};${motors};${lanes};${needs}`
}

export type PatternDuplicateHit = {
  id: string
  name: string
  reason: 'name' | 'wave'
}

/** Find an existing live pattern that collides on name or waveform. */
export function findPatternDuplicate(
  candidate: {
    name: string
    strengths: number[]
    intervalMs: number
    stepMotors?: number[]
    motorStrengths?: number[][]
    needs?: string[]
  },
  opts?: { excludeId?: string },
): PatternDuplicateHit | null {
  const exclude = (opts?.excludeId || '').trim()
  const nameKey = normalizePatternNameKey(candidate.name)
  const waveKey = patternWaveKey(candidate)
  if (!nameKey && !waveKey) return null

  for (const p of PATTERNS) {
    if (!p?.id || p.id === exclude) continue
    if (nameKey && normalizePatternNameKey(p.name) === nameKey) {
      return { id: p.id, name: p.name, reason: 'name' }
    }
  }
  for (const p of PATTERNS) {
    if (!p?.id || p.id === exclude) continue
    if (patternWaveKey(p) === waveKey) {
      return { id: p.id, name: p.name, reason: 'wave' }
    }
  }
  return null
}

/** Sanitize and clamp a pattern def for storage / play. */
export function normalizePatternDef(
  raw: Partial<PatternDef> | null | undefined,
  idFallback?: string,
): PatternDef | null {
  if (!raw || typeof raw !== 'object') return null
  const id =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim().slice(0, 48)
      : idFallback || ''
  if (!id) return null
  const name =
    typeof raw.name === 'string' && raw.name.trim()
      ? raw.name.trim().slice(0, 48)
      : 'Untitled'
  const blurb =
    typeof raw.blurb === 'string' ? raw.blurb.trim().slice(0, 120) : ''
  const tag =
    typeof raw.tag === 'string' && raw.tag.trim()
      ? raw.tag.trim().toLowerCase().slice(0, 24)
      : 'custom'
  const kind: PatternKind =
    raw.kind === 'preset' || raw.kind === 'pulse' || raw.kind === 'pattern'
      ? raw.kind
      : 'pattern'
  const intervalMs = Math.max(
    80,
    Math.min(2000, Math.round(Number(raw.intervalMs) || 400)),
  )
  let strengths = Array.isArray(raw.strengths)
    ? raw.strengths
        .map((n) => Math.max(0, Math.min(8, Math.round(Number(n) || 0))))
        .slice(0, 32)
    : []
  if (!strengths.length) strengths = [4, 4, 0]
  const price = Math.max(0, Number(raw.price) || 0)
  let timeSec = Math.max(0, Number(raw.timeSec) || 0)
  if (!timeSec) {
    timeSec = Math.max(1, Math.round((strengths.length * intervalMs) / 1000))
  }
  const out: PatternDef = {
    id,
    name,
    blurb,
    price,
    tag,
    kind,
    timeSec,
    intervalMs,
    strengths,
  }
  if (typeof raw.preset === 'string' && raw.preset.trim()) {
    out.preset = raw.preset.trim()
  }
  if (raw.intensity != null && Number.isFinite(Number(raw.intensity))) {
    out.intensity = Math.max(1, Math.min(8, Math.round(Number(raw.intensity))))
  }
  const stepMotors = normalizeStepMotors(raw.stepMotors, strengths.length)
  if (stepMotors) out.stepMotors = stepMotors
  const motorStrengths = normalizeMotorStrengths(
    raw.motorStrengths,
    strengths.length,
  )
  if (motorStrengths) out.motorStrengths = motorStrengths
  const needs = normalizeNeeds(raw.needs)
  if (Array.isArray(raw.needs)) out.needs = needs
  else {
    const inferred = inferPatternNeeds({ id, name, blurb })
    if (inferred.length) out.needs = inferred
  }
  if (Array.isArray(raw.forProducts)) {
    const forProducts = raw.forProducts
      .map((x) => productToken(String(x || '')))
      .filter(Boolean)
      .slice(0, 12)
    if (forProducts.length) out.forProducts = forProducts
  }
  return out
}

export function normalizePatternDefList(raw: unknown): PatternDef[] {
  if (!Array.isArray(raw)) return []
  const out: PatternDef[] = []
  const seen = new Set<string>()
  for (const row of raw) {
    const p = normalizePatternDef(row as Partial<PatternDef>)
    if (!p || seen.has(p.id) || CATALOG_IDS.has(p.id)) continue
    seen.add(p.id)
    out.push(p)
  }
  return out
}

export function normalizePatternOverrides(
  raw: unknown,
): Record<string, PatternDef> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, PatternDef> = {}
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!CATALOG_IDS.has(id)) continue
    const p = normalizePatternDef(v as Partial<PatternDef>, id)
    if (p) out[id] = { ...p, id }
  }
  return out
}

/**
 * Rebuild live PATTERNS from built-in catalog + user custom + catalog overrides.
 */
export function rebuildPatterns(
  customs: PatternDef[] = [],
  overrides: Record<string, PatternDef> = {},
) {
  const next: PatternDef[] = []
  for (const c of CATALOG_PATTERNS_ALL) {
    const o = overrides[c.id]
    const base: PatternDef = o
      ? {
          ...o,
          id: c.id,
          // Keep stock product affinity unless the override sets its own.
          forProducts: o.forProducts?.length
            ? [...o.forProducts]
            : c.forProducts
              ? [...c.forProducts]
              : undefined,
        }
      : {
          ...c,
          strengths: c.strengths.slice(),
          stepMotors: c.stepMotors ? [...c.stepMotors] : undefined,
          motorStrengths: c.motorStrengths?.map((lane) => lane.slice()),
          needs: c.needs ? [...c.needs] : undefined,
          forProducts: c.forProducts ? [...c.forProducts] : undefined,
        }
    if (!Array.isArray(base.needs)) {
      const inferred = inferPatternNeeds(base)
      if (inferred.length) base.needs = inferred
    }
    const sm = normalizeStepMotors(base.stepMotors, base.strengths.length)
    if (sm) base.stepMotors = sm
    else delete base.stepMotors
    const ms = normalizeMotorStrengths(
      base.motorStrengths,
      base.strengths.length,
    )
    if (ms) base.motorStrengths = ms
    else delete base.motorStrengths
    next.push(base)
  }
  for (const c of customs) {
    if (CATALOG_IDS.has(c.id)) continue
    const row: PatternDef = {
      ...c,
      strengths: c.strengths.slice(),
      stepMotors: c.stepMotors ? [...c.stepMotors] : undefined,
      motorStrengths: c.motorStrengths?.map((lane) => lane.slice()),
      needs: c.needs ? [...c.needs] : undefined,
    }
    if (!Array.isArray(row.needs)) {
      const inferred = inferPatternNeeds(row)
      if (inferred.length) row.needs = inferred
    }
    const sm = normalizeStepMotors(row.stepMotors, row.strengths.length)
    if (sm) row.stepMotors = sm
    else delete row.stepMotors
    const ms = normalizeMotorStrengths(row.motorStrengths, row.strengths.length)
    if (ms) row.motorStrengths = ms
    else delete row.motorStrengths
    next.push(row)
  }
  PATTERNS = next
  PATTERN_IDS = PATTERNS.map((x) => x.id)
  byId = new Map(PATTERNS.map((x) => [x.id, x]))
}

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
  /** 1-based motors for this step; omit = all (toy lock still applies) */
  motorMask?: number[]
  /**
   * Independent 0–1 level per motor (index 0 = M1) when the pattern runs
   * different lanes per motor. `level` stays the loudest lane for backends
   * that only take one number.
   */
  motorLevels?: number[]
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
  let stepMotors = item.stepMotors ? [...item.stepMotors] : []
  let lanes = item.motorStrengths?.length
    ? item.motorStrengths.map((lane) => lane.slice())
    : []

  if (durationMs != null && durationMs > 0) {
    const want = Math.max(1, Math.round(durationMs / iv))
    if (want < steps.length) {
      steps = steps.slice(0, want)
      stepMotors = stepMotors.slice(0, want)
      lanes = lanes.map((lane) => lane.slice(0, want))
    } else if (want > steps.length) {
      const out: number[] = []
      const mo: StepMotorCode[] = []
      const laneOut: number[][] = lanes.map(() => [])
      while (out.length < want) {
        out.push(...steps)
        if (stepMotors.length) mo.push(...stepMotors)
        lanes.forEach((lane, li) => laneOut[li]!.push(...lane))
      }
      steps = out.slice(0, want)
      stepMotors = mo.slice(0, want)
      lanes = laneOut.map((lane) => lane.slice(0, want))
    }
  }

  return steps.map((s, i) => {
    const mask = stepMotorToMask(stepMotors[i])
    const level = (Math.max(0, Math.min(8, Number(s) || 0)) / 8) * peak
    if (lanes.length) {
      const motorLevels = lanes.map(
        (lane) => (Math.max(0, Math.min(8, Number(lane[i]) || 0)) / 8) * peak,
      )
      const seg: PatternSegment = {
        level: Math.max(level, ...motorLevels),
        ms: iv,
        motorLevels,
      }
      if (mask) seg.motorMask = mask
      return seg
    }
    const seg: PatternSegment = { level, ms: iv }
    if (mask) seg.motorMask = mask
    return seg
  })
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

export function patternTags(): string[] {
  const tags = new Set(PATTERNS.map((p) => p.tag || 'other'))
  tags.add('custom')
  return [...tags]
}
