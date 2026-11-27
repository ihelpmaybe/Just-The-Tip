/**
 * Last-linked toys must survive an empty live poll (reload before reconnect).
 *
 *   npx tsx scripts/verify-saved-toys.mts
 */
import type { DeviceToy } from '../shared/src/types/device.ts'
import {
  mergeLiveWithSavedToys,
  normalizeSavedToys,
  toysForTipMenu,
  upsertSavedToys,
} from '../shared/src/utils/tipFilterToys.ts'
import { LovenseWebBluetooth } from '../src/device/webBluetooth.ts'

let failed = 0

function pass(name: string) {
  console.log(`  PASS  ${name}`)
}
function fail(name: string, detail: string) {
  failed += 1
  console.error(`  FAIL  ${name} — ${detail}`)
}

function toy(
  partial: Pick<DeviceToy, 'id' | 'name'> & Partial<DeviceToy>,
): DeviceToy {
  return {
    source: 'bluetooth',
    connected: true,
    status: 'online',
    ...partial,
  }
}

const nora = toy({
  id: 'ble-nora',
  name: 'Nora',
  toyType: 'nora',
  extra: { mac: '90:AB:96:B8:05:40' },
})
const lush = toy({
  id: 'ble-lush',
  name: 'Lush',
  toyType: 'lush',
})

console.log('\n=== verify saved toys ===\n')

const saved = upsertSavedToys([nora, lush], [])
if (saved.length === 2) pass('upsert keeps live hardware')
else fail('upsert keeps live hardware', `len=${saved.length}`)

const afterReload = upsertSavedToys([], saved)
if (afterReload.length === 2) pass('empty live poll does not drop roster')
else fail('empty live poll does not drop roster', `len=${afterReload.length}`)
if (afterReload.every((t) => t.connected === false && t.status === 'offline')) {
  pass('roster is offline until reconnect')
} else fail('roster is offline until reconnect', JSON.stringify(afterReload))

const merged = mergeLiveWithSavedToys([], afterReload)
if (merged.map((t) => t.id).sort().join() === 'ble-lush,ble-nora') {
  pass('merge restores both toys with no live inventory')
} else fail('merge restores both toys with no live inventory', merged.map((t) => t.id).join())

const liveAgain = mergeLiveWithSavedToys(
  [toy({ id: 'ble-nora', name: 'Nora', extra: { mac: '90:AB:96:B8:05:40' } })],
  afterReload,
)
const noraLive = liveAgain.find((t) => t.id === 'ble-nora')
const lushOff = liveAgain.find((t) => t.id === 'ble-lush')
if (noraLive?.connected !== false && lushOff?.connected === false) {
  pass('reconnect brings Nora online and keeps Lush as offline')
} else {
  fail(
    'reconnect brings Nora online and keeps Lush as offline',
    JSON.stringify(liveAgain.map((t) => [t.id, t.connected])),
  )
}

const macDup = mergeLiveWithSavedToys(
  [toy({ id: 'chrome-new', name: 'Nora', extra: { mac: '90:AB:96:B8:05:40' } })],
  [toy({ id: 'ble-nora', name: 'Nora', extra: { mac: '90:AB:96:B8:05:40' } })],
)
if (macDup.length === 1 && macDup[0]?.id === 'chrome-new') {
  pass('same MAC does not duplicate after a new browser id')
} else fail('same MAC does not duplicate after a new browser id', JSON.stringify(macDup))

const normalized = normalizeSavedToys([{ id: 'x', name: 'Lush', source: 'lovense' }, { id: 'preview', name: 'Preview', source: 'preview' }, { id: 'filter:lush', name: 'Lush' }])
if (normalized.length === 1 && normalized[0]?.id === 'x') {
  pass('normalize drops catalog and preview placeholders')
} else fail('normalize drops catalog and preview placeholders', JSON.stringify(normalized))

const menu = toysForTipMenu([], afterReload)
if (menu.some((t) => t.id === 'ble-nora') && menu.some((t) => t.id === 'ble-lush')) {
  pass('tip menu still lists last-session toys before reconnect')
} else fail('tip menu still lists last-session toys before reconnect', menu.map((t) => t.id).slice(0, 8).join())

const rememberedKeep = LovenseWebBluetooth.dedupeRemembered([
  { name: 'Nora', mac: '90:AB:96:B8:05:40', tag: '0540', id: 'chrome-nora' },
  { name: 'Nora', mac: '90:AB:96:B8:05:40', tag: '0540', id: 'chrome-nora' },
  { name: 'Domi', mac: 'AA:BB:CC:DD:EE:FF', tag: 'EEFF', id: 'chrome-domi' },
])
if (
  rememberedKeep.length === 2 &&
  rememberedKeep.some((t) => t.id === 'chrome-nora') &&
  rememberedKeep.some((t) => t.id === 'chrome-domi')
) {
  pass('partial BLE snapshot keeps the other remembered toy')
} else {
  fail(
    'partial BLE snapshot keeps the other remembered toy',
    JSON.stringify(rememberedKeep),
  )
}

const rememberedFill = LovenseWebBluetooth.dedupeRemembered([
  { name: 'Nora', mac: '', tag: '', id: 'chrome-nora', service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e' },
  { name: 'Nora', mac: '90:AB:96:B8:05:40', tag: '0540', id: 'chrome-nora' },
])
if (
  rememberedFill.length === 1 &&
  rememberedFill[0]?.mac === '90:AB:96:B8:05:40' &&
  rememberedFill[0]?.service
) {
  pass('same Chrome id fills MAC and service without duplicating')
} else {
  fail(
    'same Chrome id fills MAC and service without duplicating',
    JSON.stringify(rememberedFill),
  )
}

if (failed) {
  console.error(`\n${failed} failed`)
  process.exit(1)
}
console.log('\nOK')
