import { CATALOG_PATTERNS_ALL, patternNeeds } from '../shared/src/utils/patterns.ts'
import { patternFamily } from '../shared/src/utils/patternFit.ts'

function strengthKey(p: typeof CATALOG_PATTERNS_ALL[0]) {
  return (p.strengths || []).join(',')
}

const byStrength = new Map<string, typeof CATALOG_PATTERNS_ALL>()
for (const p of CATALOG_PATTERNS_ALL) {
  const k = `${patternFamily(patternNeeds(p))};${strengthKey(p)}`
  if (!byStrength.has(k)) byStrength.set(k, [])
  byStrength.get(k)!.push(p)
}
const sameShape = [...byStrength.entries()].filter(([, v]) => v.length > 1)
console.log('Same strengths+family (may differ interval):', sameShape.length)
for (const [, group] of sameShape.sort((a, b) => b[1].length - a[1].length).slice(0, 20)) {
  console.log(`  ${group.length}x: ${group.map((p) => p.id).join(', ')}`)
}
