/**
 * Test must fire one tip per linked toy, including duplicate models.
 *
 *   npx tsx scripts/verify-test-coverage.mts
 */
import {
  defaultPatternPrices,
  sampleSimTipJob,
  testSimTipJobs,
} from '../shared/src/utils/pricing.ts'
import { toyDiscriminator } from '../src/ui/toys.ts'
import { extractMacAddress } from '../src/device/webBluetooth.ts'

const prices = defaultPatternPrices()

const toys = [
  {
    id: 'ble-nora-1',
    name: 'LVS-Nora',
    toyType: 'nora',
    motors: 1,
    connected: true,
    functions: ['Vibrate', 'Rotate'],
    secondary: { rotate: true, air: false, pump: false, thrust: false },
    extra: { mac: '90:AB:96:B8:05:40' },
  },
  {
    id: 'ble-nora-2',
    name: 'LVS-Nora',
    toyType: 'nora',
    motors: 1,
    connected: true,
    functions: ['Vibrate', 'Rotate'],
    secondary: { rotate: true, air: false, pump: false, thrust: false },
    extra: { mac: '6C:5C:B1:8C:A9:FB' },
  },
  {
    id: 'ble-lush-1',
    name: 'LVS-Lush',
    toyType: 'lush',
    motors: 1,
    connected: true,
  },
]

const opts = { prices, disabled: [], toyPrices: {}, toys, minAmount: 0 }

let failed = 0
function ok(name: string, cond: boolean, detail = '') {
  if (cond) console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`)
  else {
    failed++
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

console.log('\n=== Test coverage across toys ===')

for (let run = 0; run < 25; run++) {
  const jobs = testSimTipJobs(opts)
  const ids = [...new Set(jobs.map((j) => j.toyId))].sort()
  if (ids.length !== toys.length) {
    ok(`run ${run} covers every toy`, false, JSON.stringify(ids))
    break
  }
  if (run === 24) ok('25 runs each cover all 3 toys', true)
}

const single = sampleSimTipJob(opts)
ok('Fake a tip still targets one toy', Boolean(single?.toyId), single?.toyId)

const tag1 = toyDiscriminator(toys[0] as never)
const tag2 = toyDiscriminator(toys[1] as never)
ok('duplicate Noras get different tags', Boolean(tag1) && tag1 !== tag2, `${tag1} vs ${tag2}`)

const noMac = toyDiscriminator({ id: 'ble-lush-abcdef', name: 'x' } as never)
ok('id fallback tag when no MAC', noMac.length > 0, noMac)

ok(
  'extract MAC from Chrome chooser name',
  extractMacAddress('LVS-Nora (6C:5C:B1:8C:A9:FB)') === '6C:5C:B1:8C:A9:FB',
)
ok(
  'extract packed MAC',
  extractMacAddress('C:39:90AB96B80540') === '90:AB:96:B8:05:40',
)
ok(
  'single Nora still gets a MAC tag',
  toyDiscriminator({
    id: 'x',
    name: 'Nora',
    extra: { mac: '90:AB:96:B8:05:40' },
  } as never) === '0540',
)

console.log(`\nPASS/FAIL — failures: ${failed}\n`)
process.exit(failed ? 1 : 0)
