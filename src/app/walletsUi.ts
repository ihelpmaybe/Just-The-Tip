import { isAddress } from 'viem'
import type { Saved } from '../state/settings'
import {
  rememberWallet,
  removeSavedWallet,
  shortAddress,
  walletDisplayLabel,
} from '../state/wallets'

type WalletElements = {
  receive: HTMLInputElement
  receiveLabel: HTMLInputElement
  settingsStatus: HTMLParagraphElement
}

export type WalletsUiContext = {
  $: <T extends HTMLElement>(id: string) => T
  elements: WalletElements
  getState: () => Saved
  setState: (next: Saved) => void
  readForm: () => Saved
  save: (next: Saved) => boolean
  showError: (message: string) => void
  paintSession: () => void
  paintWatch: () => void
  paintAddressPill: () => void
  syncQr: () => void
  onReceiveChange: () => void
}

export function createWalletsUi(ctx: WalletsUiContext) {
  const { receive, receiveLabel, settingsStatus } = ctx.elements

  function labelForAddress(address: string): string {
    if (!isAddress(address)) return ''
    const key = address.toLowerCase()
    return (
      ctx
        .getState()
        .savedWallets.find((wallet) => wallet.address.toLowerCase() === key)
        ?.label || ''
    )
  }

  function syncReceiveLabelField() {
    if (document.activeElement === receiveLabel) return
    receiveLabel.value = labelForAddress(receive.value.trim())
  }

  function applyWalletLabel(address: string, label: string): boolean {
    if (!isAddress(address)) return false
    const state = ctx.getState()
    const savedWallets = rememberWallet(state.savedWallets, address, {
      label: label.trim().slice(0, 48),
    })
    ctx.setState({ ...state, receive: address, savedWallets })
    return ctx.save({
      ...ctx.readForm(),
      receive: address,
      savedWallets,
    })
  }

  function paintSavedWallets() {
    const box = ctx.$('saved-wallets')
    const list = ctx.$('wallet-list')
    const state = ctx.getState()
    const wallets = state.savedWallets || []
    list.replaceChildren()
    if (!wallets.length) {
      box.hidden = true
      return
    }
    box.hidden = false
    const current = receive.value.trim().toLowerCase()
    for (const wallet of wallets) {
      const li = document.createElement('li')
      li.className = 'wallet-item'
      if (wallet.address.toLowerCase() === current) li.classList.add('active')

      const pick = document.createElement('button')
      pick.type = 'button'
      pick.className = 'wallet-item-main'
      pick.title = `Watch ${wallet.address}`
      const name = document.createElement('span')
      name.className = 'wallet-item-name'
      name.textContent = walletDisplayLabel(wallet)
      const address = document.createElement('span')
      address.className = 'wallet-item-addr'
      address.textContent = wallet.label
        ? shortAddress(wallet.address)
        : wallet.address
      pick.append(name, address)
      pick.addEventListener('click', () => {
        const currentState = ctx.getState()
        const savedWallets = rememberWallet(currentState.savedWallets, wallet.address)
        receive.value = wallet.address
        receiveLabel.value = wallet.label || ''
        ctx.setState({ ...currentState, receive: wallet.address, savedWallets })
        ctx.save({ ...ctx.readForm(), savedWallets })
        ctx.paintAddressPill()
        paintSavedWallets()
        ctx.paintSession()
        ctx.paintWatch()
      })

      const actions = document.createElement('div')
      actions.className = 'wallet-item-actions'
      const rename = document.createElement('button')
      rename.type = 'button'
      rename.className = 'btn ghost tiny'
      rename.textContent = 'Name'
      rename.title = 'Edit wallet name'
      rename.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        startInlineRename(li, wallet.address, wallet.label || '')
      })
      const remove = document.createElement('button')
      remove.type = 'button'
      remove.className = 'btn ghost tiny'
      remove.textContent = 'Remove'
      remove.title = 'Remove from saved list'
      remove.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        const currentState = ctx.getState()
        const savedWallets = removeSavedWallet(
          currentState.savedWallets,
          wallet.address,
        )
        const removingActive =
          receive.value.trim().toLowerCase() === wallet.address.toLowerCase()
        // Active tip wallet is auto-re-saved on persist/boot — clear it so Remove sticks.
        if (removingActive) {
          receive.value = ''
          receiveLabel.value = ''
        }
        const next = {
          ...currentState,
          savedWallets,
          ...(removingActive ? { receive: '' } : {}),
        }
        ctx.setState(next)
        ctx.save({
          ...ctx.readForm(),
          savedWallets,
          ...(removingActive ? { receive: '' } : {}),
        })
        if (removingActive) {
          ctx.paintAddressPill()
          ctx.syncQr()
          settingsStatus.textContent =
            'Removed · tip wallet cleared so it stays gone'
        } else {
          settingsStatus.textContent = 'Removed from saved list'
        }
        syncReceiveLabelField()
        paintSavedWallets()
        ctx.paintSession()
        ctx.paintWatch()
        ctx.showError('')
      })
      actions.append(rename, remove)
      li.append(pick, actions)
      list.append(li)
    }
  }

  function startInlineRename(
    li: HTMLElement,
    address: string,
    currentLabel: string,
  ) {
    li.classList.add('is-renaming')
    li.replaceChildren()
    const row = document.createElement('div')
    row.className = 'wallet-item-rename'
    const input = document.createElement('input')
    input.type = 'text'
    input.maxLength = 48
    input.value = currentLabel
    input.placeholder = 'Wallet name'
    input.setAttribute('aria-label', 'Wallet name')
    const save = document.createElement('button')
    save.type = 'button'
    save.className = 'btn primary tiny'
    save.textContent = 'Save name'
    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.className = 'btn ghost tiny'
    cancel.textContent = 'Cancel'
    const commit = () => {
      if (!applyWalletLabel(address, input.value)) {
        ctx.showError(
          'Could not save wallet name — browser storage may be full or blocked.',
        )
        paintSavedWallets()
        return
      }
      if (receive.value.trim().toLowerCase() === address.toLowerCase()) {
        receiveLabel.value = input.value.trim().slice(0, 48)
      } else {
        syncReceiveLabelField()
      }
      ctx.syncQr()
      paintSavedWallets()
      ctx.paintSession()
      ctx.showError('')
    }
    save.addEventListener('click', (event) => {
      event.preventDefault()
      commit()
    })
    cancel.addEventListener('click', (event) => {
      event.preventDefault()
      paintSavedWallets()
    })
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        commit()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        paintSavedWallets()
      }
    })
    row.append(input, save, cancel)
    li.append(row)
    input.focus()
    input.select()
  }

  function saveCurrentWallet() {
    const address = receive.value.trim()
    if (!isAddress(address)) {
      ctx.showError('Enter a valid 0x address before saving')
      return
    }
    const label = receiveLabel.value.trim().slice(0, 48)
    if (!applyWalletLabel(address, label)) {
      settingsStatus.textContent = ''
      return
    }
    receive.value = address
    receiveLabel.value = label
    ctx.syncQr()
    ctx.paintAddressPill()
    paintSavedWallets()
    ctx.paintSession()
    ctx.showError('')
    const n = ctx.getState().savedWallets.length
    settingsStatus.textContent = label
      ? `Saved “${label}” · ${n} wallet${n === 1 ? '' : 's'} in Settings`
      : `Wallet saved · ${n} wallet${n === 1 ? '' : 's'} in Settings`
  }

  function wire() {
    ctx.$('btn-save-wallet').addEventListener('click', saveCurrentWallet)
    receiveLabel.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        saveCurrentWallet()
      }
    })
    receive.addEventListener('blur', syncReceiveLabelField)
    receive.addEventListener('change', ctx.onReceiveChange)
    receive.addEventListener('input', () => {
      ctx.paintAddressPill()
      paintSavedWallets()
      syncReceiveLabelField()
    })
  }

  return {
    labelForAddress,
    syncReceiveLabelField,
    paintSavedWallets,
    saveCurrentWallet,
    wire,
  }
}
