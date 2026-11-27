/**
 * Haptic archetypes (Lovense + Immersion/DRV2605 families).
 * Reshapes catalog waveforms while keeping id / name / blurb / price.
 */
import {
  normalizeNeeds,
  patternFamily,
  type ChannelNeed,
  type ToyFamily,
} from './patternFit'
import type { PatternDef, StepMotorCode } from './patterns'

function resolveNeeds(p: PatternDef): ChannelNeed[] {
  if (Array.isArray(p.needs)) return normalizeNeeds(p.needs)
  return []
}

export type VibeArchetype =
  | 'tick'
  | 'doubleClick'
  | 'rampUp'
  | 'rampDown'
  | 'plateau'
  | 'pulseTrain'
  | 'wave'
  | 'hum'
  | 'burstCluster'
  | 'fakeout'
  | 'strobe'
  | 'chaos'
  | 'longArc'
  | 'heartbeat'
  | 'bounce'
  | 'teaseFlutter'

export type RotateArchetype =
  | 'nudge'
  | 'lap'
  | 'pulseSpin'
  | 'accelerate'
  | 'decelerate'
  | 'wobble'
  | 'holdSpin'
  | 'strobeSpin'

export type ThrustArchetype =
  | 'stroke'
  | 'staccato'
  | 'climb'
  | 'clamp'
  | 'emergency'
  | 'pulseThrust'

export type MultiArchetype =
  | 'mirrorSoft'
  | 'mirrorPulse'
  | 'mirrorClimb'
  | 'mirrorHold'
  | 'counterPhase'
  | 'callResponse'
  | 'stagger'
  | 'chaseStereo'
  | 'hotCold'
  | 'soloLeft'
  | 'soloRight'
  | 'scissor'

export type PatternArchetype =
  | VibeArchetype
  | RotateArchetype
  | ThrustArchetype
  | MultiArchetype

type Tier = 'cheap' | 'mid' | 'high' | 'whale'

type BuiltWave = {
  strengths: number[]
  intervalMs: number
  stepMotors?: StepMotorCode[]
  motorStrengths?: number[][]
}

const SKIP_TAGS = new Set(['science', 'feature'])

function hashSeed(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h >>> 0)
}

function rng(seed: number) {
  let s = seed || 1
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function clamp8(n: number): number {
  return Math.max(0, Math.min(8, Math.round(n)))
}

function finish(strengths: number[]): number[] {
  const out = strengths.map(clamp8)
  if (!out.length || out[out.length - 1] !== 0) out.push(0)
  return out
}

/** Per-pattern jitter so same archetype + tier still diverges. */
function uniquifyStrengths(strengths: number[], seed: number): number[] {
  return strengths.map((v, i) => {
    if (v === 0) return 0
    const h = Math.imul(seed + i * 374761393, 668265263) >>> 0
    const jitter = (h % 5) - 2
    return clamp8(v + jitter)
  })
}

function waveSignature(w: BuiltWave): string {
  return JSON.stringify({
    s: w.strengths,
    m: w.motorStrengths,
    t: w.stepMotors,
    i: w.intervalMs,
  })
}

function poolForFamily(family: ToyFamily, splitMulti: boolean): PatternArchetype[] {
  if (family === 'multi' && splitMulti) return MULTI_POOL
  if (family === 'rotate') return ROTATE_POOL
  if (family === 'thrust' || family === 'air') return THRUST_POOL
  return VIBE_POOL
}

function tierFromPrice(price: number): Tier {
  if (price < 2000) return 'cheap'
  if (price < 10000) return 'mid'
  if (price < 25000) return 'high'
  return 'whale'
}

function peakForTier(tier: Tier, seed: number): number {
  const base = tier === 'cheap' ? 4 : tier === 'mid' ? 6 : tier === 'high' ? 7 : 8
  const raw = clamp8(base + (seed % 5) - 2)
  if (tier === 'cheap') return Math.min(raw, 5)
  return raw
}

function stepCountForTier(tier: Tier, seed: number, min: number, max: number): number {
  const span = max - min + 1
  return min + (seed % span) + (tier === 'whale' ? 2 : tier === 'high' ? 1 : 0)
}

function textBlob(p: PatternDef): string {
  return `${p.id} ${p.name} ${p.blurb}`.toLowerCase()
}

function pickKeyword(text: string, rules: [RegExp, PatternArchetype][]): PatternArchetype | null {
  for (const [re, arch] of rules) {
    if (re.test(text)) return arch
  }
  return null
}

const VIBE_KEYWORDS: [RegExp, VibeArchetype][] = [
  [/\bflash\b|\btick\b|\bspark\b|\bhello\b|\bcontact\b|\bshort blast\b/, 'tick'],
  [/\bwink\b|\bdouble\b|\bpeeks\b|\blub.?dub\b|\bpaired\b|\btwo soft\b/, 'doubleClick'],
  [/\bheartbeat\b|\bthrob\b|\blub\b|\bdub\b/, 'heartbeat'],
  [/\bgod candle\b|\bramp\b|\bgenesis\b|\bcompounding\b|\bclimb\b|\bbreakout\b|\b100x\b/, 'rampUp'],
  [/\bslow rug\b|\brug pull\b|\bfade\b|\bhalving\b|\bcapitulation\b|\bcollapse\b|\bdump\b/, 'rampDown'],
  [/\bath\b|\bstaked\b|\bhold\b|\bplateau\b|\bnode\b|\bfull node\b|\bpos\b|\bproof of stake\b/, 'plateau'],
  [/\bdca\b|\bpulse train\b|\bgreen candle\b|\bpulsechain\b|\bliq\b|\bcascade\b|\benigma\b/, 'pulseTrain'],
  [/\bwave\b|\bripple\b|\broll\b|\bvibrafi\b|\bvibenomics\b|\bdecentralized\b/, 'wave'],
  [/\bhum\b|\bnuzzle\b|\bkrause\b|\bsteady mid\b|\bswell\b|\barousal\b/, 'hum'],
  [/\bfireworks\b|\bburst\b|\bwhale\b|\bblock reward\b|\bcluster\b|\bsupernova\b|\bflash loan\b/, 'burstCluster'],
  [/\bfakeout\b|\bstop hunt\b|\bdead cat\b|\btease\b|\bdesist\b|\bwick\b/, 'fakeout'],
  [/\bgas wars\b|\bbrrrr\b|\bhigh frequency\b|\bmachine.?gun\b|\bstrobe\b|\bdegen\b/, 'strobe'],
  [/\bvolatility\b|\bchaos\b|\bslippage\b|\birregular\b|\bunpredictable\b|\bmax slip\b/, 'chaos'],
  [/\blong\b|\bsuite\b|\bfull send\b|\bexit liq\b|\bwhale alert\b|\bbuild\b|\barc\b/, 'longArc'],
  [/\bbounce\b|\belastic\b|\bpump.?&?\b/, 'bounce'],
  [/\bflutter\b|\bon.?off\b|\btease &\b/, 'teaseFlutter'],
  [/\bsqueeze\b|\bpop\b|\bcompress\b|\bvibe squeeze\b/, 'burstCluster'],
  [/\bedge\b|\bpermissionless\b/, 'plateau'],
]

const ROTATE_KEYWORDS: [RegExp, RotateArchetype][] = [
  [/\bnudge\b|\bsoft\b|\bquiet\b|\bzk\b/, 'nudge'],
  [/\blap\b|\bcircle\b|\b360\b|\bblock\b|\bround trip\b|\bcircuit\b/, 'lap'],
  [/\bpulse\b|\bon\/off\b|\bdeadlock\b|\bhung\b|\bspin then stop\b/, 'pulseSpin'],
  [/\bsupercycle\b|\baccelerat\b|\bdeath spiral\b|\btornado\b|\bunlicensed\b/, 'accelerate'],
  [/\bdecelerat\b|\bunwind\b|\bunravel\b/, 'decelerate'],
  [/\bwobble\b|\bsector\b|\bshift\b|\bcorkscrew\b|\btwist\b/, 'wobble'],
  [/\bperpetual\b|\bnever.?stop\b|\bimmutable\b|\blocked forever\b/, 'holdSpin'],
  [/\bhigh turnover\b|\bquick\b|\brpm\b|\bredline\b/, 'strobeSpin'],
  [/\bvortex\b|\bwhirl\b|\bstorm\b|\bdeposit\b/, 'lap'],
]

const THRUST_KEYWORDS: [RegExp, ThrustArchetype][] = [
  [/\bsoft\b|\bsteady\b|\bmaintain\b|\bstable\b|\bpeg algorithm\b/, 'stroke'],
  [/\bstaccato\b|\bmint\b|\bpulse\b|\bpressure\b/, 'pulseThrust'],
  [/\bclimb\b|\bpar\b|\brecovery\b|\bthrust to\b|\bda[iy] harder\b/, 'climb'],
  [/\bclamp\b|\bpegged\b|\bhard peg\b|\bbacked\b|\bhold\b|\btethered\b/, 'clamp'],
  [/\bemergency\b|\bdepeg\b|\bcrash\b|\bbust\b|\bdollar.?peg punch\b/, 'emergency'],
  [/\bdesist\b|\bcease\b|\bfull stroke\b/, 'staccato'],
]

const MULTI_KEYWORDS: [RegExp, MultiArchetype][] = [
  [/\bl.?rug\b|\bleft rugs\b|\bsolo.*left\b/, 'soloLeft'],
  [/\br.?rug\b|\bright rugs\b|\bsolo.*right\b/, 'soloRight'],
  [/\barbitrage\b|\bcrossfade\b|\bbalance\b|\bdual liquidity\b|\bas one rises\b/, 'counterPhase'],
  [/\bcall\b|\bresponse\b|\bvalidator\b|\bproposes\b|\bconfirms\b/, 'callResponse'],
  [/\bstagger\b|\btwin peak\b|\byield\b|\bdouble yield\b/, 'stagger'],
  [/\bchase\b|\bstereo ping\b|\bpulse pair\b|\balternate\b|\bl \/ r\b/, 'chaseStereo'],
  [/\bhot.?cold\b|\bnipple\b|\bwarm hold\b|\bcold tap\b/, 'hotCold'],
  [/\bscissor\b|\bcrossing\b|\bliquidity pair\b|\bphase.?offset\b|\borbit\b|\bhex\b/, 'scissor'],
  [/\bshort squeeze\b|\bpressure\b|\bpop\b/, 'mirrorPulse'],
  [/\bstaked\b|\bhold\b|\bassets\b/, 'mirrorHold'],
  [/\bsprinkle\b|\bsoft\b|\bproof of tits\b/, 'mirrorSoft'],
  [/\bclamp\b|\bpump\b|\bdesync\b|\bimbalance\b|\btwin pump\b/, 'hotCold'],
  [/\becho\b|\bpair of assets\b|\bheartbeat\b/, 'callResponse'],
  [/\bbuild\b|\bclimb\b/, 'mirrorClimb'],
]

const VIBE_POOL: VibeArchetype[] = [
  'tick',
  'doubleClick',
  'rampUp',
  'rampDown',
  'plateau',
  'pulseTrain',
  'wave',
  'hum',
  'burstCluster',
  'fakeout',
  'strobe',
  'chaos',
  'longArc',
  'heartbeat',
  'bounce',
  'teaseFlutter',
]

const ROTATE_POOL: RotateArchetype[] = [
  'nudge',
  'lap',
  'pulseSpin',
  'accelerate',
  'decelerate',
  'wobble',
  'holdSpin',
  'strobeSpin',
]

const THRUST_POOL: ThrustArchetype[] = [
  'stroke',
  'staccato',
  'climb',
  'clamp',
  'emergency',
  'pulseThrust',
]

const MULTI_POOL: MultiArchetype[] = [
  'mirrorSoft',
  'mirrorPulse',
  'mirrorClimb',
  'mirrorHold',
  'counterPhase',
  'callResponse',
  'stagger',
  'chaseStereo',
  'hotCold',
  'soloLeft',
  'soloRight',
  'scissor',
]

export function inferArchetype(p: PatternDef, family: ToyFamily): PatternArchetype {
  const text = textBlob(p)
  if (family === 'multi' && p.motorStrengths?.length) {
    return pickKeyword(text, MULTI_KEYWORDS) ?? MULTI_POOL[hashSeed(p.id) % MULTI_POOL.length]!
  }
  if (family === 'rotate') {
    return pickKeyword(text, ROTATE_KEYWORDS) ?? ROTATE_POOL[hashSeed(p.id) % ROTATE_POOL.length]!
  }
  if (family === 'thrust' || family === 'air') {
    return pickKeyword(text, THRUST_KEYWORDS) ?? THRUST_POOL[hashSeed(p.id) % THRUST_POOL.length]!
  }
  return pickKeyword(text, VIBE_KEYWORDS) ?? VIBE_POOL[hashSeed(p.id) % VIBE_POOL.length]!
}

function buildVibe(arch: VibeArchetype, seed: number, tier: Tier): BuiltWave {
  const rand = rng(seed)
  const peak = peakForTier(tier, seed)
  const n = stepCountForTier(tier, seed, 4, 10)
  let strengths: number[] = []
  let intervalMs = 280 + Math.round(rand() * 180)

  switch (arch) {
    case 'tick':
      strengths = [0, clamp8(peak - 1), clamp8(peak), 0]
      intervalMs = 220 + (seed % 80)
      break
    case 'doubleClick':
      strengths = [0, clamp8(peak - 1), 0, 0, peak, 0]
      intervalMs = 260 + (seed % 60)
      break
    case 'rampUp': {
      const steps = n + 2
      for (let i = 0; i < steps; i++) {
        strengths.push(clamp8((i / (steps - 1)) * peak))
      }
      intervalMs = 300 + (seed % 100)
      break
    }
    case 'rampDown': {
      for (let i = 0; i < n; i++) {
        strengths.push(clamp8(peak - (i / (n - 1)) * peak))
      }
      intervalMs = 380 + (seed % 120)
      break
    }
    case 'plateau': {
      const climb = Math.max(2, Math.floor(n / 3))
      for (let i = 0; i < climb; i++) strengths.push(clamp8(2 + (i / climb) * (peak - 2)))
      for (let i = 0; i < Math.max(2, n - climb - 1); i++) strengths.push(peak)
      strengths.push(clamp8(peak - 2), 1)
      intervalMs = 400 + (seed % 80)
      break
    }
    case 'pulseTrain': {
      const pulses = 4 + (seed % 4)
      for (let i = 0; i < pulses; i++) {
        strengths.push(0, clamp8(peak - (i % 2)))
      }
      intervalMs = 280 + (seed % 140)
      break
    }
    case 'wave': {
      const len = n + 4
      for (let i = 0; i < len; i++) {
        const t = (i / (len - 1)) * Math.PI * 2
        strengths.push(clamp8(2 + ((Math.sin(t) + 1) / 2) * (peak - 2)))
      }
      intervalMs = 320 + (seed % 100)
      break
    }
    case 'hum': {
      const len = n + 2
      for (let i = 0; i < len; i++) {
        const t = i / (len - 1)
        const bell = Math.exp(-Math.pow((t - 0.5) * 3, 2))
        strengths.push(clamp8(2 + bell * (peak - 2)))
      }
      intervalMs = 450 + (seed % 150)
      break
    }
    case 'burstCluster': {
      const clusters = 2 + (seed % 2)
      for (let c = 0; c < clusters; c++) {
        strengths.push(0, clamp8(peak - 1), peak, clamp8(peak - 2), 0, 0)
      }
      intervalMs = 240 + (seed % 80)
      break
    }
    case 'fakeout':
      strengths = [
        clamp8(peak - 2),
        clamp8(peak - 1),
        1,
        0,
        clamp8(peak - 1),
        peak,
        clamp8(peak - 2),
      ]
      intervalMs = 320 + (seed % 80)
      break
    case 'strobe': {
      const flashes = 6 + (seed % 4)
      for (let i = 0; i < flashes; i++) {
        strengths.push(0, clamp8(peak - (i % 2)))
      }
      intervalMs = 180 + (seed % 50)
      break
    }
    case 'chaos': {
      for (let i = 0; i < n + 3; i++) {
        strengths.push(clamp8(1 + rand() * peak))
      }
      intervalMs = 260 + (seed % 80)
      break
    }
    case 'longArc': {
      const len = n + 6
      for (let i = 0; i < len; i++) {
        const t = i / (len - 1)
        let v = t < 0.7 ? t / 0.7 : 1 - (t - 0.7) / 0.3
        strengths.push(clamp8(1 + v * (peak - 1)))
      }
      intervalMs = 350 + (seed % 100)
      break
    }
    case 'heartbeat': {
      const cycles = 2 + (seed % 3)
      for (let c = 0; c < cycles; c++) {
        const lead = clamp8(peak - 1 - (c % 2))
        const dub = clamp8(peak - 2 - (c % 2))
        strengths.push(lead, clamp8(peak - 3), 0, 0, dub, clamp8(peak - 2), 0, 0)
      }
      intervalMs = 260 + (seed % 40)
      break
    }
    case 'bounce':
      for (let i = 0; i < n; i++) {
        strengths.push(clamp8(2 + ((i % 2) + 0.5) * (peak - 3)))
      }
      intervalMs = 300 + (seed % 60)
      break
    case 'teaseFlutter':
      for (let i = 0; i < n + 2; i++) {
        strengths.push(i % 2 === 0 ? 0 : clamp8(peak - (i % 3)))
      }
      intervalMs = 300 + (seed % 70)
      break
  }

  return { strengths: finish(strengths), intervalMs: Math.max(120, intervalMs) }
}

function buildRotate(arch: RotateArchetype, seed: number, tier: Tier): BuiltWave {
  const peak = peakForTier(tier, seed)
  const n = stepCountForTier(tier, seed, 4, 8)
  let strengths: number[] = []
  let intervalMs = 1500 + (seed % 400)

  switch (arch) {
    case 'nudge':
      strengths = Array.from({ length: n }, (_, i) => clamp8(2 + (i % 2)))
      intervalMs = 1600 + (seed % 200)
      break
    case 'lap':
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1)
        strengths.push(clamp8(2 + Math.sin(t * Math.PI) * (peak - 2)))
      }
      intervalMs = 1700 + (seed % 300)
      break
    case 'pulseSpin':
      for (let i = 0; i < n + 2; i++) {
        strengths.push(i % 2 === 0 ? 0 : peak)
        if (i % 2 === 1) strengths.push(0, 0)
      }
      intervalMs = 1400 + (seed % 200)
      break
    case 'accelerate':
      for (let i = 0; i < n; i++) {
        strengths.push(clamp8(1 + (i / (n - 1)) * peak))
      }
      intervalMs = 1400 + (seed % 250)
      break
    case 'decelerate':
      for (let i = 0; i < n; i++) {
        strengths.push(clamp8(peak - (i / (n - 1)) * (peak - 1)))
      }
      intervalMs = 1500 + (seed % 250)
      break
    case 'wobble':
      for (let i = 0; i < n + 2; i++) {
        strengths.push(clamp8(peak - 2 + (i % 3)))
      }
      intervalMs = 1550 + (seed % 200)
      break
    case 'holdSpin':
      strengths = Array.from({ length: n }, () => clamp8(peak - (seed % 2)))
      intervalMs = 1600 + (seed % 200)
      break
    case 'strobeSpin':
      for (let i = 0; i < n + 1; i++) {
        strengths.push(0, peak)
      }
      intervalMs = 1400 + (seed % 150)
      break
  }

  return { strengths: finish(strengths), intervalMs: Math.max(1400, intervalMs) }
}

function buildThrust(arch: ThrustArchetype, seed: number, tier: Tier): BuiltWave {
  const peak = peakForTier(tier, seed)
  const n = stepCountForTier(tier, seed, 4, 8)
  let strengths: number[] = []
  let intervalMs = 1500 + (seed % 350)

  switch (arch) {
    case 'stroke':
      strengths = Array.from({ length: n }, (_, i) => clamp8(3 + (i % 2)))
      intervalMs = 1700 + (seed % 200)
      break
    case 'staccato':
      for (let i = 0; i < n; i++) {
        strengths.push(0, peak)
      }
      intervalMs = 1400 + (seed % 200)
      break
    case 'climb':
      for (let i = 0; i < n; i++) {
        strengths.push(clamp8(1 + (i / (n - 1)) * peak))
      }
      intervalMs = 1800 + (seed % 200)
      break
    case 'clamp':
      strengths = [peak, peak, peak, clamp8(peak - 3), clamp8(peak - 5)]
      intervalMs = 1500 + (seed % 300)
      break
    case 'emergency':
      strengths = [peak, 0, 0, peak, peak, clamp8(peak - 2)]
      intervalMs = 1400 + (seed % 200)
      break
    case 'pulseThrust':
      for (let i = 0; i < n + 1; i++) {
        strengths.push(0, clamp8(peak - (i % 2)))
      }
      intervalMs = 1500 + (seed % 200)
      break
  }

  return { strengths: finish(strengths), intervalMs: Math.max(1400, intervalMs) }
}

function buildMulti(arch: MultiArchetype, seed: number, tier: Tier): BuiltWave {
  const peak = peakForTier(tier, seed)
  const n = stepCountForTier(tier, seed, 5, 9)
  const vibe = buildVibe('wave', seed + 1, tier)
  let m1: number[] = []
  let m2: number[] = []
  let intervalMs = vibe.intervalMs

  switch (arch) {
    case 'mirrorSoft':
      m1 = Array.from({ length: n }, (_, i) => clamp8(2 + (i % 3)))
      m2 = [...m1]
      intervalMs = 350 + (seed % 80)
      break
    case 'mirrorPulse':
      for (let i = 0; i < n; i++) {
        m1.push(i % 2 === 0 ? 0 : peak)
        m2.push(m1[m1.length - 1]!)
      }
      intervalMs = 300 + (seed % 80)
      break
    case 'mirrorClimb':
      for (let i = 0; i < n; i++) {
        const v = clamp8(1 + (i / (n - 1)) * peak)
        m1.push(v)
        m2.push(v)
      }
      intervalMs = 360 + (seed % 80)
      break
    case 'mirrorHold':
      m1 = Array.from({ length: n }, () => clamp8(peak - (seed % 2)))
      m2 = [...m1]
      intervalMs = 450 + (seed % 100)
      break
    case 'counterPhase':
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1)
        m1.push(clamp8(1 + t * peak))
        m2.push(clamp8(1 + (1 - t) * peak))
      }
      intervalMs = 380 + (seed % 80)
      break
    case 'callResponse':
      m1 = [peak, 0, 0, 0, clamp8(peak - 1), 0, 0]
      m2 = [0, 0, clamp8(peak - 2), 0, 0, 0, clamp8(peak - 1)]
      intervalMs = 320 + (seed % 60)
      break
    case 'stagger':
      m1 = [2, 5, peak, 5, 2, 0, 0, 0]
      m2 = [0, 0, 0, 2, 5, peak, 5, 0]
      intervalMs = 340 + (seed % 60)
      break
    case 'chaseStereo':
      for (let i = 0; i < n; i++) {
        m1.push(i % 2 === 0 ? peak : 0)
        m2.push(i % 2 === 0 ? 0 : clamp8(peak - 1))
      }
      intervalMs = 300 + (seed % 60)
      break
    case 'hotCold':
      m1 = Array.from({ length: n }, () => clamp8(peak - 2))
      for (let i = 0; i < n; i++) m2.push(i % 2 === 0 ? 0 : peak)
      intervalMs = 330 + (seed % 70)
      break
    case 'soloLeft':
      for (let i = 0; i < n; i++) {
        m1.push(clamp8(2 + (i % 4)))
        m2.push(0)
      }
      intervalMs = 320 + (seed % 60)
      break
    case 'soloRight':
      for (let i = 0; i < n; i++) {
        m1.push(0)
        m2.push(clamp8(2 + (i % 4)))
      }
      intervalMs = 320 + (seed % 60)
      break
    case 'scissor':
      for (let i = 0; i < n + 1; i++) {
        const t = i / n
        m1.push(clamp8(1 + t * peak))
        m2.push(clamp8(1 + (1 - t) * peak))
      }
      intervalMs = 350 + (seed % 80)
      break
  }

  m1 = finish(m1)
  m2 = finish(m2)
  const len = Math.max(m1.length, m2.length)
  while (m1.length < len) m1.push(0)
  while (m2.length < len) m2.push(0)
  const strengths = m1.map((a, i) => Math.max(a, m2[i]!))

  return {
    strengths,
    intervalMs,
    motorStrengths: [m1, m2],
  }
}

function buildChaseStepMotors(seed: number, tier: Tier): BuiltWave {
  const peak = peakForTier(tier, seed)
  const n = 6 + (seed % 3)
  const strengths: number[] = []
  const stepMotors: StepMotorCode[] = []
  for (let i = 0; i < n; i++) {
    strengths.push(i % 2 === 0 ? 0 : peak)
    stepMotors.push(i % 2 === 0 ? 0 : ((i % 4 === 1 ? 1 : 2) as StepMotorCode))
  }
  return {
    strengths: finish(uniquifyStrengths(strengths, seed)),
    intervalMs: Math.max(1400, 1500 + (seed % 200)),
    stepMotors,
  }
}

function buildWaveform(
  p: PatternDef,
  family: ToyFamily,
  archetype: PatternArchetype,
  attemptOffset = 0,
): BuiltWave {
  const seed = hashSeed(p.id) + attemptOffset * 2654435761
  const tier = tierFromPrice(p.price)

  let built: BuiltWave
  if (p.stepMotors?.some((c) => c === 1 || c === 2)) {
    built = buildChaseStepMotors(seed, tier)
  } else if (family === 'multi' && (p.motorStrengths?.length || p.needs?.includes('multi'))) {
    if (p.motorStrengths?.length) {
      built = buildMulti(archetype as MultiArchetype, seed, tier)
    } else {
      const vibe = buildVibe(archetype as VibeArchetype, seed, tier)
      const n = vibe.strengths.length
      built = {
        ...vibe,
        stepMotors: Array.from({ length: n }, (_, i) =>
          i % 2 === 0 ? 1 : 2,
        ) as StepMotorCode[],
      }
    }
  } else if (family === 'rotate') {
    built = buildRotate(archetype as RotateArchetype, seed, tier)
  } else if (family === 'thrust' || family === 'air') {
    built = buildThrust(archetype as ThrustArchetype, seed, tier)
  } else {
    built = buildVibe(archetype as VibeArchetype, seed, tier)
  }

  built = {
    ...built,
    strengths: finish(uniquifyStrengths(built.strengths, seed)),
    motorStrengths: built.motorStrengths?.map((lane) =>
      finish(uniquifyStrengths(lane, seed + lane.length)),
    ),
  }
  return built
}

const ARCHETYPE_PACK_PREFIXES = [
  'crypto-',
  'rh-',
  'gg-',
  'storm-',
  'spin-',
  'peg-',
  'gemini-',
  'vibe-',
] as const

function shouldSkipArchetypeApply(p: PatternDef): boolean {
  if (p.kind === 'preset') return true
  if (SKIP_TAGS.has(p.tag || '')) return true
  const id = p.id || ''
  if (!ARCHETYPE_PACK_PREFIXES.some((pre) => id.startsWith(pre))) return true
  return false
}

/** Apply industry haptic archetypes; keeps metadata, replaces waveform. */
export function applyHapticArchetypes(patterns: PatternDef[]): PatternDef[] {
  const usedKeys = new Set<string>()
  const builtById = new Map<string, PatternDef>()

  const candidates = patterns
    .map((p) => ({ p }))
    .filter(({ p }) => !shouldSkipArchetypeApply(p))

  const sorted = [...candidates].sort((a, b) => {
    const fa = patternFamily(resolveNeeds(a.p))
    const fb = patternFamily(resolveNeeds(b.p))
    return fa.localeCompare(fb) || a.p.id.localeCompare(b.p.id)
  })

  const slotById = new Map<string, number>()
  sorted.forEach(({ p }, slot) => slotById.set(p.id, slot))

  for (const { p } of sorted) {
    const family = patternFamily(resolveNeeds(p))
    const splitMulti = !!p.motorStrengths?.length
    const pool = poolForFamily(family, splitMulti)
    const slot = slotById.get(p.id) ?? 0
    let archetype = inferArchetype(p, family)
    let built = buildWaveform(p, family, archetype, slot)
    let sig = waveSignature(built)
    let attempts = 0

    while (usedKeys.has(sig) && attempts < pool.length * 4) {
      attempts++
      archetype = pool[(pool.indexOf(archetype) + 1) % pool.length]!
      built = buildWaveform(p, family, archetype, slot + attempts * 997)
      sig = waveSignature(built)
    }
    usedKeys.add(sig)

    const timeSec = Math.max(
      1,
      Math.round((built.strengths.length * built.intervalMs) / 1000),
    )

    const next: PatternDef = {
      ...p,
      strengths: built.strengths,
      intervalMs: built.intervalMs,
      timeSec,
    }
    if (built.stepMotors) next.stepMotors = built.stepMotors
    else delete next.stepMotors
    if (built.motorStrengths) next.motorStrengths = built.motorStrengths
    else delete next.motorStrengths
    builtById.set(p.id, next)
  }

  return patterns.map((p) => builtById.get(p.id) ?? p)
}
