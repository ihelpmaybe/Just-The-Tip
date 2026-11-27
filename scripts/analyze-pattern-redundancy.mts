/**
 * Audit pattern catalog for duplicate waveforms and overlapping pun bundles.
 *   npx tsx scripts/analyze-pattern-redundancy.mts
 */
import {
  CATALOG_PATTERNS,
  CATALOG_PATTERNS_ALL,
  GEMINI_PUN_PATTERNS,
  GEMINI_SPLIT_PATTERNS,
  VIBE_PUN_PATTERNS,
  CRYPTO_PUN_PATTERNS,
  RICHARD_HEART_PATTERNS,
  GARY_GENSLER_PATTERNS,
  STABLECOIN_THRUST_PATTERNS,
  ROTATE_PUN_PATTERNS,
  ROMAN_STORM_PATTERNS,
  FEATURE_FOCUS_PATTERNS,
  patternNeeds,
  type PatternDef,
} from '../shared/src/utils/patterns.ts'
import { patternFamily } from '../shared/src/utils/patternFit.ts'

const BUNDLES: { label: string; patterns: PatternDef[] }[] = [
  { label: 'core', patterns: CATALOG_PATTERNS },
  { label: 'gemini-pun', patterns: GEMINI_PUN_PATTERNS },
  { label: 'gemini-split', patterns: GEMINI_SPLIT_PATTERNS },
  { label: 'vibe-pun', patterns: VIBE_PUN_PATTERNS },
  { label: 'crypto-pun', patterns: CRYPTO_PUN_PATTERNS },
  { label: 'rotate-pun', patterns: ROTATE_PUN_PATTERNS },
  { label: 'richard-heart', patterns: RICHARD_HEART_PATTERNS },
  { label: 'gary-gensler', patterns: GARY_GENSLER_PATTERNS },
  { label: 'stablecoin-thrust', patterns: STABLECOIN_THRUST_PATTERNS },
  { label: 'roman-storm', patterns: ROMAN_STORM_PATTERNS },
  { label: 'feature-focus', patterns: FEATURE_FOCUS_PATTERNS },
]

function waveKey(p: PatternDef): string {
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
  const needs = patternNeeds(p).slice().sort().join('+')
  return `${interval};${strengths};${motors};${lanes};${needs}`
}

function bundleOf(id: string): string {
  for (const b of BUNDLES) {
    if (b.patterns.some((p) => p.id === id)) return b.label
  }
  return '?'
}

console.log('=== Pattern catalog audit ===\n')
console.log('Total live patterns:', CATALOG_PATTERNS_ALL.length)
console.log('\nBy bundle:')
for (const b of BUNDLES) {
  console.log(`  ${b.label.padEnd(18)} ${b.patterns.length}`)
}

const byWave = new Map<string, PatternDef[]>()
for (const p of CATALOG_PATTERNS_ALL) {
  const k = waveKey(p)
  if (!byWave.has(k)) byWave.set(k, [])
  byWave.get(k)!.push(p)
}

const waveDups = [...byWave.entries()]
  .filter(([, v]) => v.length > 1)
  .sort((a, b) => b[1].length - a[1].length)

console.log(`\nExact duplicate waveforms: ${waveDups.length} groups`)
for (const [, group] of waveDups.slice(0, 25)) {
  console.log(`\n  ${group.length}× same waveform:`)
  for (const p of group) {
    console.log(
      `    ${p.id.padEnd(28)} ${p.name.padEnd(24)} [${bundleOf(p.id)}] ${patternFamily(patternNeeds(p))} $${p.price}`,
    )
  }
}

// Pun-only patterns whose waveform already exists in core catalog
const coreWaves = new Set(CATALOG_PATTERNS.map(waveKey))
const punRedundant: PatternDef[] = []
for (const p of CATALOG_PATTERNS_ALL) {
  if (CATALOG_PATTERNS.some((c) => c.id === p.id)) continue
  if (coreWaves.has(waveKey(p))) punRedundant.push(p)
}
console.log(`\nPun/extra patterns duplicating a core waveform: ${punRedundant.length}`)
for (const p of punRedundant.slice(0, 30)) {
  console.log(`  ${p.id} · ${p.name} [${bundleOf(p.id)}]`)
}
if (punRedundant.length > 30) {
  console.log(`  … and ${punRedundant.length - 30} more`)
}

// Cross-pun redundancy (non-core dupes another non-core)
const nonCore = CATALOG_PATTERNS_ALL.filter(
  (p) => !CATALOG_PATTERNS.some((c) => c.id === p.id),
)
const nonCoreByWave = new Map<string, PatternDef[]>()
for (const p of nonCore) {
  const k = waveKey(p)
  if (!nonCoreByWave.has(k)) nonCoreByWave.set(k, [])
  nonCoreByWave.get(k)!.push(p)
}
const punOnlyDups = [...nonCoreByWave.entries()].filter(([, v]) => v.length > 1)
console.log(`\nDuplicate waveforms within pun bundles only: ${punOnlyDups.length} groups`)
for (const [, group] of punOnlyDups.slice(0, 15)) {
  console.log(`  ${group.map((p) => p.name).join(' / ')}`)
}
