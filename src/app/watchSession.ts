import { isAddress, type Address } from 'viem'
import { activeBridges } from '../chain/bridges'
import { activeChainLogs } from '../chain/chainLogs'
import { CHAINS, defaultRpcs, parseRpcList } from '../chain/config'
import { activePools, PULSEX_FACTORY_ADDRESSES } from '../chain/pools'
import {
  PaymentWatcher,
  type PaymentEvent,
  type WatcherStatus,
} from '../chain/watcher'
import {
  coinRewardTokenAddresses,
  enabledCoinRewardRules,
} from '../state/coinRewards'
import type { Saved } from '../state/settings'

export type WatchSessionOptions = {
  onPayment: (payment: PaymentEvent) => void | Promise<void>
  onStatus: (status: WatcherStatus) => void
  onError: (message: string) => void
}

export const stoppedWatchStatus = (rpcCount = 0): WatcherStatus => ({
  watching: false,
  blockNumber: null,
  lastPollAt: null,
  rpcCount,
  poolWatch: false,
  poolCount: 0,
})

/**
 * Owns the PaymentWatcher lifecycle. UI state, validation messages, and feed
 * rendering remain in app.ts through callbacks.
 */
export function createWatchSession(options: WatchSessionOptions) {
  let watcher: PaymentWatcher | null = null

  function stop(state: Saved) {
    watcher?.stop()
    watcher = null
    options.onStatus(stoppedWatchStatus(parseRpcList(state.rpcList).length))
  }

  async function start(
    state: Saved,
  ): Promise<'started' | 'missing-target' | 'failed'> {
    const walletOk = isAddress(state.receive)
    const pools = activePools(state.pools)
    const bridges = activeBridges(state.bridges)
    const chainLogs = activeChainLogs(state.chainLogs)
    const extrasOk =
      Boolean(state.poolWatch) &&
      (pools.length > 0 || bridges.length > 0 || chainLogs.length > 0)
    if (!walletOk && !extrasOk) return 'missing-target'

    stop(state)
    const chain = CHAINS[state.chainKey]
    const token =
      state.tokenAddress && isAddress(state.tokenAddress)
        ? (state.tokenAddress as Address)
        : undefined
    const configuredRpcs = parseRpcList(state.rpcList)
    const rpcUrls =
      configuredRpcs.length > 0
        ? configuredRpcs
        : defaultRpcs(state.chainKey)

    const rewardTokens = coinRewardTokenAddresses(
      enabledCoinRewardRules(state.coinRewardRules || []),
    )
    const decimalsByAddr = new Map<string, number>()
    const symbolByAddr = new Map<string, string>()
    for (const saved of state.savedTokens || []) {
      const key = saved.address.toLowerCase()
      decimalsByAddr.set(key, saved.decimals)
      symbolByAddr.set(key, saved.symbol)
    }
    if (token) {
      decimalsByAddr.set(token.toLowerCase(), state.tokenDecimals)
      symbolByAddr.set(token.toLowerCase(), state.tokenSymbol)
    }

    const watchedTokens = rewardTokens
      .filter((addr) => addr && isAddress(addr))
      .map((addr) => {
        const key = addr.toLowerCase()
        return {
          address: addr as Address,
          decimals: decimalsByAddr.get(key) ?? 18,
          symbol: symbolByAddr.get(key) || 'TOKEN',
        }
      })

    watcher = new PaymentWatcher({
      chain: chain.chain,
      receiveAddress: walletOk
        ? (state.receive as Address)
        : ('0x0000000000000000000000000000000000000000' as Address),
      rpcUrls,
      nativeSymbol: chain.symbol,
      minAmount: state.minAmount,
      tokenAddress: token,
      tokenDecimals: state.tokenDecimals,
      tokenSymbol: state.tokenSymbol,
      watchedTokens,
      pollMs: state.pollMs,
      poolWatch: extrasOk,
      pools: extrasOk ? pools : [],
      bridges: extrasOk ? bridges : [],
      chainLogs: extrasOk ? chainLogs : [],
      confirmations: 2,
      trustedPoolFactories: PULSEX_FACTORY_ADDRESSES,
      onPayment: (payment) => void options.onPayment(payment),
      onStatus: options.onStatus,
      onError: options.onError,
    })
    try {
      await watcher.start()
      return 'started'
    } catch (error) {
      watcher = null
      options.onStatus(stoppedWatchStatus(rpcUrls.length))
      const message = error instanceof Error ? error.message : String(error)
      options.onError(message)
      return 'failed'
    }
  }

  return { start, stop }
}
