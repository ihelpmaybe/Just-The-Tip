import { isAddress } from 'viem'
import { fanSafeCreatorWalletUri } from '../utils/fanQr'
import { tryBuildTipPaymentUri } from '../utils/eip681'
import { CHAINS } from '../chain/config'
import type { DeviceToy } from '../device/controller'
import { type Saved, resolveToyMaxVibe, clampMenuMaxVibe, saveSettings } from '../state/settings'
import {
  coinRewardRulesForPattern,
  coinColorHue,
  coinPaintSkin,
  coinRewardTokenAddresses,
  enabledCoinRewardRules,
  ensureUniqueCoinRewardRules,
  exportCoinRewardCsv,
  parseCoinRewardCsv,
  removeCoinRewardRules,
  starterCoinRewardCsv,
  toggleCoinRewardAssignment,
  upsertCoinRewardRules,
  usdTargetToTokenAmount,
  type CoinRewardRule,
} from '../state/coinRewards'
import {
  EXTRA_SAVED_TOKEN_PRESETS,
  hideTipBoardToken,
  isExtraSavedTipToken,
  isFrontTipBoardToken,
  isRetiredTipPreset,
  isStableTipPreset,
  isTipBoardSuggestion,
  rememberToken,
  TIP_BOARD_SUGGESTIONS,
  tokenDisplayLabel,
  unhideTipBoardToken,
} from '../state/tokens'
import {
  paintPatternList,
  fillMenuSortSelect,
  paintMenuToyTicks,
} from '../ui/patterns'
import {
  paintPatternCatalog,
} from '../ui/patternCatalog'
import {
  defFromWizardFields,
  fillTagList,
  fillWizardNeeds,
  paintMotorStrengthEditors,
  paintStrengthEditors,
  readMotorStrengthEditors,
  readStrengthEditors,
  readStepMotorEditors,
  readWizardNeeds,
  type WizardMode,
} from '../ui/patternWizard'
import { buildPatternSvg, vizMotorLanes, vizStepsForPattern } from '../ui/patternViz'
import { shortToyLabel } from '../utils/toySilhouettes'
import {
  TOY_PRODUCT_PROFILES,
  capabilityFromProductProfile,
  toyProductProfile,
} from '../utils/toyIdentity'
import {
  familyLabel,
  patternFamily,
  patternFitsToy,
  toyChannelLabels,
  type CapabilitySource,
} from '../utils/patternFit'
import {
  getCatalogPattern,
  getPattern,
  isCatalogPattern,
  isCustomPattern,
  newCustomPatternId,
  patternLabel,
  patternMotorLanes,
  findPatternDuplicate,
  patternNeeds,
  patternTags,
  PATTERNS,
  type PatternId,
  type StepMotorCode,
} from '../utils/patterns'
import {
  isMenuSort,
  applyUniqueSkuAmounts,
  durationBoundsForPatterns,
  ensureUniqueEffectiveToySheet,
  ladderPricesFromRange,
  menuBaseFromPrices,
  menuTopFromPrices,
  patternToyPrice,
  patternsForSharedMenu,
  patternsForToyMenu,
  repairPatternPriceUniqueness,
  setToyPatternLadder,
  setToyPatternPrice,
  uniqueUsdTargetsForPatterns,
  usdTargetAcrossDuration,
} from '../utils/pricing'
import {
  ensureUsdQuotesForTokens,
  formatUsdApprox,
  isApproxUsdStable,
  peekUsdPerTipUnit,
  peekUsdQuoteMap,
  resolveUsdPerTipUnit,
  type TipCoinForUsd,
} from '../utils/tipUsd'
import {
  exportTipMenuJpg,
  type MenuExportOrientation,
  type TipMenuExportInput,
} from '../utils/exportTipMenuJpg'
import { exportTipMenuHtml } from '../utils/exportTipMenuHtml'
import { onBackdropDismiss } from '../utils/backdropDismiss'
import { toysForTipMenu, importLinkedFilterIds } from '../utils/tipFilterToys'
import {
  applyToyMenuPack,
  buildToyMenuPack,
  downloadToyMenuPack,
  parseToyMenuPack,
} from '../utils/toyMenuPack'
import { APP_NAME, APP_SLUG, DONATION_ADDRESS } from '../version'
import { resolveDonationAddress } from '../donate'

export type TipMenuStudioCtx = {
  $: <T extends HTMLElement>(id: string) => T
  getState: () => Saved
  readForm: () => Saved
  saveSettings: typeof saveSettings
  getDeviceToys: () => DeviceToy[]
  resolvedFilterToyIds: (menuToys: DeviceToy[]) => string[]
  menuFitToys: () => CapabilitySource[] | null
  tokenLabelForAddress: (address: string) => string
  getTokenLabelFieldValue: () => string
  showError: (msg: string) => void
  /** Jump to Home so the operator can add a tip wallet. */
  goHome: () => void
  paintSession: () => void
  runPatternTest: (
    intensity: number,
    durationMs: number,
    pattern: PatternId,
    label: string,
    toyId?: string,
  ) => Promise<void>
  scheduleStreamMenuPush: () => void
  applyDeviceSettings: () => void
}

export function createTipMenuStudio(ctx: TipMenuStudioCtx) {
  const $ = ctx.$
  const state = () => ctx.getState()
  let pendingToyPackImportId: string | null = null
  /** Last USD/unit used when painting (avoids paint loops). */
  let paintedUsdKey = ''
  let paintedUsdPerUnit: number | null = null
  /** Active toy tab when multiple tip-menu toys are selected. */
  let activePatternToyId = ''
  /** Guard: adopting tab paint as tip coin re-enters paintPatterns. */
  let aligningTipCoin = false
  /** Paint-brush coin keys ('' = native). Empty = not painting. */
  const selectedCoinKeys = new Set<string>()
  /** hiddenTipCoins sentinel for the native gas coin (its key is ''). */
  const NATIVE_COIN_KEY = 'native'
  /** Seed range for the USD scale inputs before the operator sets one. */
  const DEFAULT_USD_TIP_LO = 3.69
  const DEFAULT_USD_TIP_HI = 55.55
  let usdTargetSheetCache: {
    key: string
    sheet: Record<string, number>
  } | null = null

  function invalidateUsdTargetSheetCache() {
    usdTargetSheetCache = null
  }

  function setCoinMatrixStatus(_msg: string) {
    // Status lines under Whitelist were removed as redundant.
  }

  function noPriceDetectedNote(coinLabel: string): string {
    return `No price detected for ${coinLabel} — waiting for PulseChain quote`
  }

  function updatePaintHint(_note?: string) {
    // Paint hint under Whitelist was removed as redundant.
  }

  function persistCoinRules(rules: CoinRewardRule[]) {
    const toyIds = [
      ...new Set(
        (ctx.menuFitToys() || [])
          .map((t) => t.id)
          .filter(Boolean) as string[],
      ),
    ]
    const quotes = peekUsdQuoteMap(coinRewardTokenAddresses(rules))
    const decimalsByToken: Record<string, number> = { '': 18 }
    for (const saved of state().savedTokens || []) {
      decimalsByToken[saved.address.toLowerCase()] = saved.decimals
    }
    const active = (state().tokenAddress || '').trim().toLowerCase()
    if (active) decimalsByToken[active] = state().tokenDecimals
    const unique = ensureUniqueCoinRewardRules(rules, {
      extraToyIds: toyIds,
      quotes,
      decimalsByToken,
    })
    invalidateUsdTargetSheetCache()
    state().coinRewardRules = unique
    ctx.saveSettings({
      ...ctx.readForm(),
      coinRewardRules: unique,
    })
  }

  function decimalsForToken(tokenAddress: string): number {
    const key = tokenAddress.toLowerCase()
    if (!key) return 18
    const saved = (state().savedTokens || []).find(
      (t) => t.address.toLowerCase() === key,
    )
    if (saved) return saved.decimals
    if (state().tokenAddress.toLowerCase() === key) return state().tokenDecimals
    return 18
  }

  function coinsForPriceBoard(): Array<{
    key: string
    label: string
    tokenAddress: string
  }> {
    const chain = CHAINS[state().chainKey]
    const rows: Array<{ key: string; label: string; tokenAddress: string }> = [
      { key: '', label: chain.symbol, tokenAddress: '' },
    ]
    const hidden = new Set(
      (state().hiddenTipCoins || []).map((a) => a.trim().toLowerCase()),
    )
    const seen = new Set<string>([''])
    for (const token of state().savedTokens || []) {
      const key = token.address.toLowerCase()
      if (
        !key ||
        seen.has(key) ||
        hidden.has(key) ||
        isRetiredTipPreset(key)
      )
        continue
      seen.add(key)
      rows.push({
        key,
        label: tokenDisplayLabel(token) || token.symbol || 'TOKEN',
        tokenAddress: token.address,
      })
    }
    const activeRaw = state().tokenAddress.trim()
    if (
      activeRaw &&
      isAddress(activeRaw) &&
      !isRetiredTipPreset(activeRaw) &&
      !hidden.has(activeRaw.toLowerCase())
    ) {
      const key = activeRaw.toLowerCase()
      if (!seen.has(key)) {
        rows.push({
          key,
          label:
            ctx.getTokenLabelFieldValue().trim() ||
            ctx.tokenLabelForAddress(activeRaw) ||
            state().tokenSymbol ||
            'TOKEN',
          tokenAddress: activeRaw,
        })
      }
    }
    return rows
  }

  /**
   * Board chips: selected Suggestions (PLS), Save-token rows, and custom saved tokens.
   * Nothing auto-pins — pick PLS from Suggestions or Save token.
   */
  function coinsForFrontChips(): Array<{
    key: string
    label: string
    tokenAddress: string
  }> {
    const all = coinsForPriceBoard()
    const out: Array<{ key: string; label: string; tokenAddress: string }> = []
    for (const preset of TIP_BOARD_SUGGESTIONS) {
      const coin = all.find((c) => c.key === preset.address.toLowerCase())
      if (coin && selectedCoinKeys.has(coin.key)) out.push(coin)
    }
    const native = all.find((c) => !c.key)
    if (native && selectedCoinKeys.has('')) out.push(native)
    for (const coin of all) {
      if (isFrontTipBoardToken(coin.tokenAddress)) continue
      if (isTipBoardSuggestion(coin.tokenAddress)) continue
      if (isExtraSavedTipToken(coin.tokenAddress)) continue
      out.push(coin)
    }
    return out
  }

  function coinsForSuggestionMenu(): Array<{
    key: string
    label: string
    tokenAddress: string
  }> {
    const board = coinsForPriceBoard()
    const byKey = new Map(board.map((c) => [c.key, c]))
    const out: Array<{ key: string; label: string; tokenAddress: string }> = []
    const seen = new Set<string>()
    const push = (coin: {
      key: string
      label: string
      tokenAddress: string
    }) => {
      const id = coin.key || NATIVE_COIN_KEY
      if (seen.has(id) || selectedCoinKeys.has(coin.key)) return
      seen.add(id)
      out.push(coin)
    }
    const native = byKey.get('')
    if (native) push(native)
    for (const preset of TIP_BOARD_SUGGESTIONS) {
      const key = preset.address.toLowerCase()
      const coin = byKey.get(key)
      if (coin) {
        push(coin)
        continue
      }
      push({
        key,
        label: preset.label || preset.symbol,
        tokenAddress: preset.address,
      })
    }
    for (const preset of EXTRA_SAVED_TOKEN_PRESETS) {
      const key = preset.address.toLowerCase()
      if (byKey.has(key)) continue
      push({
        key,
        label: preset.label || preset.symbol,
        tokenAddress: preset.address,
      })
    }
    const hidden = new Set(
      (state().hiddenTipCoins || []).map((a) => a.trim().toLowerCase()),
    )
    for (const token of state().savedTokens || []) {
      const key = token.address.toLowerCase()
      if (!hidden.has(key)) continue
      if (
        isFrontTipBoardToken(key) ||
        isTipBoardSuggestion(key) ||
        isExtraSavedTipToken(key)
      )
        continue
      push({
        key,
        label: tokenDisplayLabel(token) || token.symbol || 'TOKEN',
        tokenAddress: token.address,
      })
    }
    return out
  }

  function canRemoveBoardCoin(coin: {
    key: string
    tokenAddress: string
  }): boolean {
    if (isFrontTipBoardToken(coin.tokenAddress)) {
      return selectedCoinKeys.has('')
    }
    if (isTipBoardSuggestion(coin.tokenAddress)) return false
    return Boolean(coin.key)
  }

  function hideBoardCoin(coin: {
    key: string
    label: string
    tokenAddress: string
  }) {
    if (isFrontTipBoardToken(coin.tokenAddress)) {
      if (selectedCoinKeys.has('')) togglePaintCoin(coin)
      paintCoinPrice()
      return
    }
    if (!canRemoveBoardCoin(coin)) return
    if (selectedCoinKeys.has(coin.key)) {
      selectedCoinKeys.delete(coin.key)
      clearPaintForCoin(coin.key)
      if (!selectedCoinKeys.size) clearAllPaint()
      else distributeWhitelistAcrossToys()
      persistPaintWhitelist()
    }
    const hiddenTipCoins = hideTipBoardToken(
      state().hiddenTipCoins,
      coin.tokenAddress,
    )
    state().hiddenTipCoins = hiddenTipCoins
    ctx.saveSettings({
      ...ctx.readForm(),
      hiddenTipCoins,
      savedTokens: state().savedTokens,
    })
    paintCoinPrice()
    paintPatterns()
    ctx.paintSession()
  }

  function restoreHiddenBoardCoin(coin: {
    key: string
    label: string
    tokenAddress: string
  }) {
    const preset =
      TIP_BOARD_SUGGESTIONS.find(
        (p) => p.address.toLowerCase() === coin.key,
      ) ||
      EXTRA_SAVED_TOKEN_PRESETS.find(
        (p) => p.address.toLowerCase() === coin.key,
      )
    const saved = (state().savedTokens || []).find(
      (t) => t.address.toLowerCase() === coin.key,
    )
    const hiddenTipCoins = unhideTipBoardToken(
      state().hiddenTipCoins,
      coin.tokenAddress,
    )
    const savedTokens = rememberToken(state().savedTokens || [], coin.tokenAddress, {
      symbol: preset?.symbol || saved?.symbol || coin.label,
      decimals: preset?.decimals ?? saved?.decimals ?? 18,
      label: preset?.label || saved?.label || coin.label,
    })
    state().hiddenTipCoins = hiddenTipCoins
    state().savedTokens = savedTokens
    ctx.saveSettings({
      ...ctx.readForm(),
      hiddenTipCoins,
      savedTokens,
    })
  }

  function selectedPaintCoins(): Array<{
    key: string
    label: string
    tokenAddress: string
  }> {
    // Bridged stables tip by USD — never paint matrix rows.
    return coinsForPriceBoard().filter(
      (c) => selectedCoinKeys.has(c.key) && !isStableTipPreset(c.tokenAddress),
    )
  }

  /**
   * Nothing whitelisted means nothing painted — drop every rule, including
   * leftovers from coins that are no longer on the board.
   */
  function clearAllPaint(): boolean {
    if (!(state().coinRewardRules || []).length) return false
    persistCoinRules([])
    return true
  }

  /** Drop every pattern/toy assignment for one tip coin. */
  function clearPaintForCoin(tokenKey: string) {
    const key = String(tokenKey || '')
      .trim()
      .toLowerCase()
    const before = state().coinRewardRules || []
    const next = removeCoinRewardRules(before, { tokenAddresses: [key] })
    if (next.length === before.length) return false
    persistCoinRules(next)
    return true
  }

  /**
   * Chip selection is the paint whitelist — persisted in paintCoinKeys.
   * Do not re-select from coinRewardRules on reload (that forced PLSX/PUMP
   * back on after the operator cleared them).
   */
  let restoredPaintSelection = false
  function restorePaintSelectionFromRules() {
    if (restoredPaintSelection) return
    restoredPaintSelection = true
    selectedCoinKeys.clear()
    // Ensure suggestion chips in paintCoinKeys (incl. stables) are on the board.
    let savedTokens = state().savedTokens || []
    let tokensChanged = false
    for (const saved of state().paintCoinKeys || []) {
      const key = saved === NATIVE_COIN_KEY ? '' : String(saved || '').toLowerCase()
      if (!key) continue
      if ((savedTokens || []).some((t) => t.address.toLowerCase() === key)) continue
      const preset =
        TIP_BOARD_SUGGESTIONS.find((p) => p.address.toLowerCase() === key) ||
        EXTRA_SAVED_TOKEN_PRESETS.find((p) => p.address.toLowerCase() === key)
      if (!preset) continue
      savedTokens = rememberToken(savedTokens, preset.address, {
        symbol: preset.symbol,
        decimals: preset.decimals,
        label: preset.label,
      })
      tokensChanged = true
    }
    if (tokensChanged) {
      state().savedTokens = savedTokens
      ctx.saveSettings({ ...ctx.readForm(), savedTokens })
    }
    const known = new Set(coinsForPriceBoard().map((c) => c.key))
    for (const saved of state().paintCoinKeys || []) {
      const key = saved === NATIVE_COIN_KEY ? '' : saved
      if (known.has(key)) selectedCoinKeys.add(key)
    }
    healOrphanPaint()
    updatePaintHint()
  }

  /**
   * Painted coins must always have a selected chip, or there is no control
   * left to turn them off. Sessions saved before this rule existed could load
   * with painted tabs and an empty whitelist — drop that paint on sight.
   */
  function healOrphanPaint(): boolean {
    const before = state().coinRewardRules || []
    if (!before.length) return false
    if (!selectedCoinKeys.size) {
      persistCoinRules([])
      setCoinMatrixStatus('Cleared stuck paint — no coins were selected')
      return true
    }
    const next = before.filter((rule) =>
      selectedCoinKeys.has(rule.tokenAddress.trim().toLowerCase()),
    )
    if (next.length === before.length) return false
    persistCoinRules(next)
    setCoinMatrixStatus('Cleared paint from unselected coins')
    return true
  }

  function persistPaintWhitelist() {
    // Native's key is '' — store it under a sentinel so it survives the save.
    const keys = [...selectedCoinKeys].map((k) => k || NATIVE_COIN_KEY)
    const acceptedStables = keys.filter((k) => isStableTipPreset(k))
    state().paintCoinKeys = keys
    state().acceptedStables = acceptedStables
    ctx.saveSettings({
      ...ctx.readForm(),
      paintCoinKeys: keys,
      acceptedStables,
    })
  }

  /**
   * The tools card belongs to the active toy tab, so clearing paint only
   * touches that toy (shared/pattern-wide rules go when no tab is open).
   */
  function clearPaintFromVisibleToys() {
    const activeId = activePatternToyId || ''
    const before = state().coinRewardRules || []
    const kept = before.filter((rule) => {
      if (!rule.toyIds.length) return Boolean(activeId)
      if (!activeId) return true
      if (!rule.toyIds.includes(activeId)) return true
      // Shared with other toys — keep the row, just drop this toy.
      return rule.toyIds.length > 1
    })
    const trimmed = kept.map((rule) =>
      activeId && rule.toyIds.length > 1 && rule.toyIds.includes(activeId)
        ? { ...rule, toyIds: rule.toyIds.filter((id) => id !== activeId) }
        : rule,
    )
    const changed =
      trimmed.length !== before.length ||
      trimmed.some((r, i) => r.toyIds.length !== before[i]?.toyIds.length)
    if (!changed) {
      setCoinMatrixStatus('No paint to clear on this toy')
      return
    }
    persistCoinRules(trimmed)
    setCoinMatrixStatus(
      activeId ? 'Cleared paint from this toy' : 'Cleared shared menu paint',
    )
    ctx.showError('')
    paintCoinPrice()
    paintPatterns()
    ctx.paintSession()
  }

  function menuDurationBounds(toy?: CapabilitySource | null): {
    loMs: number
    hiMs: number
  } {
    const menu = toy
      ? patternsForToyMenu(toy, {
          disabled: state().disabledPatterns,
          featured: state().featuredPatterns,
          includeDisabled: false,
        })
      : patternsForSharedMenu({
          disabled: state().disabledPatterns,
          featured: state().featuredPatterns,
          includeDisabled: false,
        })
    return durationBoundsForPatterns(menu)
  }

  function usdTargetForPattern(
    patternId: string,
    toyId: string | undefined,
    _tokenKey: string,
  ): number {
    const toy =
      (toyId &&
        (ctx.menuFitToys() || []).find((t) => t.id === toyId)) ||
      null
    const menu = toy
      ? patternsForToyMenu(toy, {
          disabled: state().disabledPatterns,
          featured: state().featuredPatterns,
          includeDisabled: false,
        })
      : patternsForSharedMenu({
          disabled: state().disabledPatterns,
          featured: state().featuredPatterns,
          includeDisabled: false,
        })
    const toyUsd = toyId ? state().toyMenuUsd?.[toyId] : undefined
    const lo = toyUsd?.lo || state().menuUsdLo || DEFAULT_USD_TIP_LO
    const hi = Math.max(
      lo,
      toyUsd?.hi || state().menuUsdHi || DEFAULT_USD_TIP_HI,
    )
    const bounds = menuDurationBounds(toy)
    const cacheKey = `${toyId || ''}|${lo}|${hi}|${bounds.loMs}|${bounds.hiMs}|${menu.map((p) => p.id).join(',')}`
    if (!usdTargetSheetCache || usdTargetSheetCache.key !== cacheKey) {
      usdTargetSheetCache = {
        key: cacheKey,
        sheet: uniqueUsdTargetsForPatterns(
          menu.map((p) => p.id),
          lo,
          hi,
          bounds,
        ),
      }
    }
    return (
      usdTargetSheetCache.sheet[patternId] ??
      usdTargetAcrossDuration(patternId, lo, hi, bounds)
    )
  }

  /** Keep painted coin rows aligned to the scaled USD menu (unique SKUs). */
  function syncPaintedCoinRulesForScale(scopeToyId?: string) {
    const rules = state().coinRewardRules || []
    if (!rules.length) return
    const incoming: Array<Partial<CoinRewardRule>> = []
    for (const rule of rules) {
      if (!rule.enabled) continue
      if (scopeToyId) {
        if (!rule.toyIds.length || !rule.toyIds.includes(scopeToyId)) continue
        incoming.push({
          coin: rule.coin,
          tokenAddress: rule.tokenAddress,
          patternId: rule.patternId,
          usdTarget: usdTargetForPattern(
            rule.patternId,
            scopeToyId,
            rule.tokenAddress.toLowerCase(),
          ),
          enabled: true,
          toyIds: rule.toyIds,
        })
        continue
      }
      if (rule.toyIds.length) continue
      incoming.push({
        coin: rule.coin,
        tokenAddress: rule.tokenAddress,
        patternId: rule.patternId,
        usdTarget: usdTargetForPattern(
          rule.patternId,
          undefined,
          rule.tokenAddress.toLowerCase(),
        ),
        enabled: true,
        toyIds: [],
      })
    }
    if (!incoming.length) return
    persistCoinRules(upsertCoinRewardRules(rules, incoming))
  }

  function syncAllPaintedCoinRulesFromMenus() {
    const rules = state().coinRewardRules || []
    if (!rules.length) return
    const incoming: Array<Partial<CoinRewardRule>> = []
    for (const rule of rules) {
      if (!rule.enabled) continue
      const scopeToyId = rule.toyIds.length === 1 ? rule.toyIds[0] : undefined
      incoming.push({
        coin: rule.coin,
        tokenAddress: rule.tokenAddress,
        patternId: rule.patternId,
        usdTarget: usdTargetForPattern(
          rule.patternId,
          scopeToyId,
          rule.tokenAddress.toLowerCase(),
        ),
        enabled: true,
        toyIds: rule.toyIds,
      })
    }
    persistCoinRules(upsertCoinRewardRules(rules, incoming))
  }

  function isCoinAssigned(
    rules: CoinRewardRule[],
    tokenKey: string,
    patternId: string,
    toyId: string | null,
  ): boolean {
    const rule = rules.find(
      (r) =>
        r.patternId === patternId &&
        r.tokenAddress.toLowerCase() === tokenKey &&
        r.enabled,
    )
    if (!rule) return false
    if (!toyId) return rule.toyIds.length === 0
    return rule.toyIds.length === 0 || rule.toyIds.includes(toyId)
  }

  /**
   * Rebuild tip ladders from saved USD ranges for the active tip coin.
   * Call after tip-coin changes so PLSX-sized counts never become eDAI tips.
   */
  function rescaleLaddersForTipCoin(usdPer: number): {
    toys: number
    shortest: number
    longest: number
  } {
    const tipCoin = activeTipCoin()
    const decimals = tipCoin.tokenAddress
      ? decimalsForToken(tipCoin.tokenAddress)
      : 18
    const gLo = state().menuUsdLo || DEFAULT_USD_TIP_LO
    const gHi = Math.max(gLo, state().menuUsdHi || DEFAULT_USD_TIP_HI)
    const gTokenLo = usdTargetToTokenAmount(gLo, usdPer, decimals)
    const gTokenHi = usdTargetToTokenAmount(gHi, usdPer, decimals)
    if (gTokenLo == null || gTokenHi == null) {
      return { toys: 0, shortest: 0, longest: 0 }
    }
    state().patternPrices = ladderPricesFromRange(
      gTokenLo,
      gTokenHi,
      menuDurationBounds(null),
    )

    let toyMap = { ...(state().toyPatternPrices || {}) }
    const toyUsd = { ...(state().toyMenuUsd || {}) }
    const fitToys = ctx.menuFitToys() || []
    const toyIds = new Set([
      ...Object.keys(toyMap),
      ...Object.keys(toyUsd),
      ...(activePatternToyId ? [activePatternToyId] : []),
      ...(fitToys.map((t) => t.id).filter(Boolean) as string[]),
    ])
    let toys = 0
    for (const toyId of toyIds) {
      const range = toyUsd[toyId] || { lo: gLo, hi: gHi }
      const lo = usdTargetToTokenAmount(range.lo, usdPer, decimals)
      const hi = usdTargetToTokenAmount(
        Math.max(range.lo, range.hi),
        usdPer,
        decimals,
      )
      if (lo == null || hi == null) continue
      const toy = fitToys.find((t) => t.id === toyId) || null
      toyMap = setToyPatternLadder(
        toyMap,
        toyId,
        ladderPricesFromRange(lo, hi, menuDurationBounds(toy)),
      )
      toyUsd[toyId] = { lo: range.lo, hi: Math.max(range.lo, range.hi) }
      toys++
    }
    state().toyPatternPrices = toyMap
    state().toyMenuUsd = toyUsd
    ctx.saveSettings({
      ...ctx.readForm(),
      patternPrices: state().patternPrices,
      toyPatternPrices: state().toyPatternPrices,
      toyMenuUsd: state().toyMenuUsd,
      menuUsdLo: gLo,
      menuUsdHi: gHi,
    })
    invalidateUsdTargetSheetCache()
    syncAllPaintedCoinRulesFromMenus()
    return { toys, shortest: gTokenLo, longest: gTokenHi }
  }

  /**
   * Scale one toy (or the shared menu) from a USD tip range.
   * Same work as the Scale menu button.
   */
  function applyUsdScale(opts: {
    toyId?: string
    usdLo: number
    usdHi: number
    usdPer: number
  }): boolean {
    const { usdLo, usdHi, usdPer } = opts
    if (
      !Number.isFinite(usdLo) ||
      usdLo <= 0 ||
      !Number.isFinite(usdHi) ||
      usdHi <= 0 ||
      !Number.isFinite(usdPer) ||
      usdPer <= 0
    ) {
      return false
    }
    const tipCoin = activeTipCoin()
    const decimals = tipCoin.tokenAddress
      ? decimalsForToken(tipCoin.tokenAddress)
      : 18
    const lo = usdTargetToTokenAmount(usdLo, usdPer, decimals)
    const hi = usdTargetToTokenAmount(usdHi, usdPer, decimals)
    if (lo == null || hi == null) return false
    const toyId = opts.toyId || ''
    const toy =
      (toyId && (ctx.menuFitToys() || []).find((t) => t.id === toyId)) || null
    const ladder = ladderPricesFromRange(lo, hi, menuDurationBounds(toy))
    if (toyId) {
      state().toyPatternPrices = setToyPatternLadder(
        state().toyPatternPrices || {},
        toyId,
        ladder,
      )
      state().toyMenuUsd = {
        ...(state().toyMenuUsd || {}),
        [toyId]: { lo: usdLo, hi: usdHi },
      }
      ctx.saveSettings({
        ...ctx.readForm(),
        toyPatternPrices: state().toyPatternPrices,
        toyMenuUsd: state().toyMenuUsd,
      })
    } else {
      state().patternPrices = ladder
      state().menuUsdLo = usdLo
      state().menuUsdHi = usdHi
      ctx.saveSettings({
        ...ctx.readForm(),
        patternPrices: state().patternPrices,
        menuUsdLo: usdLo,
        menuUsdHi: usdHi,
      })
    }
    invalidateUsdTargetSheetCache()
    syncPaintedCoinRulesForScale(toyId || undefined)
    return true
  }

  /**
   * Keep tip ladders aligned to the USD Low/High for patterns actually on the
   * tip menu (not the full catalog). Fixes dust tips and stale mid-menu floors
   * (e.g. cheapest card stuck near $25 while Low says $3.69).
   */
  function ensureUsdScaledLadders(usdPer: number | null | undefined): boolean {
    if (usdPer == null || !Number.isFinite(usdPer) || usdPer <= 0) return false
    const gLo = state().menuUsdLo || DEFAULT_USD_TIP_LO
    const gHi = Math.max(gLo, state().menuUsdHi || DEFAULT_USD_TIP_HI)
    const menuFloorUsd = (
      toy: CapabilitySource | null,
      prices: Record<string, number>,
      toyId?: string,
    ) => {
      const menu = toy
        ? patternsForToyMenu(toy, {
            disabled: state().disabledPatterns,
            featured: state().featuredPatterns,
            includeDisabled: false,
          })
        : patternsForSharedMenu({
            disabled: state().disabledPatterns,
            featured: state().featuredPatterns,
            includeDisabled: false,
          })
      let min = Infinity
      for (const p of menu) {
        const n = patternToyPrice(
          p.id,
          prices,
          state().toyPatternPrices || {},
          toyId,
        )
        if (Number.isFinite(n) && n >= 0 && n < min) min = n
      }
      if (!Number.isFinite(min)) {
        min = menuBaseFromPrices(prices)
      }
      return min * usdPer
    }
    const needsScale = (
      toy: CapabilitySource | null,
      prices: Record<string, number>,
      usdLo: number,
      toyId?: string,
    ) => {
      const floor = menuFloorUsd(toy, prices, toyId)
      if (!Number.isFinite(floor) || floor <= 0) return true
      // Dust vs Low, or cheapest menu card sitting well above Low.
      return floor < usdLo * 0.25 || floor > usdLo * 1.35
    }
    let changed = false
    const toys = (ctx.menuFitToys() || []).filter((t) => Boolean(t.id))
    if (!toys.length) {
      if (needsScale(null, state().patternPrices, gLo)) {
        changed = applyUsdScale({ usdLo: gLo, usdHi: gHi, usdPer }) || changed
      }
      return changed
    }
    for (const toy of toys) {
      const id = toy.id!
      const range = state().toyMenuUsd?.[id] || { lo: gLo, hi: gHi }
      const lo = range.lo || gLo
      const hi = Math.max(lo, range.hi || gHi)
      const ladder = state().toyPatternPrices?.[id]
      const effective =
        ladder && Object.keys(ladder).length ? ladder : state().patternPrices
      if (!needsScale(toy, effective, lo, id)) continue
      changed =
        applyUsdScale({ toyId: id, usdLo: lo, usdHi: hi, usdPer }) || changed
    }
    // Shared catalog dust still feeds new toys that fall back to it.
    if (needsScale(null, state().patternPrices, gLo)) {
      changed = applyUsdScale({ usdLo: gLo, usdHi: gHi, usdPer }) || changed
    }
    return changed
  }

  function selectTipCoin(tokenAddress: string) {
    const tokenEl = document.getElementById('token') as HTMLInputElement | null
    const decEl = document.getElementById('token-dec') as HTMLInputElement | null
    const symEl = document.getElementById('token-sym') as HTMLInputElement | null
    const labelEl = document.getElementById('token-label') as HTMLInputElement | null
    const key = tokenAddress.trim().toLowerCase()
    const prevKey = (state().tokenAddress || '').trim().toLowerCase()

    if (!key) {
      const chain = CHAINS[state().chainKey]
      state().tokenAddress = ''
      state().tokenSymbol = chain.symbol
      state().tokenDecimals = chain.chain.nativeCurrency.decimals ?? 18
      if (tokenEl) tokenEl.value = ''
      if (symEl) symEl.value = chain.symbol
      if (decEl) decEl.value = String(state().tokenDecimals)
      if (labelEl) labelEl.value = ''
      ctx.saveSettings({
        ...ctx.readForm(),
        tokenAddress: '',
        tokenSymbol: state().tokenSymbol,
        tokenDecimals: state().tokenDecimals,
      })
    } else {
      const saved = (state().savedTokens || []).find(
        (t) => t.address.toLowerCase() === key,
      )
      const symbol = saved?.symbol || state().tokenSymbol || 'TOKEN'
      const decimals = saved?.decimals ?? state().tokenDecimals ?? 18
      const label = saved?.label || ''
      state().tokenAddress = saved?.address || tokenAddress
      state().tokenSymbol = symbol
      state().tokenDecimals = decimals
      if (tokenEl) tokenEl.value = state().tokenAddress
      if (symEl) symEl.value = symbol
      if (decEl) decEl.value = String(decimals)
      if (labelEl) labelEl.value = label
      ctx.saveSettings({
        ...ctx.readForm(),
        tokenAddress: state().tokenAddress,
        tokenSymbol: symbol,
        tokenDecimals: decimals,
      })
    }

    const tipCoin = activeTipCoin()
    const label = tipCoin.display || CHAINS[state().chainKey].symbol
    const finish = (note: string) => {
      setCoinMatrixStatus(note)
      paintCoinPrice()
      paintPatterns()
      ctx.paintSession()
    }

    if (key === prevKey) {
      finish(`Active tip coin: ${label}`)
      return
    }

    void (async () => {
      const quotes = await ensureUsdQuotesForTokens([
        tipCoin.tokenAddress || '',
      ])
      const quoteKey = (tipCoin.tokenAddress || '').trim().toLowerCase()
      const usdPer =
        quotes[quoteKey] ??
        peekUsdPerTipUnit(tipCoin) ??
        (isApproxUsdStable(tipCoin.tokenAddress) ? 1 : null)
      if (usdPer == null || !Number.isFinite(usdPer) || usdPer <= 0) {
        finish(
          `Active tip coin: ${label} · ${noPriceDetectedNote(label)}`,
        )
        return
      }
      paintedUsdKey = `${tipCoin.tokenAddress || ''}|${tipCoin.symbol}|${tipCoin.display}`
      paintedUsdPerUnit = usdPer
      const scaled = rescaleLaddersForTipCoin(usdPer)
      finish(
        `Active tip coin: ${label} · ladders rescaled (≈ ${scaled.shortest.toLocaleString()}–${scaled.longest.toLocaleString()} ${label})`,
      )
    })()
  }

  function renderPriceChip(
    coin: { key: string; label: string; tokenAddress: string },
    usd: number | null | undefined,
  ) {
    const chip = document.createElement('button')
    chip.type = 'button'
    const skin = coinPaintSkin(coin.tokenAddress)
    chip.className = `menu-coin-price-chip coin-skin-${skin}`
    chip.style.setProperty('--coin-hue', String(coinColorHue(coin.tokenAddress)))
    const picked = selectedCoinKeys.has(coin.key)
    if (picked) chip.classList.add('is-picked')
    chip.setAttribute('aria-pressed', picked ? 'true' : 'false')
    chip.textContent =
      usd != null
        ? `${coin.label} · $${formatUsdApprox(usd)}`
        : `${coin.label} · …`
    chip.title =
      usd != null
        ? picked
          ? `1 ${coin.label} ≈ $${formatUsdApprox(usd)} · click to unselect`
          : `1 ${coin.label} ≈ $${formatUsdApprox(usd)} · click to select`
        : `Fetching ${coin.label} price…`
    chip.addEventListener('click', () => togglePaintCoin(coin))
    if (!canRemoveBoardCoin(coin)) return chip
    const wrap = document.createElement('div')
    wrap.className = 'menu-coin-price-chip-wrap'
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'menu-coin-chip-remove'
    remove.setAttribute('aria-label', `Remove ${coin.label}`)
    remove.title = `Remove ${coin.label}`
    remove.textContent = '×'
    remove.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      hideBoardCoin(coin)
    })
    wrap.append(chip, remove)
    return wrap
  }

  function renderSuggestionSelect(
    coins: Array<{ key: string; label: string; tokenAddress: string }>,
    usdFor: (coin: { key: string; tokenAddress: string }) => number | null | undefined,
  ) {
    const wrap = document.createElement('label')
    wrap.className = 'menu-coin-suggest'
    const cap = document.createElement('span')
    cap.className = 'visually-hidden'
    cap.textContent = 'Suggested tokens'
    const sel = document.createElement('select')
    sel.id = 'menu-coin-suggest'
    sel.setAttribute('aria-label', 'Suggested tokens')
    const placeholder = document.createElement('option')
    placeholder.value = ''
    placeholder.textContent = 'Suggestions…'
    sel.append(placeholder)
    for (const coin of coins) {
      const opt = document.createElement('option')
      opt.value = coin.key || NATIVE_COIN_KEY
      const usd = usdFor(coin)
      opt.textContent =
        usd != null
          ? `${coin.label} · $${formatUsdApprox(usd)}`
          : `${coin.label} · …`
      sel.append(opt)
    }
    sel.addEventListener('change', () => {
      const raw = sel.value
      sel.value = ''
      if (!raw) return
      const key = raw === NATIVE_COIN_KEY ? '' : raw
      let coin = coinsForPriceBoard().find((c) => c.key === key)
      if (!coin) {
        coin = coinsForSuggestionMenu().find((c) => c.key === key)
        if (!coin) return
        restoreHiddenBoardCoin(coin)
        coin = coinsForPriceBoard().find((c) => c.key === key) || coin
      }
      if (coin && !selectedCoinKeys.has(coin.key)) togglePaintCoin(coin)
    })
    wrap.append(cap, sel)
    return wrap
  }

  function togglePaintCoin(coin: {
    key: string
    label: string
    tokenAddress: string
  }) {
    // Whitelist change auto-splits tip coins across toy tabs:
    // 1 coin → every toy, 2 coins → half each, and so on.
    if (selectedCoinKeys.has(coin.key)) {
      selectedCoinKeys.delete(coin.key)
      clearPaintForCoin(coin.key)
      if (!selectedCoinKeys.size) {
        // Last chip off — nothing may stay painted, orphans included.
        clearAllPaint()
        setCoinMatrixStatus(`Cleared ${coin.label} — no coins selected`)
      } else {
        distributeWhitelistAcrossToys()
      }
    } else {
      selectedCoinKeys.add(coin.key)
      distributeWhitelistAcrossToys()
    }
    persistPaintWhitelist()
    updatePaintHint()
    paintCoinPrice()
    paintPatterns()
    ctx.paintSession()
  }

  /**
   * Split menu toys evenly across the current whitelist.
   * One coin paints every toy; two coins split ~half/~half; etc.
   */
  function distributeWhitelistAcrossToys() {
    const coins = selectedPaintCoins()
    const toys = (ctx.menuFitToys() || []).filter((t) => Boolean(t.id))
    if (!coins.length) return

    if (!toys.length) {
      // No toy tabs yet — paint the shared (pattern-wide) menu with the first coin.
      const coin = coins[0]!
      const menu = patternsForSharedMenu({
        disabled: state().disabledPatterns,
        featured: state().featuredPatterns,
        includeDisabled: false,
      })
      const incoming = menu.map((p) => ({
        coin: coin.label,
        tokenAddress: coin.tokenAddress,
        patternId: p.id,
        usdTarget: usdTargetForPattern(p.id, undefined, coin.key),
        enabled: true,
        toyIds: [] as string[],
      }))
      const kept = (state().coinRewardRules || []).filter((rule) =>
        Boolean(rule.toyIds.length),
      )
      persistCoinRules(upsertCoinRewardRules(kept, incoming))
      setCoinMatrixStatus(`${coin.label} → shared menu (${incoming.length} patterns)`)
      return
    }

    const n = coins.length
    const m = toys.length
    const base = Math.floor(m / n)
    const extra = m % n
    const incoming: Array<{
      coin: string
      tokenAddress: string
      patternId: string
      usdTarget: number
      enabled: boolean
      toyIds: string[]
    }> = []
    const summary: string[] = []
    let idx = 0
    for (let c = 0; c < n; c++) {
      const size = base + (c < extra ? 1 : 0)
      const coin = coins[c]!
      const slice = toys.slice(idx, idx + size)
      idx += size
      if (!slice.length) continue
      const names: string[] = []
      for (const toy of slice) {
        const toyId = toy.id!
        names.push(shortToyLabel(toy.name || '', toy.toyType, toyId))
        const menu = patternsForToyMenu(toy, {
          disabled: state().disabledPatterns,
          featured: state().featuredPatterns,
          includeDisabled: false,
        })
        for (const p of menu) {
          incoming.push({
            coin: coin.label,
            tokenAddress: coin.tokenAddress,
            patternId: p.id,
            usdTarget: usdTargetForPattern(p.id, toyId, coin.key),
            enabled: true,
            toyIds: [toyId],
          })
        }
      }
      summary.push(`${coin.label}→${names.join('+') || '—'}`)
    }

    const toyIds = new Set(toys.map((t) => t.id!))
    const whitelisted = new Set(coins.map((c) => c.key))
    const kept: CoinRewardRule[] = []
    for (const rule of state().coinRewardRules || []) {
      if (!rule.toyIds.length) continue // drop shared; toys own the paint now
      // Unselected coins never survive, even on tabs that are closed now.
      if (!whitelisted.has(rule.tokenAddress.trim().toLowerCase())) continue
      const remaining = rule.toyIds.filter((id) => !toyIds.has(id))
      if (remaining.length) kept.push({ ...rule, toyIds: remaining })
    }
    persistCoinRules(upsertCoinRewardRules(kept, incoming))
    setCoinMatrixStatus(
      n === 1
        ? `${coins[0]!.label} on all ${m} toy${m === 1 ? '' : 's'}`
        : `Split ${n} coins · ${summary.join(' · ')}`,
    )
    ctx.showError('')
  }

  function paintCoinsOnto(
    patternId: PatternId,
    toyId: string | null,
  ): { assigned: boolean; labels: string[] } {
    const coins = selectedPaintCoins()
    if (!coins.length) return { assigned: false, labels: [] }
    let rules = state().coinRewardRules || []
    const allOn = coins.every((c) =>
      isCoinAssigned(rules, c.key, patternId, toyId),
    )
    const labels: string[] = []
    for (const coin of coins) {
      const on = isCoinAssigned(rules, coin.key, patternId, toyId)
      if (allOn ? on : !on) {
        const next = toggleCoinRewardAssignment(rules, {
          coin: coin.label,
          tokenAddress: coin.tokenAddress,
          patternId,
          usdTarget: usdTargetForPattern(patternId, toyId || undefined, coin.key),
          toyId,
        })
        rules = next.rules
        labels.push(coin.label)
      }
    }
    persistCoinRules(rules)
    return { assigned: !allOn, labels }
  }

  /**
   * Copy each toy’s existing tip-coin paint onto a newly menu’d pattern so
   * Catalog → Add to menu matches neighboring cards.
   */
  function inheritCurrencyOntoPattern(patternId: PatternId) {
    const definition = getPattern(patternId)
    if (!definition) return

    const incoming: Array<{
      coin: string
      tokenAddress: string
      patternId: string
      usdTarget: number
      enabled: boolean
      toyIds: string[]
    }> = []
    const rules = state().coinRewardRules || []
    const toys = (ctx.menuFitToys() || []).filter((t) => Boolean(t.id))

    if (!toys.length) {
      const sharedCoins = new Map<string, CoinRewardRule>()
      for (const rule of rules) {
        if (!rule.enabled || rule.toyIds.length) continue
        const key = rule.tokenAddress.trim().toLowerCase()
        if (!sharedCoins.has(key)) sharedCoins.set(key, rule)
      }
      for (const rule of sharedCoins.values()) {
        const key = rule.tokenAddress.trim().toLowerCase()
        incoming.push({
          coin: rule.coin,
          tokenAddress: rule.tokenAddress,
          patternId,
          usdTarget: usdTargetForPattern(patternId, undefined, key),
          enabled: true,
          toyIds: [],
        })
      }
    } else {
      for (const toy of toys) {
        const toyId = toy.id!
        if (
          !patternFitsToy(patternNeeds(definition), toy, definition.forProducts)
        ) {
          continue
        }
        const coins = new Map<string, CoinRewardRule>()
        for (const rule of rules) {
          if (!rule.enabled || !rule.toyIds.includes(toyId)) continue
          const key = rule.tokenAddress.trim().toLowerCase()
          if (!coins.has(key)) coins.set(key, rule)
        }
        for (const rule of coins.values()) {
          const key = rule.tokenAddress.trim().toLowerCase()
          incoming.push({
            coin: rule.coin,
            tokenAddress: rule.tokenAddress,
            patternId,
            usdTarget: usdTargetForPattern(patternId, toyId, key),
            enabled: true,
            toyIds: [toyId],
          })
        }
      }
    }

    if (!incoming.length) return
    persistCoinRules(upsertCoinRewardRules(rules, incoming))
  }

  function paintPatternWithCoin(patternId: PatternId) {
    const coins = selectedPaintCoins()
    const toyId = activePatternToyId || null

    // No paint selection: click again on a painted pattern clears its coins.
    if (!coins.length) {
      const existing = coinRewardRulesForPattern(
        state().coinRewardRules || [],
        patternId,
        toyId || undefined,
      )
      if (existing.length) {
        let rules = state().coinRewardRules || []
        for (const rule of existing) {
          const next = toggleCoinRewardAssignment(rules, {
            coin: rule.coin,
            tokenAddress: rule.tokenAddress,
            patternId,
            usdTarget: rule.usdTarget,
            toyId,
          })
          rules = next.rules
        }
        persistCoinRules(rules)
        setCoinMatrixStatus(`Cleared coin colors from ${patternId}`)
        paintPatterns()
        ctx.paintSession()
        return
      }
      updatePaintHint(
        'No coin selected — click a coin chip above, then click this pattern',
      )
      return
    }

    const { assigned, labels } = paintCoinsOnto(patternId, toyId)
    setCoinMatrixStatus(
      assigned
        ? `${labels.join(', ')} → ${patternId}${toyId ? ' on active toy' : ''}`
        : `Removed ${labels.join(', ')} from ${patternId}`,
    )
    ctx.showError('')
    paintPatterns()
    ctx.paintSession()
  }

  /**
   * Drop paint for these toys (or shared menu when `fitToys` is empty), then
   * write `incoming`. Used by single-coin and All-currencies assign so swapping
   * All → PLS does not leave stacked badges behind.
   */
  function replacePaintOnToys(
    fitToys: CapabilitySource[],
    incoming: Array<{
      coin: string
      tokenAddress: string
      patternId: string
      usdTarget: number
      enabled: boolean
      toyIds: string[]
    }>,
  ) {
    const toyIds = new Set(
      fitToys.map((t) => t.id).filter((id): id is string => Boolean(id)),
    )
    const kept: CoinRewardRule[] = []
    for (const rule of state().coinRewardRules || []) {
      if (!rule.toyIds.length) {
        // Shared rows only survive when we are painting a toy tab.
        if (toyIds.size) kept.push(rule)
        continue
      }
      if (!toyIds.size) {
        kept.push(rule)
        continue
      }
      const remaining = rule.toyIds.filter((id) => !toyIds.has(id))
      if (remaining.length) kept.push({ ...rule, toyIds: remaining })
    }
    persistCoinRules(upsertCoinRewardRules(kept, incoming))
  }

  /**
   * Dropdown pick: this coin becomes the only paint on the active toy.
   * Replaces other coins instead of stacking a second badge on each pattern.
   */
  function assignCurrencyToVisiblePatterns(tokenAddress: string) {
    const key = tokenAddress.trim().toLowerCase()
    const coin = coinsForPriceBoard().find((c) => c.key === key)
    if (!coin || !selectedCoinKeys.has(coin.key)) {
      updatePaintHint(
        'Select coin chips above first — the currency list only shows selected coins',
      )
      return
    }
    // Keep the rest of the whitelist. Dropping it here stranded the other
    // tabs on coins with no chip, so unselecting could never clear them.
    selectedCoinKeys.add(coin.key)
    persistPaintWhitelist()

    // The card lives inside the active tab, so paint that toy only.
    const allToys = (ctx.menuFitToys() || []).filter((t) => Boolean(t.id))
    const active = activePatternToyId
      ? allToys.filter((t) => t.id === activePatternToyId)
      : []
    const fitToys = active.length ? active : activePatternToyId ? [] : allToys
    const incoming: Array<{
      coin: string
      tokenAddress: string
      patternId: string
      usdTarget: number
      enabled: boolean
      toyIds: string[]
    }> = []
    if (!fitToys.length) {
      const menu = patternsForSharedMenu({
        disabled: state().disabledPatterns,
        featured: state().featuredPatterns,
        includeDisabled: false,
      })
      for (const p of menu) {
        incoming.push({
          coin: coin.label,
          tokenAddress: coin.tokenAddress,
          patternId: p.id,
          usdTarget: usdTargetForPattern(p.id, undefined, coin.key),
          enabled: true,
          toyIds: [],
        })
      }
    } else {
      for (const toy of fitToys) {
        const toyId = toy.id!
        const menu = patternsForToyMenu(toy, {
          disabled: state().disabledPatterns,
          featured: state().featuredPatterns,
          includeDisabled: false,
        })
        for (const p of menu) {
          incoming.push({
            coin: coin.label,
            tokenAddress: coin.tokenAddress,
            patternId: p.id,
            usdTarget: usdTargetForPattern(p.id, toyId, coin.key),
            enabled: true,
            toyIds: [toyId],
          })
        }
      }
    }
    replacePaintOnToys(fitToys, incoming)

    const toyLabel = fitToys.length
      ? shortToyLabel(
          fitToys[0]!.name || '',
          fitToys[0]!.toyType,
          fitToys[0]!.id,
        )
      : 'shared menu'
    setCoinMatrixStatus(
      `${coin.label} → ${incoming.length} pattern${
        incoming.length === 1 ? '' : 's'
      } on ${toyLabel}`,
    )
    ctx.showError('')
    // Repaint now — selectTipCoin may wait on a USD quote, and the dropdown
    // should show the new coin immediately.
    paintPatterns()
    updatePaintHint(
      `${coin.label} painted on ${toyLabel} — click a chip again to unselect`,
    )
    selectTipCoin(coin.tokenAddress)
  }

  /**
   * Dropdown: paint every selected whitelist coin onto this toy’s menu
   * patterns (stacked badges — same tip unlocked by any of those coins).
   */
  function assignAllCurrenciesToVisiblePatterns() {
    const coins = selectedPaintCoins()
    if (coins.length < 2) {
      updatePaintHint('Select at least two coin chips above for All currencies')
      return
    }

    const allToys = (ctx.menuFitToys() || []).filter((t) => Boolean(t.id))
    const active = activePatternToyId
      ? allToys.filter((t) => t.id === activePatternToyId)
      : []
    const fitToys = active.length ? active : activePatternToyId ? [] : allToys
    const incoming: Array<{
      coin: string
      tokenAddress: string
      patternId: string
      usdTarget: number
      enabled: boolean
      toyIds: string[]
    }> = []

    if (!fitToys.length) {
      const menu = patternsForSharedMenu({
        disabled: state().disabledPatterns,
        featured: state().featuredPatterns,
        includeDisabled: false,
      })
      for (const coin of coins) {
        for (const p of menu) {
          incoming.push({
            coin: coin.label,
            tokenAddress: coin.tokenAddress,
            patternId: p.id,
            usdTarget: usdTargetForPattern(p.id, undefined, coin.key),
            enabled: true,
            toyIds: [],
          })
        }
      }
    } else {
      for (const toy of fitToys) {
        const toyId = toy.id!
        const menu = patternsForToyMenu(toy, {
          disabled: state().disabledPatterns,
          featured: state().featuredPatterns,
          includeDisabled: false,
        })
        for (const coin of coins) {
          for (const p of menu) {
            incoming.push({
              coin: coin.label,
              tokenAddress: coin.tokenAddress,
              patternId: p.id,
              usdTarget: usdTargetForPattern(p.id, toyId, coin.key),
              enabled: true,
              toyIds: [toyId],
            })
          }
        }
      }
    }

    replacePaintOnToys(fitToys, incoming)

    const toyLabel = fitToys.length
      ? shortToyLabel(
          fitToys[0]!.name || '',
          fitToys[0]!.toyType,
          fitToys[0]!.id,
        )
      : 'shared menu'
    const labels = coins.map((c) => c.label).join(', ')
    setCoinMatrixStatus(
      `All currencies (${labels}) → ${toyLabel} · ${incoming.length} coin×pattern rows`,
    )
    ctx.showError('')
    paintPatterns()
    updatePaintHint(
      `All ${coins.length} coins painted on ${toyLabel} — hover a tip field for amounts`,
    )
    // Tip ladder unit stays the first selected coin so Scale menu has a quote.
    selectTipCoin(coins[0]!.tokenAddress)
  }

  /** Badge click toggles this coin on/off for the pattern (stays visible). */
  function cycleCoinOnPattern(patternId: PatternId, tokenKey: string) {
    const toyId = activePatternToyId || null
    const coin = coinsForPriceBoard().find((c) => c.key === tokenKey)
    if (!coin || !selectedCoinKeys.has(coin.key)) return

    const onPattern = coinRewardRulesForPattern(
      state().coinRewardRules || [],
      patternId,
      toyId || undefined,
    )
    const current = onPattern.find(
      (r) => r.tokenAddress.trim().toLowerCase() === tokenKey,
    )
    const usdTarget =
      current?.usdTarget ??
      usdTargetForPattern(patternId, toyId || undefined, coin.key)
    const { rules, assigned } = toggleCoinRewardAssignment(
      state().coinRewardRules || [],
      {
        coin: coin.label,
        tokenAddress: coin.tokenAddress,
        patternId,
        usdTarget,
        toyId,
      },
    )
    persistCoinRules(rules)
    setCoinMatrixStatus(
      assigned
        ? `On · ${coin.label} on ${patternId}`
        : `Off · ${coin.label} on ${patternId}`,
    )
    ctx.showError('')
    paintPatterns()
    ctx.paintSession()
  }

  function paintCoinPrice() {
    const pruned = (state().savedTokens || []).filter(
      (t) => !isRetiredTipPreset(t.address),
    )
    if (pruned.length !== (state().savedTokens || []).length) {
      state().savedTokens = pruned
      ctx.saveSettings({ ...ctx.readForm(), savedTokens: pruned })
      for (const key of [...selectedCoinKeys]) {
        if (key && isRetiredTipPreset(key)) {
          selectedCoinKeys.delete(key)
        }
      }
    }
    // Stables tip by USD when selected — they are never paint rows.
    const withoutPaintJunk = (state().coinRewardRules || []).filter(
      (r) => !isStableTipPreset(r.tokenAddress),
    )
    if (withoutPaintJunk.length !== (state().coinRewardRules || []).length) {
      persistCoinRules(withoutPaintJunk)
    }
    const priceEl = document.getElementById('menu-coin-price')
    if (!priceEl) return

    const coins = coinsForPriceBoard()
    const suggestions = coinsForSuggestionMenu()
    const addrs = [
      ...new Set([
        ...coins.map((c) => c.tokenAddress),
        ...suggestions.map((c) => c.tokenAddress),
      ]),
    ]
    const quotes = peekUsdQuoteMap(addrs)

    const fillBoards = (
      usdFor: (coin: { key: string; tokenAddress: string }) => number | null | undefined,
    ) => {
      const board = document.getElementById('menu-coin-price')
      if (!board) return
      board.replaceChildren()
      for (const coin of coinsForFrontChips()) {
        board.append(renderPriceChip(coin, usdFor(coin)))
      }
      const suggestions = coinsForSuggestionMenu()
      if (suggestions.length) {
        board.append(renderSuggestionSelect(suggestions, usdFor))
      }
    }

    fillBoards((coin) => quotes[coin.key])
    updatePaintHint()

    void ensureUsdQuotesForTokens(addrs).then((next) => {
      if (!document.getElementById('menu-coin-price')) return
      const still = coinsForPriceBoard()
      if (
        still.length !== coins.length ||
        still.some((c, i) => c.key !== coins[i]?.key)
      ) {
        paintCoinPrice()
        return
      }
      fillBoards(
        (coin) => next[coin.key] ?? peekUsdQuoteMap([coin.tokenAddress])[coin.key],
      )
    })
  }

  function downloadText(filename: string, text: string) {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function formatUsdScaleInput(usd: number): string {
    if (!Number.isFinite(usd) || usd < 0) return ''
    if (usd >= 1000) return usd.toFixed(0)
    // Tip targets are real dollars — always cents, never dust.
    return usd.toFixed(2)
  }

  function activeTipCoin(): TipCoinForUsd & { display: string } {
    const chain = CHAINS[state().chainKey]
    const tokenRaw = state().tokenAddress.trim()
    const hasTipToken = Boolean(tokenRaw && isAddress(tokenRaw))
    if (!hasTipToken) {
      return { symbol: chain.symbol, tokenAddress: null, display: chain.symbol }
    }
    const saved = (state().savedTokens || []).find(
      (t) => t.address.toLowerCase() === tokenRaw.toLowerCase(),
    )
    const display =
      (saved ? tokenDisplayLabel(saved) : '') ||
      ctx.getTokenLabelFieldValue().trim() ||
      ctx.tokenLabelForAddress(tokenRaw) ||
      state().tokenSymbol ||
      'TOKEN'
    return {
      symbol: state().tokenSymbol || display,
      tokenAddress: tokenRaw,
      display,
    }
  }

  function scheduleUsdHoverRefresh() {
    const coin = activeTipCoin()
    const key = `${coin.tokenAddress || ''}|${coin.symbol}|${coin.display}`
    const peek = peekUsdPerTipUnit(coin)
    if (peek != null && (paintedUsdKey !== key || paintedUsdPerUnit !== peek)) {
      paintedUsdKey = key
      paintedUsdPerUnit = peek
      ensureUsdScaledLadders(peek)
      paintPatterns()
      paintCoinPrice()
      return
    }
    void resolveUsdPerTipUnit(coin).then((usd) => {
      if (paintedUsdKey === key && paintedUsdPerUnit === usd) return
      paintedUsdKey = key
      paintedUsdPerUnit = usd
      if (usd != null) ensureUsdScaledLadders(usd)
      paintPatterns()
      paintCoinPrice()
    })
  }

  function backupToyMenuPack(toyId: string) {
    const menuToys = toysForTipMenu(ctx.getDeviceToys())
    const toy =
      menuToys.find((t) => t.id === toyId) ||
      ctx.getDeviceToys().find((t) => t.id === toyId)
    if (!toy?.id) {
      ctx.showError('Toy not found for backup')
      return
    }
    const label = shortToyLabel(toy.name || '', toy.toyType, toy.id)
    const pack = buildToyMenuPack({
      toy,
      label,
      basePrices: state().patternPrices,
      toyPrices: state().toyPatternPrices || {},
      disabled: state().disabledPatterns,
      featured: state().featuredPatterns,
    })
    downloadToyMenuPack(pack)
    ctx.showError('')
    setCoinMatrixStatus(`Backed up ${pack.items.length} patterns · ${label}`)
  }

  function importToyMenuPackFile(file: File, toyId: string) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const pack = parseToyMenuPack(JSON.parse(String(reader.result || '')))
        const targetLabel =
          shortToyLabel(
            ctx.getDeviceToys().find((t) => t.id === toyId)?.name || '',
            ctx.getDeviceToys().find((t) => t.id === toyId)?.toyType,
            toyId,
          ) || toyId
        const src = pack.label || pack.source.name || 'pack'
        if (
          !confirm(
            `Import “${src}” onto ${targetLabel}?\n\n` +
              `• Applies ${pack.items.length} tip prices to this toy only\n` +
              `• Updates On/Off and Featured for those patterns (shared catalogue flags)\n` +
              `• Does not change other toys’ prices`,
          )
        ) {
          return
        }
        const result = applyToyMenuPack(pack, toyId, {
          toyPatternPrices: state().toyPatternPrices || {},
          disabledPatterns: state().disabledPatterns,
          featuredPatterns: state().featuredPatterns,
        })
        state().toyPatternPrices = result.toyPatternPrices
        state().disabledPatterns = result.disabledPatterns
        state().featuredPatterns = result.featuredPatterns
        ctx.saveSettings({
          ...ctx.readForm(),
          toyPatternPrices: state().toyPatternPrices,
          disabledPatterns: state().disabledPatterns,
          featuredPatterns: state().featuredPatterns,
        })
        paintPatterns()
        ctx.paintSession()
        ctx.showError('')
        setCoinMatrixStatus(
            `Imported ${result.applied} prices onto ${targetLabel}` +
            (result.skipped
              ? ` · ${result.skipped} unknown patterns skipped`
              : ''),
        )
      } catch (e) {
        ctx.showError(e instanceof Error ? e.message : String(e))
      }
    }
    reader.onerror = () => ctx.showError('Could not read file')
    reader.readAsText(file)
  }

  /**
   * The tools tile lives in markup so its buttons keep their listeners, but the
   * grid re-render detaches it — hold the node instead of re-querying by id.
   */
  let toolsCard: HTMLElement | null = null
  function patternToolsCard(): HTMLElement | null {
    if (!toolsCard) {
      toolsCard = document.getElementById('menu-pattern-tools-card')
    }
    return toolsCard
  }

  /**
   * `activeKey` is the coin this tab is already set to ('' = native, null =
   * unpainted). The select shows it so auto-assign is visible here too.
   */
  function paintCurrencySelect(
    activeKey: string | null,
    opts?: { allCurrencies?: boolean },
  ) {
    const currency = $<HTMLSelectElement>('menu-tip-currency')
    const coins = selectedPaintCoins()
    const optionValue = (key: string) => key || 'native'
    currency.replaceChildren()
    const canClear = activeKey !== null || Boolean(opts?.allCurrencies)
    if (!coins.length && !canClear) {
      const opt = document.createElement('option')
      opt.value = ''
      opt.textContent = 'Select coins above'
      currency.append(opt)
      currency.disabled = true
      return
    }
    currency.disabled = false
    const placeholder = document.createElement('option')
    placeholder.value = ''
    placeholder.textContent = coins.length
      ? 'Select coin'
      : 'Select coins above'
    currency.append(placeholder)
    for (const coin of coins) {
      const opt = document.createElement('option')
      opt.value = optionValue(coin.key)
      opt.textContent = coin.label
      currency.append(opt)
    }
    if (coins.length >= 2) {
      const all = document.createElement('option')
      all.value = '__all__'
      all.textContent = 'All currencies'
      all.title =
        'Paint every selected whitelist coin onto this toy’s tip menu patterns'
      currency.append(all)
    }
    if (canClear) {
      const clear = document.createElement('option')
      clear.value = '__clear__'
      clear.textContent = 'Clear tip coins on this toy'
      currency.append(clear)
    }
    // Show All / the coin this tab already carries.
    if (opts?.allCurrencies && coins.length >= 2) {
      currency.value = '__all__'
      return
    }
    const onList = activeKey !== null && coins.some((c) => c.key === activeKey)
    currency.value = onList ? optionValue(activeKey!) : ''
  }

  function toyHasAllSelectedCurrencies(toyId: string): boolean {
    const coins = selectedPaintCoins()
    if (coins.length < 2 || !toyId) return false
    const rules = enabledCoinRewardRules(state().coinRewardRules || [])
    return coins.every((coin) =>
      rules.some(
        (r) =>
          r.tokenAddress.trim().toLowerCase() === coin.key &&
          r.toyIds.includes(toyId),
      ),
    )
  }

  function paintToolsCardLabels(fitToys: CapabilitySource[] | null) {
    const active =
      (fitToys || []).find((t) => t.id === activePatternToyId) || null
    const name = active
      ? shortToyLabel(active.name || '', active.toyType, active.id)
      : ''
    const set = (
      id: string,
      base: string,
      aria: string,
      withToy = false,
    ) => {
      const el = document.getElementById(id)
      if (el) el.textContent = withToy && name ? `${base} - ${name}` : base
      const inputId =
        id === 'menu-tools-currency-label'
          ? 'menu-tip-currency'
          : id === 'menu-tools-lo-label'
            ? 'menu-base-price'
            : id === 'menu-tools-hi-label'
              ? 'menu-top-price'
              : 'menu-max-vibe'
      const control = document.getElementById(inputId)
      if (control) {
        control.setAttribute(
          'aria-label',
          name ? `${aria} for ${name}` : aria,
        )
      }
    }
    set('menu-tools-currency-label', 'Currency', 'Tip coin', true)
    set('menu-tools-lo-label', 'Low', 'Lowest tip in USD')
    set('menu-tools-hi-label', 'High', 'Highest tip in USD')
    set(
      'menu-tools-max-vibe-label',
      'Max vibe',
      'Maximum vibration strength',
      true,
    )
  }

  function setToyMenuBusy(on: boolean, note = 'Loading…') {
    const block = document.querySelector('.menu-catalog-block')
    block?.classList.toggle('is-busy', on)
    block?.setAttribute('aria-busy', on ? 'true' : 'false')
    const el = document.getElementById('menu-toy-loading')
    if (el) {
      el.hidden = !on
      const text = el.querySelector('.menu-toy-loading-text')
      if (text) text.textContent = note
    }
    const search = document.getElementById(
      'menu-toy-search',
    ) as HTMLInputElement | null
    if (search) search.disabled = on
  }

  /**
   * Pattern cards rebuild on the main thread (100+ SVGs). Show the spinner
   * for a frame first so adding the 3rd/4th toy does not feel frozen.
   */
  function runToyMenuWork(note: string, work: () => void) {
    setToyMenuBusy(true, note)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          work()
        } finally {
          setToyMenuBusy(false)
        }
      })
    })
  }

  function paintPatterns() {
    restorePaintSelectionFromRules()
    const menuSortEl = $<HTMLSelectElement>('menu-sort')
    const baseEl = $<HTMLInputElement>('menu-base-price')
    fillMenuSortSelect(menuSortEl, state().menuSort)
    const menuToys = toysForTipMenu(ctx.getDeviceToys())
    const selectedIds = ctx.resolvedFilterToyIds(menuToys)
    const fitToys = ctx.menuFitToys()
    if (fitToys?.length) {
      const ids = fitToys.map((t) => t.id).filter(Boolean) as string[]
      if (!ids.includes(activePatternToyId)) {
        activePatternToyId = ids[0] || ''
      }
    } else {
      activePatternToyId = ''
    }
    paintToolsCardLabels(fitToys)

    paintMenuToyTicks(
      $('menu-toy-ticks'),
      {
        toys: menuToys,
        selectedIds,
      },
      (nextIds) => {
        const prev = new Set(selectedIds)
        const added = nextIds.find((id) => !prev.has(id))
        const removed = selectedIds.find((id) => !nextIds.includes(id))
        const label = added
          ? shortToyLabel(
              menuToys.find((t) => t.id === added)?.name || '',
              menuToys.find((t) => t.id === added)?.toyType,
              added,
            )
          : ''
        runToyMenuWork(
          added ? `Loading ${label || 'toy'}…` : 'Updating toys…',
          () => {
        state().menuFilterToyIds = nextIds
            if (added) activePatternToyId = added
            else if (!nextIds.includes(activePatternToyId)) {
              activePatternToyId = nextIds[0] || ''
            }
        ctx.saveSettings({
          ...ctx.readForm(),
          menuFilterToyIds: state().menuFilterToyIds,
        })
            // New/removed tabs reshuffle the whitelist split across toys.
            if (selectedCoinKeys.size && (added || removed)) {
              distributeWhitelistAcrossToys()
            }
        paintPatterns()
          },
        )
      },
    )

    const tipCoin = activeTipCoin()
    const usdPer =
      paintedUsdKey ===
      `${tipCoin.tokenAddress || ''}|${tipCoin.symbol}|${tipCoin.display}`
        ? paintedUsdPerUnit
        : peekUsdPerTipUnit(tipCoin)
    // Catalog defaults (500 PLS ≈ dust) vs $3.69 placeholders — scale without a click.
    if (usdPer != null) ensureUsdScaledLadders(usdPer)
    const topEl = $<HTMLInputElement>('menu-top-price')
    const toyId = activePatternToyId || ''
    const toyUsd = toyId ? state().toyMenuUsd?.[toyId] : undefined
    const usdLo = toyUsd?.lo || state().menuUsdLo || DEFAULT_USD_TIP_LO
    const usdHi = toyUsd?.hi || state().menuUsdHi || DEFAULT_USD_TIP_HI
    const toyLadder = toyId
      ? state().toyPatternPrices?.[toyId]
      : undefined
    const scalePrices =
      toyLadder && Object.keys(toyLadder).length
        ? toyLadder
        : state().patternPrices
    const tokenLo = menuBaseFromPrices(scalePrices)
    const tokenHi = menuTopFromPrices(scalePrices)
    // These inputs are the operator's USD intent, not a readout of the ladder.
    if (document.activeElement !== baseEl) {
      baseEl.value = formatUsdScaleInput(usdLo)
    }
    if (document.activeElement !== topEl) {
      topEl.value = formatUsdScaleInput(usdHi)
    }
    baseEl.placeholder = formatUsdScaleInput(DEFAULT_USD_TIP_LO)
    topEl.placeholder = formatUsdScaleInput(DEFAULT_USD_TIP_HI)
    const maxVibeEl = $<HTMLInputElement>('menu-max-vibe')
    const maxVibeOut = $<HTMLOutputElement>('menu-max-vibe-val')
    const maxVibe = resolveToyMaxVibe(toyId || undefined, state())
    if (document.activeElement !== maxVibeEl) {
      maxVibeEl.value = String(maxVibe)
    }
    maxVibeOut.textContent = `${maxVibe}/8`
    maxVibeEl.title = toyId
      ? `Pattern peaks never exceed ${maxVibe}/8 on this toy`
      : `Pattern peaks never exceed ${maxVibe}/8 on the shared menu`
    const toyScope = toyId ? 'this toy' : 'the shared menu'
    baseEl.title =
      usdPer == null
        ? noPriceDetectedNote(tipCoin.display)
        : `Shortest tip is ~${tokenLo.toLocaleString()} ${tipCoin.display} (${toyScope}). Scales from the USD range automatically.`
    topEl.title =
      usdPer == null
        ? noPriceDetectedNote(tipCoin.display)
        : `Longest tip is ~${tokenHi.toLocaleString()} ${tipCoin.display} (${toyScope}). Scales from the USD range automatically.`

    const modified = new Set(Object.keys(state().patternOverrides))
    const assignBadges: Record<
      string,
      Array<{
        key: string
        label: string
        hue: number
        skin: string
        on: boolean
        usdTarget?: number
        amount?: number | null
      }>
    > = {}
    const catalog = selectedPaintCoins()
    const badgeQuoteAddrs: string[] = catalog.map((c) => c.tokenAddress)
    const catalogQuotes = peekUsdQuoteMap(badgeQuoteAddrs)
    for (const p of PATTERNS) {
      if (!catalog.length) continue
      const rows = coinRewardRulesForPattern(
        state().coinRewardRules || [],
        p.id,
        activePatternToyId || undefined,
      )
      const assigned = new Map(
        rows.map((rule) => [rule.tokenAddress.trim().toLowerCase(), rule]),
      )
      assignBadges[p.id] = catalog.map((coin) => {
        const rule = assigned.get(coin.key)
        const usdTarget =
          rule?.usdTarget ??
          usdTargetForPattern(p.id, activePatternToyId || undefined, coin.key)
        const usdPer = catalogQuotes[coin.key] ?? null
        return {
          key: coin.key,
          label: coin.label,
          hue: coinColorHue(coin.tokenAddress),
          skin: coinPaintSkin(coin.tokenAddress),
          on: Boolean(rule),
          usdTarget,
          amount: usdTargetToTokenAmount(
            usdTarget,
            usdPer,
            decimalsForToken(coin.tokenAddress),
          ),
        }
      })
    }
    if (badgeQuoteAddrs.length) {
      void ensureUsdQuotesForTokens(badgeQuoteAddrs).then((next) => {
        let missing = false
        for (const rows of Object.values(assignBadges)) {
          for (const b of rows) {
            if (b.amount != null) continue
            const usdPer = next[b.key] ?? peekUsdQuoteMap([b.key])[b.key]
            if (usdPer == null) continue
            missing = true
            break
          }
          if (missing) break
        }
        if (missing) paintPatterns()
      })
    }
    const paintKeys = selectedCoinKeys
    const paintHue =
      paintKeys.size > 0
        ? coinColorHue(
            coinsForPriceBoard().find((c) => paintKeys.has(c.key))
              ?.tokenAddress,
          )
        : null

    /**
     * Only toys named on a rule are painted — a pattern-wide rule (empty
     * toyIds) belongs to the shared menu, not to every tab.
     * Color = majority ERC-20 on that toy (native PLS rows are ignored) so
     * cycling one pattern badge does not recolor the tools card.
     */
    const toyPaint: Record<
      string,
      { key: string; hue: number; skin: string }
    > = {}
    for (const toy of fitToys || []) {
      if (!toy.id) continue
      const rules = (state().coinRewardRules || []).filter(
        (r) => r.enabled && r.toyIds.includes(toy.id!),
      )
      if (!rules.length) continue
      const tally = new Map<string, { count: number; rule: (typeof rules)[0] }>()
      for (const rule of rules) {
        const key = rule.tokenAddress.trim().toLowerCase()
        const prev = tally.get(key)
        if (prev) prev.count += 1
        else tally.set(key, { count: 1, rule })
      }
      let best: { count: number; rule: (typeof rules)[0] } | null = null
      for (const row of tally.values()) {
        if (
          !best ||
          row.count > best.count ||
          (row.count === best.count &&
            row.rule.tokenAddress.localeCompare(best.rule.tokenAddress) < 0)
        ) {
          best = row
        }
      }
      if (!best) continue
      toyPaint[toy.id] = {
        key: best.rule.tokenAddress.trim().toLowerCase(),
        hue: coinColorHue(best.rule.tokenAddress),
        skin: coinPaintSkin(best.rule.tokenAddress),
      }
    }

    const tools = patternToolsCard()
    if (tools) {
      for (const cls of [...tools.classList]) {
        if (cls === 'is-coin-painted' || cls.startsWith('coin-skin-')) {
          tools.classList.remove(cls)
        }
      }
      const toolsPaint = activePatternToyId
        ? toyPaint[activePatternToyId]
        : undefined
      if (toolsPaint) {
        tools.classList.add('is-coin-painted', `coin-skin-${toolsPaint.skin}`)
        tools.style.setProperty('--coin-hue', String(toolsPaint.hue))
    } else {
        tools.style.removeProperty('--coin-hue')
      }
    }
    const sharedRule = (state().coinRewardRules || []).find(
      (r) => !r.toyIds.length,
    )
    paintCurrencySelect(
      activePatternToyId
        ? (toyPaint[activePatternToyId]?.key ?? null)
        : (sharedRule?.tokenAddress.trim().toLowerCase() ?? null),
      {
        allCurrencies: Boolean(
          activePatternToyId &&
            toyHasAllSelectedCurrencies(activePatternToyId),
        ),
      },
    )

    // Tip field unit follows this toy's majority paint coin when set —
    // otherwise a stale form tip coin (e.g. PUMP) labels a PLS ladder.
    // Native PLS uses key '' — must not treat that as "no paint".
    const tabPaintEntry = activePatternToyId
      ? toyPaint[activePatternToyId]
      : undefined
    const tabPaintCoin =
      tabPaintEntry !== undefined
        ? coinsForPriceBoard().find((c) => c.key === tabPaintEntry.key)
        : undefined
    const tipSymbol = tabPaintCoin?.label || tipCoin.display
    const activeTipKey = (state().tokenAddress || '').trim().toLowerCase()
    const tabPaintKey =
      tabPaintEntry !== undefined ? tabPaintEntry.key : null
    // If the tip coin is still native but this tab is painted with an ERC-20,
    // adopt that coin so ladder amounts leave the old PLS dust scale.
    if (
      tabPaintCoin &&
      tabPaintKey &&
      !activeTipKey &&
      !aligningTipCoin
    ) {
      aligningTipCoin = true
      try {
        selectTipCoin(tabPaintCoin.tokenAddress)
      } finally {
        aligningTipCoin = false
      }
      return
    }

    const { total } = paintPatternList(
      $('pattern-list'),
      {
        selected: state().defaultPattern,
        prices: state().patternPrices,
        toyPrices: state().toyPatternPrices || {},
        ratings: state().patternRatings,
        disabled: state().disabledPatterns,
        featured: state().featuredPatterns,
        sort: state().menuSort,
        modified,
        fitToys,
        activeToyId: activePatternToyId,
        tipSymbol,
        usdPerUnit: usdPer,
        leadCard: patternToolsCard(),
        assign: {
          paintKeys,
          paintHue,
          badges: assignBadges,
          toyPaint,
        },
      },
      {
        onSelect: (id) => {
          state().defaultPattern = id
          ctx.saveSettings({ ...ctx.readForm(), defaultPattern: id })
          paintPatterns()
          ctx.paintSession()
        },
        onRate: (id, stars) => {
          state().patternRatings = { ...state().patternRatings, [id]: stars }
          ctx.saveSettings({
            ...ctx.readForm(),
            patternRatings: state().patternRatings,
          })
          paintPatterns()
        },
        onPrice: (id, price, toyId) => {
          let bumped = 0
          if (toyId) {
            const toy =
              (ctx.menuFitToys() || []).find((t) => t.id === toyId) || null
            const menuIds = (
              toy
                ? patternsForToyMenu(toy, {
                    disabled: state().disabledPatterns,
                    featured: state().featuredPatterns,
                    includeDisabled: false,
                  })
                : []
            ).map((p) => p.id)
            let toyMap = setToyPatternPrice(
              state().toyPatternPrices || {},
              toyId,
              id,
              price,
            )
            const repaired = ensureUniqueEffectiveToySheet(
              state().patternPrices,
              toyMap,
              toyId,
              menuIds.length ? menuIds : [id],
            )
            state().toyPatternPrices = repaired.toyPrices
            bumped = repaired.changed.length
            ctx.saveSettings({
              ...ctx.readForm(),
              toyPatternPrices: state().toyPatternPrices,
            })
          } else {
            const menuIds = patternsForSharedMenu({
              disabled: state().disabledPatterns,
              featured: state().featuredPatterns,
              includeDisabled: false,
            }).map((p) => p.id)
            const draft = { ...state().patternPrices, [id]: price }
            const repaired = repairPatternPriceUniqueness(
              draft,
              menuIds.length ? menuIds : [id],
            )
            state().patternPrices = repaired.prices
            bumped = repaired.changed.length
            ctx.saveSettings({
              ...ctx.readForm(),
              patternPrices: state().patternPrices,
            })
          }
          if (bumped > 1 || (bumped === 1 && price !== patternToyPrice(
            id,
            state().patternPrices,
            state().toyPatternPrices,
            toyId,
          ))) {
            ctx.showError(
              bumped === 1
                ? 'Price nudged so each menu amount stays unique'
                : `Adjusted ${bumped} duplicate menu prices to keep SKUs unique`,
            )
          } else {
            ctx.showError('')
          }
          invalidateUsdTargetSheetCache()
          paintPatterns()
          ctx.paintSession()
        },
        onToggleDisabled: (id, disabled) => {
          const set = new Set(state().disabledPatterns)
          if (disabled) set.add(id)
          else set.delete(id)
          state().disabledPatterns = [...set]
          if (disabled) {
            // Drop paint for patterns taken off the tip menu.
            const next = (state().coinRewardRules || []).filter(
              (r) => r.patternId !== id,
            )
            if (next.length !== (state().coinRewardRules || []).length) {
              persistCoinRules(next)
            }
            if (state().featuredPatterns.includes(id)) {
              state().featuredPatterns = state().featuredPatterns.filter(
                (x) => x !== id,
              )
            }
          }
          ctx.saveSettings({
            ...ctx.readForm(),
            disabledPatterns: state().disabledPatterns,
            featuredPatterns: state().featuredPatterns,
          })
          paintPatterns()
          ctx.paintSession()
          ctx.scheduleStreamMenuPush()
          if (disabled) {
            setCoinMatrixStatus(
              `Removed from tip menu — re-add from Pattern catalog`,
            )
          }
        },
        onToggleFeatured: (id, featured) => {
          const set = new Set(state().featuredPatterns)
          if (featured) set.add(id)
          else set.delete(id)
          state().featuredPatterns = [...set]
          ctx.saveSettings({
            ...ctx.readForm(),
            featuredPatterns: state().featuredPatterns,
          })
          paintPatterns()
          ctx.paintSession()
          ctx.scheduleStreamMenuPush()
        },
        onEdit: (id) => openPatternWizard('edit', id),
        onTest: (id, toyId) => {
          state().defaultPattern = id
          ctx.saveSettings({ ...ctx.readForm(), defaultPattern: id })
          paintPatterns()
          ctx.paintSession()
          void ctx.runPatternTest(1, 0, id, patternLabel(id), toyId)
        },
        onReset: (id) => resetPatternToDefault(id),
        onDelete: (id) => deleteCustomPattern(id),
        onSelectToyTab: (toyId) => {
          if (toyId === activePatternToyId) return
          const label =
            shortToyLabel(
              fitToys?.find((t) => t.id === toyId)?.name || '',
              fitToys?.find((t) => t.id === toyId)?.toyType,
              toyId,
            ) || 'toy'
          runToyMenuWork(`Loading ${label}…`, () => {
            activePatternToyId = toyId
            paintPatterns()
          })
        },
        onRemoveToyTab: (toyId) => {
          const next = selectedIds.filter((id) => id !== toyId)
          runToyMenuWork('Updating toys…', () => {
            state().menuFilterToyIds = next
            if (activePatternToyId === toyId) {
              activePatternToyId = next[0] || ''
            }
            ctx.saveSettings({
              ...ctx.readForm(),
              menuFilterToyIds: state().menuFilterToyIds,
            })
            if (selectedCoinKeys.size) distributeWhitelistAcrossToys()
            paintPatterns()
          })
        },
        onPaintPattern: (id) => paintPatternWithCoin(id),
        onCycleCoinBadge: (patternId, tokenKey) =>
          cycleCoinOnPattern(patternId, tokenKey),
        onBackupToy: (toyId) => backupToyMenuPack(toyId),
        onImportToy: (toyId) => {
          pendingToyPackImportId = toyId
          const input = $<HTMLInputElement>('menu-toy-pack-import')
          input.value = ''
          input.click()
        },
      },
    )

    void total
    ctx.scheduleStreamMenuPush()
    scheduleUsdHoverRefresh()
    paintCoinPrice()
  }

  let wizardStrengths: number[] = [4, 4, 0]
  let wizardStepMotors: StepMotorCode[] = [0, 0, 0]
  /** M1 / M2 lanes, only used while Multi-motor is ticked. */
  let wizardLanes: number[][] = [
    [4, 4, 0],
    [4, 4, 0],
  ]
  /** When true, closing the wizard returns to the pattern catalog. */
  let wizardReturnToCatalog = false

  function setWizardErr(msg: string | null, kind: 'err' | 'warn' = 'err') {
    const el = $('wizard-err')
    if (!msg) {
      el.hidden = true
      el.textContent = ''
      el.classList.remove('wizard-dup-warn')
      return
    }
    el.hidden = false
    el.textContent = msg
    el.classList.toggle('wizard-dup-warn', kind === 'warn')
  }

  function wizardShowMotors(): boolean {
    return readWizardNeeds($('wizard-needs')).includes('multi')
  }

  function readWizardDraft() {
    const box = $('wizard-strengths')
    // Read whatever editor is on screen — the tick box may have just flipped.
    if (box.querySelector('.wizard-motor-row')) {
      const lanes = readMotorStrengthEditors(box)
      if (lanes.length) {
        wizardLanes = lanes
        wizardStrengths = lanes[0]!.map((_, i) =>
          Math.max(...lanes.map((lane) => lane[i] ?? 0)),
        )
      }
    } else {
      wizardStrengths = readStrengthEditors(box)
      wizardStepMotors = readStepMotorEditors(box)
    }
    syncWizardMotorsLength()
    syncWizardLanes()
  }

  function checkWizardDuplicate() {
    const mode = $<HTMLInputElement>('wizard-mode').value as WizardMode
    const name = $<HTMLInputElement>('wizard-name').value
    const intervalMs = Number($<HTMLInputElement>('wizard-interval').value) || 400
    const multi = wizardShowMotors()
    const needs = readWizardNeeds($('wizard-needs'))
    const editingId =
      mode === 'edit' ? $<HTMLInputElement>('wizard-id').value.trim() : ''
    if (!name.trim() && !wizardStrengths.length) {
      setWizardErr(null)
      return null
    }
    const dup = findPatternDuplicate(
      {
        name,
        strengths: wizardStrengths.length ? wizardStrengths : [4, 4, 0],
        intervalMs,
        stepMotors: multi ? stepMotorsFromLanes(wizardLanes) : undefined,
        motorStrengths: multi && wizardLanes.length ? wizardLanes : undefined,
        needs,
      },
      { excludeId: editingId || undefined },
    )
    if (!dup) {
      setWizardErr(null)
      return null
    }
    setWizardErr(
      dup.reason === 'name'
        ? `Duplicate name — already used by “${dup.name}”.`
        : `Duplicate pattern — same steps & timing as “${dup.name}”.`,
      'warn',
    )
    return dup
  }

  function paintWizardPreview() {
    const box = document.getElementById('wizard-preview')
    if (!box) return
    const intervalMs = Number($<HTMLInputElement>('wizard-interval').value) || 400
    const multi = wizardShowMotors()
    const draft = {
      strengths: wizardStrengths.length ? wizardStrengths : [4, 4, 0],
      stepMotors: multi ? wizardStepMotors : undefined,
      motorStrengths: multi ? wizardLanes : undefined,
    }
    const lanes = vizMotorLanes(draft, multi ? 2 : 1)
    box.replaceChildren()
    box.classList.toggle('pattern-viz-multi', lanes.length > 1)
    for (let i = 0; i < lanes.length; i++) {
      if (lanes.length > 1) {
        const lane = document.createElement('span')
        lane.className = 'pattern-viz-lane'
        const lab = document.createElement('span')
        lab.className = 'pattern-viz-lane-label'
        lab.textContent = `M${i + 1}`
        lane.append(
          lab,
          buildPatternSvg(lanes[i]!, {
            w: 220,
            h: 28,
            intervalMs,
            animate: true,
          }),
        )
        box.append(lane)
      } else {
        box.append(
          buildPatternSvg(lanes[0] || vizStepsForPattern(draft), {
            w: 220,
            h: 36,
            intervalMs,
            animate: true,
          }),
        )
      }
    }
    checkWizardDuplicate()
  }

  function paintWizardStrengths() {
    const multi = wizardShowMotors()
    const label = document.getElementById('wizard-strength-label')
    const hint = document.getElementById('wizard-strength-hint')
    if (label) {
      label.textContent = multi
        ? 'Strength steps (0–8) · one row per motor'
        : 'Strength steps (0–8)'
    }
    if (hint) {
      hint.textContent = multi
        ? 'Gemini / Edge: M1 and M2 each run their own row of beats. Set a box to 0 to keep that motor quiet for that beat.'
        : 'Each box is one beat of the vibe. Tick Multi-motor above for dual-motor toys.'
    }
    if (multi) {
      syncWizardLanes()
      paintMotorStrengthEditors($('wizard-strengths'), wizardLanes)
    } else {
      paintStrengthEditors($('wizard-strengths'), wizardStrengths)
    }
    for (const el of $('wizard-strengths').querySelectorAll('input, select')) {
      el.addEventListener('input', () => {
        readWizardDraft()
        paintWizardPreview()
      })
      el.addEventListener('change', () => {
        readWizardDraft()
        paintWizardPreview()
      })
    }
    paintWizardPreview()
  }

  function syncWizardMotorsLength() {
    while (wizardStepMotors.length < wizardStrengths.length) {
      wizardStepMotors.push(0)
    }
    wizardStepMotors = wizardStepMotors.slice(0, wizardStrengths.length)
  }

  /** Keep both motor lanes the same length as the step count. */
  function syncWizardLanes() {
    const n = wizardStrengths.length
    const seeded = patternMotorLanes(
      { strengths: wizardStrengths, stepMotors: wizardStepMotors },
      2,
    )
    wizardLanes = [0, 1].map((m) => {
      const lane = wizardLanes[m] || []
      return Array.from({ length: n }, (_, i) =>
        lane[i] == null ? (seeded[m]?.[i] ?? 0) : lane[i]!,
      )
    })
  }

  /** L/R codes derived from the lanes, kept for readers that predate lanes. */
  function stepMotorsFromLanes(lanes: number[][]): StepMotorCode[] {
    const [m1 = [], m2 = []] = lanes
    return (lanes[0] || []).map((_, i) => {
      const a = m1[i] ?? 0
      const b = m2[i] ?? 0
      if (a > 0 && b === 0) return 1
      if (b > 0 && a === 0) return 2
      return 0
    })
  }

  function openPatternWizard(
    mode: WizardMode,
    id?: PatternId,
    opts?: { fromCatalog?: boolean },
  ) {
    wizardReturnToCatalog = Boolean(opts?.fromCatalog)
    setWizardErr(null)
    $<HTMLInputElement>('wizard-mode').value = mode
    const title = $('pattern-wizard-title')
    fillTagList(
      $<HTMLDataListElement>('wizard-tag-list'),
      patternTags().filter((t) => t),
    )

    if (mode === 'edit' && id) {
      const p = getPattern(id)
      if (!p) return
      title.textContent = isCatalogPattern(id)
        ? `Edit ${p.name}`
        : `Edit pattern`
      $<HTMLInputElement>('wizard-id').value = id
      $<HTMLInputElement>('wizard-name').value = p.name
      $<HTMLInputElement>('wizard-blurb').value = p.blurb
      $<HTMLInputElement>('wizard-tag').value = p.tag || 'custom'
      $<HTMLInputElement>('wizard-price').value = String(
        state().patternPrices[id] ?? p.price,
      )
      $<HTMLInputElement>('wizard-interval').value = String(p.intervalMs || 400)
      wizardStrengths = p.strengths.slice()
      wizardStepMotors = (p.stepMotors || []).slice() as StepMotorCode[]
      syncWizardMotorsLength()
      wizardLanes = patternMotorLanes(p, 2)
      fillWizardNeeds($('wizard-needs'), patternNeeds(p))
    } else {
      title.textContent = 'Create pattern'
      $<HTMLInputElement>('wizard-id').value = ''
      $<HTMLInputElement>('wizard-name').value = ''
      $<HTMLInputElement>('wizard-blurb').value = ''
      $<HTMLInputElement>('wizard-tag').value = 'custom'
      $<HTMLInputElement>('wizard-price').value = '1000'
      $<HTMLInputElement>('wizard-interval').value = '400'
      wizardStrengths = [4, 4, 0]
      wizardStepMotors = [0, 0, 0]
      wizardLanes = [
        [4, 4, 0],
        [4, 4, 0],
      ]
      fillWizardNeeds($('wizard-needs'), [])
    }
    paintWizardStrengths()
    $('pattern-wizard').hidden = false
    $<HTMLInputElement>('wizard-name').focus()
  }

  function closePatternWizard() {
    $('pattern-wizard').hidden = true
    setWizardErr(null)
    if (wizardReturnToCatalog) {
      wizardReturnToCatalog = false
      if ($('pattern-catalog').hidden) openPatternCatalog()
      else paintCatalogBrowser()
    }
  }

  function fillCatalogToySelect() {
    const sel = $<HTMLSelectElement>('pattern-catalog-toy')
    const prev = sel.value
    sel.replaceChildren()
    const all = document.createElement('option')
    all.value = ''
    all.textContent = 'All toys'
    sel.append(all)
    const profiles = [...TOY_PRODUCT_PROFILES].sort((a, b) =>
      a.title.localeCompare(b.title),
    )
    for (const p of profiles) {
      const opt = document.createElement('option')
      opt.value = p.id
      opt.textContent = p.title
      sel.append(opt)
    }
    if (prev && [...sel.options].some((o) => o.value === prev)) {
      sel.value = prev
      return
    }
    // Prefer the tip-menu active toy's product when opening.
    const linked = ctx
      .getDeviceToys()
      .find((t) => t.id && t.id === activePatternToyId)
    const fromLinked = linked
      ? toyProductProfile(linked.toyType) ||
        toyProductProfile(linked.name) ||
        null
      : null
    sel.value = fromLinked?.id || ''
  }

  function selectedCatalogCapability() {
    const id = $<HTMLSelectElement>('pattern-catalog-toy').value.trim()
    if (!id) return null
    const profile = toyProductProfile(id)
    return profile ? capabilityFromProductProfile(profile) : null
  }

  /** Prefer a linked device matching the catalog product for Test. */
  function linkedToyIdForCatalogProduct(productId: string): string | undefined {
    const want = productId.toLowerCase()
    const hit = ctx.getDeviceToys().find((t) => {
      if (!t.id) return false
      const blob = `${t.toyType || ''} ${t.name || ''}`.toLowerCase()
      return blob.includes(want)
    })
    return hit?.id
  }

  function paintCatalogBrowser() {
    const search = $<HTMLInputElement>('pattern-catalog-search').value
    const toy = selectedCatalogCapability()
    const { shown, total } = paintPatternCatalog(
      $('pattern-catalog-body'),
      {
        query: search,
        toy,
        prices: state().patternPrices,
        ratings: state().patternRatings,
        disabled: state().disabledPatterns,
      },
      {
        onTest: (id) => {
          const productId = toy?.id || ''
          void ctx.runPatternTest(
            1,
            0,
            id,
            patternLabel(id),
            productId
              ? linkedToyIdForCatalogProduct(productId)
              : undefined,
          )
        },
        onEdit: (id) => {
          openPatternWizard('edit', id, { fromCatalog: true })
        },
        onDuplicate: (id) => {
          openPatternWizardFromTemplate(id, { fromCatalog: true })
        },
        onSelect: (id) => {
          state().defaultPattern = id
          ctx.saveSettings({ ...ctx.readForm(), defaultPattern: id })
          paintPatterns()
          ctx.paintSession()
          closePatternCatalog()
        },
        onRate: (id, stars) => {
          state().patternRatings = { ...state().patternRatings, [id]: stars }
          ctx.saveSettings({
            ...ctx.readForm(),
            patternRatings: state().patternRatings,
          })
          paintCatalogBrowser()
        },
        onAddToMenu: (id) => {
          const disabled = state().disabledPatterns.filter((x) => x !== id)
          state().disabledPatterns = disabled
          if (!disabled.includes(id)) {
            inheritCurrencyOntoPattern(id)
          }
          ctx.saveSettings({
            ...ctx.readForm(),
            disabledPatterns: state().disabledPatterns,
          })
          paintCatalogBrowser()
          paintPatterns()
          ctx.paintSession()
          ctx.scheduleStreamMenuPush()
          setCoinMatrixStatus(`Added ${patternLabel(id)} to tip menu`)
        },
      },
    )
    const toyBit = toy ? ` for ${toy.name}` : ''
    $('pattern-catalog-count').textContent =
      shown === total
        ? `${total} built-in patterns${toyBit} · × on a tip card removes it · Add to menu here to restore`
        : `${shown} of ${total} built-in patterns${toyBit} · × on a tip card removes it · Add to menu here to restore`
  }

  function openPatternCatalog() {
    fillCatalogToySelect()
    $('pattern-catalog').hidden = false
    paintCatalogBrowser()
    $<HTMLInputElement>('pattern-catalog-search').focus()
  }

  function closePatternCatalog() {
    $('pattern-catalog').hidden = true
  }

  function hasTipWallet() {
    return isAddress(state().receive.trim())
  }

  function openNeedWalletPopup() {
    $('export-need-wallet-modal').hidden = false
    document.getElementById('btn-export-need-wallet-ok')?.focus()
  }

  function closeNeedWalletPopup() {
    $('export-need-wallet-modal').hidden = true
  }

  function requireTipWalletForExport() {
    if (hasTipWallet()) return true
    openNeedWalletPopup()
    return false
  }

  function openShareCardModal() {
    if (!requireTipWalletForExport()) return
    $('menu-share-modal').hidden = false
    document.getElementById('btn-export-menu-jpg')?.focus()
  }

  function closeShareCardModal() {
    $('menu-share-modal').hidden = true
  }

  /** Prefill Create pattern from a catalog entry (new custom id on save). */
  function openPatternWizardFromTemplate(
    sourceId: PatternId,
    opts?: { fromCatalog?: boolean },
  ) {
    const p = getPattern(sourceId) || getCatalogPattern(sourceId)
    if (!p) {
      openPatternWizard('create', undefined, opts)
      return
    }
    wizardReturnToCatalog = Boolean(opts?.fromCatalog)
    setWizardErr(null)
    $<HTMLInputElement>('wizard-mode').value = 'create'
    const title = $('pattern-wizard-title')
    fillTagList(
      $<HTMLDataListElement>('wizard-tag-list'),
      patternTags().filter((t) => t),
    )
    title.textContent = 'Create pattern'
    $<HTMLInputElement>('wizard-id').value = ''
    $<HTMLInputElement>('wizard-name').value = `${p.name} copy`
    $<HTMLInputElement>('wizard-blurb').value = p.blurb
    $<HTMLInputElement>('wizard-tag').value = p.tag || 'custom'
    $<HTMLInputElement>('wizard-price').value = String(
      state().patternPrices[p.id] ?? p.price,
    )
    $<HTMLInputElement>('wizard-interval').value = String(p.intervalMs || 400)
    wizardStrengths = p.strengths.slice()
    wizardStepMotors = (p.stepMotors || []).slice() as StepMotorCode[]
    while (wizardStepMotors.length < wizardStrengths.length) {
      wizardStepMotors.push(0)
    }
    wizardStepMotors = wizardStepMotors.slice(0, wizardStrengths.length)
    wizardLanes = patternMotorLanes(p, 2)
    fillWizardNeeds($('wizard-needs'), patternNeeds(p))
    paintWizardStrengths()
    $('pattern-wizard').hidden = false
    $<HTMLInputElement>('wizard-name').focus()
  }

  function commitPatternWizard() {
    const mode = $<HTMLInputElement>('wizard-mode').value as WizardMode
    const intervalMs = Number($<HTMLInputElement>('wizard-interval').value)
    const multi = wizardShowMotors()
    readWizardDraft()
    const lanes = multi ? wizardLanes : []
    const strengths = wizardStrengths
    const stepMotors = multi ? stepMotorsFromLanes(lanes) : wizardStepMotors
    if (!strengths.length) {
      setWizardErr('Add at least one strength step.')
      return
    }
    const price = Number($<HTMLInputElement>('wizard-price').value)
    const name = $<HTMLInputElement>('wizard-name').value
    if (!name.trim()) {
      setWizardErr('Name is required.')
      $<HTMLInputElement>('wizard-name').focus()
      return
    }

    let id = $<HTMLInputElement>('wizard-id').value.trim()
    if (mode === 'create' || !id) id = newCustomPatternId()

    const needs = readWizardNeeds($('wizard-needs'))
    checkWizardDuplicate()

    const base = mode === 'edit' ? getPattern(id) : undefined
    const def = defFromWizardFields({
      id,
      name,
      blurb: $<HTMLInputElement>('wizard-blurb').value,
      tag: $<HTMLInputElement>('wizard-tag').value,
      price: Number.isFinite(price) && price >= 0 ? price : 0,
      intervalMs,
      strengths,
      stepMotors: needs.includes('multi') ? stepMotors : undefined,
      motorStrengths: needs.includes('multi') && lanes.length ? lanes : undefined,
      kind: base?.kind ?? 'pattern',
      preset: base?.preset,
      intensity: base?.intensity,
      needs,
    })
    if (!def) {
      setWizardErr('Could not save pattern.')
      return
    }

    if (isCatalogPattern(id)) {
      state().patternOverrides = { ...state().patternOverrides, [id]: def }
    } else {
      const list = state().customPatterns.filter((c) => c.id !== id)
      list.push(def)
      state().customPatterns = list
    }

    state().patternPrices = { ...state().patternPrices, [id]: def.price }
    if (mode === 'create') {
      state().defaultPattern = id
    }
    ctx.saveSettings({
      ...ctx.readForm(),
      customPatterns: state().customPatterns,
      patternOverrides: state().patternOverrides,
      patternPrices: state().patternPrices,
      defaultPattern: state().defaultPattern,
    })
    closePatternWizard()
    paintPatterns()
    ctx.paintSession()
  }

  function resetPatternToDefault(id: PatternId) {
    if (!isCatalogPattern(id)) return
    const stock = getCatalogPattern(id)
    if (!stock) return
    if (
      !confirm(
        `Restore “${stock.name}” to the built-in pattern and default tip price?`,
      )
    ) {
      return
    }
    const { [id]: _drop, ...rest } = state().patternOverrides
    state().patternOverrides = rest
    state().patternPrices = { ...state().patternPrices, [id]: stock.price }
    ctx.saveSettings({
      ...ctx.readForm(),
      patternOverrides: state().patternOverrides,
      patternPrices: state().patternPrices,
    })
    paintPatterns()
    ctx.paintSession()
  }

  function deleteCustomPattern(id: PatternId) {
    if (!isCustomPattern(id)) return
    const p = getPattern(id)
    if (
      !confirm(
        `Delete custom pattern “${p?.name || id}”? This cannot be undone.`,
      )
    ) {
      return
    }
    state().customPatterns = state().customPatterns.filter((c) => c.id !== id)
    const prices = { ...state().patternPrices }
    delete prices[id]
    state().patternPrices = prices
    const ratings = { ...state().patternRatings }
    delete ratings[id]
    state().patternRatings = ratings
    state().disabledPatterns = state().disabledPatterns.filter((x) => x !== id)
    state().featuredPatterns = state().featuredPatterns.filter((x) => x !== id)
    if (state().defaultPattern === id) {
      state().defaultPattern = PATTERNS.find((x) => x.id !== id)?.id || 'wave'
    }
    ctx.saveSettings({
      ...ctx.readForm(),
      customPatterns: state().customPatterns,
      patternPrices: state().patternPrices,
      patternRatings: state().patternRatings,
      disabledPatterns: state().disabledPatterns,
      featuredPatterns: state().featuredPatterns,
      defaultPattern: state().defaultPattern,
    })
    paintPatterns()
    ctx.paintSession()
  }

  function buildExportPaymentUri(item: {
    price: number
    tokenAddress?: string
    tokenDecimals?: number
    coin?: string
  }): string | undefined {
    const receive = state().receive.trim()
    if (!receive || !isAddress(receive)) return undefined
    const chain = CHAINS[state().chainKey]
    const tokenRaw = (item.tokenAddress || state().tokenAddress || '').trim()
    const decimals =
      item.tokenDecimals ??
      (tokenRaw && isAddress(tokenRaw)
        ? decimalsForToken(tokenRaw)
        : (chain.chain.nativeCurrency.decimals ?? 18))
    const uri = tryBuildTipPaymentUri({
      receiveAddress: receive,
      amountHuman: item.price,
      chainId: chain.chain.id,
      decimals,
      tokenAddress: tokenRaw && isAddress(tokenRaw) ? tokenRaw : null,
      tokenSymbol:
        (item.coin || '').trim() ||
        state().tokenSymbol ||
        chain.symbol ||
        null,
      networkName: chain.label,
    })
    if (!uri) return undefined
    return fanSafeCreatorWalletUri(uri, receive)
  }

  async function buildMenuExportPayload(): Promise<TipMenuExportInput> {
    // Same filter as the tip menu UI: enabled patterns that fit ticked toys
    const fitToys = ctx.menuFitToys() ?? []
    if (!fitToys.length) {
      throw new Error(
        'No toy selected for the tip menu — search a toy under Toys, then export.',
      )
    }

    const chain = CHAINS[state().chainKey]
    const pool: TipMenuExportInput['items'] = []
    const multiToy = fitToys.length > 1

    for (const toy of fitToys) {
      const toyLabel = shortToyLabel(toy.name || '', toy.toyType, toy.id)
      for (const p of patternsForToyMenu(toy, {
        disabled: state().disabledPatterns,
        featured: state().featuredPatterns,
        includeDisabled: false,
      })) {
        const needs = patternNeeds(p)
        const price = patternToyPrice(
          p.id,
          state().patternPrices,
          state().toyPatternPrices,
          toy.id,
        )
        // Match OBS: skip non-positive amounts (no EIP-681 QR).
        if (!Number.isFinite(price) || price <= 0) continue
        pool.push({
          name: p.name,
          forToy: multiToy ? toyLabel : undefined,
          blurb: (p.blurb || '').trim(),
          timeSec: p.timeSec,
          tag: p.tag || 'other',
          family: familyLabel(patternFamily(needs)),
          strengths: vizStepsForPattern(p),
          motorStrengths: needs.includes('multi')
            ? patternMotorLanes(p, 2)
            : undefined,
          featured: state().featuredPatterns.includes(p.id),
          price,
        })
      }
    }
    pool.sort(
      (a, b) =>
        (a.forToy || '').localeCompare(b.forToy || '') ||
        a.price - b.price ||
        a.name.localeCompare(b.name),
    )

    const dedupedPool = (() => {
      const bySheet = new Map<string, TipMenuExportInput['items']>()
      for (const item of pool) {
        const sheetKey = `${item.forToy || ''}|tip`
        const row = bySheet.get(sheetKey) || []
        row.push(item)
        bySheet.set(sheetKey, row)
      }
      const out: TipMenuExportInput['items'] = []
      for (const row of bySheet.values()) {
        const unique = applyUniqueSkuAmounts(
          row.map((item, index) => ({
            id: `${item.name}|${index}`,
            amount: item.price,
          })),
        )
        const priceById = new Map(unique.map((entry) => [entry.id, entry.amount]))
        row.forEach((item, index) => {
          out.push({
            ...item,
            price: priceById.get(`${item.name}|${index}`) ?? item.price,
          })
        })
      }
      return out
    })()

    if (!dedupedPool.length) {
      throw new Error(
        'No enabled patterns match the selected toy(s). Turn patterns On or pick another toy.',
      )
    }

    const cheapest = Math.min(...dedupedPool.map((r) => r.price))
    const toyNote =
      fitToys.length === 1
        ? `${shortToyLabel(fitToys[0]!.name || '', fitToys[0]!.toyType, fitToys[0]!.id)} · ${toyChannelLabels(fitToys[0]!)}`
        : `${fitToys.length} toys selected`
    const taglineParts = [toyNote].filter(Boolean)

    const landEl = $<HTMLInputElement>('export-orient-landscape')
    const orientation: MenuExportOrientation = $<HTMLInputElement>(
      'export-orient-portrait',
    ).checked
      ? 'portrait'
      : landEl.checked
        ? 'landscape'
        : 'landscape'

    // Price cards must show the active tip unit — not always native PLS.
    const tokenRaw = state().tokenAddress.trim()
    const hasTipToken = Boolean(tokenRaw && isAddress(tokenRaw))
    const tokenAddress = hasTipToken ? tokenRaw : undefined
    let tipUnit = chain.symbol
    if (hasTipToken) {
      const saved = (state().savedTokens || []).find(
        (t) => t.address.toLowerCase() === tokenRaw.toLowerCase(),
      )
      tipUnit =
        (saved ? tokenDisplayLabel(saved) : '') ||
        ctx.getTokenLabelFieldValue().trim() ||
        ctx.tokenLabelForAddress(tokenRaw) ||
        state().tokenSymbol ||
        'TOKEN'
    }

    return {
      brand: APP_NAME,
      displayName: '',
      tagline: taglineParts.join(' · '),
      chainLabel: chain.label,
      symbol: tipUnit,
      receive: state().receive.trim() || undefined,
      cheapest,
      // Used only by Export JPG
      orientation,
      chainId: chain.chain.id,
      chainRpcs: chain.rpcs.slice(),
      explorerUrl: chain.chain.blockExplorers?.default.url,
      nativeSymbol: chain.symbol,
      nativeDecimals: chain.chain.nativeCurrency.decimals ?? 18,
      tokenAddress,
      tokenDecimals: state().tokenDecimals,
      // Keep ticker for wallet/scripts when label differs (e.g. PornDai vs DAI)
      tokenSymbol: hasTipToken
        ? state().tokenSymbol || tipUnit
        : undefined,
      links: [],
      items: dedupedPool.map((item) => ({
        ...item,
        paymentUri: buildExportPaymentUri({
          ...item,
          coin: tipUnit,
        }),
      })),
    }
  }

  async function exportMenuJpg() {
    if (!requireTipWalletForExport()) return
    const btn = $<HTMLButtonElement>('btn-export-menu-jpg')
    const landEl = $<HTMLInputElement>('export-orient-landscape')
    const portEl = $<HTMLInputElement>('export-orient-portrait')
    const prev = btn.textContent
    btn.disabled = true
    landEl.disabled = true
    portEl.disabled = true
    try {
      await exportTipMenuJpg(await buildMenuExportPayload())
      ctx.showError('')
      btn.textContent = 'Saved'
      window.setTimeout(() => {
        if (btn.textContent === 'Saved') btn.textContent = prev
      }, 1800)
    } catch (e) {
      ctx.showError(e instanceof Error ? e.message : String(e))
      btn.textContent = prev
    } finally {
      btn.disabled = false
      landEl.disabled = false
      portEl.disabled = false
    }
  }

  async function exportMenuHtml() {
    if (!requireTipWalletForExport()) return
    const btn = $<HTMLButtonElement>('btn-export-menu-html')
    const prev = btn.textContent
    btn.disabled = true
    try {
      // Omit orientation so landscape/portrait never touches HTML
      const { orientation: _jpgOnly, ...htmlInput } = await buildMenuExportPayload()
      await exportTipMenuHtml(htmlInput)
      ctx.showError('')
      btn.textContent = 'Saved'
      window.setTimeout(() => {
        if (btn.textContent === 'Saved') {
          btn.textContent = prev
        }
      }, 1800)
    } catch (e) {
      ctx.showError(e instanceof Error ? e.message : String(e))
      btn.textContent = prev
    } finally {
      btn.disabled = false
    }
  }

  function wireTipMenuEvents() {
    $('btn-pattern-create').addEventListener('click', () =>
      openPatternWizard('create'),
    )
    $('btn-pattern-catalog').addEventListener('click', () =>
      openPatternCatalog(),
    )
    $('btn-pattern-catalog-close').addEventListener('click', () =>
      closePatternCatalog(),
    )
    $('btn-menu-share').addEventListener('click', () => openShareCardModal())
    $('btn-menu-share-close').addEventListener('click', () =>
      closeShareCardModal(),
    )
    onBackdropDismiss($('menu-share-modal'), closeShareCardModal)
    $('btn-export-need-wallet-ok').addEventListener('click', () => {
      closeNeedWalletPopup()
      closeShareCardModal()
      ctx.goHome()
      window.setTimeout(() => {
        document.getElementById('receive')?.focus()
      }, 0)
    })
    onBackdropDismiss($('export-need-wallet-modal'), closeNeedWalletPopup)
    let liveDonateAddr = DONATION_ADDRESS
    const donateCode = $('donate-addr')
    void resolveDonationAddress(DONATION_ADDRESS).then((addr) => {
      liveDonateAddr = addr
      if (donateCode) {
        donateCode.textContent = addr
        donateCode.setAttribute('title', addr)
      }
    })
    $('btn-copy-donate').addEventListener('click', () => {
      const status = $('donate-copy-status')
      const done = (ok: boolean) => {
        status.textContent = ok ? 'Copied' : 'Copy failed'
        window.setTimeout(() => {
          status.textContent = ''
        }, 1600)
      }
      void (async () => {
        try {
          await navigator.clipboard.writeText(liveDonateAddr)
          done(true)
        } catch {
          try {
            const ta = document.createElement('textarea')
            ta.value = liveDonateAddr
            ta.setAttribute('readonly', '')
            ta.style.position = 'fixed'
            ta.style.left = '-9999px'
            document.body.append(ta)
            ta.select()
            const ok = document.execCommand('copy')
            ta.remove()
            done(ok)
          } catch {
            done(false)
          }
        }
      })()
    })
    onBackdropDismiss($('pattern-catalog'), closePatternCatalog)
    $('pattern-catalog-search').addEventListener('input', () =>
      paintCatalogBrowser(),
    )
    $('pattern-catalog-toy').addEventListener('change', () =>
      paintCatalogBrowser(),
    )
    $('btn-wizard-cancel').addEventListener('click', () => closePatternWizard())
    $('btn-wizard-save').addEventListener('click', () => commitPatternWizard())
    $('wizard-name').addEventListener('input', () => checkWizardDuplicate())
    $('wizard-needs').addEventListener('change', () => {
      readWizardDraft()
      paintWizardStrengths()
    })
    $('wizard-interval').addEventListener('change', () => {
      readWizardDraft()
      paintWizardPreview()
    })
    $('wizard-interval').addEventListener('input', () => checkWizardDuplicate())
    $('btn-wizard-add-step').addEventListener('click', () => {
      readWizardDraft()
      if (wizardStrengths.length >= 32) return
      wizardStrengths.push(4)
      wizardStepMotors.push(0)
      for (const lane of wizardLanes) lane.push(4)
      paintWizardStrengths()
    })
    $('btn-wizard-rm-step').addEventListener('click', () => {
      readWizardDraft()
      if (wizardStrengths.length <= 1) return
      wizardStrengths.pop()
      wizardStepMotors.pop()
      for (const lane of wizardLanes) lane.pop()
      paintWizardStrengths()
    })

    $('menu-tip-currency').addEventListener('change', () => {
      const currency = $<HTMLSelectElement>('menu-tip-currency')
      const picked = currency.value
      currency.value = ''
      if (!picked) return
      if (picked === '__clear__') {
        clearPaintFromVisibleToys()
        return
      }
      if (picked === '__all__') {
        assignAllCurrenciesToVisiblePatterns()
        return
      }
      assignCurrencyToVisiblePatterns(picked === 'native' ? '' : picked)
    })

    $('btn-menu-base-apply').addEventListener('click', () => {
      const usdLo = Number($<HTMLInputElement>('menu-base-price').value)
      const usdHi = Number($<HTMLInputElement>('menu-top-price').value)
      const tipCoin = activeTipCoin()
      const usdPer =
        peekUsdPerTipUnit(tipCoin) ?? paintedUsdPerUnit
      if (usdPer == null || !Number.isFinite(usdPer) || usdPer <= 0) {
        ctx.showError(
          `${noPriceDetectedNote(tipCoin.display || 'tip coin')} — then Scale menu`,
        )
        return
      }
      if (
        !Number.isFinite(usdLo) ||
        usdLo <= 0 ||
        !Number.isFinite(usdHi) ||
        usdHi <= 0
      ) {
        paintPatterns()
        return
      }
      const toyId = activePatternToyId || ''
      if (
        !applyUsdScale({
          toyId: toyId || undefined,
          usdLo,
          usdHi,
          usdPer,
        })
      ) {
        ctx.showError('Could not convert USD tips to the tip coin')
        return
      }
      setCoinMatrixStatus(
        toyId
          ? `Scaled this toy · $${formatUsdApprox(usdLo)}–$${formatUsdApprox(usdHi)}`
          : `Scaled shared menu · $${formatUsdApprox(usdLo)}–$${formatUsdApprox(usdHi)}`,
      )
      ctx.showError('')
      paintPatterns()
      ctx.paintSession()
    })
    const paintScaleUsdTitle = (el: HTMLInputElement) => {
      const coin = activeTipCoin()
      const usd = Number(el.value)
      const usdPer = peekUsdPerTipUnit(coin) ?? paintedUsdPerUnit
      if (!Number.isFinite(usd) || usd < 0 || usdPer == null || usdPer <= 0) {
        el.title = noPriceDetectedNote(coin.display || 'tip coin')
        return
      }
      const decimals = coin.tokenAddress
        ? decimalsForToken(coin.tokenAddress)
        : 18
      const tokens = usdTargetToTokenAmount(usd, usdPer, decimals)
      el.title =
        tokens == null
          ? `$${formatUsdApprox(usd)} USD`
          : `$${formatUsdApprox(usd)} ≈ ${tokens.toLocaleString()} ${coin.display}`
    }
    /**
     * Keep the typed range even when there is no quote to scale with, so a
     * repaint never snaps the fields back to a stale value.
     */
    const commitScaleUsd = () => {
      const lo = Number($<HTMLInputElement>('menu-base-price').value)
      const hi = Number($<HTMLInputElement>('menu-top-price').value)
      if (!Number.isFinite(lo) || lo <= 0 || !Number.isFinite(hi) || hi <= 0) {
        return
      }
      const toyId = activePatternToyId || ''
      if (toyId) {
        state().toyMenuUsd = {
          ...(state().toyMenuUsd || {}),
          [toyId]: { lo, hi },
        }
        ctx.saveSettings({
          ...ctx.readForm(),
          toyMenuUsd: state().toyMenuUsd,
        })
        return
      }
      state().menuUsdLo = lo
      state().menuUsdHi = hi
      ctx.saveSettings({
        ...ctx.readForm(),
        menuUsdLo: lo,
        menuUsdHi: hi,
      })
    }
    for (const id of ['menu-base-price', 'menu-top-price'] as const) {
      $(id).addEventListener('input', () => {
        paintScaleUsdTitle($<HTMLInputElement>(id))
      })
      $(id).addEventListener('change', commitScaleUsd)
      $(id).addEventListener('blur', commitScaleUsd)
    }
    for (const id of ['menu-base-price', 'menu-top-price'] as const) {
      $(id).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        $('btn-menu-base-apply').click()
      }
    })
    }

    const commitMaxVibe = () => {
      const cap = clampMenuMaxVibe($<HTMLInputElement>('menu-max-vibe').value, 8)
      const toyId = activePatternToyId || ''
      if (toyId) {
        const next = { ...(state().toyMaxVibe || {}) }
        if (cap >= 8) delete next[toyId]
        else next[toyId] = cap
        state().toyMaxVibe = next
        ctx.saveSettings({
          ...ctx.readForm(),
          toyMaxVibe: state().toyMaxVibe,
        })
        ctx.applyDeviceSettings()
        return
      }
      state().menuMaxVibe = cap
      ctx.saveSettings({
        ...ctx.readForm(),
        menuMaxVibe: cap,
      })
      ctx.applyDeviceSettings()
    }
    $('menu-max-vibe').addEventListener('input', () => {
      const cap = clampMenuMaxVibe($<HTMLInputElement>('menu-max-vibe').value, 8)
      $<HTMLOutputElement>('menu-max-vibe-val').textContent = `${cap}/8`
    })
    $('menu-max-vibe').addEventListener('change', commitMaxVibe)

    $('menu-sort').addEventListener('change', () => {
      const v = $<HTMLSelectElement>('menu-sort').value
      if (!isMenuSort(v)) return
      state().menuSort = v
      ctx.saveSettings({ ...ctx.readForm(), menuSort: state().menuSort })
      paintPatterns()
    })

    $('btn-menu-toys-import').addEventListener('click', () => {
      const roster = ctx.getDeviceToys()
      const menuToys = toysForTipMenu(roster)
      // Only currently connected hardware — never catalog stand-ins.
      const ids = importLinkedFilterIds(roster, menuToys)
      if (!ids.length) {
        ctx.showError('Use linked needs a connected toy on Device.')
        return
      }
      // null = follow connected toys as they change (Import used to pin stale ids).
      state().menuFilterToyIds = null
      ctx.saveSettings({
        ...ctx.readForm(),
        menuFilterToyIds: state().menuFilterToyIds,
      })
      ctx.showError('')
      const labels = ids
        .map((id) => {
          const toy = roster.find((t) => t.id === id) || menuToys.find((t) => t.id === id)
          return shortToyLabel(toy?.name || '', toy?.toyType, id)
        })
        .filter(Boolean)
      setCoinMatrixStatus(
        `Tip menu · ${ids.length} linked${labels.length ? ` · ${labels.join(' · ')}` : ''}`,
      )
      runToyMenuWork(`Loading ${ids.length} linked toy${ids.length === 1 ? '' : 's'}…`, () => {
        if (selectedCoinKeys.size) distributeWhitelistAcrossToys()
        paintPatterns()
      })
    })

    $('btn-menu-toys-none').addEventListener('click', () => {
      state().menuFilterToyIds = []
      ctx.saveSettings({
        ...ctx.readForm(),
        menuFilterToyIds: state().menuFilterToyIds,
      })
      runToyMenuWork('Clearing toys…', () => {
      paintPatterns()
    })
    })

    $('btn-coin-csv-export').addEventListener('click', () => {
      const csv = exportCoinRewardCsv(state().coinRewardRules || [])
      downloadText(`${APP_SLUG}-coin-rewards.csv`, csv)
      setCoinMatrixStatus(
        `Exported ${(state().coinRewardRules || []).length} row(s)`,
      )
    })

    $('btn-coin-csv-starter').addEventListener('click', () => {
      const chain = CHAINS[state().chainKey]
      const csv = starterCoinRewardCsv({
        tokens: (state().savedTokens || []).map((t) => ({
          address: t.address,
          symbol: t.symbol,
          label: tokenDisplayLabel(t),
        })),
        patterns: PATTERNS.filter((p) => !state().disabledPatterns.includes(p.id)).map(
          (p) => ({
            id: p.id,
            name: p.name,
            price: state().patternPrices[p.id] ?? p.price,
          }),
        ),
        includeNative: true,
        nativeSymbol: chain.symbol,
      })
      downloadText(`${APP_SLUG}-coin-rewards-starter.csv`, csv)
      setCoinMatrixStatus(
        'Starter CSV downloaded — edit USD targets, then Import CSV',
      )
    })

    $('coin-csv-import').addEventListener('change', () => {
      const input = $<HTMLInputElement>('coin-csv-import')
      const file = input.files?.[0]
      input.value = ''
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const parsed = parseCoinRewardCsv(String(reader.result || ''))
        if (parsed.errors.length && !parsed.rules.length) {
          ctx.showError(parsed.errors.slice(0, 3).join(' · '))
          setCoinMatrixStatus(parsed.errors[0] || 'Import failed')
          return
        }
        persistCoinRules(parsed.rules)
        // Imported coins join the whitelist, else the orphan sweep on the
        // next load would treat these rows as stuck paint and drop them.
        const known = new Set(coinsForPriceBoard().map((c) => c.key))
        for (const rule of parsed.rules) {
          const key = rule.tokenAddress.trim().toLowerCase()
          if (known.has(key)) selectedCoinKeys.add(key)
        }
        persistPaintWhitelist()
        ctx.showError('')
        const bits = [`Imported ${parsed.rules.length} row(s)`]
        if (parsed.warnings.length) {
          bits.push(`${parsed.warnings.length} warning(s)`)
        }
        if (parsed.errors.length) {
          bits.push(`${parsed.errors.length} row error(s) skipped`)
        }
        setCoinMatrixStatus(bits.join(' · '))
        paintCoinPrice()
        ctx.paintSession()
      }
      reader.readAsText(file)
    })

    $('btn-coin-csv-clear').addEventListener('click', () => {
      if (
        !confirm(
          'Clear the coin reward CSV?\n\nOptional coin×pattern USD rows will be removed until you import again.',
        )
      ) {
        return
      }
      persistCoinRules([])
      setCoinMatrixStatus('Coin reward CSV cleared')
      paintCoinPrice()
      ctx.paintSession()
    })

    $('menu-toy-pack-import').addEventListener('change', () => {
      const input = $<HTMLInputElement>('menu-toy-pack-import')
      const file = input.files?.[0]
      const toyId = pendingToyPackImportId
      pendingToyPackImportId = null
      input.value = ''
      if (!file || !toyId) return
      importToyMenuPackFile(file, toyId)
    })

    $('btn-export-menu-jpg').addEventListener('click', () => {
      void exportMenuJpg()
    })
    $('btn-export-menu-html').addEventListener('click', () => {
      exportMenuHtml()
    })
  }

  /**
   * Paint debugger: `__paintDebug()` in the console prints whitelist chips,
   * per-tab coins, rule count, orphaned toy ids, and localStorage read-back.
   */
  function paintDebugSnapshot() {
    const s = state()
    const board = coinsForPriceBoard()
    const rules = s.coinRewardRules || []
    const fitToys = (ctx.menuFitToys() || []).filter((t) => Boolean(t.id))
    const byToy: Record<string, string[]> = {}
    for (const rule of rules) {
      for (const id of rule.toyIds.length ? rule.toyIds : ['(shared)']) {
        byToy[id] = [...new Set([...(byToy[id] || []), rule.coin])]
      }
    }
    let stored: {
      bytes: number
      rules: number
      paintCoinKeys: unknown
      menuFilterToyIds: unknown
    } = { bytes: 0, rules: 0, paintCoinKeys: [], menuFilterToyIds: [] }
    try {
      const raw = localStorage.getItem('pulsefans-tipbuzz-v1') || ''
      const parsed = JSON.parse(raw || '{}')
      stored = {
        bytes: raw.length,
        rules: (parsed.coinRewardRules || []).length,
        paintCoinKeys: parsed.paintCoinKeys || [],
        menuFilterToyIds: parsed.menuFilterToyIds ?? null,
      }
    } catch {
      /* ignore */
    }
    const snapshot = {
      selectedChips: [...selectedCoinKeys].map(
        (k) => board.find((c) => c.key === k)?.label || k || 'PLS',
      ),
      selectedKeys: [...selectedCoinKeys],
      paintCoinKeys: s.paintCoinKeys || [],
      boardCoins: board.map((c) => c.label),
      ruleCount: rules.length,
      coinsInRules: [
        ...new Set(
          rules.map((r) => `${r.coin}:${r.tokenAddress.toLowerCase()}`),
        ),
      ],
      tabs: fitToys.map((t) => ({
        id: t.id,
        label: shortToyLabel(t.name || '', t.toyType, t.id),
        coins: byToy[t.id!] || [],
      })),
      orphanRuleToyIds: Object.keys(byToy).filter(
        (id) => id !== '(shared)' && !fitToys.some((t) => t.id === id),
      ),
      sharedRules: (byToy['(shared)'] || []).length,
      activeTab: activePatternToyId,
      stored,
    }
    // eslint-disable-next-line no-console
    console.table(snapshot.tabs)
    // eslint-disable-next-line no-console
    console.log('[paintDebug]', snapshot)
    return snapshot
  }
  ;(window as unknown as Record<string, unknown>).__paintDebug =
    paintDebugSnapshot

  return {
    paintPatterns,
    openPatternWizard,
    closePatternWizard,
    openPatternCatalog,
    closePatternCatalog,
    openShareCardModal,
    closeShareCardModal,
    closeNeedWalletPopup,
    wireTipMenuEvents,
  }
}
