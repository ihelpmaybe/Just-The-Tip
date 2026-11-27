/**
 * Pure EIP-681 URI checks (no browser / RPC).
 *
 *   npx tsx scripts/verify-eip681.mts
 */
import {
  buildErc20TransferUri,
  buildNativeTipUri,
  buildTipPaymentUri,
  eip681PayToAddress,
  isFanSafeTipUri,
  parseEip681Erc20Transfer,
  eip681NativeValue,
  toBeats,
  toSmallestUnits,
  tryBuildTipPaymentUri,
} from '../shared/src/utils/eip681.ts'
import {
  classifyFanQrPayload,
  extractEthAddresses,
  isCreatorWalletQrPayload,
  overlayQrPayloadLooksUnsafe,
  sanitizeWebsiteLinkQrPayload,
} from '../shared/src/utils/fanQr.ts'
import { getAddress } from 'viem'
import { buildTipMenuHtml } from '../shared/src/utils/exportTipMenuHtml.ts'
import { paymentQrSvg } from '../shared/src/utils/exportQr.ts'

const ADDR = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const TOKEN = '0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07'

let failed = 0

function pass(name: string, detail = '') {
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`)
}
function fail(name: string, detail = '') {
  failed += 1
  console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
}

function expectEq(name: string, got: unknown, want: unknown) {
  if (got === want) pass(name, String(got))
  else fail(name, `got=${got} want=${want}`)
}

console.log('\n=== EIP-681 verify ===\n')

try {
  expectEq(
    '2500 PLS → beats',
    toBeats(2500).toString(),
    '2500000000000000000000',
  )
} catch (e) {
  fail('2500 PLS → beats', e instanceof Error ? e.message : String(e))
}

try {
  expectEq(
    'fractional within decimals',
    toSmallestUnits('1.5', 18).toString(),
    '1500000000000000000',
  )
} catch (e) {
  fail('fractional within decimals', e instanceof Error ? e.message : String(e))
}

try {
  expectEq(
    'excess precision rounds',
    toSmallestUnits('1.1234567890123456789', 18).toString(),
    '1123456789012345679',
  )
} catch (e) {
  fail('excess precision rounds', e instanceof Error ? e.message : String(e))
}

try {
  toSmallestUnits(0, 18)
  fail('zero amount', 'should throw')
} catch {
  pass('zero amount rejected')
}

try {
  toSmallestUnits(-1, 18)
  fail('negative amount', 'should throw')
} catch {
  pass('negative amount rejected')
}

try {
  toSmallestUnits(Number.NaN, 18)
  fail('NaN amount', 'should throw')
} catch {
  pass('NaN amount rejected')
}

const native = buildNativeTipUri({
  address: ADDR,
  chainId: 369,
  valueBeats: toBeats(2500),
})
if (
  native.startsWith('ethereum:') &&
  native.includes('@369') &&
  native.includes('?value=2500000000000000000000') &&
  !/[eE]/.test(native.split('value=')[1] || '')
) {
  pass('native URI shape', native)
} else {
  fail('native URI shape', native)
}

try {
  buildNativeTipUri({
    address: 'not-an-address',
    chainId: 369,
    valueBeats: 1n,
  })
  fail('invalid address', 'should throw')
} catch {
  pass('invalid address rejected')
}

const tip = buildTipPaymentUri({
  receiveAddress: ADDR,
  amountHuman: 2500,
  chainId: 369,
  decimals: 18,
})
expectEq('buildTipPaymentUri native', tip, native)

const erc20Spec = buildErc20TransferUri({
  tokenAddress: TOKEN,
  receiveAddress: ADDR,
  chainId: 369,
  amountRaw: toSmallestUnits(50, 6),
})
if (
  erc20Spec.includes('/transfer?') &&
  erc20Spec.toLowerCase().includes(TOKEN.toLowerCase()) &&
  erc20Spec.includes(`address=${getAddress(ADDR)}`) &&
  erc20Spec.includes('uint256=50000000') &&
  eip681PayToAddress(erc20Spec)?.toLowerCase() === TOKEN.toLowerCase()
) {
  pass('spec ERC-20 URI is token/transfer + receive + amount', erc20Spec)
} else {
  fail('spec ERC-20 URI is token/transfer + receive + amount', erc20Spec)
}

if (isFanSafeTipUri(erc20Spec, ADDR)) {
  pass('spec ERC-20 URI to receive is fan-safe')
} else {
  fail('spec ERC-20 URI to receive is fan-safe')
}

const viaToken = buildTipPaymentUri({
  receiveAddress: ADDR,
  amountHuman: 50,
  chainId: 369,
  decimals: 6,
  tokenAddress: TOKEN,
})
const receiveCs = getAddress(ADDR)
const tokenCs = getAddress(TOKEN)
expectEq('token tip URI is spec transfer', viaToken, erc20Spec)
const parsed = parseEip681Erc20Transfer(viaToken)
if (
  parsed &&
  parsed.receive === receiveCs &&
  parsed.token === tokenCs &&
  parsed.amountRaw === 50_000_000n
) {
  pass('token tip URI parses token, receive, amount')
} else {
  fail('token tip URI parses token, receive, amount', viaToken)
}
if (eip681PayToAddress(viaToken) !== tokenCs) {
  fail('token tip first address is token contract', String(eip681PayToAddress(viaToken)))
} else {
  pass('token tip first address is token contract (call target)')
}
if (!isFanSafeTipUri(viaToken, ADDR)) {
  fail('token tip URI should be fan-safe')
} else {
  pass('token tip URI is fan-safe')
}
const hintedNative = buildTipPaymentUri({
  receiveAddress: ADDR,
  amountHuman: 2500,
  chainId: 369,
  decimals: 18,
  tokenSymbol: 'PLS',
  networkName: 'PulseChain',
})
if (
  hintedNative.startsWith(native) &&
  hintedNative.includes('symbol=PLS') &&
  hintedNative.includes('network=PulseChain') &&
  isFanSafeTipUri(hintedNative, ADDR)
) {
  pass('native URI injects token name + network', hintedNative)
} else {
  fail('native URI injects token name + network', hintedNative)
}

const hintedToken = buildTipPaymentUri({
  receiveAddress: ADDR,
  amountHuman: 50,
  chainId: 369,
  decimals: 6,
  tokenAddress: TOKEN,
  tokenSymbol: 'eUSDC',
  networkName: 'PulseChain',
})
if (
  hintedToken.startsWith(erc20Spec) &&
  hintedToken.includes('symbol=eUSDC') &&
  hintedToken.includes('network=PulseChain') &&
  isFanSafeTipUri(hintedToken, ADDR)
) {
  pass('token URI injects token name + amount + network', hintedToken)
} else {
  fail('token URI injects token name + amount + network', hintedToken)
}

const parsedHinted = parseEip681Erc20Transfer(hintedToken)
if (
  parsedHinted &&
  parsedHinted.amountRaw === 50_000_000n &&
  parsedHinted.receive === receiveCs
) {
  pass('token URI with hints still parses amount')
} else {
  fail('token URI with hints still parses amount', hintedToken)
}
if (!eip681NativeValue(native) || eip681NativeValue(viaToken)) {
  fail('native has value=; token URI has no value=')
} else {
  pass('native has value=; token URI has no value=')
}
if (!isFanSafeTipUri(native, ADDR)) {
  fail('native tip URI should be fan-safe')
} else {
  pass('native tip URI is fan-safe')
}

const bareWalletChain = `ethereum:${getAddress(ADDR)}@369`
if (isFanSafeTipUri(bareWalletChain, ADDR)) {
  fail('native URI without value= should not be fan-safe')
} else {
  pass('native URI without value= rejected')
}

if (isCreatorWalletQrPayload(bareWalletChain, ADDR)) {
  fail('native URI without value= should not pass creator-wallet check')
} else {
  pass('native URI without value= fails creator-wallet check')
}

expectEq(
  'round extra fractional digits',
  toSmallestUnits('1.235', 2).toString(),
  '124',
)

if (tryBuildTipPaymentUri({
  receiveAddress: 'bad',
  amountHuman: 1,
  chainId: 369,
  decimals: 18,
}) === null) {
  pass('tryBuildTipPaymentUri null on bad addr')
} else {
  fail('tryBuildTipPaymentUri null on bad addr')
}

if (extractEthAddresses(erc20Spec).length === 2) {
  pass('spec transfer URI embeds two addresses')
} else {
  fail('spec transfer URI embeds two addresses')
}

if (isCreatorWalletQrPayload(erc20Spec, ADDR)) {
  pass('token transfer URI passes creator-wallet check')
} else {
  fail('token transfer URI passes creator-wallet check')
}

if (isCreatorWalletQrPayload(viaToken, ADDR)) {
  pass('token tip URI passes creator-wallet check')
} else {
  fail('token tip URI passes creator-wallet check')
}

if (classifyFanQrPayload('https://pulsechain.com/') === 'website-link') {
  pass('public https URL is website-link QR')
} else {
  fail('public https URL is website-link QR')
}

if (sanitizeWebsiteLinkQrPayload('https://pulsechain.com/')) {
  pass('website link sanitizes clean URL')
} else {
  fail('website link sanitizes clean URL')
}

if (
  sanitizeWebsiteLinkQrPayload(
    'https://scan.example/address/0x15D38573d2feeb82e7ad5187aB8c1D52810B1f07',
  ) === null
) {
  pass('website URL with embedded 0x rejected')
} else {
  fail('website URL with embedded 0x rejected')
}

if (
  overlayQrPayloadLooksUnsafe(
    [
      {
        paymentUri: erc20Spec,
      },
    ],
    ADDR,
  )
) {
  fail('valid token transfer should not look unsafe', erc20Spec)
} else {
  pass('valid token transfer is overlay-safe')
}

if (
  overlayQrPayloadLooksUnsafe([
    {
      paymentUri: `ethereum:${TOKEN}@369/transfer?bogus=1`,
    },
  ])
) {
  pass('malformed /transfer looks unsafe')
} else {
  fail('malformed /transfer looks unsafe')
}

console.log('\n--- HTML export QR ---\n')

const exportHtml = buildTipMenuHtml({
  displayName: 'EIP-681 test',
  receive: ADDR,
  chainId: 369,
  chainLabel: 'PulseChain',
  symbol: 'eUSDC',
  tokenAddress: TOKEN,
  tokenDecimals: 6,
  cheapest: 50,
  items: [
    {
      name: 'Wave',
      blurb: 'Test pattern',
      price: 50,
      timeSec: 30,
      tag: 'wave',
      family: 'Wave',
      strengths: [2, 4, 2],
      tokenAddress: TOKEN,
      tokenDecimals: 6,
    },
  ],
})

if (exportHtml.includes('href="ethereum:') && exportHtml.includes('/transfer?')) {
  pass('HTML card is an EIP-681 pay link')
} else {
  fail('HTML card is an EIP-681 pay link')
}

if (
  exportHtml.includes('symbol=eUSDC') &&
  exportHtml.includes('network=PulseChain') &&
  exportHtml.includes('uint256=50000000')
) {
  pass('HTML QR URI injects token name, amount, network')
} else {
  fail('HTML QR URI injects token name, amount, network')
}

if (exportHtml.includes('50 · eUSDC · PulseChain')) {
  pass('HTML QR caption shows token amount and network')
} else {
  fail('HTML QR caption shows token amount and network')
}

if (exportHtml.includes('card-qr') && exportHtml.includes('<svg')) {
  pass('HTML card has inline SVG QR (same URI as click)')
} else {
  fail('HTML card has inline SVG QR (same URI as click)')
}

const nativeHtml = buildTipMenuHtml({
  displayName: 'Native PLS',
  receive: ADDR,
  chainId: 369,
  chainLabel: 'PulseChain',
  symbol: 'PLS',
  cheapest: 25,
  items: [
    {
      name: 'Spark',
      blurb: 'Test',
      price: 25,
      timeSec: 4,
      tag: 'spark',
      family: 'Vibe',
      strengths: [4, 2, 4],
    },
  ],
})
if (
  nativeHtml.includes('symbol=PLS') &&
  nativeHtml.includes('network=PulseChain') &&
  nativeHtml.includes('value=') &&
  nativeHtml.includes('25 · PLS · PulseChain')
) {
  pass('native HTML QR injects PLS amount and PulseChain')
} else {
  fail('native HTML QR injects PLS amount and PulseChain')
}

if (exportHtml.includes('btn-pay-now') && exportHtml.includes('Open payment')) {
  pass('HTML export has Open payment button')
} else {
  fail('HTML export has Open payment button')
}

if (
  !exportHtml.includes('Internet Money') &&
  !exportHtml.includes('internetmoney.io')
) {
  pass('HTML export skips Internet Money')
} else {
  fail('HTML export skips Internet Money')
}

if (exportHtml.includes('file-warn')) {
  pass('HTML export warns file:// cannot open the wallet')
} else {
  fail('HTML export warns file:// cannot open the wallet')
}

if (!exportHtml.includes('qrserver.com')) {
  pass('HTML export avoids external QR API')
} else {
  fail('HTML export avoids external QR API')
}

const qrSvg = paymentQrSvg(viaToken, 96)
if (qrSvg.startsWith('<svg') && qrSvg.includes('<rect')) {
  pass('exportQr paymentQrSvg renders modules')
} else {
  fail('exportQr paymentQrSvg renders modules')
}

console.log(`\n=== Summary: ${failed ? `FAIL ${failed}` : 'PASS'} ===\n`)
process.exit(failed ? 1 : 0)
