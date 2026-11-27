import {
  CHAINS,
  defaultRpcs,
  parseRpcList,
  type ChainKey,
} from '../chain/config'
import {
  createPoolBuzzRule,
  mergePoolPresets,
  normalizeWatchedPool,
  WPLS_ADDRESS,
  type PoolBuzzRule,
  type PoolListenKind,
  type PoolSide,
  type WatchedPool,
} from '../chain/pools'
import {
  mergeBridgePresets,
  normalizeWatchedBridge,
  PULSECHAIN_OMNIBRIDGE_ADDRESS,
  type BridgeDirection,
  type WatchedBridge,
} from '../chain/bridges'
import {
  normalizeWatchedChainLog,
  parseChainEventAbi,
  type WatchedChainLog,
} from '../chain/chainLogs'
import {
  createPoolSampleClient,
  suggestPoolTriggers,
} from '../chain/poolSuggest'
import type { Saved } from '../state/settings'
import { shortToyLabel } from '../utils/toySilhouettes'

export type PoolToyOption = {
  id: string
  name: string
  toyType?: string
  connected?: boolean
}

export type PoolPatternOption = {
  id: string
  name: string
}

export type PoolsUiContext = {
  $: <T extends HTMLElement>(id: string) => T
  getState: () => Saved
  setState: (next: Saved) => void
  readForm: () => Saved
  save: (next: Saved) => void
  isWatching: () => boolean
  restartWatch: () => void
  getToys: () => PoolToyOption[]
  getPatterns: () => PoolPatternOption[]
}

export function createPoolsUi(ctx: PoolsUiContext) {
  /** Which pool row has the alert/edit panel open (by address). */
  let editingAddress: string | null = null
  let editingBridgeId: string | null = null
  let editingLogId: string | null = null
  /** Suggest status / busy keyed by pool address (lowercase). */
  const suggestNote = new Map<string, string>()
  const suggestBusy = new Set<string>()

  const RULE_SIDES: ReadonlyArray<readonly [PoolSide, string]> = [
    ['all', 'All'],
    ['buy', 'Buy'],
    ['sell', 'Sell'],
    ['add', 'Add LP'],
    ['remove', 'Remove LP'],
    ['in', 'Bridge in'],
    ['out', 'Bridge out'],
  ]

  function restartWhenWatching() {
    if (ctx.isWatching() && ctx.getState().poolWatch) ctx.restartWatch()
  }

  function updatePool(index: number, patch: Partial<WatchedPool>) {
    const current = ctx.getState()
    const nextPools = [...(current.pools || [])]
    const selected = nextPools[index]
    if (!selected) return
    nextPools[index] = { ...selected, ...patch }
    ctx.setState({ ...current, pools: nextPools })
    ctx.save({ ...ctx.readForm(), pools: nextPools })
    paintPoolPanel()
    restartWhenWatching()
  }

  function alertSummary(pool: WatchedPool): string {
    const bits: string[] = []
    const listen = pool.listen?.length ? pool.listen : (['swap'] as PoolListenKind[])
    bits.push(listen.join('+'))
    if (pool.overlayAlert === false) bits.push('OBS off')
    else if (pool.overlayMinAmount != null && pool.overlayMinAmount > 0) {
      bits.push(`OBS ≥${pool.overlayMinAmount}`)
    } else bits.push('OBS on')
    const n = pool.buzzRules?.length || 0
    if (n) bits.push(`${n} rule${n === 1 ? '' : 's'}`)
    return bits.join(' · ')
  }

  async function suggestTriggers(pool: WatchedPool) {
    const key = pool.address.toLowerCase()
    if (suggestBusy.has(key)) return
    suggestBusy.add(key)
    suggestNote.set(key, 'Sampling recent buy/sell swaps…')
    paintPoolPanel()
    try {
      const state = ctx.getState()
      const chainKey = state.chainKey as ChainKey
      const chain = CHAINS[chainKey]
      const configured = parseRpcList(state.rpcList)
      const rpcUrls =
        configured.length > 0 ? configured : defaultRpcs(chainKey)
      const client = createPoolSampleClient({
        chain: chain.chain,
        rpcUrls,
      })
      const suggestion = await suggestPoolTriggers(client, pool, {
        lookbackBlocks: 900,
        maxSwaps: 120,
      })
      if (!suggestion.rules.length) {
        suggestNote.set(key, suggestion.summary)
        return
      }
      const live = ctx.getState().pools || []
      const index = live.findIndex((row) => row.address.toLowerCase() === key)
      if (index < 0) {
        suggestNote.set(
          key,
          'Pool was removed before suggestions could apply.',
        )
        return
      }
      const patch: Partial<WatchedPool> = {
        buzzRules: suggestion.rules,
        token0: suggestion.pool.token0,
        token1: suggestion.pool.token1,
        decimals: suggestion.pool.decimals,
      }
      if (suggestion.preferPoolSideAll) {
        patch.side = 'all'
      }
      if (suggestion.scanMinAmount > 0) {
        patch.minAmount = suggestion.scanMinAmount
      }
      if (
        suggestion.overlayMinAmount != null &&
        suggestion.overlayMinAmount > 0
      ) {
        patch.overlayMinAmount = suggestion.overlayMinAmount
      }
      updatePool(index, patch)
      suggestNote.set(key, suggestion.summary)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      suggestNote.set(key, `Suggest failed: ${msg.slice(0, 160)}`)
    } finally {
      suggestBusy.delete(key)
      paintPoolPanel()
    }
  }

  function paintRuleEditor(poolIndex: number, pool: WatchedPool): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'pool-rules'
    const key = pool.address.toLowerCase()
    const head = document.createElement('div')
    head.className = 'pool-rules-head'
    const title = document.createElement('p')
    title.className = 'pool-rules-title'
    title.textContent = 'Buzz rules'
    const actions = document.createElement('div')
    actions.className = 'pool-rules-actions'
    const suggest = document.createElement('button')
    suggest.type = 'button'
    suggest.className = 'btn ghost tiny'
    suggest.textContent = suggestBusy.has(key)
      ? 'Sampling…'
      : 'Suggest from recent'
    suggest.disabled = suggestBusy.has(key)
    suggest.title =
      'Sample recent pair swaps and propose buy/sell amount triggers (replaces current rules)'
    suggest.addEventListener('click', () => {
      void suggestTriggers(pool)
    })
    const add = document.createElement('button')
    add.type = 'button'
    add.className = 'btn ghost tiny'
    add.textContent = 'Add rule'
    add.title = 'Add amount → toy / pattern / multiples'
    add.addEventListener('click', () => {
      const rules = [
        ...(pool.buzzRules || []),
        createPoolBuzzRule({ minAmount: pool.minAmount || 0 }),
      ]
      updatePool(poolIndex, { buzzRules: rules })
    })
    actions.append(suggest, add)
    head.append(title, actions)
    wrap.append(head)

    const noteText = suggestNote.get(key)
    if (noteText) {
      const note = document.createElement('p')
      note.className = 'hint pool-suggest-status'
      note.textContent = noteText
      wrap.append(note)
    }

    const toys = ctx.getToys()
    const patterns = ctx.getPatterns()
    const rules = pool.buzzRules || []
    if (!rules.length) {
      const empty = document.createElement('p')
      empty.className = 'hint'
      empty.textContent =
        'No rules yet — swaps use the tip menu ladder. Suggest from recent, or add a rule for toys, side, function, amount, and repeats.'
      wrap.append(empty)
      return wrap
    }

    for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex++) {
      const rule = rules[ruleIndex]!
      const row = document.createElement('div')
      row.className = 'pool-rule-row'

      const sideField = document.createElement('label')
      sideField.className = 'field narrow'
      sideField.innerHTML = '<span>Side</span>'
      const sideSel = document.createElement('select')
      for (const [value, label] of RULE_SIDES) {
        const opt = document.createElement('option')
        opt.value = value
        opt.textContent = label
        if ((rule.side || 'all') === value) opt.selected = true
        sideSel.append(opt)
      }
      sideSel.addEventListener('change', () => {
        patchRule(poolIndex, pool, ruleIndex, {
          side: sideSel.value as PoolSide,
        })
      })
      sideField.append(sideSel)

      const amountField = document.createElement('label')
      amountField.className = 'field narrow'
      amountField.innerHTML = '<span>Amount ≥</span>'
      const amountInput = document.createElement('input')
      amountInput.type = 'number'
      amountInput.min = '0'
      amountInput.step = 'any'
      amountInput.value = String(rule.minAmount || 0)
      amountInput.addEventListener('change', () => {
        const n = Number(amountInput.value)
        patchRule(poolIndex, pool, ruleIndex, {
          minAmount: Number.isFinite(n) && n >= 0 ? n : 0,
        })
      })
      amountField.append(amountInput)

      const patternField = document.createElement('label')
      patternField.className = 'field'
      patternField.innerHTML = '<span>Function</span>'
      const patternSel = document.createElement('select')
      const auto = document.createElement('option')
      auto.value = ''
      auto.textContent = 'Tip ladder (auto)'
      patternSel.append(auto)
      for (const pattern of patterns) {
        const opt = document.createElement('option')
        opt.value = pattern.id
        opt.textContent = pattern.name
        if (rule.patternId === pattern.id) opt.selected = true
        patternSel.append(opt)
      }
      if (rule.patternId && !patterns.some((p) => p.id === rule.patternId)) {
        const orphan = document.createElement('option')
        orphan.value = rule.patternId
        orphan.textContent = `${rule.patternId} (missing)`
        orphan.selected = true
        patternSel.append(orphan)
      }
      patternSel.addEventListener('change', () => {
        patchRule(poolIndex, pool, ruleIndex, { patternId: patternSel.value })
      })
      patternField.append(patternSel)

      const multField = document.createElement('label')
      multField.className = 'field narrow'
      multField.innerHTML = '<span>Multiples</span>'
      const multInput = document.createElement('input')
      multInput.type = 'number'
      multInput.min = '1'
      multInput.max = '8'
      multInput.step = '1'
      multInput.value = String(rule.multiples || 1)
      multInput.title = 'How many times to play on each selected toy (1–8)'
      multInput.addEventListener('change', () => {
        const n = Math.round(Number(multInput.value))
        patchRule(poolIndex, pool, ruleIndex, {
          multiples: Number.isFinite(n) ? Math.min(8, Math.max(1, n)) : 1,
        })
      })
      multField.append(multInput)

      const remove = document.createElement('button')
      remove.type = 'button'
      remove.className = 'btn ghost tiny'
      remove.textContent = 'Remove'
      remove.addEventListener('click', () => {
        const next = (pool.buzzRules || []).filter((_, i) => i !== ruleIndex)
        updatePool(poolIndex, { buzzRules: next })
      })

      const toysBox = document.createElement('div')
      toysBox.className = 'pool-rule-toys'
      const toysLabel = document.createElement('p')
      toysLabel.className = 'pool-rule-toys-label'
      toysLabel.textContent = toys.length
        ? 'Toys (tick one or more)'
        : 'Toys — connect a toy on Home to target'
      toysBox.append(toysLabel)
      if (toys.length) {
        for (const toy of toys) {
          const lab = document.createElement('label')
          lab.className = 'pool-rule-toy'
          const check = document.createElement('input')
          check.type = 'checkbox'
          check.checked = rule.toyIds.includes(toy.id)
          check.addEventListener('change', () => {
            const set = new Set(rule.toyIds)
            if (check.checked) set.add(toy.id)
            else set.delete(toy.id)
            patchRule(poolIndex, pool, ruleIndex, { toyIds: [...set] })
          })
          const span = document.createElement('span')
          span.textContent = shortToyLabel(toy.name || '', toy.toyType, toy.id)
          lab.append(check, span)
          toysBox.append(lab)
        }
      }

      row.append(
        sideField,
        amountField,
        patternField,
        multField,
        remove,
        toysBox,
      )
      wrap.append(row)
    }
    return wrap
  }

  function patchRule(
    poolIndex: number,
    pool: WatchedPool,
    ruleIndex: number,
    patch: Partial<PoolBuzzRule>,
  ) {
    const rules = [...(pool.buzzRules || [])]
    const current = rules[ruleIndex]
    if (!current) return
    rules[ruleIndex] = { ...current, ...patch }
    updatePool(poolIndex, { buzzRules: rules })
  }

  function paintPoolPanel() {
    const enabled = ctx.$<HTMLInputElement>('pool-watch-enabled')
    const hint = ctx.$('pool-watch-hint')
    const list = ctx.$('pool-list')
    const empty = ctx.$('pool-list-empty')
    const state = ctx.getState()
    enabled.checked = Boolean(state.poolWatch)
    const pools = state.pools || []
    const count = pools.length
    const enabledCount = pools.filter((pool) => pool.enabled !== false).length
    hint.textContent = state.poolWatch
      ? count
        ? `On · ${enabledCount}/${count} pool${count === 1 ? '' : 's'} ticked`
        : 'On · listening for ticked pools, bridges, and custom events'
      : 'Off · not listening for chain events'
    list.replaceChildren()
    for (let index = 0; index < count; index++) {
      const pool = pools[index]!
      const li = document.createElement('li')
      li.className = pool.enabled === false ? 'pool-row is-off' : 'pool-row'
      if (editingAddress === pool.address.toLowerCase()) {
        li.classList.add('is-editing')
      }

      const tickLabel = document.createElement('label')
      tickLabel.className = 'pool-enable'
      tickLabel.title =
        pool.enabled === false
          ? 'Disabled — not watched'
          : 'Enabled for watching'
      const tick = document.createElement('input')
      tick.type = 'checkbox'
      tick.checked = pool.enabled !== false
      tick.setAttribute('aria-label', `Watch ${pool.label}`)
      tick.addEventListener('change', () => {
        updatePool(index, { enabled: tick.checked })
      })
      const tickText = document.createElement('span')
      tickText.textContent = 'On'
      tickLabel.append(tick, tickText)

      const body = document.createElement('div')
      body.className = 'pool-body'
      const title = document.createElement('p')
      title.className = 'pool-title'
      title.textContent = pool.label
      const meta = document.createElement('p')
      meta.className = 'pool-meta'
      meta.textContent = `${pool.address.slice(0, 10)}… · min ${pool.minAmount} ${pool.quoteSymbol} · ${pool.side} · ${alertSummary(pool)}`
      body.append(title, meta)

      const actions = document.createElement('div')
      actions.className = 'pool-row-actions'

      const edit = document.createElement('button')
      edit.type = 'button'
      edit.className = 'btn ghost tiny'
      const open = editingAddress === pool.address.toLowerCase()
      edit.textContent = open ? 'Done' : 'Alert'
      edit.title = open
        ? 'Close alert settings'
        : 'Edit OBS alerts and buzz rules (toy, amount, function, multiples)'
      edit.addEventListener('click', () => {
        editingAddress = open ? null : pool.address.toLowerCase()
        editingBridgeId = null
        editingLogId = null
        paintPoolPanel()
      })

      const remove = document.createElement('button')
      remove.type = 'button'
      remove.className = 'btn ghost tiny'
      remove.textContent = 'Remove'
      remove.addEventListener('click', () => {
        const current = ctx.getState()
        const nextPools = (current.pools || []).filter((_, item) => item !== index)
        if (editingAddress === pool.address.toLowerCase()) editingAddress = null
        ctx.setState({ ...current, pools: nextPools })
        ctx.save({ ...ctx.readForm(), pools: nextPools })
        paintPoolPanel()
        restartWhenWatching()
      })
      actions.append(edit, remove)

      li.append(tickLabel, body, actions)

      if (open) {
        const panel = document.createElement('div')
        panel.className = 'pool-alert-panel'
        panel.setAttribute('role', 'region')
        panel.setAttribute('aria-label', `Alerts for ${pool.label}`)

        const buzzMin = document.createElement('label')
        buzzMin.className = 'field narrow'
        buzzMin.innerHTML = '<span>Scan min</span>'
        const buzzInput = document.createElement('input')
        buzzInput.type = 'number'
        buzzInput.min = '0'
        buzzInput.step = 'any'
        buzzInput.value = String(pool.minAmount || 0)
        buzzInput.title = 'Ignore swaps below this quote size'
        buzzInput.addEventListener('change', () => {
          const n = Number(buzzInput.value)
          updatePool(index, {
            minAmount: Number.isFinite(n) && n >= 0 ? n : 0,
          })
        })
        buzzMin.append(buzzInput)

        const sideField = document.createElement('label')
        sideField.className = 'field'
        sideField.innerHTML = '<span>Side</span>'
        const sideSel = document.createElement('select')
        for (const [value, label] of [
          ['all', 'All swaps'],
          ['buy', 'Buy (spend quote)'],
          ['sell', 'Sell (receive quote)'],
        ] as const) {
          const opt = document.createElement('option')
          opt.value = value
          opt.textContent = label
          if (pool.side === value) opt.selected = true
          sideSel.append(opt)
        }
        sideSel.addEventListener('change', () => {
          updatePool(index, { side: sideSel.value as PoolSide })
        })
        sideField.append(sideSel)

        const obsTick = document.createElement('label')
        obsTick.className = 'field settings-toggle-field pool-obs-toggle'
        const obsCheck = document.createElement('input')
        obsCheck.type = 'checkbox'
        obsCheck.checked = pool.overlayAlert !== false
        obsCheck.addEventListener('change', () => {
          updatePool(index, { overlayAlert: obsCheck.checked })
        })
        const obsSpan = document.createElement('span')
        obsSpan.textContent = 'Show on stream overlay'
        obsTick.append(obsSpan, obsCheck)

        const obsMin = document.createElement('label')
        obsMin.className = 'field narrow'
        obsMin.innerHTML = '<span>OBS min</span>'
        const obsMinInput = document.createElement('input')
        obsMinInput.type = 'number'
        obsMinInput.min = '0'
        obsMinInput.step = 'any'
        obsMinInput.placeholder = 'stream default'
        obsMinInput.value =
          pool.overlayMinAmount != null ? String(pool.overlayMinAmount) : ''
        obsMinInput.title =
          'OBS alert minimum for this pool only. Empty = use Stream tip alert “Pool / chain event alert minimum”.'
        obsMinInput.addEventListener('change', () => {
          const raw = obsMinInput.value.trim()
          if (!raw) {
            updatePool(index, { overlayMinAmount: null })
            return
          }
          const n = Number(raw)
          updatePool(index, {
            overlayMinAmount: Number.isFinite(n) && n >= 0 ? n : null,
          })
        })
        obsMin.append(obsMinInput)

        const note = document.createElement('p')
        note.className = 'hint pool-alert-hint'
        note.textContent =
          'Scan min gates detection. Matching events also fire the OBS tip alert (same card as wallet tips) unless “Show on stream overlay” is off.'

        const listenBox = document.createElement('div')
        listenBox.className = 'pool-listen'
        const listenLabel = document.createElement('p')
        listenLabel.className = 'pool-listen-label'
        listenLabel.textContent = 'Listen'
        listenBox.append(listenLabel)
        const currentListen = new Set(
          pool.listen?.length ? pool.listen : (['swap'] as PoolListenKind[]),
        )
        for (const [kind, label] of [
          ['swap', 'Swaps'],
          ['mint', 'Add LP'],
          ['burn', 'Remove LP'],
        ] as const) {
          const lab = document.createElement('label')
          lab.className = 'pool-rule-toy'
          const check = document.createElement('input')
          check.type = 'checkbox'
          check.checked = currentListen.has(kind)
          check.addEventListener('change', () => {
            const next = new Set(currentListen)
            if (check.checked) next.add(kind)
            else next.delete(kind)
            updatePool(index, {
              listen: [...next] as PoolListenKind[],
            })
          })
          const span = document.createElement('span')
          span.textContent = label
          lab.append(check, span)
          listenBox.append(lab)
        }

        panel.append(
          listenBox,
          buzzMin,
          sideField,
          obsTick,
          obsMin,
          note,
          paintRuleEditor(index, pool),
        )
        li.append(panel)
      }

      list.append(li)
    }
    empty.hidden = count > 0
    paintBridgePanel()
    paintLogPanel()
  }

  function setPoolWatchEnabled() {
    const state = ctx.getState()
    const poolWatch = ctx.$<HTMLInputElement>('pool-watch-enabled').checked
    ctx.setState({ ...state, poolWatch })
    ctx.save({ ...ctx.readForm(), poolWatch })
    paintPoolPanel()
    if (ctx.isWatching()) ctx.restartWatch()
  }

  function addPool() {
    const address = ctx.$<HTMLInputElement>('pool-address').value.trim()
    const quoteToken = ctx.$<HTMLInputElement>('pool-quote').value.trim()
    const raw = {
      address,
      label: ctx.$<HTMLInputElement>('pool-label').value.trim(),
      minAmount: Number(ctx.$<HTMLInputElement>('pool-min').value) || 0,
      quoteSymbol:
        ctx.$<HTMLInputElement>('pool-quote-sym').value.trim() || 'WPLS',
      quoteToken: quoteToken || WPLS_ADDRESS,
      side: ctx.$<HTMLSelectElement>('pool-side').value,
      decimals: 18,
      overlayAlert: true,
      overlayMinAmount: null,
      buzzRules: [],
      listen: ['swap'],
    }
    const pool = normalizeWatchedPool(raw)
    const status = ctx.$('pool-form-status')
    if (!pool) {
      status.textContent = 'Invalid pair address'
      return
    }
    const state = ctx.getState()
    if (
      (state.pools || []).some(
        (saved) => saved.address.toLowerCase() === pool.address.toLowerCase(),
      )
    ) {
      status.textContent = 'Pool already listed'
      return
    }
    const pools = [...(state.pools || []), { ...pool, enabled: true }]
    ctx.setState({ ...state, pools })
    ctx.save({ ...ctx.readForm(), pools })
    ctx.$<HTMLInputElement>('pool-address').value = ''
    ctx.$<HTMLInputElement>('pool-label').value = ''
    status.textContent = `Added ${pool.label} (On)`
    paintPoolPanel()
    if (!ctx.getState().poolWatch) {
      status.textContent = `Added ${pool.label} — turn on Watch chain events to listen`
    }
  }

  function loadPresets() {
    const state = ctx.getState()
    const { pools, added } = mergePoolPresets(state.pools || [])
    ctx.setState({ ...state, pools })
    ctx.save({ ...ctx.readForm(), pools })
    paintPoolPanel()
    ctx.$('pool-form-status').textContent = added
      ? `Loaded ${added} presets (all Off — tick the ones you want)`
      : 'Presets already loaded — tick pools On to watch'
  }

  function enableAll() {
    const state = ctx.getState()
    const pools = (state.pools || []).map((pool) => ({ ...pool, enabled: true }))
    ctx.setState({ ...state, pools })
    ctx.save({ ...ctx.readForm(), pools })
    paintPoolPanel()
    restartWhenWatching()
  }

  function disableAll() {
    const state = ctx.getState()
    const pools = (state.pools || []).map((pool) => ({
      ...pool,
      enabled: false,
    }))
    ctx.setState({ ...state, pools })
    ctx.save({ ...ctx.readForm(), pools })
    paintPoolPanel()
    restartWhenWatching()
  }

  function extraAlertSummary(row: {
    overlayAlert: boolean
    overlayMinAmount: number | null
    buzzRules: PoolBuzzRule[]
  }): string {
    const bits: string[] = []
    if (row.overlayAlert === false) bits.push('OBS off')
    else if (row.overlayMinAmount != null && row.overlayMinAmount > 0) {
      bits.push(`OBS ≥${row.overlayMinAmount}`)
    } else bits.push('OBS on')
    const n = row.buzzRules?.length || 0
    if (n) bits.push(`${n} rule${n === 1 ? '' : 's'}`)
    return bits.join(' · ')
  }

  function paintExtraRules(
    rules: PoolBuzzRule[],
    minAmount: number,
    apply: (next: PoolBuzzRule[]) => void,
  ): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'pool-rules'
    const head = document.createElement('div')
    head.className = 'pool-rules-head'
    const title = document.createElement('p')
    title.className = 'pool-rules-title'
    title.textContent = 'Buzz rules'
    const add = document.createElement('button')
    add.type = 'button'
    add.className = 'btn ghost tiny'
    add.textContent = 'Add rule'
    add.addEventListener('click', () => {
      apply([
        ...rules,
        createPoolBuzzRule({ minAmount: minAmount || 0 }),
      ])
    })
    head.append(title, add)
    wrap.append(head)
    if (!rules.length) {
      const empty = document.createElement('p')
      empty.className = 'hint'
      empty.textContent =
        'No rules yet — matching events use the tip menu ladder. Add a rule to target toys, side, function, amount, and repeats.'
      wrap.append(empty)
      return wrap
    }
    const toys = ctx.getToys()
    const patterns = ctx.getPatterns()
    for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex++) {
      const rule = rules[ruleIndex]!
      const row = document.createElement('div')
      row.className = 'pool-rule-row'
      const sideField = document.createElement('label')
      sideField.className = 'field narrow'
      sideField.innerHTML = '<span>Side</span>'
      const sideSel = document.createElement('select')
      for (const [value, label] of RULE_SIDES) {
        const opt = document.createElement('option')
        opt.value = value
        opt.textContent = label
        if ((rule.side || 'all') === value) opt.selected = true
        sideSel.append(opt)
      }
      sideSel.addEventListener('change', () => {
        const next = [...rules]
        next[ruleIndex] = { ...rule, side: sideSel.value as PoolSide }
        apply(next)
      })
      sideField.append(sideSel)

      const amountField = document.createElement('label')
      amountField.className = 'field narrow'
      amountField.innerHTML = '<span>Amount ≥</span>'
      const amountInput = document.createElement('input')
      amountInput.type = 'number'
      amountInput.min = '0'
      amountInput.step = 'any'
      amountInput.value = String(rule.minAmount || 0)
      amountInput.addEventListener('change', () => {
        const n = Number(amountInput.value)
        const next = [...rules]
        next[ruleIndex] = {
          ...rule,
          minAmount: Number.isFinite(n) && n >= 0 ? n : 0,
        }
        apply(next)
      })
      amountField.append(amountInput)

      const patternField = document.createElement('label')
      patternField.className = 'field'
      patternField.innerHTML = '<span>Function</span>'
      const patternSel = document.createElement('select')
      const auto = document.createElement('option')
      auto.value = ''
      auto.textContent = 'Tip ladder (auto)'
      patternSel.append(auto)
      for (const pattern of patterns) {
        const opt = document.createElement('option')
        opt.value = pattern.id
        opt.textContent = pattern.name
        if (rule.patternId === pattern.id) opt.selected = true
        patternSel.append(opt)
      }
      patternSel.addEventListener('change', () => {
        const next = [...rules]
        next[ruleIndex] = { ...rule, patternId: patternSel.value }
        apply(next)
      })
      patternField.append(patternSel)

      const remove = document.createElement('button')
      remove.type = 'button'
      remove.className = 'btn ghost tiny'
      remove.textContent = 'Remove'
      remove.addEventListener('click', () => {
        apply(rules.filter((_, i) => i !== ruleIndex))
      })

      const toysBox = document.createElement('div')
      toysBox.className = 'pool-rule-toys'
      const toysLabel = document.createElement('p')
      toysLabel.className = 'pool-rule-toys-label'
      toysLabel.textContent = toys.length
        ? 'Toys (tick one or more)'
        : 'Toys — connect a toy on Home to target'
      toysBox.append(toysLabel)
      for (const toy of toys) {
        const lab = document.createElement('label')
        lab.className = 'pool-rule-toy'
        const check = document.createElement('input')
        check.type = 'checkbox'
        check.checked = rule.toyIds.includes(toy.id)
        check.addEventListener('change', () => {
          const set = new Set(rule.toyIds)
          if (check.checked) set.add(toy.id)
          else set.delete(toy.id)
          const next = [...rules]
          next[ruleIndex] = { ...rule, toyIds: [...set] }
          apply(next)
        })
        const span = document.createElement('span')
        span.textContent = shortToyLabel(toy.name || '', toy.toyType, toy.id)
        lab.append(check, span)
        toysBox.append(lab)
      }

      row.append(sideField, amountField, patternField, remove, toysBox)
      wrap.append(row)
    }
    return wrap
  }

  function updateBridge(index: number, patch: Partial<WatchedBridge>) {
    const current = ctx.getState()
    const next = [...(current.bridges || [])]
    const selected = next[index]
    if (!selected) return
    next[index] = { ...selected, ...patch }
    ctx.setState({ ...current, bridges: next })
    ctx.save({ ...ctx.readForm(), bridges: next })
    paintPoolPanel()
    restartWhenWatching()
  }

  function updateLog(index: number, patch: Partial<WatchedChainLog>) {
    const current = ctx.getState()
    const next = [...(current.chainLogs || [])]
    const selected = next[index]
    if (!selected) return
    next[index] = { ...selected, ...patch }
    ctx.setState({ ...current, chainLogs: next })
    ctx.save({ ...ctx.readForm(), chainLogs: next })
    paintPoolPanel()
    restartWhenWatching()
  }

  function paintTriggerRow(
    list: HTMLElement,
    opts: {
      enabled: boolean
      title: string
      meta: string
      open: boolean
      onToggle: (on: boolean) => void
      onEdit: () => void
      onRemove: () => void
      panel?: HTMLElement
    },
  ) {
    const li = document.createElement('li')
    li.className = opts.enabled === false ? 'pool-row is-off' : 'pool-row'
    if (opts.open) li.classList.add('is-editing')
    const tickLabel = document.createElement('label')
    tickLabel.className = 'pool-enable'
    const tick = document.createElement('input')
    tick.type = 'checkbox'
    tick.checked = opts.enabled
    tick.addEventListener('change', () => opts.onToggle(tick.checked))
    const tickText = document.createElement('span')
    tickText.textContent = 'On'
    tickLabel.append(tick, tickText)
    const body = document.createElement('div')
    body.className = 'pool-body'
    const title = document.createElement('p')
    title.className = 'pool-title'
    title.textContent = opts.title
    const meta = document.createElement('p')
    meta.className = 'pool-meta'
    meta.textContent = opts.meta
    body.append(title, meta)
    const actions = document.createElement('div')
    actions.className = 'pool-row-actions'
    const edit = document.createElement('button')
    edit.type = 'button'
    edit.className = 'btn ghost tiny'
    edit.textContent = opts.open ? 'Done' : 'Alert'
    edit.addEventListener('click', opts.onEdit)
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'btn ghost tiny'
    remove.textContent = 'Remove'
    remove.addEventListener('click', opts.onRemove)
    actions.append(edit, remove)
    li.append(tickLabel, body, actions)
    if (opts.panel) li.append(opts.panel)
    list.append(li)
  }

  function paintObsFields(
    overlayAlert: boolean,
    overlayMinAmount: number | null,
    onOverlay: (alert: boolean) => void,
    onMin: (n: number | null) => void,
  ): HTMLElement[] {
    const obsTick = document.createElement('label')
    obsTick.className = 'field settings-toggle-field pool-obs-toggle'
    const obsCheck = document.createElement('input')
    obsCheck.type = 'checkbox'
    obsCheck.checked = overlayAlert !== false
    obsCheck.addEventListener('change', () => onOverlay(obsCheck.checked))
    const obsSpan = document.createElement('span')
    obsSpan.textContent = 'Show on stream overlay'
    obsTick.append(obsSpan, obsCheck)
    const obsMin = document.createElement('label')
    obsMin.className = 'field narrow'
    obsMin.innerHTML = '<span>OBS min</span>'
    const obsMinInput = document.createElement('input')
    obsMinInput.type = 'number'
    obsMinInput.min = '0'
    obsMinInput.step = 'any'
    obsMinInput.placeholder = 'stream default'
    obsMinInput.value =
      overlayMinAmount != null ? String(overlayMinAmount) : ''
    obsMinInput.addEventListener('change', () => {
      const raw = obsMinInput.value.trim()
      if (!raw) {
        onMin(null)
        return
      }
      const n = Number(raw)
      onMin(Number.isFinite(n) && n >= 0 ? n : null)
    })
    obsMin.append(obsMinInput)
    return [obsTick, obsMin]
  }

  function paintBridgePanel() {
    const list = ctx.$('bridge-list')
    const empty = ctx.$('bridge-list-empty')
    if (!list || !empty) return
    const bridges = ctx.getState().bridges || []
    list.replaceChildren()
    for (let index = 0; index < bridges.length; index++) {
      const bridge = bridges[index]!
      const open = editingBridgeId === bridge.id
      const panel = open ? document.createElement('div') : undefined
      if (panel) {
        panel.className = 'pool-alert-panel'
        const minField = document.createElement('label')
        minField.className = 'field narrow'
        minField.innerHTML = '<span>Scan min</span>'
        const minInput = document.createElement('input')
        minInput.type = 'number'
        minInput.min = '0'
        minInput.step = 'any'
        minInput.value = String(bridge.minAmount || 0)
        minInput.addEventListener('change', () => {
          const n = Number(minInput.value)
          updateBridge(index, {
            minAmount: Number.isFinite(n) && n >= 0 ? n : 0,
          })
        })
        minField.append(minInput)
        const dirField = document.createElement('label')
        dirField.className = 'field'
        dirField.innerHTML = '<span>Direction</span>'
        const dirSel = document.createElement('select')
        for (const [value, label] of [
          ['both', 'In and out'],
          ['in', 'Deposits in'],
          ['out', 'Withdrawals out'],
        ] as const) {
          const opt = document.createElement('option')
          opt.value = value
          opt.textContent = label
          if (bridge.direction === value) opt.selected = true
          dirSel.append(opt)
        }
        dirSel.addEventListener('change', () => {
          updateBridge(index, { direction: dirSel.value as BridgeDirection })
        })
        dirField.append(dirSel)
        const txTick = document.createElement('label')
        txTick.className = 'field settings-toggle-field pool-obs-toggle'
        const txCheck = document.createElement('input')
        txCheck.type = 'checkbox'
        txCheck.checked = bridge.tokenTxBackup !== false
        txCheck.addEventListener('change', () => {
          updateBridge(index, { tokenTxBackup: txCheck.checked })
        })
        const txSpan = document.createElement('span')
        txSpan.textContent = 'Token tx backup'
        txTick.append(txSpan, txCheck)
        const txHint = document.createElement('p')
        txHint.className = 'hint pool-alert-hint'
        txHint.textContent = bridge.token
          ? 'If OmniBridge logs miss, also watch Transfer mint/burn on the filtered token (same min / rules). Official bridge events still win for the same tx.'
          : 'If OmniBridge logs miss, also watch Transfer mint/burn on bridged HEX / WETH / USDC / USDT / DAI. Official bridge events still win for the same tx.'
        const [obsTick, obsMin] = paintObsFields(
          bridge.overlayAlert,
          bridge.overlayMinAmount,
          (alert) => updateBridge(index, { overlayAlert: alert }),
          (n) => updateBridge(index, { overlayMinAmount: n }),
        )
        panel.append(
          minField,
          dirField,
          txTick,
          txHint,
          obsTick,
          obsMin,
          paintExtraRules(bridge.buzzRules || [], bridge.minAmount, (rules) =>
            updateBridge(index, { buzzRules: rules }),
          ),
        )
      }
      paintTriggerRow(list, {
        enabled: bridge.enabled !== false,
        title: bridge.label,
        meta: `${bridge.address.slice(0, 10)}… · ${bridge.direction} · min ${bridge.minAmount}${bridge.tokenTxBackup !== false ? ' · tx backup' : ''} · ${extraAlertSummary(bridge)}`,
        open,
        onToggle: (on) => updateBridge(index, { enabled: on }),
        onEdit: () => {
          editingBridgeId = open ? null : bridge.id
          editingAddress = null
          editingLogId = null
          paintPoolPanel()
        },
        onRemove: () => {
          const current = ctx.getState()
          const next = (current.bridges || []).filter((_, i) => i !== index)
          if (editingBridgeId === bridge.id) editingBridgeId = null
          ctx.setState({ ...current, bridges: next })
          ctx.save({ ...ctx.readForm(), bridges: next })
          paintPoolPanel()
          restartWhenWatching()
        },
        panel,
      })
    }
    empty.hidden = bridges.length > 0
  }

  function paintLogPanel() {
    const list = ctx.$('log-list')
    const empty = ctx.$('log-list-empty')
    if (!list || !empty) return
    const logs = ctx.getState().chainLogs || []
    list.replaceChildren()
    for (let index = 0; index < logs.length; index++) {
      const row = logs[index]!
      const open = editingLogId === row.id
      const panel = open ? document.createElement('div') : undefined
      if (panel) {
        panel.className = 'pool-alert-panel'
        const minField = document.createElement('label')
        minField.className = 'field narrow'
        minField.innerHTML = '<span>Scan min</span>'
        const minInput = document.createElement('input')
        minInput.type = 'number'
        minInput.min = '0'
        minInput.step = 'any'
        minInput.value = String(row.minAmount || 0)
        minInput.addEventListener('change', () => {
          const n = Number(minInput.value)
          updateLog(index, {
            minAmount: Number.isFinite(n) && n >= 0 ? n : 0,
          })
        })
        minField.append(minInput)
        const [obsTick, obsMin] = paintObsFields(
          row.overlayAlert,
          row.overlayMinAmount,
          (alert) => updateLog(index, { overlayAlert: alert }),
          (n) => updateLog(index, { overlayMinAmount: n }),
        )
        panel.append(
          minField,
          obsTick,
          obsMin,
          paintExtraRules(row.buzzRules || [], row.minAmount, (rules) =>
            updateLog(index, { buzzRules: rules }),
          ),
        )
      }
      paintTriggerRow(list, {
        enabled: row.enabled !== false,
        title: row.label,
        meta: `${row.address.slice(0, 10)}… · ${row.eventAbi.slice(0, 42)}${row.eventAbi.length > 42 ? '…' : ''} · min ${row.minAmount} · ${extraAlertSummary(row)}`,
        open,
        onToggle: (on) => updateLog(index, { enabled: on }),
        onEdit: () => {
          editingLogId = open ? null : row.id
          editingAddress = null
          editingBridgeId = null
          paintPoolPanel()
        },
        onRemove: () => {
          const current = ctx.getState()
          const next = (current.chainLogs || []).filter((_, i) => i !== index)
          if (editingLogId === row.id) editingLogId = null
          ctx.setState({ ...current, chainLogs: next })
          ctx.save({ ...ctx.readForm(), chainLogs: next })
          paintPoolPanel()
          restartWhenWatching()
        },
        panel,
      })
    }
    empty.hidden = logs.length > 0
  }

  function addBridge() {
    const status = ctx.$('bridge-form-status')
    const tokenRaw = ctx.$<HTMLInputElement>('bridge-token').value.trim()
    const raw = {
      address: ctx.$<HTMLInputElement>('bridge-address').value.trim(),
      label: ctx.$<HTMLInputElement>('bridge-label').value.trim(),
      minAmount: Number(ctx.$<HTMLInputElement>('bridge-min').value) || 0,
      direction: ctx.$<HTMLSelectElement>('bridge-dir').value,
      token: tokenRaw,
      quoteSymbol: 'TOKEN',
      decimals: 18,
      overlayAlert: true,
      overlayMinAmount: null,
      buzzRules: [],
      enabled: true,
      tokenTxBackup: true,
    }
    const bridge = normalizeWatchedBridge(raw)
    if (!bridge) {
      status.textContent = 'Invalid mediator address'
      return
    }
    const state = ctx.getState()
    if (
      (state.bridges || []).some(
        (saved) => saved.address.toLowerCase() === bridge.address.toLowerCase(),
      )
    ) {
      status.textContent = 'Bridge already listed'
      return
    }
    const bridges = [...(state.bridges || []), bridge]
    ctx.setState({ ...state, bridges })
    ctx.save({ ...ctx.readForm(), bridges })
    ctx.$<HTMLInputElement>('bridge-address').value = ''
    ctx.$<HTMLInputElement>('bridge-label').value = ''
    status.textContent = `Added ${bridge.label} (On)`
    paintPoolPanel()
    if (!ctx.getState().poolWatch) {
      status.textContent = `Added ${bridge.label} — turn on Watch chain events to listen`
    }
  }

  function loadBridgePresets() {
    const state = ctx.getState()
    const { bridges, added } = mergeBridgePresets(state.bridges || [])
    ctx.setState({ ...state, bridges })
    ctx.save({ ...ctx.readForm(), bridges })
    paintPoolPanel()
    ctx.$('bridge-form-status').textContent = added
      ? `Loaded ${added} OmniBridge preset (Off — tick to watch)`
      : 'OmniBridge already listed — tick On to watch'
    if (!ctx.$<HTMLInputElement>('bridge-address').value.trim()) {
      ctx.$<HTMLInputElement>('bridge-address').value =
        PULSECHAIN_OMNIBRIDGE_ADDRESS
      ctx.$<HTMLInputElement>('bridge-label').value = 'PulseChain OmniBridge'
    }
  }

  function addChainLog() {
    const status = ctx.$('log-form-status')
    const eventAbi = ctx.$<HTMLInputElement>('log-abi').value.trim()
    if (!parseChainEventAbi(eventAbi)) {
      status.textContent =
        'Invalid event ABI — example: Transfer(address indexed from, address indexed to, uint256 value)'
      return
    }
    const raw = {
      address: ctx.$<HTMLInputElement>('log-address').value.trim(),
      label: ctx.$<HTMLInputElement>('log-label').value.trim(),
      eventAbi,
      amountArg: ctx.$<HTMLInputElement>('log-amount-arg').value.trim(),
      minAmount: Number(ctx.$<HTMLInputElement>('log-min').value) || 0,
      decimals: Number(ctx.$<HTMLInputElement>('log-decimals').value) || 18,
      quoteSymbol: ctx.$<HTMLInputElement>('log-symbol').value.trim() || 'TOKEN',
      overlayAlert: true,
      overlayMinAmount: null,
      buzzRules: [],
      enabled: true,
    }
    const log = normalizeWatchedChainLog(raw)
    if (!log) {
      status.textContent = 'Invalid contract address or event ABI'
      return
    }
    const state = ctx.getState()
    if (
      (state.chainLogs || []).some(
        (saved) =>
          saved.address.toLowerCase() === log.address.toLowerCase() &&
          saved.eventAbi.toLowerCase() === log.eventAbi.toLowerCase(),
      )
    ) {
      status.textContent = 'Event already listed on that contract'
      return
    }
    const chainLogs = [...(state.chainLogs || []), log]
    ctx.setState({ ...state, chainLogs })
    ctx.save({ ...ctx.readForm(), chainLogs })
    ctx.$<HTMLInputElement>('log-address').value = ''
    ctx.$<HTMLInputElement>('log-label').value = ''
    status.textContent = `Added ${log.label} (On)`
    paintPoolPanel()
    if (!ctx.getState().poolWatch) {
      status.textContent = `Added ${log.label} — turn on Watch chain events to listen`
    }
  }

  function wire() {
    ctx.$('pool-watch-enabled').addEventListener('change', setPoolWatchEnabled)
    ctx.$('btn-pool-add').addEventListener('click', addPool)
    ctx.$('btn-pool-presets').addEventListener('click', loadPresets)
    ctx.$('btn-pools-all').addEventListener('click', enableAll)
    ctx.$('btn-pools-none').addEventListener('click', disableAll)
    ctx.$('btn-bridge-add').addEventListener('click', addBridge)
    ctx.$('btn-bridge-presets').addEventListener('click', loadBridgePresets)
    ctx.$('btn-log-add').addEventListener('click', addChainLog)
  }

  return { paintPoolPanel, wire }
}
