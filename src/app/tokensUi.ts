import { isAddress } from 'viem'
import type { Saved } from '../state/settings'
import { rememberToken } from '../state/tokens'

type TokenElements = {
  token: HTMLInputElement
  symbol: HTMLInputElement
  decimals: HTMLInputElement
  label: HTMLInputElement
  settingsStatus?: HTMLParagraphElement | null
}

export type TokensUiContext = {
  $: <T extends HTMLElement>(id: string) => T
  elements: TokenElements
  getState: () => Saved
  setState: (next: Saved) => void
  readForm: () => Saved
  save: (next: Saved) => void
  showError: (message: string) => void
  paintSession: () => void
  onTokenFieldChange: () => void
}

export function createTokensUi(ctx: TokensUiContext) {
  const { token, symbol, decimals, label, settingsStatus } = ctx.elements

  function tokenLabelForAddress(address: string): string {
    if (!isAddress(address)) return ''
    const key = address.toLowerCase()
    return (
      (ctx.getState().savedTokens || []).find(
        (saved) => saved.address.toLowerCase() === key,
      )?.label || ''
    )
  }

  function syncTokenLabelField() {
    if (document.activeElement === label) return
    label.value = tokenLabelForAddress(token.value.trim())
  }

  function applyActiveToken(
    address: string,
    tokenSymbol: string,
    tokenDecimals: number,
    tokenLabel?: string,
  ) {
    const state = ctx.getState()
    const next = {
      ...state,
      tokenAddress: address,
      tokenSymbol: tokenSymbol || 'TOKEN',
      tokenDecimals: Math.max(
        0,
        Math.min(36, Math.round(Number(tokenDecimals) || 18)),
      ),
    }
    ctx.setState(next)
    token.value = address
    symbol.value = next.tokenSymbol
    decimals.value = String(next.tokenDecimals)
    if (tokenLabel !== undefined) label.value = tokenLabel
  }

  function paintSavedTokens() {
    // Saved-token list UI removed — tip coin chips show prices instead.
  }

  function saveCurrentToken() {
    const address = token.value.trim()
    if (!isAddress(address)) {
      ctx.showError('Enter a valid ERC‑20 contract address before saving')
      return
    }
    const tokenSymbol = symbol.value.trim().slice(0, 16) || 'TOKEN'
    const tokenDecimals = Math.max(
      0,
      Math.min(36, Math.round(Number(decimals.value) || 18)),
    )
    const tokenLabel = label.value.trim().slice(0, 48)
    const state = ctx.getState()
    const savedTokens = rememberToken(state.savedTokens || [], address, {
      symbol: tokenSymbol,
      decimals: tokenDecimals,
      label: tokenLabel,
    })
    const hiddenTipCoins = (state.hiddenTipCoins || []).filter(
      (row) => row.toLowerCase() !== address.toLowerCase(),
    )
    ctx.setState({ ...state, savedTokens, hiddenTipCoins })
    applyActiveToken(address, tokenSymbol, tokenDecimals, tokenLabel)
    ctx.save({
      ...ctx.readForm(),
      tokenAddress: address,
      tokenSymbol,
      tokenDecimals,
      savedTokens,
      hiddenTipCoins,
    })
    paintSavedTokens()
    ctx.paintSession()
    ctx.showError('')
    if (settingsStatus) {
      settingsStatus.textContent = tokenLabel
        ? `Saved token “${tokenLabel}” (${tokenSymbol})`
        : `Saved token ${tokenSymbol}`
    }
  }

  function wire() {
    ctx.$('btn-save-token').addEventListener('click', saveCurrentToken)
    label.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        saveCurrentToken()
      }
    })
    token.addEventListener('blur', syncTokenLabelField)
    token.addEventListener('input', () => {
      syncTokenLabelField()
      paintSavedTokens()
    })
    for (const field of [token, symbol, decimals]) {
      field.addEventListener('change', () => {
        ctx.onTokenFieldChange()
      })
    }
  }

  return {
    tokenLabelForAddress,
    syncTokenLabelField,
    applyActiveToken,
    paintSavedTokens,
    saveCurrentToken,
    wire,
  }
}
