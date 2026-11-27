import { isAddress } from 'viem'
import {
  clampInt,
  defaults,
  mergeSaved,
  type Saved,
} from '../state/settings'
import { rememberWallet } from '../state/wallets'
import {
  isEmptyLovenseLocalIp,
  stripLovenseLocalIpLabel,
} from '../device/lovense'
import { APP_SLUG } from '../version'

type SettingsElements = {
  backend: HTMLSelectElement
  deviceUrl: HTMLInputElement
  appId: HTMLInputElement
  chain: HTMLInputElement
  rpcList: HTMLTextAreaElement
  receive: HTMLInputElement
  receiveLabel: HTMLInputElement
  minAmount: HTMLInputElement
  token: HTMLInputElement
  tokenDecimals: HTMLInputElement
  tokenSymbol: HTMLInputElement
  tokenLabel: HTMLInputElement
  night: HTMLInputElement
  queueGap: HTMLInputElement
  maxQueue: HTMLInputElement
  pollMs: HTMLInputElement
  status: HTMLParagraphElement
  importFile: HTMLInputElement
}

export type SettingsFormContext = {
  $: <T extends HTMLElement>(id: string) => T
  elements: SettingsElements
  getState: () => Saved
  setState: (next: Saved) => void
  save: (next: Saved) => boolean
  getView: () => string
  getOverlayStyle: () => Saved['overlayStyle']
  getOverlayQr: () => Saved['overlayQr']
  getOverlayMenu: () => Saved['overlayMenu']
  readOverlayStyle: () => Saved['overlayStyle']
  readOverlayQr: () => Saved['overlayQr']
  readOverlayMenu: () => Saved['overlayMenu']
  formatRpcList: (value: string) => string
  parseRpcList: (value: string) => string[]
  syncUrlField: () => void
  paintRpcCount: () => void
  applyDeviceSettings: () => void
  applyQueueSettings: () => void
  paintAddressPill: () => void
  paintSavedWallets: () => void
  paintSavedTokens: () => void
  paintPoolPanel: () => void
  paintSession: () => void
  paintPatterns: () => void
  paintMode: () => void
  paintWatch: () => void
  paintQueue: () => void
  isWatching: () => boolean
  labelForAddress: (address: string) => string
  tokenLabelForAddress: (address: string) => string
}

export function createSettingsForm(ctx: SettingsFormContext) {
  const {
    backend,
    deviceUrl,
    appId,
    chain,
    rpcList,
    receive,
    receiveLabel,
    minAmount,
    token,
    tokenDecimals,
    tokenSymbol,
    tokenLabel,
    night,
    queueGap,
    maxQueue,
    pollMs,
    status,
    importFile,
  } = ctx.elements

  function readForm(): Saved {
    const state = ctx.getState()
    const urls = ctx.parseRpcList(rpcList.value)
    return {
      ...state,
      chainKey: chain.value as Saved['chainKey'],
      backend: backend.value as Saved['backend'],
      receive: receive.value.trim(),
      rpcList: urls.length ? ctx.formatRpcList(urls.join('\n')) : rpcList.value.trim(),
      minAmount: Number(minAmount.value) || 0,
      tokenAddress: token.value.trim(),
      tokenDecimals: Number(tokenDecimals.value) || 18,
      tokenSymbol: tokenSymbol.value.trim() || 'TOKEN',
      overlayStyle: ctx.getOverlayStyle(),
      overlayQr: ctx.getOverlayQr(),
      overlayMenu: ctx.getOverlayMenu(),
      intifaceUrl:
        backend.value === 'intiface' ? deviceUrl.value.trim() : state.intifaceUrl,
      lovenseLocalIp:
        backend.value === 'lovense' || backend.value === 'lovense-remote'
          ? isEmptyLovenseLocalIp(deviceUrl.value)
            ? ''
            : stripLovenseLocalIpLabel(deviceUrl.value)
          : state.lovenseLocalIp,
      lovenseAppId:
        backend.value === 'lovense' ? appId.value.trim() : state.lovenseAppId,
    }
  }

  function persist() {
    let next = readForm()
    if (isAddress(next.receive)) {
      next = {
        ...next,
        savedWallets: rememberWallet(next.savedWallets, next.receive),
      }
    }
    ctx.setState(next)
    const ok = ctx.save(next)
    ctx.applyDeviceSettings()
    ctx.applyQueueSettings()
    ctx.paintSavedWallets()
    return ok
  }

  function applyTheme() {
    document.documentElement.classList.toggle('night', ctx.getState().nightMode)
    document.documentElement.classList.toggle('day', !ctx.getState().nightMode)
  }

  function fillSettingsForm() {
    const state = ctx.getState()
    night.checked = state.nightMode
    queueGap.value = String(state.queueGapMs)
    maxQueue.value = String(state.maxQueue)
    pollMs.value = String(state.pollMs)
    status.textContent = ''
    ctx.paintPoolPanel()
  }

  function applyForm() {
    const state = ctx.getState()
    backend.value = state.backend
    chain.value = state.chainKey
    receive.value = state.receive
    receiveLabel.value = ctx.labelForAddress(state.receive)
    rpcList.value = state.rpcList
    minAmount.value = String(state.minAmount)
    token.value = state.tokenAddress
    tokenDecimals.value = String(state.tokenDecimals)
    tokenSymbol.value = state.tokenSymbol
    tokenLabel.value = ctx.tokenLabelForAddress(state.tokenAddress)
    appId.value = state.lovenseAppId
    ctx.syncUrlField()
    ctx.paintRpcCount()
    applyTheme()
    ctx.paintAddressPill()
    ctx.paintSavedWallets()
    ctx.paintSavedTokens()
    ctx.paintSession()
    ctx.paintPatterns()
    ctx.paintPoolPanel()
    ctx.applyDeviceSettings()
  }

  function saveSettingsFromForm() {
    persist()
    const state = ctx.getState()
    const next = {
      ...state,
      nightMode: night.checked,
      dryRun: false,
      queueGapMs: clampInt(queueGap.value, 0, 10_000, defaults.queueGapMs),
      maxQueue: clampInt(maxQueue.value, 1, 256, defaults.maxQueue),
      pollMs: clampInt(pollMs.value, 1500, 30_000, defaults.pollMs),
    }
    ctx.setState(next)
    ctx.save(next)
    applyTheme()
    ctx.applyQueueSettings()
    ctx.paintMode()
    ctx.paintWatch()
    ctx.paintQueue()
    ctx.paintSession()
    fillSettingsForm()
    status.textContent = ctx.isWatching()
      ? 'Saved. Restart watching if you changed the chain check interval.'
      : 'Saved.'
  }

  function exportSettings() {
    persist()
    const blob = new Blob([JSON.stringify(ctx.getState(), null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${APP_SLUG}-settings-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    status.textContent = 'Exported settings file.'
  }

  function refreshAfterSettingsChange(message: string) {
    applyForm()
    applyTheme()
    ctx.applyDeviceSettings()
    ctx.applyQueueSettings()
    ctx.paintMode()
    ctx.paintWatch()
    ctx.paintQueue()
    ctx.paintSession()
    ctx.paintPatterns()
    fillSettingsForm()
    status.textContent = message
  }

  function importSettingsObject(raw: unknown) {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid settings file')
    const next = mergeSaved(raw as Partial<Saved>, ctx.getState())
    ctx.setState(next)
    ctx.save(next)
    refreshAfterSettingsChange('Imported. Restart watching if poll interval changed.')
  }

  function resetSettings() {
    if (
      !confirm(
        'Reset all Just The Tip settings to defaults? Wallet, device IP, patterns, and prices will clear.',
      )
    ) {
      return
    }
    const next = structuredClone(defaults)
    ctx.setState(next)
    ctx.save(next)
    refreshAfterSettingsChange('Reset to defaults.')
  }

  function wire() {
    ctx.$('btn-settings-save').addEventListener('click', saveSettingsFromForm)
    ctx.$('btn-settings-export').addEventListener('click', exportSettings)
    ctx.$('btn-settings-reset').addEventListener('click', resetSettings)
    importFile.addEventListener('change', () => {
      const file = importFile.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          importSettingsObject(JSON.parse(String(reader.result || '')))
        } catch (error) {
          status.textContent =
            error instanceof Error ? error.message : 'Could not import settings'
        }
      }
      reader.onerror = () => {
        status.textContent = 'Could not read file'
      }
      reader.readAsText(file)
      importFile.value = ''
    })
    night.addEventListener('change', () => {
      const state = ctx.getState()
      ctx.setState({ ...state, nightMode: night.checked })
      ctx.save({ ...readForm(), nightMode: night.checked })
      applyTheme()
    })
  }

  return {
    readForm,
    persist,
    applyTheme,
    fillSettingsForm,
    applyForm,
    wire,
  }
}
