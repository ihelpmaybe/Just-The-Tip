/**
 * Find patterns that feel nearly identical (not just exact wave-key dupes).
 *   npx tsx scripts/analyze-pattern-similarity.mts
 */
import {
  CATALOG_PATTERNS_ALL,
  patternNeeds,
  type PatternDef,
} from '../shared/src/utils/patterns.ts'
import { patternFamily } from '../shared/src/utils/patternFit.ts'

function dur(p: PatternDef): number {
  if (p.timeSec > 0) return p.timeSec
  return ((p.intervalMs || 400) * Math.max(1, p.strengths?.length || 1)) / 1000
}

function peak(p: PatternDef): number {
  return Math.max(0, ...(p.strengths || [0]))
}

function normStrengths(p: PatternDef): number[] {
  return (p.strengths || []).map((n) => Math.max(0, Math.min(8, Math.round(Number(n) || 0))))
}

/** Resample to fixed length for shape compare. */
function shapeVec(p: PatternDef, len = 12): number[] {
  const s = normStrengths(p)
  if (!s.length) return Array(len).fill(0)
  const out: number[] = []
  for (let i = 0; i < len; i++) {
    const t = (i / (len - 1)) * (s.length - 1)
    const lo = Math.floor(t)
    const hi = Math.min(s.length - 1, lo + 1)
    const f = t - lo
    out.push(s[lo]! * (1 - f) + s[hi]! * f)
  }
  return out
}

function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    na += a[i]! * a[i]!
    nb += b[i]! * b[i]!
  }
  if (!na || !nb) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

function stepDiff(a: PatternDef, b: PatternDef): number {
  const sa = normStrengths(a)
  const sb = normStrengths(b)
  const n = Math.max(sa.length, sb.length)
  let diff = Math.abs(sa.length - sb.length) * 2
  for (let i = 0; i < n; i++) {
    diff += Math.abs((sa[i] || 0) - (sb[i] || 0))
  }
  return diff
}

type Hit = {
  a: PatternDef
  b: PatternDef
  cosine: number
  stepDiff: number
  sameFamily: boolean
  durDelta: number
  peakMatch: boolean
}

const hits: Hit[] = []
for (let i = 0; i < CATALOG_PATTERNS_ALL.length; i++) {
  for (let j = i + 1; j < CATALOG_PATTERNS_ALL.length; j++) {
    const a = CATALOG_PATTERNS_ALL[i]!
    const b = CATALOG_PATTERNS_ALL[j]!
    const fa = patternFamily(patternNeeds(a))
    const fb = patternFamily(patternNeeds(b))
    if (fa !== fb) continue
    const va = shapeVec(a)
    const vb = shapeVec(b)
    const c = cosine(va, vb)
    const sd = stepDiff(a, b)
    const dd = Math.abs(dur(a) - dur(b))
    const pk = peak(a) === peak(b)
    // Near-clone: very similar shape OR tiny step edits at same peak/duration band
    const near =
      c >= 0.97 ||
      (c >= 0.92 && sd <= 6 && pk && dd <= 2) ||
      (sd <= 4 && pk && dd <= 1.5)
    if (near) {
      hits.push({
        a,
        b,
        cosine: c,
        stepDiff: sd,
        sameFamily: true,
        durDelta: dd,
        peakMatch: pk,
      })
    }
  }
}

hits.sort(
  (x, y) =>
    y.cosine - x.cosine || x.stepDiff - y.stepDiff || x.durDelta - y.durDelta,
)

console.log(`Near-duplicate pairs (same family): ${hits.length}\n`)
for (const h of hits.slice(0, 40)) {
  console.log(
    [
      `${h.a.name} (${h.a.id})`,
      '↔',
      `${h.b.name} (${h.b.id})`,
      `[${patternFamily(patternNeeds(h.a))}]`,
      `cos=${h.cosine.toFixed(3)}`,
      `Δsteps=${h.stepDiff}`,
      `Δdur=${h.durDelta.toFixed(1)}s`,
      `peak=${peak(h.a)}`,
    ].join(' '),
  )
}

// Clusters (union-find lite)
const parent = new Map<string, string>()
function find(id: string): string {
  const p = parent.get(id) || id
  if (p !== id) return find(p)
  return id
}
function unite(a: string, b: string) {
  parent.set(find(a), find(b))
}
for (const h of hits) unite(h.a.id, h.b.id)
const clusters = new Map<string, PatternDef[]>()
for (const p of CATALOG_PATTERNS_ALL) {
  if (!parent.has(p.id)) continue
  const root = find(p.id)
  if (!clusters.has(root)) clusters.set(root, [])
  clusters.get(root)!.push(p)
}
const big = [...clusters.values()].filter((c) => c.length >= 3).sort((a, b) => b.length - a.length)
console.log(`\nClusters (3+ similar): ${big.length}`)
for (const c of big.slice(0, 10)) {
  console.log(`  ${c.length}: ${c.map((p) => p.name).join(' · ')}`)
}
