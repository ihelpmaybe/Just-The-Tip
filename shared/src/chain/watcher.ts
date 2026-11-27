import {
  createPublicClient,
  fallback,
  formatEther,
  formatUnits,
  http,
  isAddress,
  parseAbiItem,
  type Address,
  type Chain,
  type Hash,
  type PublicClient,
  type Transport,
} from 'viem'
import {
  decodeSwapData,
  poolListensFor,
  quoteAmount,
  quotePairLeg,
  type ChainEventKind,
  type WatchedPool,
} from './pools'
import {
  bridgeBackupTokens,
  bridgeClaimKey,
  bridgeTransferSide,
  erc20TransferEvent,
  tokensBridgedEvent,
  tokensBridgingInitiatedEvent,
  type WatchedBridge,
} from './bridges'
import {
  chainLogAmountFromArgs,
  parseChainEventAbi,
  type WatchedChainLog,
} from './chainLogs'

export type PaymentEvent = {
  id: string
  hash: Hash
  from: Address
  to: Address
  /** Human-readable amount in token units */
  amount: number
  amountRaw: bigint
  symbol: string
  /** Token address, or null for native / pool quote */
  token: Address | null
  blockNumber: bigint
  timestamp: number
  /** wallet tip (default) or UniswapV2-style pool / chain event */
  source?: 'wallet' | 'pool'
  poolLabel?: string
  /** Pair / mediator / log contract when source is pool */
  poolAddress?: Address
  poolSide?: string
  /** Distinguishes swap vs LP vs bridge vs custom log. */
  eventKind?: ChainEventKind
  /** Stable id for custom logs / bridges when address is shared. */
  triggerId?: string
  /**
   * Local Simulate only — skip ladder re-pick so Nora rotate (etc.)
   * actually plays the spoofed pattern.
   */
  force?: {
    pattern: string
    toyId?: string
    name?: string
    price?: number
    toyLabel?: string
  }
}

export type WatcherOptions = {
  chain: Chain
  /**
   * Tip jar for native + ERC-20 inbound. May be zero-address when pool-only.
   */
  receiveAddress: Address
  /**
   * RPC endpoints (first preferred). Empty → chain defaults from viem config.
   * Multiple URLs use viem `fallback` transport.
   */
  rpcUrls?: string[]
  /** Optional ERC-20 contract to also watch (e.g. USDC). Prefer watchedTokens for multi-coin menus. */
  tokenAddress?: Address
  tokenDecimals?: number
  tokenSymbol?: string
  /**
   * Additional / multi tip ERC-20s (coin reward matrix).
   * When set, each token is scanned; legacy tokenAddress is merged in if missing.
   */
  watchedTokens?: Array<{
    address: Address
    decimals?: number
    symbol?: string
  }>
  nativeSymbol: string
  /** Minimum amount (in whole units) to fire for wallet tips */
  minAmount: number
  pollMs?: number
  /** Optional: PulseX / UniV2 pair swaps + LP mint/burn */
  poolWatch?: boolean
  pools?: WatchedPool[]
  bridges?: WatchedBridge[]
  chainLogs?: WatchedChainLog[]
  /** Max extra chain events fired per poll (largest first) */
  maxPoolEventsPerTick?: number
  /** Completed blocks to wait before accepting an event (default: 2). */
  confirmations?: number
  /** Trusted UniV2/PulseX factory contracts for pool watches. */
  trustedPoolFactories?: readonly Address[]
  onPayment: (p: PaymentEvent) => void
  onStatus: (s: WatcherStatus) => void
  onError: (e: string) => void
}

export type WatcherStatus = {
  watching: boolean
  blockNumber: bigint | null
  lastPollAt: number | null
  /** How many RPC endpoints are configured */
  rpcCount: number
  poolWatch?: boolean
  poolCount?: number
}

const transferEvent = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
)

/** Uniswap V2 / PulseX pair Swap */
const swapEvent = parseAbiItem(
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
)

const mintEvent = parseAbiItem(
  'event Mint(address indexed sender, uint amount0, uint amount1)',
)

const burnEvent = parseAbiItem(
  'event Burn(address indexed sender, uint amount0, uint amount1, address indexed to)',
)

const ZERO_ADDRESS =
  '0x0000000000000000000000000000000000000000' as Address

function buildTransport(urls: string[]): Transport {
  const list = urls.map((u) => u.trim()).filter(Boolean)
  if (list.length === 0) {
    return http(undefined, { timeout: 20_000, retryCount: 2 })
  }
  if (list.length === 1) {
    return http(list[0], { timeout: 20_000, retryCount: 2 })
  }
  return fallback(
    list.map((u) => http(u, { timeout: 18_000, retryCount: 1 })),
    { rank: false },
  )
}

export class PaymentWatcher {
  private client: PublicClient
  private options: WatcherOptions
  private timer: ReturnType<typeof setInterval> | null = null
  private lastBlock: bigint | null = null
  private seen = new Set<string>()
  private stopped = true
  private rpcCount: number
  private pools: WatchedPool[] = []
  private bridges: WatchedBridge[] = []
  private chainLogs: Array<
    WatchedChainLog & { abiEvent: ReturnType<typeof parseChainEventAbi> }
  > = []
  private tokenMeta = new Map<string, { decimals: number; symbol: string }>()
  private receipts = new Map<Hash, Promise<boolean>>()
  private tipTokens: Array<{
    address: Address
    decimals: number
    symbol: string
  }> = []

  constructor(options: WatcherOptions) {
    this.options = options
    let urls = (options.rpcUrls || [])
      .map((u) => u.trim())
      .filter(Boolean)
    if (!urls.length) {
      urls = [...(options.chain.rpcUrls.default.http || [])]
    }
    this.rpcCount = urls.length || 1
    this.client = createPublicClient({
      chain: options.chain,
      transport: buildTransport(urls),
    })
    this.pools = options.poolWatch
      ? (options.pools || []).filter(
          (p) => isAddress(p.address) && p.enabled !== false,
        )
      : []
    this.bridges = options.poolWatch
      ? (options.bridges || []).filter(
          (b) => isAddress(b.address) && b.enabled !== false,
        )
      : []
    this.chainLogs = options.poolWatch
      ? (options.chainLogs || [])
          .filter((row) => isAddress(row.address) && row.enabled !== false)
          .map((row) => ({ ...row, abiEvent: parseChainEventAbi(row.eventAbi) }))
          .filter((row) => row.abiEvent)
      : []
    this.tipTokens = this.resolveTipTokens(options)
  }

  private resolveTipTokens(options: WatcherOptions) {
    const out: Array<{ address: Address; decimals: number; symbol: string }> =
      []
    const seen = new Set<string>()
    const push = (
      address: Address | undefined,
      decimals: number | undefined,
      symbol: string | undefined,
    ) => {
      if (!address || !isAddress(address)) return
      const key = address.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      out.push({
        address,
        decimals:
          Number.isFinite(decimals) && (decimals as number) >= 0
            ? Math.min(36, Math.round(decimals as number))
            : 18,
        symbol: String(symbol || 'TOKEN').slice(0, 16) || 'TOKEN',
      })
    }
    for (const t of options.watchedTokens || []) {
      push(t.address, t.decimals, t.symbol)
    }
    push(options.tokenAddress, options.tokenDecimals, options.tokenSymbol)
    return out
  }

  get isWatching() {
    return !this.stopped
  }

  async start() {
    const walletOk = isAddress(this.options.receiveAddress) &&
      this.options.receiveAddress.toLowerCase() !== ZERO_ADDRESS
    const extrasOk =
      this.pools.length > 0 ||
      this.bridges.length > 0 ||
      this.chainLogs.length > 0
    if (!walletOk && !extrasOk) {
      throw new Error(
        'Enter a receive wallet and/or enable chain-event watching with at least one pool, bridge, or custom event',
      )
    }
    this.stopped = false
    this.seen.clear()
    this.receipts.clear()
    this.tokenMeta.clear()

    try {
      if (this.pools.length) await this.hydratePools()
      if (this.bridges.length) await this.hydrateBridges()
      if (this.chainLogs.length) await this.hydrateChainLogs()
      if (
        !walletOk &&
        !this.pools.length &&
        !this.bridges.length &&
        !this.chainLogs.length
      ) {
        throw new Error(
          'No verified PulseX pools, bridges, or custom events are enabled.',
        )
      }
      this.lastBlock = await this.client.getBlockNumber()
      this.emitStatus()
      await this.tick()
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      this.options.onError(message)
      this.stopped = true
      this.emitStatus()
      // Re-throw so callers (watchSession) do not report a successful start.
      throw e instanceof Error ? e : new Error(message)
    }

    const pollMs = this.options.pollMs ?? 4000
    this.timer = setInterval(() => {
      void this.tick()
    }, pollMs)
  }

  stop() {
    this.stopped = true
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.emitStatus()
  }

  private emitStatus() {
    this.options.onStatus({
      watching: !this.stopped,
      blockNumber: this.lastBlock,
      lastPollAt: Date.now(),
      rpcCount: this.rpcCount,
      poolWatch:
        Boolean(this.options.poolWatch) &&
        (this.pools.length > 0 ||
          this.bridges.length > 0 ||
          this.chainLogs.length > 0),
      poolCount: this.pools.length,
    })
  }

  private async hydratePools() {
    const verified: WatchedPool[] = []
    const rejected: string[] = []
    const factories = (this.options.trustedPoolFactories || []).map((address) =>
      address.toLowerCase(),
    )

    for (const pool of this.pools) {
      try {
        if (!factories.length) throw new Error('No trusted pool factories')
        const code = await this.client.getBytecode({ address: pool.address })
        if (!code || code === '0x') throw new Error('Pair has no contract code')

        const pairAbi = [
          {
            name: 'factory',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ type: 'address' }],
          },
          {
            name: 'token0',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ type: 'address' }],
          },
          {
            name: 'token1',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ type: 'address' }],
          },
        ] as const
        const [factory, token0, token1] = await Promise.all([
          this.client.readContract({
            address: pool.address,
            abi: pairAbi,
            functionName: 'factory',
          }),
          this.client.readContract({
            address: pool.address,
            abi: pairAbi,
            functionName: 'token0',
          }),
          this.client.readContract({
            address: pool.address,
            abi: pairAbi,
            functionName: 'token1',
          }),
        ])
        if (!factories.includes((factory as Address).toLowerCase())) {
          throw new Error('Pair factory is not trusted')
        }
        const pairAtFactory = await this.client.readContract({
          address: factory as Address,
          abi: [
            {
              name: 'getPair',
              type: 'function',
              stateMutability: 'view',
              inputs: [
                { name: 'tokenA', type: 'address' },
                { name: 'tokenB', type: 'address' },
              ],
              outputs: [{ type: 'address' }],
            },
          ] as const,
          functionName: 'getPair',
          args: [token0 as Address, token1 as Address],
        })
        if ((pairAtFactory as Address).toLowerCase() !== pool.address.toLowerCase()) {
          throw new Error('Pair is not registered by its factory')
        }
        if (
          (token0 as Address).toLowerCase() !== pool.quoteToken.toLowerCase() &&
          (token1 as Address).toLowerCase() !== pool.quoteToken.toLowerCase()
        ) {
          throw new Error('Configured quote token is not in the pair')
        }
        let decimals = pool.decimals
        try {
          const raw = await this.client.readContract({
            address: pool.quoteToken,
            abi: [
              {
                name: 'decimals',
                type: 'function',
                stateMutability: 'view',
                inputs: [],
                outputs: [{ type: 'uint8' }],
              },
            ] as const,
            functionName: 'decimals',
          })
          const n = Number(raw)
          if (Number.isFinite(n) && n >= 0 && n <= 36) decimals = Math.round(n)
        } catch {
          /* keep configured decimals */
        }
        verified.push({
          ...pool,
          token0: token0 as Address,
          token1: token1 as Address,
          decimals,
        })
      } catch {
        rejected.push(pool.label)
      }
    }
    this.pools = verified
    if (rejected.length) {
      this.options.onError(
        `Skipped unverified pool${rejected.length === 1 ? '' : 's'}: ${rejected.join(', ')}`,
      )
    }
  }

  private async hydrateBridges() {
    const verified: WatchedBridge[] = []
    const rejected: string[] = []
    for (const bridge of this.bridges) {
      try {
        const code = await this.client.getBytecode({ address: bridge.address })
        if (!code || code === '0x') throw new Error('Bridge has no contract code')
        verified.push(bridge)
      } catch {
        rejected.push(bridge.label)
      }
    }
    this.bridges = verified
    if (rejected.length) {
      this.options.onError(
        `Skipped unverified bridge${rejected.length === 1 ? '' : 's'}: ${rejected.join(', ')}`,
      )
    }
  }

  private async hydrateChainLogs() {
    const verified: typeof this.chainLogs = []
    const rejected: string[] = []
    for (const row of this.chainLogs) {
      try {
        if (!row.abiEvent) throw new Error('Invalid event ABI')
        const code = await this.client.getBytecode({ address: row.address })
        if (!code || code === '0x') throw new Error('Contract has no code')
        verified.push(row)
      } catch {
        rejected.push(row.label)
      }
    }
    this.chainLogs = verified
    if (rejected.length) {
      this.options.onError(
        `Skipped unverified event${rejected.length === 1 ? '' : 's'}: ${rejected.join(', ')}`,
      )
    }
  }

  private erc20MetaAbi = [
    {
      name: 'decimals',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint8' }],
    },
    {
      name: 'symbol',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'string' }],
    },
  ] as const

  private async readTokenMeta(
    token: Address,
    fallback: { decimals: number; symbol: string },
  ): Promise<{ decimals: number; symbol: string }> {
    const key = token.toLowerCase()
    const hit = this.tokenMeta.get(key)
    if (hit) return hit
    let decimals = fallback.decimals
    let symbol = fallback.symbol
    try {
      const raw = await this.client.readContract({
        address: token,
        abi: this.erc20MetaAbi,
        functionName: 'decimals',
      })
      const n = Number(raw)
      if (Number.isFinite(n) && n >= 0 && n <= 36) decimals = Math.round(n)
    } catch {
      /* keep fallback */
    }
    try {
      const raw = await this.client.readContract({
        address: token,
        abi: this.erc20MetaAbi,
        functionName: 'symbol',
      })
      const s = String(raw || '').trim().slice(0, 16)
      if (s) symbol = s
    } catch {
      /* keep fallback */
    }
    const meta = { decimals, symbol }
    this.tokenMeta.set(key, meta)
    return meta
  }

  private async tick() {
    if (this.stopped) return
    try {
      const tip = await this.client.getBlockNumber()
      if (this.lastBlock === null) {
        this.lastBlock = tip
        this.emitStatus()
        return
      }

      const confirmations = BigInt(Math.max(0, this.options.confirmations ?? 2))
      const finalizedTip = tip - confirmations
      const from = this.lastBlock + 1n
      const to =
        finalizedTip - from > 25n ? this.lastBlock + 25n : finalizedTip

      if (to < from) {
        this.emitStatus()
        return
      }

      const walletOk =
        isAddress(this.options.receiveAddress) &&
        this.options.receiveAddress.toLowerCase() !== ZERO_ADDRESS

      if (walletOk) {
        for (let n = from; n <= to; n++) {
          await this.scanBlock(n)
          this.lastBlock = n
        }
        if (this.tipTokens.length) {
          await this.scanTokenTransfers(from, to)
        }
      } else {
        this.lastBlock = to
      }

      if (this.pools.length || this.bridges.length || this.chainLogs.length) {
        await this.scanExtras(from, to)
      }

      this.emitStatus()
    } catch (e) {
      this.options.onError(e instanceof Error ? e.message : String(e))
    }
  }

  private async isSuccessfulTransaction(hash: Hash): Promise<boolean> {
    let result = this.receipts.get(hash)
    if (!result) {
      result = this.client
        .getTransactionReceipt({ hash })
        .then((receipt) => receipt.status === 'success')
        .catch(() => false)
      this.receipts.set(hash, result)
    }
    return result
  }

  private async scanBlock(blockNumber: bigint) {
    const block = await this.client.getBlock({
      blockNumber,
      includeTransactions: true,
    })

    const receive = this.options.receiveAddress.toLowerCase()
    const minRaw = BigInt(Math.floor(this.options.minAmount * 1e18))

    for (const tx of block.transactions) {
      if (typeof tx === 'string') continue
      if (!tx.to || tx.to.toLowerCase() !== receive) continue
      if (tx.from.toLowerCase() === receive) continue
      if (tx.value < minRaw && this.options.minAmount > 0) {
        if (tx.value === 0n) continue
        if (tx.value < minRaw) continue
      }
      if (tx.value === 0n) continue

      const id = `${tx.hash}:native`
      if (this.seen.has(id)) continue
      if (!(await this.isSuccessfulTransaction(tx.hash))) continue

      const amount = Number(formatEther(tx.value))
      if (amount < this.options.minAmount) continue
      this.seen.add(id)

      this.options.onPayment({
        id,
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        amount,
        amountRaw: tx.value,
        symbol: this.options.nativeSymbol,
        token: null,
        blockNumber,
        timestamp: Number(block.timestamp) * 1000,
        source: 'wallet',
      })
    }
  }

  private async scanTokenTransfers(fromBlock: bigint, toBlock: bigint) {
    if (!this.tipTokens.length) return

    const receive = this.options.receiveAddress

    for (const tipToken of this.tipTokens) {
      const token = tipToken.address
      const decimals = tipToken.decimals
      const symbol = tipToken.symbol

      let logs
      try {
        logs = await this.client.getLogs({
          address: token,
          event: transferEvent,
          args: { to: receive },
          fromBlock,
          toBlock,
        })
      } catch {
        continue
      }

      for (const log of logs) {
        if (!log.args.value || !log.args.from || !log.transactionHash) continue
        if (log.args.from.toLowerCase() === receive.toLowerCase()) continue
        const amount = Number(formatUnits(log.args.value, decimals))
        if (amount < this.options.minAmount) continue

        const id = `${log.transactionHash}:erc20:${token.toLowerCase()}:${log.logIndex}`
        if (this.seen.has(id)) continue
        if (!(await this.isSuccessfulTransaction(log.transactionHash))) continue
        this.seen.add(id)

        this.options.onPayment({
          id,
          hash: log.transactionHash,
          from: log.args.from,
          to: receive,
          amount,
          amountRaw: log.args.value,
          symbol,
          token,
          blockNumber: log.blockNumber ?? fromBlock,
          timestamp: Date.now(),
          source: 'wallet',
        })
      }
    }
  }

  private async scanExtras(fromBlock: bigint, toBlock: bigint) {
    type Cand = PaymentEvent & { amount: number }
    type RememberFn = (
      id: string,
      hash: Hash,
      build: () => Cand | Promise<Cand | null>,
    ) => Promise<void>
    const candidates: Cand[] = []

    const remember: RememberFn = async (id, hash, build) => {
      if (this.seen.has(id)) return
      if (!(await this.isSuccessfulTransaction(hash))) return
      const next = await build()
      this.seen.add(id)
      if (!next) return
      candidates.push(next)
    }

    await this.collectPoolEvents(fromBlock, toBlock, remember)
    await this.collectBridgeEvents(fromBlock, toBlock, remember)
    await this.collectChainLogEvents(fromBlock, toBlock, remember)

    if (!candidates.length) return
    candidates.sort((a, b) => b.amount - a.amount)
    const cap = Math.max(1, this.options.maxPoolEventsPerTick ?? 6)
    for (const p of candidates.slice(0, cap)) {
      this.options.onPayment(p)
    }
  }

  private async collectPoolEvents(
    fromBlock: bigint,
    toBlock: bigint,
    remember: (
      id: string,
      hash: Hash,
      build: () => (PaymentEvent & { amount: number }) | Promise<(PaymentEvent & { amount: number }) | null>,
    ) => Promise<void>,
  ) {
    for (const pool of this.pools) {
      if (poolListensFor(pool, 'swap')) {
        let logs: Array<{
          transactionHash?: Hash | null
          logIndex?: number | null
          blockNumber?: bigint | null
          data?: `0x${string}` | string
          args?: Record<string, unknown>
        }> = []
        try {
          logs = await this.client.getLogs({
            address: pool.address,
            event: swapEvent,
            fromBlock,
            toBlock,
          })
        } catch {
          logs = []
        }
        for (const log of logs) {
          if (!log.transactionHash || log.logIndex == null) continue
          const id = `${log.transactionHash}:pool:${pool.address}:${log.logIndex}`
          const args = log.args as {
            sender?: Address
            amount0In?: bigint
            amount1In?: bigint
            amount0Out?: bigint
            amount1Out?: bigint
            to?: Address
          }
          const amts =
            args.amount0In != null &&
            args.amount1In != null &&
            args.amount0Out != null &&
            args.amount1Out != null
              ? {
                  amount0In: args.amount0In,
                  amount1In: args.amount1In,
                  amount0Out: args.amount0Out,
                  amount1Out: args.amount1Out,
                }
              : decodeSwapData((log.data || '0x') as `0x${string}`)
          const sized = quoteAmount(pool, amts)
          if (pool.side === 'buy' && sized.side !== 'buy') continue
          if (pool.side === 'sell' && sized.side !== 'sell') continue
          if (sized.amountWei <= 0n) continue
          const amount = Number(formatUnits(sized.amountWei, pool.decimals))
          if (!Number.isFinite(amount) || amount < (pool.minAmount || 0)) continue
          await remember(id, log.transactionHash, () => ({
            id,
            hash: log.transactionHash!,
            from: args.sender || ZERO_ADDRESS,
            to: args.to || pool.address,
            amount,
            amountRaw: sized.amountWei,
            symbol: sized.quoteSymbol || pool.quoteSymbol,
            token: pool.quoteToken,
            blockNumber: log.blockNumber ?? fromBlock,
            timestamp: Date.now(),
            source: 'pool',
            poolLabel: pool.label,
            poolAddress: pool.address,
            poolSide: sized.side,
            eventKind: 'swap',
          }))
        }
      }

      for (const kind of ['mint', 'burn'] as const) {
        if (!poolListensFor(pool, kind)) continue
        const event = kind === 'mint' ? mintEvent : burnEvent
        let logs
        try {
          logs = await this.client.getLogs({
            address: pool.address,
            event,
            fromBlock,
            toBlock,
          })
        } catch {
          continue
        }
        for (const log of logs) {
          if (!log.transactionHash || log.logIndex == null) continue
          const id = `${log.transactionHash}:${kind}:${pool.address}:${log.logIndex}`
          const args = log.args as {
            sender?: Address
            amount0?: bigint
            amount1?: bigint
            to?: Address
          }
          const amount0 = args.amount0 ?? 0n
          const amount1 = args.amount1 ?? 0n
          const sized = quotePairLeg(pool, amount0, amount1)
          if (sized.amountWei <= 0n) continue
          const amount = Number(formatUnits(sized.amountWei, pool.decimals))
          if (!Number.isFinite(amount) || amount < (pool.minAmount || 0)) continue
          const side = kind === 'mint' ? 'add' : 'remove'
          await remember(id, log.transactionHash, () => ({
            id,
            hash: log.transactionHash!,
            from: args.sender || ZERO_ADDRESS,
            to: args.to || pool.address,
            amount,
            amountRaw: sized.amountWei,
            symbol: sized.quoteSymbol || pool.quoteSymbol,
            token: pool.quoteToken,
            blockNumber: log.blockNumber ?? fromBlock,
            timestamp: Date.now(),
            source: 'pool',
            poolLabel: pool.label,
            poolAddress: pool.address,
            poolSide: side,
            eventKind: kind,
          }))
        }
      }
    }
  }

  private async collectBridgeEvents(
    fromBlock: bigint,
    toBlock: bigint,
    remember: (
      id: string,
      hash: Hash,
      build: () =>
        | (PaymentEvent & { amount: number })
        | Promise<(PaymentEvent & { amount: number }) | null>,
    ) => Promise<void>,
  ) {
    for (const bridge of this.bridges) {
      const wantIn = bridge.direction === 'both' || bridge.direction === 'in'
      const wantOut = bridge.direction === 'both' || bridge.direction === 'out'
      const claimed = new Set<string>()
      const jobs: Array<{
        event: typeof tokensBridgedEvent | typeof tokensBridgingInitiatedEvent
        kind: 'bridge-in' | 'bridge-out'
        side: 'in' | 'out'
      }> = []
      if (wantIn) {
        jobs.push({
          event: tokensBridgedEvent,
          kind: 'bridge-in',
          side: 'in',
        })
      }
      if (wantOut) {
        jobs.push({
          event: tokensBridgingInitiatedEvent,
          kind: 'bridge-out',
          side: 'out',
        })
      }
      for (const job of jobs) {
        let logs
        try {
          logs = await this.client.getLogs({
            address: bridge.address,
            event: job.event,
            fromBlock,
            toBlock,
          })
        } catch {
          continue
        }
        for (const log of logs) {
          if (!log.transactionHash || log.logIndex == null) continue
          const args = log.args as {
            token?: Address
            recipient?: Address
            sender?: Address
            value?: bigint
          }
          const token = args.token
          if (!token) continue
          if (
            bridge.token &&
            token.toLowerCase() !== bridge.token.toLowerCase()
          ) {
            continue
          }
          const value = args.value ?? 0n
          if (value <= 0n) continue
          claimed.add(bridgeClaimKey(log.transactionHash, job.kind, token))
          const id = `${log.transactionHash}:${job.kind}:${bridge.address}:${log.logIndex}`
          await remember(id, log.transactionHash, async () => {
            const meta = await this.readTokenMeta(token, {
              decimals: bridge.decimals,
              symbol: bridge.quoteSymbol,
            })
            const amount = Number(formatUnits(value, meta.decimals))
            if (!Number.isFinite(amount) || amount < (bridge.minAmount || 0)) {
              return null
            }
            const party =
              job.kind === 'bridge-in'
                ? args.recipient || ZERO_ADDRESS
                : args.sender || ZERO_ADDRESS
            return {
              id,
              hash: log.transactionHash!,
              from: party,
              to: bridge.address,
              amount,
              amountRaw: value,
              symbol: meta.symbol,
              token,
              blockNumber: log.blockNumber ?? fromBlock,
              timestamp: Date.now(),
              source: 'pool',
              poolLabel: bridge.label,
              poolAddress: bridge.address,
              poolSide: job.side,
              eventKind: job.kind,
              triggerId: bridge.id,
            }
          })
        }
      }

      if (bridge.tokenTxBackup === false) continue
      const backupTokens = bridgeBackupTokens(bridge)
      for (const token of backupTokens) {
        let logs
        try {
          logs = await this.client.getLogs({
            address: token,
            event: erc20TransferEvent,
            fromBlock,
            toBlock,
          })
        } catch {
          continue
        }
        for (const log of logs) {
          if (!log.transactionHash || log.logIndex == null) continue
          const args = log.args as {
            from?: Address
            to?: Address
            value?: bigint
          }
          const from = args.from || ZERO_ADDRESS
          const to = args.to || ZERO_ADDRESS
          const side = bridgeTransferSide(from, to, bridge.address)
          if (!side) continue
          if (side === 'in' && !wantIn) continue
          if (side === 'out' && !wantOut) continue
          const value = args.value ?? 0n
          if (value <= 0n) continue
          const kind = side === 'in' ? 'bridge-in' : 'bridge-out'
          if (claimed.has(bridgeClaimKey(log.transactionHash, kind, token))) {
            continue
          }
          const id = `${log.transactionHash}:bridgetx:${kind}:${token}:${log.logIndex}`
          await remember(id, log.transactionHash, async () => {
            const meta = await this.readTokenMeta(token, {
              decimals: bridge.decimals,
              symbol: bridge.quoteSymbol,
            })
            const amount = Number(formatUnits(value, meta.decimals))
            if (!Number.isFinite(amount) || amount < (bridge.minAmount || 0)) {
              return null
            }
            claimed.add(bridgeClaimKey(log.transactionHash!, kind, token))
            return {
              id,
              hash: log.transactionHash!,
              from,
              to,
              amount,
              amountRaw: value,
              symbol: meta.symbol,
              token,
              blockNumber: log.blockNumber ?? fromBlock,
              timestamp: Date.now(),
              source: 'pool',
              poolLabel: `${bridge.label} · token tx`,
              poolAddress: bridge.address,
              poolSide: side,
              eventKind: kind,
              triggerId: bridge.id,
            }
          })
        }
      }
    }
  }

  private async collectChainLogEvents(
    fromBlock: bigint,
    toBlock: bigint,
    remember: (
      id: string,
      hash: Hash,
      build: () =>
        | (PaymentEvent & { amount: number })
        | Promise<(PaymentEvent & { amount: number }) | null>,
    ) => Promise<void>,
  ) {
    for (const row of this.chainLogs) {
      if (!row.abiEvent) continue
      let logs
      try {
        logs = await this.client.getLogs({
          address: row.address,
          event: row.abiEvent,
          fromBlock,
          toBlock,
        })
      } catch {
        continue
      }
      for (const log of logs) {
        if (!log.transactionHash || log.logIndex == null) continue
        const id = `${log.transactionHash}:log:${row.id}:${log.logIndex}`
        const args = (log.args || {}) as Record<string, unknown>
        const rawAmt = chainLogAmountFromArgs(args, row.amountArg)
        if (rawAmt == null) continue
        const amount =
          rawAmt === 0n && !row.amountArg
            ? 0
            : Number(formatUnits(rawAmt, row.decimals))
        if (!Number.isFinite(amount) || amount < (row.minAmount || 0)) continue
        const fromArg = args.from
        const toArg = args.to
        await remember(id, log.transactionHash, () => ({
          id,
          hash: log.transactionHash!,
          from:
            typeof fromArg === 'string' && isAddress(fromArg)
              ? fromArg
              : ZERO_ADDRESS,
          to:
            typeof toArg === 'string' && isAddress(toArg)
              ? toArg
              : row.address,
          amount,
          amountRaw: rawAmt,
          symbol: row.quoteSymbol,
          token: row.address,
          blockNumber: log.blockNumber ?? fromBlock,
          timestamp: Date.now(),
          source: 'pool',
          poolLabel: row.label,
          poolAddress: row.address,
          poolSide: 'all',
          eventKind: 'custom',
          triggerId: row.id,
        }))
      }
    }
  }
}

/** Build a fake payment for local demo / dry run */
export function simulatePayment(
  to: Address,
  amount: number,
  symbol: string,
  force?: PaymentEvent['force'],
): PaymentEvent {
  const amountRaw = BigInt(Math.round(amount * 1e18))
  // React Native has no global `crypto.randomUUID` — build a 0x hash ourselves.
  const hex = () =>
    Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, '0')
  const hash =
    `0x${Array.from({ length: 8 }, hex).join('')}`.slice(0, 66) as Hash
  const sym = (symbol || '').trim() || 'PLS'
  return {
    id: `sim:${hash}`,
    hash,
    from: '0x0000000000000000000000000000000000000001',
    to,
    amount,
    amountRaw,
    symbol: sym,
    token: null,
    blockNumber: 0n,
    timestamp: Date.now(),
    source: 'wallet',
    ...(force ? { force } : {}),
  }
}
