import { CATALOG_PATTERNS_ALL, patternNeeds } from '../shared/src/utils/patterns.ts'
import { patternFamily } from '../shared/src/utils/patternFit.ts'

function key(p: typeof CATALOG_PATTERNS_ALL[0]) {
  return `${patternFamily(patternNeeds(p))};${(p.strengths || []).join(',')};${p.intervalMs}`
}

const byExact = new Map<string, typeof CATALOG_PATTERNS_ALL>()
for (const p of CATALOG_PATTERNS_ALL) {
  const k = key(p)
  if (!byExact.has(k)) byExact.set(k, [])
  byExact.get(k)!.push(p)
}

console.log('Exact strengths+interval+family duplicates:')
for (const [, g] of [...byExact.entries()].filter(([, v]) => v.length > 1)) {
  console.log('---')
  for (const p of g) console.log(`  ${p.id} · ${p.name}`)
}

function nearKey(p: typeof CATALOG_PATTERNS_ALL[0]) {
  return `${patternFamily(patternNeeds(p))};${(p.strengths || []).join(',')}`
}
const byShape = new Map<string, typeof CATALOG_PATTERNS_ALL>()
for (const p of CATALOG_PATTERNS_ALL) {
  const k = nearKey(p)
  if (!byShape.has(k)) byShape.set(k, [])
  byShape.get(k)!.push(p)
}
console.log('\nSame strengths+family (any interval):')
for (const [, g] of [...byShape.entries()].filter(([, v]) => v.length > 1).sort((a,b)=>b[1].length-a[1].length)) {
  console.log(`  ${g.map(p=>p.name).join(' / ')}`)
}
