/**
 * Pure wallet list invariants — no browser.
 * Catches the remove→remember→resurrect class of bugs in logic.
 *
 *   npx tsx scripts/verify-wallets.mts
 */
import {
  MAX_SAVED_WALLETS,
  normalizeSavedWallets,
  rememberWallet,
  removeSavedWallet,
  shortAddress,
  walletDisplayLabel,
  type SavedWallet,
} from '../shared/src/state/wallets.ts'

const VITALIK = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const VITALIK_LOWER = VITALIK.toLowerCase()
const BURN = '0x000000000000000000000000000000000000dEaD'
const ZERO = '0x0000000000000000000000000000000000000000'

let failed = 0
let passed = 0

function ok(name: string, cond: boolean, detail = '') {
  if (cond) {
    passed++
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`)
  } else {
    failed++
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function addrs(list: SavedWallet[]) {
  return list.map((w) => w.address.toLowerCase())
}

function has(list: SavedWallet[], address: string) {
  return addrs(list).includes(address.toLowerCase())
}

/** Mimic settingsForm.persist: always re-remember current receive. */
function persistRemember(list: SavedWallet[], receive: string) {
  return rememberWallet(list, receive)
}

/** Mimic app boot seed. */
function bootSeed(list: SavedWallet[], receive: string) {
  return rememberWallet(list, receive)
}

console.log('\n=== verify-wallets (pure) ===\n')

{
  const list = rememberWallet([], VITALIK, { label: 'ops' })
  ok('remember empty→1', list.length === 1 && has(list, VITALIK))
  ok('remember checksums', list[0]!.address === VITALIK)
  ok('remember label', list[0]!.label === 'ops')
  ok('display label', walletDisplayLabel(list[0]!) === 'ops')
  ok('short address shape', shortAddress(VITALIK).includes('…'))
}

{
  let list = rememberWallet([], VITALIK, { label: 'a' })
  list = rememberWallet(list, BURN, { label: 'b' })
  ok('remember two', list.length === 2 && has(list, VITALIK) && has(list, BURN))
  ok('most recent first', list[0]!.address.toLowerCase() === BURN.toLowerCase())
  list = rememberWallet(list, VITALIK)
  ok('re-remember moves front', list[0]!.address.toLowerCase() === VITALIK_LOWER)
  ok('re-remember keeps label', list[0]!.label === 'a')
}

{
  let list = rememberWallet([], VITALIK, { label: 'keep' })
  list = rememberWallet(list, VITALIK_LOWER, { label: 'renamed' })
  ok('case-insensitive merge', list.length === 1)
  ok('label overwrite when provided', list[0]!.label === 'renamed')
}

{
  ok('remember invalid no-op', rememberWallet([], 'not-an-address').length === 0)
  ok('remember empty no-op', rememberWallet([], '').length === 0)
}

{
  let list = rememberWallet([], VITALIK)
  list = rememberWallet(list, BURN)
  list = removeSavedWallet(list, VITALIK)
  ok('remove inactive', list.length === 1 && !has(list, VITALIK) && has(list, BURN))
  list = removeSavedWallet(list, VITALIK)
  ok('remove missing idempotent', list.length === 1)
  list = removeSavedWallet(list, BURN.toLowerCase())
  ok('remove case-insensitive', list.length === 0)
}

{
  // THE BUG: remove active then persist/boot re-adds if receive still set
  let list = rememberWallet([], VITALIK, { label: 'active' })
  list = removeSavedWallet(list, VITALIK)
  ok('remove active clears list', list.length === 0)

  const resurrectedByPersist = persistRemember(list, VITALIK)
  ok(
    'BUGGUARD persist would resurrect if receive kept',
    resurrectedByPersist.length === 1 && has(resurrectedByPersist, VITALIK),
    'documents why UI must clear receive',
  )

  const resurrectedByBoot = bootSeed([], VITALIK)
  ok(
    'BUGGUARD boot seed would resurrect if receive kept',
    resurrectedByBoot.length === 1,
    'documents why UI must clear receive',
  )

  // Fixed product path: clear receive with remove
  const afterClearReceive = persistRemember([], '')
  const afterBootEmpty = bootSeed([], '')
  ok('fixed path: persist with empty receive stays empty', afterClearReceive.length === 0)
  ok('fixed path: boot with empty receive stays empty', afterBootEmpty.length === 0)
}

{
  let list = rememberWallet([], VITALIK)
  list = rememberWallet(list, BURN)
  list = removeSavedWallet(list, BURN)
  const afterPersistActive = persistRemember(list, VITALIK)
  ok(
    'remove inactive + persist active keeps only active',
    afterPersistActive.length === 1 &&
      has(afterPersistActive, VITALIK) &&
      !has(afterPersistActive, BURN),
  )
}

{
  const junk = normalizeSavedWallets([
    { address: VITALIK, label: 'ok', lastUsed: 9 },
    { address: 'nope', label: 'bad', lastUsed: 1 },
    { address: VITALIK_LOWER, label: 'dup', lastUsed: 1 },
    null,
    42,
    { address: ZERO, label: 'z', lastUsed: 5 },
  ])
  ok('normalize drops invalid + dedupes', junk.length === 2)
  ok('normalize sorts by lastUsed', junk[0]!.address.toLowerCase() === VITALIK_LOWER)
}

{
  let list: SavedWallet[] = []
  for (let i = 0; i < MAX_SAVED_WALLETS + 5; i++) {
    const hex = i.toString(16).padStart(40, '0')
    list = rememberWallet(list, `0x${hex}`)
  }
  ok('cap at MAX_SAVED_WALLETS', list.length === MAX_SAVED_WALLETS)
}

console.log(`\n=== Summary ===`)
console.log(`PASS ${passed}  FAIL ${failed}\n`)
process.exit(failed ? 1 : 0)
