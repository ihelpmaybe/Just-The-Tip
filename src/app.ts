import { isAddress, type Address } from 'viem'
import {
  CHAINS,
  defaultRpcs,
  formatRpcList,
  parseRpcList,
  type ChainKey,
} from './chain/config'
import {
  simulatePayment,
  type WatcherStatus,
} from './chain/watcher'
import {
  activePools,
} from './chain/pools'
import { activeBridges } from './chain/bridges'
import { activeChainLogs } from './chain/chainLogs'
import { createWatchSession, stoppedWatchStatus } from './app/watchSession'
import { createTipPipeline } from './app/tipPipeline'
import { createTipMenuStudio } from './app/tipMenuStudio'
import { createWalletsUi } from './app/walletsUi'
import { createTokensUi } from './app/tokensUi'
import { createPoolsUi } from './app/poolsUi'
import { createPaymentsFeed } from './app/paymentsFeed'
import { createSettingsForm } from './app/settingsForm'
import {
  DeviceController,
  type DeviceBackend,
  type DeviceStatus,
  type DeviceToy,
} from './device/controller'
import {
  LOVENSE_APPID_PLACEHOLDER,
  LOVENSE_HINT,
  LOVENSE_REMOTE_HINT,
  LOVENSE_LOCAL_IP_PLACEHOLDER,
  isEmptyLovenseLocalIp,
  lovenseLocalIpFieldValue,
  parseConnectPopupPaste,
} from './device/lovense'
import {
  bleSilentReconnectSupported,
  BLE_PERSIST_FLAG_URL,
  isBlePickerCancel,
  LovenseWebBluetooth,
  webBluetoothShellBlocked,
  webBluetoothUnavailableMessage,
} from './device/webBluetooth'
import {
  loadSettings,
  saveSettings,
  type Saved,
} from './state/settings'
import { rememberWallet } from './state/wallets'
import { tokenDisplayLabel } from './state/tokens'
import {
  loadPaymentLog,
  type PaymentLogItem,
} from './state/paymentsLog'
import { qs, short } from './ui/dom'
import { appShellHtml } from './ui/layout'
import { isPagesShowcase, SHOWCASE_BANNER_HTML } from './pagesFace'
import {
  createPageNavigation,
  pageFromHash,
  type PageView,
} from './ui/navigation'
import { vizStepsForPattern, patternBarsSvgString } from './ui/patternViz'
import { shortToyLabel } from './utils/toySilhouettes'
import { paintToyCard } from './ui/toys'
import {
  identityKeysForToy,
  type ToyIdentityOverride,
} from './utils/toyIdentity'
import { BuzzQueue, type BuzzQueueStatus } from './utils/buzzQueue'
import {
  PATTERNS,
} from './utils/patterns'
import {
  applyUniqueSkuAmounts,
  enabledPatterns,
  patternsForToyMenu,
  patternToyPrice,
  sampleSimTipJob,
  ladderSimTipJobs,
  testSimTipJobs,
} from './utils/pricing'
import { mergeRpcLists, parseRpcImportText } from './utils/rpcImport'
import {
  toysForTipMenu,
  resolvedFilterToyIds as resolveTipMenuFilterIds,
  mergeLiveWithSavedToys,
  upsertSavedToys,
  savedToysEqual,
  isPersistedHardwareToy,
} from './utils/tipFilterToys'
import { fanSafeCreatorWalletUri } from './utils/fanQr'
import { tryBuildTipPaymentUri } from './utils/eip681'
import { agentDbg } from './debugAgentLog'
import {
  mountStreamTipAlert,
  normalizeOverlayStyle,
  defaultOverlayStyle,
  normalizeOverlayQr,
  defaultOverlayQr,
  normalizeOverlayMenuStyle,
  defaultOverlayMenuStyle,
  pushOverlayQr,
  pushOverlayLadder,
  OVERLAY_MENU_OFFER_LIMIT,
  takeOverlayMenuOffersEvenly,
  type OverlayMenuOffer,
} from './overlay'

type FeedItem = PaymentLogItem

export function mountApp(root: HTMLElement) {
  let state = loadSettings()
  let watchStatus: WatcherStatus = stoppedWatchStatus()
  let wasWatching = false
  let liveFlashTimeout: ReturnType<typeof setTimeout> | null = null
  let watchStartedAt: number | null = null
  let watchUptimeInterval: ReturnType<typeof setInterval> | null = null
  let deviceStatus: DeviceStatus = {
    backend: state.backend,
    connected: false,
    devices: [],
    toys: [],
    message: '',
  }
  const feed: FeedItem[] = loadPaymentLog()
  let uiReady = false
  let busy = false
  let busyWatchdog: ReturnType<typeof setTimeout> | null = null
  let view: PageView = pageFromHash()
  const BLE_TIP_DISMISS_KEY = 'pulsefans.ble.tipDismissed.v1'
  let bleRelinkDismissed = (() => {
    try {
      return localStorage.getItem(BLE_TIP_DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })()

  root.innerHTML =
    (isPagesShowcase() ? SHOWCASE_BANNER_HTML : '') + appShellHtml()
  if (isPagesShowcase()) {
    document.documentElement.dataset.pagesShowcase = '1'
    root.classList.add('app--showcase')
  }
  const $ = <T extends HTMLElement>(id: string) => qs<T>(root, id)

  /** Replaced after showError exists so failed writes surface in the banner. */
  let persistSettings: (s: Saved) => boolean = saveSettings

  function showError(msg: string) {
    const el = $('err')
    if (!msg) {
      el.hidden = true
      el.textContent = ''
      return
    }
    el.hidden = false
    el.textContent = msg
  }

  persistSettings = (s: Saved) => {
    const ok = saveSettings(s)
    if (!ok) {
      showError(
        'Could not save settings — browser storage may be full or blocked. Export a backup from Settings.',
      )
    }
    return ok
  }

  function isElectronShell(): boolean {
    return /\bElectron\//i.test(
      typeof navigator !== 'undefined' ? navigator.userAgent || '' : '',
    )
  }

  function rememberedBleToys(): DeviceToy[] {
    if (state.backend !== 'bluetooth') return []
    // Only surface remembered toys while actively recovering — otherwise the
    // Home roster looks "already set up" for a fresh Link toy session.
    if (!toysRecovering()) return []
    const recovering = toysRecovering()
    return LovenseWebBluetooth.loadRememberedToys()
      .map((row) => {
        const id = row.id || (row.mac ? `mac:${row.mac}` : '')
        if (!id || !row.name) return null
        const toy: DeviceToy = {
          id,
          name: row.tag ? `${row.name} ${row.tag}` : row.name,
          connected: false,
          status: recovering ? 'reconnecting' : 'offline',
          source: 'bluetooth',
          extra: row.mac ? { mac: row.mac } : undefined,
        }
        return toy
      })
      .filter((toy): toy is DeviceToy => Boolean(toy))
  }

  function liveToys(): DeviceToy[] {
    return deviceStatus.toys || []
  }

  function toyMatchesPickedBackend(toy: DeviceToy): boolean {
    const src = String(toy.source || '')
    if (state.backend === 'bluetooth') return src === 'bluetooth' || src === 'ble'
    if (state.backend === 'intiface') return src === 'intiface'
    return src === 'lovense' || src === 'emu'
  }

  /** Live hardware plus last-session toys so reload does not empty Home / tabs. */
  function rosterToys(): DeviceToy[] {
    const merged = mergeLiveWithSavedToys(liveToys(), [
      ...(state.savedToys || []),
      ...rememberedBleToys(),
    ]).filter(toyMatchesPickedBackend)
    if (state.backend !== 'bluetooth' || !toysRecovering()) return merged
    return merged.map((toy) => {
      if (toy.source !== 'bluetooth') return toy
      if (toy.connected !== false) return toy
      return { ...toy, status: 'reconnecting' }
    })
  }

  function liveBluetoothCount(): number {
    return (deviceStatus.toys || []).filter(
      (t) => t.source === 'bluetooth' && t.connected !== false,
    ).length
  }

  function rememberedBluetoothCount(): number {
    return LovenseWebBluetooth.loadRememberedToys().length
  }

  /** User hit Disconnect — do not resurrect leftover cards from an empty live poll. */
  let rosterForgotten = false
  /** Boot / reload is still bringing hardware back — not the same as offline. */
  let hardwareRecovering =
    state.hardwareLive !== false &&
    (state.backend === 'bluetooth' ||
      state.backend === 'intiface' ||
      ((state.backend === 'lovense' || state.backend === 'lovense-remote') &&
        !isEmptyLovenseLocalIp(state.lovenseLocalIp || '')))

  function toysRecovering() {
    return hardwareRecovering || device.isReconnecting
  }

  function forgetHardwareRoster() {
    rosterForgotten = true
    state.savedToys = []
    persistSettings({ ...state, savedToys: [] })
    LovenseWebBluetooth.clearRemembered()
  }

  function rememberHardwareToys(live: DeviceToy[]) {
    if ((live || []).some(isPersistedHardwareToy)) rosterForgotten = false
    const previous = rosterForgotten ? [] : state.savedToys || []
    const next = upsertSavedToys(live, previous)
    if (savedToysEqual(next, state.savedToys || [])) return
    state.savedToys = next
    persistSettings({ ...state, savedToys: next })
  }

  /**
   * Tip-menu paint is provided by tipMenuStudio (created after device/test
   * helpers). Keep a forward slot so early closures never hit a TDZ crash.
   */
  let paintPatterns: () => void = () => {}
  let scheduleStreamMenuPush: () => void = () => {}

  const device = new DeviceController((s) => {
    deviceStatus = s
    rememberHardwareToys(s.toys || [])
    if (uiReady) {
      paintDevice()
      if (view === 'menu') paintPatterns()
      scheduleStreamMenuPush()
    }
  })

  let queueStatus: BuzzQueueStatus = {
    depth: 0,
    waiting: 0,
    busy: false,
    playingId: null,
    playingLabel: null,
    playingToys: 0,
    message: 'idle',
  }

  const buzzQueue = new BuzzQueue({
    gapMs: state.queueGapMs,
    maxQueue: state.maxQueue,
    run: async (job) => {
      await device.buzz(
        job.intensity,
        job.durationMs,
        job.pattern ?? 'spark',
        job.toyId,
      )
    },
    onStatus: (s) => {
      queueStatus = s
      if (uiReady) paintQueue()
    },
  })

  const backendEl = $<HTMLSelectElement>('backend')
  const deviceUrlEl = $<HTMLInputElement>('device-url')
  const appIdEl = $<HTMLInputElement>('lovense-appid')
  const chainEl = $<HTMLInputElement>('chain')
  const rpcListEl = $<HTMLTextAreaElement>('rpc-list')
  const receiveEl = $<HTMLInputElement>('receive')
  const receiveLabelEl = $<HTMLInputElement>('receive-label')
  const minEl = $<HTMLInputElement>('min-amount')
  const tokenEl = $<HTMLInputElement>('token')
  const tokenDecEl = $<HTMLInputElement>('token-dec')
  const tokenSymEl = $<HTMLInputElement>('token-sym')
  const tokenLabelEl = $<HTMLInputElement>('token-label')
  const rpcFileEl = $<HTMLInputElement>('rpc-file')
  const pageMain = $<HTMLDivElement>('page-main')
  const pageLive = $<HTMLDivElement>('page-live')
  const pageSettings = $<HTMLDivElement>('page-settings')
  const pageMenu = $<HTMLDivElement>('page-menu')
  const pageObs = $<HTMLDivElement>('page-obs')
  const btnMenu = $<HTMLButtonElement>('btn-menu')
  const drawer = $<HTMLElement>('app-drawer')
  const drawerScrim = $<HTMLDivElement>('drawer-scrim')
  const setNight = $<HTMLInputElement>('set-night')
  const setQueueGap = $<HTMLInputElement>('set-queue-gap')
  const setMaxQueue = $<HTMLInputElement>('set-max-queue')
  const setPollMs = $<HTMLInputElement>('set-poll-ms')
  const settingsStatus = $<HTMLParagraphElement>('settings-status')
  const homeWalletStatus = $<HTMLParagraphElement>('home-wallet-status')
  const setImportFile = $<HTMLInputElement>('set-import-file')

  const tipAlert = mountStreamTipAlert({
    el: $,
    getStyle: () =>
      normalizeOverlayStyle(state.overlayStyle || defaultOverlayStyle),
    setStyle: (s) => {
      state.overlayStyle = s
    },
    persist: (s) => {
      state.overlayStyle = s
      persistSettings({ ...state, overlayStyle: s })
    },
    getQr: () =>
      normalizeOverlayQr({
        ...(state.overlayQr || defaultOverlayQr),
        address: state.receive,
      }),
    setQr: (q) => {
      // Keep switch/slide preferences; drop ephemeral offer SVGs from state
      state.overlayQr = normalizeOverlayQr({ ...q, menuOffers: [] })
    },
    persistQr: (q) => {
      state.overlayQr = normalizeOverlayQr({ ...q, menuOffers: [] })
      persistSettings({ ...state, overlayQr: state.overlayQr })
    },
    getMenuStyle: () =>
      normalizeOverlayMenuStyle(
        state.overlayMenu || defaultOverlayMenuStyle,
      ),
    setMenuStyle: (s) => {
      state.overlayMenu = s
    },
    persistMenu: (s) => {
      state.overlayMenu = s
      persistSettings({ ...state, overlayMenu: s })
    },
    getReceiveAddress: () => state.receive || '',
    getDryRun: () => false,
    getChainSymbol: () => tipMenuUnitSymbol(),
    getMenuOffers: () => buildStreamMenuOffers(),
    isPageActive: () => view === 'obs',
  })

  const actionButtons = [
    $('btn-connect'),
    $('btn-disconnect'),
    $('btn-test'),
    $('btn-scan'),
    $('btn-stop'),
    $('btn-watch'),
    $('btn-simulate'),
  ] as HTMLButtonElement[]

  /** Keep main action buttons + per-feature Test buttons in sync with `busy`. */
  function applyBusyToActions() {
    for (const b of actionButtons) {
      if (b.id === 'btn-stop' || b.id === 'btn-disconnect') continue
      if (busy) {
        b.disabled = true
        continue
      }
      if (b.id === 'btn-scan') {
        b.disabled = !deviceStatus.connected
        continue
      }
      b.disabled = false
    }
  }

  function setBusy(on: boolean) {
    busy = on
    if (busyWatchdog) {
      clearTimeout(busyWatchdog)
      busyWatchdog = null
    }
    // Powered-off BLE toys can leave GATT promises pending; never lock the UI forever.
    if (on) {
      busyWatchdog = setTimeout(() => {
        busyWatchdog = null
        if (!busy) return
        busy = false
        if (uiReady) paintDevice()
        else applyBusyToActions()
      }, 25_000)
    }
    if (uiReady) paintDevice()
    else applyBusyToActions()
  }

  function applyDeviceSettings() {
    device.setIntifaceUrl(state.intifaceUrl)
    device.setLovenseLocalIp(state.lovenseLocalIp)
    device.setLovenseAppId(state.lovenseAppId)
    device.setDisabledToys(state.disabledToys)
    device.setToyMotorMasks(state.toyMotorMasks || {})
    device.setMaxVibeCaps(state.menuMaxVibe ?? 8, state.toyMaxVibe || {})
    device.setToyIdentity(state.toyIdentity || {})
  }

  function applyQueueSettings() {
    buzzQueue.setGapMs(state.queueGapMs)
    buzzQueue.setMaxQueue(state.maxQueue)
  }

  function paintRpcCount() {
    const n = parseRpcList(rpcListEl.value).length
    $('rpc-count').textContent = n
      ? `(${n} active)`
      : '(using chain defaults when empty)'
  }

  function syncUrlField() {
    const label = $('url-label')
    const field = $('url-field')
    const appField = $('appid-field')
    const noEndpoint = state.backend === 'bluetooth'
    // APPID only for Lovense Connect (not Remote Game Mode)
    const noAppId = state.backend !== 'lovense'

    if (state.backend === 'bluetooth') {
      const inDesktop = isElectronShell()
      $('device-hint').textContent = inDesktop
        ? 'Bluetooth stays in this app. Link toy opens a picker — select several toys and link them together. Add toy links more without dropping the first.'
        : bleSilentReconnectSupported()
          ? 'Bluetooth in this browser window. After a refresh, Link toy brings them back. Same button adds the next one.'
          : 'Bluetooth in this browser window. After a refresh you pick each toy again — that is the Bluetooth picker, not Lovense Connect.'
    } else if (state.backend === 'intiface') {
      label.textContent = 'Intiface WebSocket'
      deviceUrlEl.placeholder = 'ws://127.0.0.1:12345'
      deviceUrlEl.value = state.intifaceUrl
      $('device-hint').textContent =
        'Advanced multi-brand stack. Most people should use Lovense Connect.'
    } else if (state.backend === 'lovense-remote') {
      label.textContent = 'Local IP'
      deviceUrlEl.placeholder = LOVENSE_LOCAL_IP_PLACEHOLDER
      deviceUrlEl.value = lovenseLocalIpFieldValue(state.lovenseLocalIp)
      appIdEl.placeholder = LOVENSE_APPID_PLACEHOLDER
      appIdEl.value = state.lovenseAppId
      $('device-hint').textContent = LOVENSE_REMOTE_HINT
    } else {
      label.textContent = 'Local IP'
      deviceUrlEl.placeholder = LOVENSE_LOCAL_IP_PLACEHOLDER
      deviceUrlEl.value = lovenseLocalIpFieldValue(state.lovenseLocalIp)
      appIdEl.placeholder = LOVENSE_APPID_PLACEHOLDER
      appIdEl.value = state.lovenseAppId
      $('device-hint').textContent = LOVENSE_HINT
    }

    const lovenseOn = state.backend === 'lovense'
    $('lovense-download').hidden = !lovenseOn

    field.hidden = noEndpoint
    appField.hidden = noAppId
    field.classList.remove('is-idle')
    appField.classList.remove('is-idle')
    deviceUrlEl.disabled = noEndpoint
    appIdEl.disabled = noAppId
  }

  function paintAddressPill() {
    const raw = receiveEl.value.trim()
    const pill = $('address-pill')
    if (!raw) {
      pill.textContent = 'required'
      pill.classList.remove('on', 'bad')
      return
    }
    if (isAddress(raw)) {
      pill.textContent = 'valid'
      pill.classList.add('on')
      pill.classList.remove('bad')
    } else {
      pill.textContent = 'invalid'
      pill.classList.add('bad')
      pill.classList.remove('on')
    }
  }

  /**
   * Resolve which toy ticks are active for the tip menu.
   * null = auto: currently connected hardware only (never the full catalog).
   * [] = none. Explicit ids = that selection (stale ids → connected).
   */
  function resolvedFilterToyIds(menuToys: DeviceToy[]): string[] {
    return resolveTipMenuFilterIds(menuToys, state.menuFilterToyIds)
  }

  /** Tips filter by ticked toys (always at least the profile list). */
  function menuFitToys():
    import('./utils/patternFit').CapabilitySource[] | null {
    const menuToys = toysForTipMenu(rosterToys())
    const ids = new Set(resolvedFilterToyIds(menuToys))
    return menuToys.filter((t) => t.id && ids.has(t.id))
  }

  function tipMenuUnitSymbol(): string {
    const chain = CHAINS[state.chainKey]
    const tokenRaw = state.tokenAddress.trim()
    if (tokenRaw && isAddress(tokenRaw)) {
      const saved = (state.savedTokens || []).find(
        (t) => t.address.toLowerCase() === tokenRaw.toLowerCase(),
      )
      return (
        (saved ? tokenDisplayLabel(saved) : '') ||
        tokenLabelEl.value.trim() ||
        tokenLabelForAddress(tokenRaw) ||
        state.tokenSymbol ||
        'TOKEN'
      )
    }
    return chain.symbol
  }

  function formatOfferAmount(n: number): string {
    if (!Number.isFinite(n)) return '0'
    if (n >= 1000) {
      return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
    }
    if (n >= 10) {
      return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
    }
    return n.toLocaleString(undefined, {
      maximumFractionDigits: 4,
      minimumFractionDigits: 0,
    })
  }

  type MenuOfferDraft = {
    id: string
    sheetKey: string
    offer: OverlayMenuOffer
    symbol: string
    tokenAddress: string
    decimals: number
    receive: string
    chainId: number
  }

  /** Last-line defense: no two rows on the same toy+coin sheet share an amount. */
  function finalizeUniqueMenuOffers(drafts: MenuOfferDraft[]): OverlayMenuOffer[] {
    const bySheet = new Map<string, MenuOfferDraft[]>()
    for (const draft of drafts) {
      const row = bySheet.get(draft.sheetKey) || []
      row.push(draft)
      bySheet.set(draft.sheetKey, row)
    }
    const out: OverlayMenuOffer[] = []
    for (const row of bySheet.values()) {
      const unique = applyUniqueSkuAmounts(
        row.map((draft) => ({ id: draft.id, amount: draft.offer.amount })),
      )
      const amountById = new Map(unique.map((entry) => [entry.id, entry.amount]))
      for (const draft of row) {
        const amount = amountById.get(draft.id) ?? draft.offer.amount
        const rawUri =
          draft.receive && isAddress(draft.receive)
            ? tryBuildTipPaymentUri({
                receiveAddress: draft.receive,
                amountHuman: amount,
                chainId: draft.chainId,
                decimals: draft.decimals,
                tokenAddress: draft.tokenAddress || null,
              })
            : null
        const paymentUri =
          rawUri && draft.receive
            ? fanSafeCreatorWalletUri(rawUri, draft.receive)
            : undefined
        out.push({
          ...draft.offer,
          amount,
          amountLabel: `${formatOfferAmount(amount)} ${draft.symbol}`,
          paymentUri,
        })
      }
    }
    return out
  }

  /**
   * Snapshot of tip-menu patterns for OBS (carousel + tip-menu overlay).
   * Amounts always match Tip Menu Studio cards (`patternToyPrice`) — never the
   * coin-reward CSV USD→token conversion (that is for inbound tip matching only).
   */
  function buildStreamMenuOffers(opts?: { includeMenuViz?: boolean }): OverlayMenuOffer[] {
    const includeMenuViz = opts?.includeMenuViz !== false
    const fitToys = menuFitToys() || []
    if (!fitToys.length) return []
    const chain = CHAINS[state.chainKey]
    const receive = state.receive.trim()
    const tokenRaw = state.tokenAddress.trim()
    const tokenOk = Boolean(tokenRaw && isAddress(tokenRaw))
    const decimals = tokenOk
      ? Math.max(0, Math.round(Number(state.tokenDecimals) || 18))
      : Math.max(0, Math.round(chain.chain.nativeCurrency.decimals ?? 18))
    const drafts: MenuOfferDraft[] = []
    for (const toy of fitToys) {
      const toyLabel = shortToyLabel(toy.name || '', toy.toyType, toy.id)
      const menu = patternsForToyMenu(toy, {
        disabled: state.disabledPatterns,
        featured: state.featuredPatterns,
        includeDisabled: false,
      })
      for (const p of menu) {
        const strengths = includeMenuViz ? vizStepsForPattern(p) : undefined
        const price = patternToyPrice(
          p.id,
          state.patternPrices,
          state.toyPatternPrices,
          toy.id,
        )
        // EIP-681 / QR require a positive amount — skip dust zeros.
        if (!Number.isFinite(price) || price <= 0) continue
        const symbol = tipMenuUnitSymbol()
        const tokenKey = tokenOk ? tokenRaw.toLowerCase() : 'native'
        const sheetKey = `${toyLabel}|${tokenKey}`
        const offer: OverlayMenuOffer = {
          name: p.name,
          amount: price,
          amountLabel: `${formatOfferAmount(price)} ${symbol}`,
          note: toyLabel,
          blurb: String(p.blurb || '').trim() || undefined,
          featured: state.featuredPatterns.includes(p.id),
          strengths,
          barsSvg: strengths
            ? patternBarsSvgString(strengths, { w: 720, h: 64, quality: 'hd' })
            : undefined,
        }
        drafts.push({
          id: `${sheetKey}|${p.id}`,
          sheetKey,
          offer,
          symbol,
          tokenAddress: tokenOk ? tokenRaw : '',
          decimals,
          receive,
          chainId: chain.chain.id,
        })
      }
    }
    const pool = finalizeUniqueMenuOffers(drafts)
    pool.sort(
      (a, b) =>
        Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
        a.amount - b.amount ||
        (a.note || '').localeCompare(b.note || '') ||
        a.name.localeCompare(b.name),
    )
    return takeOverlayMenuOffersEvenly(
      pool,
      (row) => row.note || '',
      OVERLAY_MENU_OFFER_LIMIT,
    )
  }

  let menuOfferPushTimer = 0
  let overlayPushHeavy = false
  /** Push tip-menu rows to OBS hub only — never re-save form ticks from this path. */
  scheduleStreamMenuPush = () => {
    window.clearTimeout(menuOfferPushTimer)
    const delay = overlayPushHeavy ? 450 : 2_400
    menuOfferPushTimer = window.setTimeout(() => {
      const baseQr = normalizeOverlayQr({
        ...(state.overlayQr || defaultOverlayQr),
        address: state.receive || '',
      })
      const needMenuOffers =
        baseQr.slides.menu !== false || baseQr.slides.qr !== false
      const q = normalizeOverlayQr({
        ...baseQr,
        menuOffers: needMenuOffers ? buildStreamMenuOffers() : [],
        menuSymbol: tipMenuUnitSymbol(),
      })
      overlayPushHeavy = true
      // Keep settings lean (no bars SVG); hub gets the full payload via push.
      state.overlayQr = normalizeOverlayQr({ ...q, menuOffers: [] })
      void pushOverlayQr(q)
      void pushOverlayLadder(buildStreamMenuOffers({ includeMenuViz: false }))
    }, delay)
  }

  let addPayment: (payment: FeedItem) => void = () => {
    throw new Error('Payments feed is not initialized')
  }
  let paintFeed: () => void = () => {}
  const tipPipeline = createTipPipeline({
    getState: () => state,
    getDeviceToys: () => deviceStatus.toys || [],
    device,
    applyDeviceSettings,
    buzzQueue,
    addPayment: (payment) => addPayment(payment),
    paintFeed: () => paintFeed(),
    setQueueStatus: (message) => {
      $('queue-status').textContent = message
    },
    getOverlayStyle: () =>
      normalizeOverlayStyle(state.overlayStyle || defaultOverlayStyle),
    notifyTip: (payload) => {
      void tipAlert.notify(payload)
    },
    showError,
  })
  const {
    tipBuzzToys,
    plansForPayment,
    resolveToyFeedLabel,
    feedFeelLine,
    ensureDeviceReady,
    runPatternTest,
    onPayment,
  } = tipPipeline

  const paymentsFeed = createPaymentsFeed({
    $,
    getState: () => state,
    getFeed: () => feed,
    plansForPayment,
    feedFeelLine,
    resolveToyFeedLabel,
    showError,
  })
  ;({ addPayment, paintFeed } = paymentsFeed)

  // The pipeline is fully initialized before a watcher can dispatch payments.
  const watchSession = createWatchSession({
    onPayment,
    onStatus: (status) => {
      watchStatus = status
      if (uiReady) paintWatch()
    },
    onError: showError,
  })

  function paintSession() {
    const backend =
      state.backend === 'bluetooth'
        ? 'Bluetooth'
        : state.backend === 'lovense'
          ? 'Lovense Connect'
          : state.backend === 'lovense-remote'
            ? 'Lovense Remote'
            : state.backend === 'intiface'
              ? 'Intiface'
              : 'Lovense Connect'
    const wallet = isAddress(state.receive)
      ? (() => {
          const lab = labelForAddress(state.receive)
          return lab ? `${lab} (${short(state.receive)})` : short(state.receive)
        })()
      : 'wallet not set'
    const on = PATTERNS.length - state.disabledPatterns.length
    const deviceOn = deviceStatus.connected ? 'connected' : 'off'
    const watch = watchStatus.watching ? 'watching' : 'idle'
    const toysOn =
      deviceStatus.toys?.filter(
        (t) => t.id && !state.disabledToys.includes(t.id),
      ).length ?? 0
    const toysTotal = deviceStatus.toys?.length ?? 0

    $('session-line').textContent = [
      wallet,
      `${backend} · ${deviceOn}`,
      watch,
      `${on} patterns on`,
    ].join(' · ')
    $('device-summary').textContent = [
      backend,
      deviceOn,
      toysTotal
        ? `toys ${toysOn}/${toysTotal} buzz`
        : 'no toys yet',
    ].join(' · ')
  }

  // Seed list with the currently watched address if present
  if (isAddress(state.receive)) {
    const before = state.savedWallets.length
    state.savedWallets = rememberWallet(state.savedWallets, state.receive)
    if (state.savedWallets.length !== before) {
      persistSettings(state)
    }
  }

  const navigation = createPageNavigation({
    root,
    pageMain,
    pageLive,
    pageSettings,
    pageMenu,
    pageObs,
    menuButton: btnMenu,
    drawer,
    drawerScrim,
    onPage: (next) => {
      view = next
      if (next === 'main') {
        paintSession()
      } else if (next === 'live') {
        applyForm()
        paintSession()
        paintWatch()
        paintPoolPanel()
        paintFeed()
      } else if (next === 'settings') {
        applyForm()
        fillSettingsForm()
      } else if (next === 'obs') {
        tipAlert.paint()
      } else {
        applyForm()
        paintPatterns()
      }
    },
  })
  const setDrawerOpen = navigation.setDrawerOpen
  const showPage = navigation.showPage

  /** Picker cancel with toys already linked is not a failure — don't red-banner it. */
  function showBlePickerError(e: unknown) {
    const linked = (deviceStatus.toys || []).filter(
      (t) => t.source === 'bluetooth' && t.connected !== false,
    )
    if (isBlePickerCancel(e) && linked.length) {
      showError('')
      $('device-status').textContent = `Linked · ${linked
        .map((t) => t.name)
        .join(' · ')} · ${linked.length} online · Add toy for the next one`
      return
    }
    showError(e instanceof Error ? e.message : String(e))
  }

  const walletsUi = createWalletsUi({
    $,
    elements: {
      receive: receiveEl,
      receiveLabel: receiveLabelEl,
      settingsStatus: homeWalletStatus,
    },
    getState: () => state,
    setState: (next) => {
      state = next
    },
    readForm: () => settingsForm.readForm(),
    save: persistSettings,
    showError,
    paintSession,
    paintWatch,
    paintAddressPill,
    syncQr: () => void tipAlert.syncQr(),
    onReceiveChange: () => {
      persist()
      paintAddressPill()
      paintRpcCount()
      paintSession()
    },
  })
  const {
    labelForAddress,
    paintSavedWallets,
  } = walletsUi

  const tokensUi = createTokensUi({
    $,
    elements: {
      token: tokenEl,
      symbol: tokenSymEl,
      decimals: tokenDecEl,
      label: tokenLabelEl,
      settingsStatus: document.getElementById(
        'menu-token-status',
      ) as HTMLParagraphElement | null,
    },
    getState: () => state,
    setState: (next) => {
      state = next
    },
    readForm: () => settingsForm.readForm(),
    save: persistSettings,
    showError,
    paintSession: () => {
      paintSession()
      paintPatterns()
    },
    onTokenFieldChange: () => {
      persist()
      paintAddressPill()
      paintRpcCount()
      paintSession()
      paintPatterns()
    },
  })
  const { tokenLabelForAddress, paintSavedTokens } = tokensUi

  const poolsUi = createPoolsUi({
    $,
    getState: () => state,
    setState: (next) => {
      state = next
    },
    readForm: () => settingsForm.readForm(),
    save: persistSettings,
    isWatching: () => watchStatus.watching,
    restartWatch: () => void startWatch(),
    getToys: () =>
      (deviceStatus.toys || [])
        .filter(
          (toy) =>
            Boolean(toy.id) &&
            toy.source !== 'preview' &&
            String(toy.status || '').toLowerCase() !== 'catalog',
        )
        .map((toy) => ({
          id: toy.id!,
          name: toy.name || '',
          toyType: toy.toyType,
          connected: toy.connected,
        })),
    getPatterns: () =>
      enabledPatterns(state.disabledPatterns).map((pattern) => ({
        id: pattern.id,
        name: pattern.name,
      })),
  })
  const { paintPoolPanel } = poolsUi

  const settingsForm = createSettingsForm({
    $,
    elements: {
      backend: backendEl,
      deviceUrl: deviceUrlEl,
      appId: appIdEl,
      chain: chainEl,
      rpcList: rpcListEl,
      receive: receiveEl,
      receiveLabel: receiveLabelEl,
      minAmount: minEl,
      token: tokenEl,
      tokenDecimals: tokenDecEl,
      tokenSymbol: tokenSymEl,
      tokenLabel: tokenLabelEl,
      night: setNight,
      queueGap: setQueueGap,
      maxQueue: setMaxQueue,
      pollMs: setPollMs,
      status: settingsStatus,
      importFile: setImportFile,
    },
    getState: () => state,
    setState: (next) => {
      state = next
    },
    save: persistSettings,
    getView: () => view,
    getOverlayStyle: () =>
      normalizeOverlayStyle(state.overlayStyle || defaultOverlayStyle),
    getOverlayQr: () =>
      normalizeOverlayQr({
        ...(state.overlayQr || defaultOverlayQr),
        address: state.receive || '',
        menuOffers: [],
      }),
    getOverlayMenu: () =>
      normalizeOverlayMenuStyle(
        state.overlayMenu || defaultOverlayMenuStyle,
      ),
    readOverlayStyle: () => tipAlert.readStyle(),
    readOverlayQr: () => tipAlert.readQr(),
    readOverlayMenu: () => tipAlert.readMenuStyle(),
    formatRpcList: (value) => formatRpcList(parseRpcList(value)),
    parseRpcList,
    syncUrlField,
    paintRpcCount,
    applyDeviceSettings,
    applyQueueSettings,
    paintAddressPill,
    paintSavedWallets,
    paintSavedTokens,
    paintPoolPanel,
    paintSession,
    paintPatterns,
    paintMode,
    paintWatch,
    paintQueue,
    isWatching: () => watchStatus.watching,
    labelForAddress,
    tokenLabelForAddress,
  })
  const {
    readForm,
    persist,
    fillSettingsForm,
    applyForm,
  } = settingsForm

  /** After LAN discover, write the found IP into the form so the next persist keeps it. */
  function adoptDiscoveredLovenseIp() {
    if (state.backend !== 'lovense' && state.backend !== 'lovense-remote') return
    const ip = device.lovenseLocalIp.trim()
    if (isEmptyLovenseLocalIp(ip)) return
    if (deviceUrlEl.value.trim() === ip && state.lovenseLocalIp.trim() === ip) {
      return
    }
    deviceUrlEl.value = ip
    persist()
  }

  function paintDevice() {
    const pill = $('device-pill')
    const connectBtn = $('btn-connect')
    const disconnectBtn = $<HTMLButtonElement>('btn-disconnect')
    const scanBtn = $<HTMLButtonElement>('btn-scan')
    const backendForUi = state.backend
    const on = deviceStatus.connected
    // Desktop BLE picker reads this to mark already-imported toys.
    try {
      ;(window as unknown as { __jttBleLinked?: unknown }).__jttBleLinked = (
        deviceStatus.toys || []
      )
        .filter((t) => t.source === 'bluetooth' || t.source === 'ble')
        .map((t) => ({
          id: String(t.id || ''),
          name: String(t.name || t.toyType || ''),
          mac: t.extra?.mac != null ? String(t.extra.mac) : '',
          connected: t.connected !== false,
        }))
    } catch {
      /* ignore */
    }
    const recovering =
      backendForUi === 'bluetooth' && toysRecovering() && !on
    pill.textContent =
      backendForUi === 'bluetooth'
        ? on
          ? 'bluetooth'
          : recovering
            ? 'linking'
            : 'off'
        : backendForUi === 'intiface'
          ? on
            ? 'intiface'
            : 'off'
          : on
            ? 'connected'
            : recovering
              ? 'linking'
              : 'off'
    pill.classList.toggle('on', on)
    connectBtn.textContent =
      backendForUi === 'bluetooth'
        ? on
          ? 'Add toy'
          : 'Link toy'
        : 'Connect'
    connectBtn.title =
      backendForUi === 'bluetooth' && on
        ? 'Open the Bluetooth picker to link another toy (keeps existing links)'
        : backendForUi === 'bluetooth'
          ? isElectronShell()
            ? 'Open the Bluetooth picker and choose a toy'
            : 'Open the browser Bluetooth picker'
          : 'Find and link a toy'
    scanBtn.hidden = backendForUi === 'bluetooth' || !on
    scanBtn.textContent = 'Refresh'
    scanBtn.title = 'Refresh the toy list'

    const list = $('toy-list')
    const empty = $('toy-empty')
    const box = $('toy-box')
    list.replaceChildren()

    const toys = rosterToys()
    const show = toys.filter((t) => t.source !== 'preview')

    // Show any real linked inventory (don't hide when connected flaps momentarily)
    if (show.length) {
      box.classList.add('has-toys')
      empty.hidden = true
      // Stale cancel banner after Add toy — clear once toys are online.
      const errEl = $('err')
      if (
        !errEl.hidden &&
        /no device selected|cancelled · pick a toy/i.test(errEl.textContent || '') &&
        show.some((t) => t.source === 'bluetooth' && t.connected !== false)
      ) {
        showError('')
      }
      const off = new Set(state.disabledToys)
      for (const toy of show) {
        list.append(
          paintToyCard(toy, {
            buzzOn: toy.id ? !off.has(toy.id) : true,
            testing: busy,
            motorMask: toy.id ? state.toyMotorMasks?.[toy.id] : undefined,
            onMotorMask: (id, motors) => {
                    const next = { ...(state.toyMotorMasks || {}) }
                    if (!motors.length) delete next[id]
                    else next[id] = motors
                    state.toyMotorMasks = next
                    device.setToyMotorMasks(state.toyMotorMasks)
                    persistSettings({
                      ...readForm(),
                      toyMotorMasks: state.toyMotorMasks,
                    })
                    paintDevice()
                  },
            onToggleBuzz: (id, enabled) => {
                    const set = new Set(state.disabledToys)
                    if (enabled) set.delete(id)
                    else set.add(id)
                    state.disabledToys = [...set]
                    device.setDisabledToys(state.disabledToys)
                    persistSettings({
                      ...readForm(),
                      disabledToys: state.disabledToys,
                    })
                    paintDevice()
                    paintPatterns()
                  },
            onIdentity: (id, product) => {
                    const toy =
                      (deviceStatus.toys || []).find((t) => t.id === id) ||
                      ({ id } as { id: string; extra?: DeviceToy['extra'] })
                    const keys = identityKeysForToy(toy)
                    const next: Record<string, ToyIdentityOverride> = {
                      ...(state.toyIdentity || {}),
                    }
                    const productId = String(product || '')
                      .trim()
                      .toLowerCase()
                    for (const k of keys.length ? keys : [id]) {
                      if (!productId || productId === 'auto') {
                        delete next[k]
                      } else {
                        next[k] = { product: productId }
                      }
                    }
                    state.toyIdentity = next
                    device.setToyIdentity(state.toyIdentity)
                    persistSettings({
                      ...readForm(),
                      toyIdentity: state.toyIdentity,
                    })
                    device.refreshToys()
                    paintPatterns()
                  },
            onTestFeature: (id, channel) => {
                    if (busy) return
                    const runTest = async (toyId: string) => {
                      setBusy(true)
                      try {
                        const live = (deviceStatus.toys || []).map((t) => ({
                          id: t.id,
                          name: t.name,
                          connected: t.connected !== false,
                          source: t.source,
                        }))
                        // #region agent log
                        agentDbg('E', 'app.ts:onTestFeature', 'feature test click', {
                          id: toyId,
                          channel,
                          deviceConnected: deviceStatus.connected,
                          bleLinked: device.isConnected,
                          live,
                        })
                        // #endregion
                        await device.testFeature(toyId, channel, 3000)
                        showError('')
                      } catch (e) {
                        // #region agent log
                        agentDbg('E', 'app.ts:onTestFeature', 'feature test error', {
                          id: toyId,
                          channel,
                          err: e instanceof Error ? e.message : String(e),
                        })
                        // #endregion
                        showError(e instanceof Error ? e.message : String(e))
                      } finally {
                        setBusy(false)
                      }
                    }
                    const liveHit = (deviceStatus.toys || []).some(
                      (t) => t.id === id && t.connected !== false,
                    )
                    if (state.backend === 'bluetooth' && !liveHit) {
                      // Vibe click is the user gesture Chrome needs to open GATT.
                      const pick = device.openBluetoothPicker()
                      void pick
                        .then((info) => {
                          const toyId =
                            (deviceStatus.toys || []).some(
                              (t) => t.id === id && t.connected !== false,
                            )
                              ? id
                              : info.id || id
                          return runTest(toyId)
                        })
                        .catch((e) => {
                          showBlePickerError(e)
                        })
                      return
                    }
                    void runTest(id)
                  },
          }),
        )
      }
    } else {
      box.classList.remove('has-toys')
      empty.hidden = false
      if (deviceStatus.connected) {
        empty.textContent = 'No toys online'
      } else {
        empty.textContent = 'Not connected'
      }
    }

    const bits = [deviceStatus.message || '']
    if (backendForUi === 'bluetooth' && webBluetoothShellBlocked()) {
      bits.unshift(webBluetoothUnavailableMessage())
    }
    if (
      deviceStatus.endpoint &&
      deviceStatus.backend !== 'bluetooth'
    ) {
      bits.push(`endpoint ${deviceStatus.endpoint}`)
    }
    const buzzN = show.filter(
      (t) => t.id && !state.disabledToys.includes(t.id),
    ).length
    if (show.length) {
      bits.push(`${buzzN}/${show.length} set to buzz`)
    }
    $('device-status').textContent = bits.filter(Boolean).join(' · ')
    disconnectBtn.hidden = !show.length && !deviceStatus.connected
    const lovenseLink =
      backendForUi === 'lovense' || backendForUi === 'lovense-remote'
    disconnectBtn.textContent =
      deviceStatus.connected && !lovenseLink ? 'Disconnect all' : 'Disconnect'
    disconnectBtn.title = lovenseLink
      ? backendForUi === 'lovense-remote'
        ? 'Stop this page talking to Remote. Does not close the Lovense app. Stays off after refresh.'
        : 'Stop this page talking to Connect. Does not close the Lovense app. Stays off after refresh.'
      : deviceStatus.connected
        ? 'Drop every live toy'
        : 'Clear leftover toys from last session'
    paintLinkLights()
    paintBleRelink()
    applyBusyToActions()
    paintSession()
  }

  function paintLinkLights() {
    const live = deviceStatus.connected ? deviceStatus.backend : ''
    const picked = state.backend
    const labels: Record<string, string> = {
      bluetooth: 'Bluetooth',
      lovense: 'Lovense Connect',
      'lovense-remote': 'Lovense Remote',
      intiface: 'Intiface',
    }
    for (const key of [
      'lovense',
      'lovense-remote',
      'bluetooth',
      'intiface',
    ] as const) {
      const on = live === key
      const isPicked = picked === key
      const name = labels[key]
      const title = on
        ? `${name} · connected`
        : isPicked
          ? `${name} · selected`
          : name
      const header = document.getElementById(`link-light-${key}`)
      if (header) {
        header.classList.toggle('is-on', on)
        header.classList.toggle('is-picked', isPicked && !on)
        header.title = title
      }
      const pick = document.getElementById(`backend-pick-${key}`)
      if (pick) {
        pick.classList.toggle('is-on', on)
        pick.classList.toggle('is-picked', isPicked && !on)
        pick.setAttribute('aria-pressed', isPicked || on ? 'true' : 'false')
        pick.title = title
      }
    }
  }

  /**
   * After a refresh with zero *live* Bluetooth toys. Saved/offline roster
   * cards must not hide this — those are placeholders, not a working link.
   */
  function paintBleRelink() {
    const box = $('ble-relink')
    const title = $('ble-relink-title')
    const body = $('ble-relink-body')
    const live = liveBluetoothCount()

    if (
      state.backend !== 'bluetooth' ||
      webBluetoothShellBlocked() ||
      bleRelinkDismissed ||
      live > 0 ||
      device.isReconnecting
    ) {
      box.hidden = true
      return
    }

    // One-time migrate: collapse bloated legacy lists sitting in this browser.
    try {
      const cleaned = LovenseWebBluetooth.loadRememberedToys()
      if (cleaned.length) {
        localStorage.setItem(
          LovenseWebBluetooth.rememberedKey,
          JSON.stringify(cleaned),
        )
      }
      for (const key of LovenseWebBluetooth.rememberedKeyLegacy) {
        localStorage.removeItem(key)
      }
    } catch {
      /* ignore */
    }

    const remembered = LovenseWebBluetooth.loadRememberedNames()
    if (!remembered.length) {
      box.hidden = true
      return
    }

    box.hidden = false
    title.textContent = 'Re-link after refresh'
    const n = remembered.length
    body.textContent = bleSilentReconnectSupported()
      ? `Last session: ${n} Bluetooth toy${n === 1 ? '' : 's'}. Keep them powered on, then Link toy.`
      : isElectronShell()
        ? `After refresh, Link toy again for each of your ${n} toy${n === 1 ? '' : 's'}.`
        : `This browser asks again after each refresh. Hit Link toy, then Add toy for each of your ${n} toy${n === 1 ? '' : 's'}.`
    $('btn-ble-lovense').hidden = true
    // Desktop app does not need the Chrome permissions-backend flag.
    $('btn-ble-flag').hidden = isElectronShell()
  }

  function paintMode() {
    /* Practice toggle removed — Fake a tip is the test path. */
  }

  function paintWatch() {
    const pill = $('watch-pill')
    pill.textContent = watchStatus.watching ? 'watching' : 'stopped'
    pill.classList.toggle('on', watchStatus.watching)

    const livePanel = $('page-live')
    const watching = watchStatus.watching
    livePanel.classList.toggle('is-live', watching)
    if (watching && !wasWatching) {
      const flashEl = $('live-flash')
      flashEl.classList.add('flash-burst')
      if (liveFlashTimeout) clearTimeout(liveFlashTimeout)
      liveFlashTimeout = setTimeout(() => {
        flashEl.classList.remove('flash-burst')
      }, 800)

      if (watchStartedAt == null) {
        watchStartedAt = state.watchLiveSince || Date.now()
      }
      if (watchUptimeInterval) clearInterval(watchUptimeInterval)
      watchUptimeInterval = setInterval(() => {
        // Keep status feeling alive even while no payments arrive.
        if (!watchStatus.watching) return
        paintWatch()
      }, 30000)
    } else if (!watching && wasWatching) {
      watchStartedAt = null
      if (watchUptimeInterval) clearInterval(watchUptimeInterval)
      watchUptimeInterval = null
    }
    wasWatching = watching

    const block =
      watchStatus.blockNumber != null
        ? ` · block ${watchStatus.blockNumber.toString()}`
        : ''
    const rpcs =
      watchStatus.rpcCount > 0 ? ` · ${watchStatus.rpcCount} RPC(s)` : ''
    const active = activePools(state.pools)
    const listed = state.pools?.length || 0
    const activeBr = activeBridges(state.bridges)
    const activeLogs = activeChainLogs(state.chainLogs)
    const extraCount = active.length + activeBr.length + activeLogs.length
    const extraListed =
      listed + (state.bridges?.length || 0) + (state.chainLogs?.length || 0)
    const poolBit =
      state.poolWatch && extraCount > 0
        ? ` · ${extraCount} chain event${extraCount === 1 ? '' : 's'}`
        : state.poolWatch && extraListed > 0
          ? ' · chain events on (none ticked)'
          : ''
    const recv = short(state.receive) || '…'

    const baseStatus = watchStatus.watching
      ? state.receive
        ? `Listening for wallet tips to ${recv}${block}${rpcs}${poolBit}`
        : state.poolWatch && extraCount
          ? `Listening for chain events only${block}${rpcs}`
          : `Listening${block}${rpcs}${poolBit}`
      : 'Not watching — press Start watching in the header when ready'

    const elapsedSec =
      watchStatus.watching && watchStartedAt != null
        ? Math.floor((Date.now() - watchStartedAt) / 1000)
        : 0
    const elapsedStr =
      watchStatus.watching && watchStartedAt != null
        ? (() => {
            const m = Math.floor(elapsedSec / 60)
            const s = elapsedSec % 60
            return m ? `${m}m ${s}s` : `${s}s`
          })()
        : ''

    $('watch-status').textContent =
      baseStatus + (elapsedStr ? ` · ${elapsedStr}` : '')

    const watchBtn = $('btn-watch')
    watchBtn.textContent = watchStatus.watching
      ? 'Stop watching'
      : 'Start watching'
    watchBtn.classList.toggle('is-watching', watchStatus.watching)
    watchBtn.setAttribute(
      'aria-pressed',
      watchStatus.watching ? 'true' : 'false',
    )

    paintSession()
  }

  function paintQueue() {
    const pill = $('queue-pill')
    const on = queueStatus.busy || queueStatus.waiting > 0
    pill.textContent = on
      ? queueStatus.waiting > 0
        ? `queue ${queueStatus.waiting}`
        : 'playing'
      : 'ready'
    pill.classList.toggle('on', on)
    $('queue-status').textContent =
      queueStatus.message && queueStatus.message !== 'idle'
        ? queueStatus.message
        : `Each toy buzzes its own queue · ${state.queueGapMs}ms gap`
  }

  const tipMenu = createTipMenuStudio({
    $,
    getState: () => state,
    readForm,
    saveSettings: persistSettings,
    getDeviceToys: () => rosterToys(),
    resolvedFilterToyIds,
    menuFitToys,
    tokenLabelForAddress,
    getTokenLabelFieldValue: () => tokenLabelEl.value,
    showError,
    goHome: () => showPage('main'),
    paintSession,
    runPatternTest,
    scheduleStreamMenuPush,
    applyDeviceSettings,
  })
  paintPatterns = tipMenu.paintPatterns
  const {
    closePatternWizard,
    closePatternCatalog,
    closeShareCardModal,
    closeNeedWalletPopup,
  } = tipMenu

  function stopWatch() {
    watchSession.stop(state)
    state.watchLive = false
    state.watchLiveSince = 0
    persistSettings({ ...state, watchLive: false, watchLiveSince: 0 })
    paintWatch()
  }

  async function startWatch() {
    persist()
    const result = await watchSession.start(state)
    if (result === 'missing-target') {
      state.watchLive = false
      state.watchLiveSince = 0
      persistSettings({ ...state, watchLive: false, watchLiveSince: 0 })
      showError(
        'Enter a tip wallet on Home, or enable Watch chain events and tick at least one pool, bridge, or custom event On',
      )
      paintWatch()
      return
    }
    if (result === 'failed') {
      // onError already set the message; keep it visible.
      paintWatch()
      return
    }
    state.watchLive = true
    if (!state.watchLiveSince) state.watchLiveSince = Date.now()
    persistSettings({
      ...state,
      watchLive: true,
      watchLiveSince: state.watchLiveSince,
    })
    showError('')
    paintWatch()
  }

  // —— form / nav ——
  for (const pick of document.querySelectorAll<HTMLButtonElement>('.backend-pick')) {
    pick.addEventListener('click', () => {
      const next = pick.dataset.backend as DeviceBackend
      if (!next || next === backendEl.value) return
      backendEl.value = next
      backendEl.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }
  backendEl.addEventListener('change', () => {
    const next = backendEl.value as DeviceBackend
    const switched = next !== state.backend
    state.backend = next
    if (switched) {
      hardwareRecovering = false
      state.hardwareLive = false
    }
    syncUrlField()
    persist()
    paintSession()
    paintDevice()
    if (!switched) return
    showError('')
    void (async () => {
      try {
        await device.disconnect()
      } catch {
        /* already down */
      }
      if (uiReady) paintDevice()
    })()
  })

  deviceUrlEl.addEventListener('paste', (e) => {
    if (state.backend !== 'lovense' && state.backend !== 'lovense-remote') return
    const clip = e.clipboardData?.getData('text') || ''
    const parsed = parseConnectPopupPaste(clip)
    if (!parsed.localIp && !parsed.appId) return
    e.preventDefault()
    if (parsed.localIp) {
      deviceUrlEl.value = /^https?:\/\//i.test(parsed.localIp)
        ? parsed.localIp
        : parsed.localIp.includes('lovense.club')
          ? `https://${parsed.localIp}`
          : parsed.localIp
    }
    if (
      state.backend === 'lovense' &&
      parsed.appId &&
      !appIdEl.value.trim()
    ) {
      appIdEl.value = parsed.appId
    }
    persist()
  })

  deviceUrlEl.addEventListener('focus', () => {
    if (state.backend !== 'lovense' && state.backend !== 'lovense-remote') return
    if (!isEmptyLovenseLocalIp(deviceUrlEl.value)) return
    deviceUrlEl.value = lovenseLocalIpFieldValue('')
    deviceUrlEl.select()
  })

  deviceUrlEl.addEventListener('blur', () => {
    if (state.backend !== 'lovense' && state.backend !== 'lovense-remote') return
    if (!isEmptyLovenseLocalIp(deviceUrlEl.value)) return
    deviceUrlEl.value = lovenseLocalIpFieldValue('')
  })

  chainEl.addEventListener('change', () => {
    // PulseChain only — keep hidden input synced; RPC list stays user-owned.
    state.chainKey = 'pulsechain'
    chainEl.value = 'pulsechain'
    persist()
    paintSession()
  })

  for (const el of [
    deviceUrlEl,
    appIdEl,
    rpcListEl,
    minEl,
  ]) {
    el.addEventListener('change', () => {
      persist()
      paintAddressPill()
      paintRpcCount()
      paintSession()
    })
    el.addEventListener('input', () => {
      if (el === rpcListEl) paintRpcCount()
    })
  }

  $('btn-rpc-defaults').addEventListener('click', () => {
    rpcListEl.value = formatRpcList(defaultRpcs(chainEl.value as ChainKey))
    persist()
    paintRpcCount()
  })

  $('btn-rpc-clear').addEventListener('click', () => {
    rpcListEl.value = ''
    persist()
    paintRpcCount()
  })

  rpcFileEl.addEventListener('change', () => {
    const file = rpcFileEl.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const incoming = parseRpcImportText(String(reader.result || ''))
      rpcListEl.value = mergeRpcLists(rpcListEl.value, incoming)
      persist()
      paintRpcCount()
      showError('')
    }
    reader.onerror = () => showError('Could not read RPC file')
    reader.readAsText(file)
    rpcFileEl.value = ''
  })

  btnMenu.addEventListener('click', (e) => {
    e.stopPropagation()
    setDrawerOpen(!navigation.drawerOpen)
  })
  drawerScrim.addEventListener('click', () => setDrawerOpen(false))
  for (const a of drawer.querySelectorAll<HTMLAnchorElement>(
    'a.nav-item-link',
  )) {
    a.addEventListener('click', () => setDrawerOpen(false))
  }
  $('nav-home').addEventListener('click', () => showPage('main'))
  $('btn-home-brand').addEventListener('click', () => showPage('main'))
  $('nav-live').addEventListener('click', () => showPage('live'))
  $('nav-tip-menu').addEventListener('click', () => showPage('menu'))
  $('nav-obs').addEventListener('click', () => showPage('obs'))
  $('nav-settings').addEventListener('click', () => showPage('settings'))

  // Device panel minimize (persist in this browser)
  const DEVICE_MIN_KEY = 'pulsefans.devicePanelMin'
  const devicePanel = $('device-panel')
  const deviceMinBtn = $<HTMLButtonElement>('btn-device-min')
  const deviceMinLabel = $('device-min-label')
  function applyDeviceMinimized(min: boolean) {
    devicePanel.classList.toggle('is-minimized', min)
    deviceMinBtn.setAttribute('aria-expanded', min ? 'false' : 'true')
    deviceMinBtn.title = min ? 'Expand Device' : 'Minimize Device'
    deviceMinLabel.textContent = min ? 'Expand Device' : 'Minimize Device'
  }
  applyDeviceMinimized(localStorage.getItem(DEVICE_MIN_KEY) === '1')
  deviceMinBtn.addEventListener('click', () => {
    const next = !devicePanel.classList.contains('is-minimized')
    applyDeviceMinimized(next)
    try {
      localStorage.setItem(DEVICE_MIN_KEY, next ? '1' : '0')
    } catch {
      /* ignore quota */
    }
  })

  const WATCH_MIN_KEY = 'pulsefans.watchPanelMin'
  const watchPanel = $('watch-panel')
  const watchMinBtn = $<HTMLButtonElement>('btn-watch-min')
  const watchMinLabel = $('watch-min-label')
  function applyWatchMinimized(min: boolean) {
    watchPanel.classList.toggle('is-minimized', min)
    watchMinBtn.setAttribute('aria-expanded', min ? 'false' : 'true')
    watchMinBtn.title = min ? 'Expand Go live' : 'Minimize Go live'
    watchMinLabel.textContent = min ? 'Expand Go live' : 'Minimize Go live'
  }
  applyWatchMinimized(localStorage.getItem(WATCH_MIN_KEY) === '1')
  watchMinBtn.addEventListener('click', () => {
    const next = !watchPanel.classList.contains('is-minimized')
    applyWatchMinimized(next)
    try {
      localStorage.setItem(WATCH_MIN_KEY, next ? '1' : '0')
    } catch {
      /* ignore quota */
    }
  })

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    if (!$('pattern-wizard').hidden) {
      closePatternWizard()
      return
    }
    if (!$('pattern-catalog').hidden) {
      closePatternCatalog()
      return
    }
    if (!$('export-need-wallet-modal').hidden) {
      closeNeedWalletPopup()
      return
    }
    if (!$('menu-share-modal').hidden) {
      closeShareCardModal()
      return
    }
    const branding = document.getElementById('obs-branding-modal')
    if (branding && !branding.hidden) {
      branding.hidden = true
      return
    }
    if (navigation.drawerOpen) setDrawerOpen(false)
    else if (view !== 'main') showPage('main')
  })

  tipMenu.wireTipMenuEvents()

  walletsUi.wire()
  tokensUi.wire()
  poolsUi.wire()
  settingsForm.wire()
  paymentsFeed.wire()

  $('btn-connect').addEventListener('click', () => {
    if (busy) return
    state.hardwareLive = true
    const backend = (backendEl.value as DeviceBackend) || state.backend

    // Bluetooth: reconnect known toys from this click (user activation).
    // Do not race the chooser with GATT — that is what dropped toys after reload.
    if (backend === 'bluetooth') {
      state.backend = 'bluetooth'
      const shellBlock = webBluetoothShellBlocked()
      if (shellBlock) {
        showError(shellBlock)
        void fetch('/api/open-chrome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: `${location.origin}/` }),
        })
          .then(async (r) => {
            const j = (await r.json().catch(() => ({}))) as {
              ok?: boolean
              via?: string
            }
            if (j.ok) {
              showError(`${shellBlock} · opened ${j.via || 'browser'}`)
            }
          })
          .catch(() => {
            /* keep shellBlock message */
          })
        return
      }

      const startPicker = () => {
        // Do not setBusy/paint before chooser opens — that can cancel
        // requestDevice on Windows Chromium within a few ms.
        const pick = device.openBluetoothPicker()
        void pick
          .then(async () => {
            setBusy(true)
            persist()
            device.setDisabledToys(state.disabledToys)
            device.setToyMotorMasks(state.toyMotorMasks || {})
            // After a new pick, quietly wake any other already-permitted toys.
            if (bleSilentReconnectSupported()) {
              await device.connect('bluetooth', { skipPicker: true }).catch(() => {})
            }
            const linked = liveBluetoothCount()
            showError('')
            if (linked > 0) {
              $('device-status').textContent =
                linked >= 6
                  ? `Linked ${linked}`
                  : `Linked ${linked} · Add toy anytime for more`
            }
          })
          .catch((e) => {
            showBlePickerError(e)
          })
          .finally(() => {
            setBusy(false)
          })
      }

      // Always open the picker from Link toy / Add toy — reconnect-only belongs
      // on boot, not on this button (otherwise "Add toy" just re-binds known toys).
      startPicker()
      return
    }

    void (async () => {
      setBusy(true)
      try {
        persist()
        device.setDisabledToys(state.disabledToys)
        device.setToyMotorMasks(state.toyMotorMasks || {})
        await device.connect(state.backend)
        adoptDiscoveredLovenseIp()
        showError('')
      } catch (e) {
        showError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(false)
      }
    })()
  })

  $('btn-disconnect').addEventListener('click', () => {
    void (async () => {
      hardwareRecovering = false
      state.hardwareLive = false
      forgetHardwareRoster()
      persistSettings({ ...state, hardwareLive: false, savedToys: [] })
      setBusy(true)
      try {
        await device.disconnect()
      } catch {
        /* already down */
      } finally {
        setBusy(false)
        showError('')
        $('device-status').textContent = 'Disconnected'
        paintDevice()
      }
    })()
  })

  $('btn-ble-dismiss').addEventListener('click', () => {
    bleRelinkDismissed = true
    try {
      localStorage.setItem(BLE_TIP_DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    $('ble-relink').hidden = true
  })

  $('btn-ble-flag').addEventListener('click', () => {
    const btn = $('btn-ble-flag')
    void navigator.clipboard
      ?.writeText(BLE_PERSIST_FLAG_URL)
      .then(() => {
        btn.textContent = 'Copied — paste in Chrome address bar'
        $('ble-relink-body').textContent =
          'Paste the copied link in Chrome, set it to Enabled, restart Chrome, then link your toys once. They come back on every refresh after that.'
      })
      .catch(() => {
        $('ble-relink-body').textContent = `Open this in Chrome, set Enabled, restart: ${BLE_PERSIST_FLAG_URL}`
      })
  })

  $('btn-ble-lovense').addEventListener('click', () => {
    backendEl.value = 'lovense'
    backendEl.dispatchEvent(new Event('change', { bubbles: true }))
    showError('')
    $('device-status').textContent =
      'Lovense Connect keeps toys linked across refreshes — open Connect, then click Connect'
  })

  $('btn-scan').addEventListener('click', () => {
    if (busy) return
    if (!deviceStatus.connected) return
    const backend = (backendEl.value as DeviceBackend) || state.backend

    if (backend === 'bluetooth') {
      state.backend = 'bluetooth'
      const shellBlock = webBluetoothShellBlocked()
      if (shellBlock) {
        showError(shellBlock)
        void fetch('/api/open-chrome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: `${location.origin}/` }),
        }).catch(() => {})
        return
      }
      // Do not setBusy before the Chrome BLE chooser opens (same as Connect).
      const pick = device.openBluetoothPicker()
      void pick
        .then(async () => {
          setBusy(true)
          persist()
          showError('')
          if (bleSilentReconnectSupported()) {
            await device.connect('bluetooth', { skipPicker: true }).catch(() => {})
          }
        })
        .catch((e) => {
          showBlePickerError(e)
        })
        .finally(() => {
          setBusy(false)
        })
      return
    }

    void (async () => {
      setBusy(true)
      try {
        persist()
        applyDeviceSettings()
        await device.scan(state.backend)
        adoptDiscoveredLovenseIp()
        showError('')
      } catch (e) {
        showError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(false)
      }
    })()
  })

  async function runSpoofTips(mode: 'one' | 'everyToy' | 'ladder') {
    persist()
    await ensureDeviceReady()
    const to = isAddress(state.receive)
      ? (state.receive as Address)
      : ('0x0000000000000000000000000000000000000000' as Address)
    const symbol = CHAINS[state.chainKey].symbol
    const toys = tipBuzzToys()
    const jobOpts = {
      prices: state.patternPrices,
      disabled: state.disabledPatterns,
      toyPrices: state.toyPatternPrices,
      toys,
      // Demo spoofs ignore min tip so Nora rotate lines still fire
      minAmount: 0,
      maxTips: Math.min(48, Math.max(12, state.maxQueue || 32)),
    }
    const jobs =
      mode === 'ladder'
        ? ladderSimTipJobs(jobOpts)
        : mode === 'everyToy'
          ? testSimTipJobs(jobOpts)
          : (() => {
              const one = sampleSimTipJob(jobOpts)
              return one ? [one] : []
            })()
    if (!jobs.length) {
      showError(
        'No sim tips — enable patterns that fit a Buzz-on linked toy (rotate needs Nora, multi needs dual motors)',
      )
      return
    }
    for (const job of jobs) {
      void onPayment(
        simulatePayment(to, job.amount, symbol, {
          pattern: job.pattern,
          toyId: job.toyId || undefined,
          name: job.name,
          price: job.price,
          toyLabel: job.toyLabel || undefined,
        }),
      )
    }
    if (mode === 'ladder') {
      $('queue-status').textContent = `Spoofed ${jobs.length} forced tips (per-toy patterns, incl. rotate/thrust) · queue playing`
    } else if (mode === 'everyToy') {
      const names = jobs.map((j) => j.toyLabel || j.name).filter(Boolean)
      $('queue-status').textContent = `Test · ${jobs.length} toy(s) playing${
        names.length ? ` · ${names.join(', ')}` : ''
      }`
    } else {
      $('queue-status').textContent = `Test · ${jobs[0]!.name}${
        jobs[0]!.toyLabel ? ` · ${jobs[0]!.toyLabel}` : ''
      }`
    }
    showError('')
  }

  $('btn-test').addEventListener('click', () => {
    if (busy) return
    void (async () => {
      setBusy(true)
      try {
        // Full tip path on every linked toy: alert, feed, queue, hardware.
        await runSpoofTips('everyToy')
      } catch (e) {
        showError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(false)
      }
    })()
  })

  $('btn-stop').addEventListener('click', () => {
    buzzQueue.clear()
    void device.stopAll()
    paintQueue()
  })

  $('btn-watch').addEventListener('click', () => {
    if (busy) return
    void (async () => {
      if (watchStatus.watching) {
        stopWatch()
        return
      }
      setBusy(true)
      try {
        await startWatch()
      } catch (e) {
        showError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(false)
      }
    })()
  })

  $('btn-simulate').addEventListener('click', (ev) => {
    if (busy) return
    const fullLadder = (ev as MouseEvent).shiftKey
    void (async () => {
      setBusy(true)
      try {
        await runSpoofTips(fullLadder ? 'ladder' : 'one')
      } catch (e) {
        showError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(false)
      }
    })()
  })

  window.addEventListener('hashchange', () => {
    if (navigation.syncingHash) return
    const next = pageFromHash()
    if (next !== view) showPage(next, { fromHash: true })
  })

  applyForm()
  applyQueueSettings()
  if (!(state.savedToys || []).length) {
    const remembered = rememberedBleToys()
    if (remembered.length) {
      state.savedToys = upsertSavedToys([], remembered)
      persistSettings({ ...state, savedToys: state.savedToys })
    }
  }
  if (state.watchLive && state.watchLiveSince) {
    watchStartedAt = state.watchLiveSince
  }
  uiReady = true
  paintMode()
  paintDevice()
  paintWatch()
  paintFeed()
  paintQueue()
  paintSession()
  setDrawerOpen(false)
  showPage(pageFromHash(), { fromHash: true })
  scheduleStreamMenuPush()

  const runAfterWindowLoad = (fn: () => void) => {
    const kick = () => window.setTimeout(fn, 0)
    if (document.readyState === 'complete') kick()
    else window.addEventListener('load', kick, { once: true })
  }

  // Wait for window.load before GATT / Connect / watching. Starting those
  // during module eval keeps Chrome's tab spinner up even when nothing is moving.
  runAfterWindowLoad(() => {
    if (state.watchLive) void startWatch()
    void recoverHardware()
  })

  async function recoverHardware() {
    try {
      applyDeviceSettings()

      if (state.hardwareLive === false) {
        hardwareRecovering = false
        deviceStatus = {
          backend: state.backend,
          connected: false,
          devices: [],
          toys: [],
          message: 'Disconnected',
        }
        paintDevice()
        return
      }

      if (state.backend === 'bluetooth') {
        try {
          await device.connect('bluetooth', {
            skipPicker: true,
            waitForAds: true,
          })
          showError('')
        } catch {
          /* first pass may miss toys still waking; background recovery continues */
        }
        // #region agent log
        agentDbg('D', 'app.ts:boot bluetooth', 'boot reconnect done', {
          isConnected: device.isConnected,
          activeBackend: device.activeBackend,
          live: liveBluetoothCount(),
          remembered: rememberedBluetoothCount(),
          silentOk: bleSilentReconnectSupported(),
          status: deviceStatus.message,
          toys: (deviceStatus.toys || []).map((t) => ({
            id: t.id,
            name: t.name,
            connected: t.connected,
          })),
        })
        // #endregion
        paintDevice()
        return
      }

      const canAutoLovense =
        (state.backend === 'lovense' || state.backend === 'lovense-remote') &&
        !isEmptyLovenseLocalIp(state.lovenseLocalIp || '')
      const canAutoIntiface = state.backend === 'intiface'

      if (!canAutoLovense && !canAutoIntiface) {
        deviceStatus = {
          backend: state.backend,
          connected: false,
          devices: [],
          toys: [],
          message:
            state.backend === 'lovense'
              ? 'Open Connect, then click Connect'
              : state.backend === 'lovense-remote'
                ? 'Open Remote Game Mode, paste Local IP, then Connect'
                : 'Not connected',
        }
        paintDevice()
        return
      }

      deviceStatus = {
        ...deviceStatus,
        backend: state.backend,
        connected: false,
        devices: [],
        toys: [],
        message: 'Reconnecting…',
      }
      paintDevice()
      try {
        await device.connect(state.backend)
        showError('')
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        deviceStatus = {
          backend: state.backend,
          connected: false,
          devices: [],
          toys: [],
          message: 'Not connected',
        }
        paintDevice()
        if (
          !/could not reach|connect first|local ip required|not running/i.test(
            msg,
          )
        ) {
          showError(msg)
        }
      }
    } finally {
      hardwareRecovering = device.isReconnecting
      if (uiReady) paintDevice()
    }
  }

  // Tab focus: keep pulling missing Bluetooth toys back during a show.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    if (state.backend !== 'bluetooth') return
    if (device.isReconnecting) return
    const remembered = rememberedBluetoothCount()
    if (device.isConnected && liveBluetoothCount() >= Math.max(1, remembered)) {
      return
    }
    if (!bleSilentReconnectSupported() && !remembered) return
    void device.connect('bluetooth', { skipPicker: true }).catch(() => {})
  })
}
