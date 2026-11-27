import type { PaymentEvent } from '../chain/watcher'
import { chainEventEyebrow, matchPoolBuzzRule } from '../chain/pools'
import type { DeviceController, DeviceToy } from '../device/controller'
import {
  enabledCoinRewardRules,
  matchCoinReward,
  matchCoinRewardByUsd,
  usdTargetToTokenAmount,
} from '../state/coinRewards'
import type { PaymentLogItem } from '../state/paymentsLog'
import type { Saved } from '../state/settings'
import { isAcceptedStableTip } from '../state/settings'
import { BuzzQueue } from '../utils/buzzQueue'
import { peekUsdQuoteMap } from '../utils/tipUsd'
import {
  familyLabel,
  patternFamily,
  patternFitsToy,
} from '../utils/patternFit'
import {
  getPattern,
  patternDurationMs,
  patternLabel,
  patternNeeds,
  type PatternId,
} from '../utils/patterns'
import { planBuzz, planBuzzEachToy } from '../utils/pricing'
import { shortToyLabel } from '../utils/toySilhouettes'

export type TipBuzzPlan = {
  intensity: number
  durationMs: number
  pattern: string
  price?: number
  label: string
  toyId?: string
}

type TipAlertPayload = {
  id: string
  amount: number
  symbol: string
  title: string
  subtitle?: string
  source: 'pool' | 'wallet' | 'test'
  eventKind?: string
  dryRun: boolean
  at: number
}

export type TipPipelineContext = {
  getState: () => Saved
  getDeviceToys: () => DeviceToy[]
  device: Pick<DeviceController, 'activeBackend' | 'isConnected' | 'connect'>
  applyDeviceSettings: () => void
  buzzQueue: BuzzQueue
  addPayment: (payment: PaymentLogItem) => void
  paintFeed: () => void
  setQueueStatus: (message: string) => void
  getOverlayStyle: () => {
    showPoolLabel: boolean
    showPattern: boolean
    showPoolAlerts: boolean
    poolMinAmount: number
  }
  notifyTip: (payload: TipAlertPayload) => void | Promise<void>
  showError: (message: string) => void
}

export function createTipPipeline(ctx: TipPipelineContext) {
  const state = () => ctx.getState()

  /** Linked toys that can receive a paid tip buzz (not catalog placeholders). */
  function tipBuzzToys() {
    return ctx.getDeviceToys().filter(
      (toy) =>
        Boolean(toy.id) &&
        toy.source !== 'preview' &&
        String(toy.status || '').toLowerCase() !== 'catalog' &&
        !state().disabledToys.includes(toy.id) &&
        toy.connected !== false,
    )
  }

  function planForAmount(
    amount: number,
    toys?: DeviceToy[],
  ) {
    const current = state()
    return planBuzz(amount, current.patternPrices, current.disabledPatterns, {
      toys: toys || tipBuzzToys(),
      toyPrices: current.toyPatternPrices,
      disabledToys: current.disabledToys,
      featured: current.featuredPatterns,
    })
  }

  function labelPlan(
    amount: number,
    plan: NonNullable<ReturnType<typeof planBuzz>>,
  ): TipBuzzPlan | null {
    return planForPayment({
      amount,
      force: {
        pattern: plan.pattern,
        toyId: plan.toyId,
        name: getPattern(plan.pattern)?.name,
        price: plan.price,
      },
    })
  }

  /** Ladder independently on each buzz-on toy so one tip can play in parallel. */
  function plansForLadderAmount(
    amount: number,
    toys?: DeviceToy[],
  ): TipBuzzPlan[] {
    const current = state()
    const raw = planBuzzEachToy(
      amount,
      current.patternPrices,
      current.disabledPatterns,
      {
        toys: toys || tipBuzzToys(),
        toyPrices: current.toyPatternPrices,
        disabledToys: current.disabledToys,
        featured: current.featuredPatterns,
      },
    )
    const out: TipBuzzPlan[] = []
    for (const plan of raw) {
      const labeled = labelPlan(amount, plan)
      if (labeled) out.push(labeled)
    }
    return out
  }

  function findPoolForPayment(payment: PaymentEvent) {
    const kind = payment.eventKind || 'swap'
    const addr = payment.poolAddress?.toLowerCase()
    if (kind === 'bridge-in' || kind === 'bridge-out') {
      const bridges = ctx.getState().bridges || []
      if (payment.triggerId) {
        const byId = bridges.find((row) => row.id === payment.triggerId)
        if (byId) return byId
      }
      return bridges.find(
        (row) => addr && row.address.toLowerCase() === addr,
      )
    }
    if (kind === 'custom') {
      const logs = ctx.getState().chainLogs || []
      if (payment.triggerId) {
        const byId = logs.find((row) => row.id === payment.triggerId)
        if (byId) return byId
      }
      return logs.find(
        (row) =>
          addr &&
          row.address.toLowerCase() === addr &&
          (!payment.poolLabel || row.label === payment.poolLabel),
      )
    }
    const pools = state().pools || []
    if (payment.poolAddress) {
      const byAddr = pools.find(
        (row) =>
          row.address.toLowerCase() === payment.poolAddress!.toLowerCase(),
      )
      if (byAddr) return byAddr
    }
    if (payment.poolLabel) {
      return pools.find((row) => row.label === payment.poolLabel)
    }
    return undefined
  }

  function filterRuleToys(toyIds: string[]): DeviceToy[] {
    const linked = tipBuzzToys()
    if (!toyIds.length) return linked
    const want = new Set(toyIds)
    return linked.filter((toy) => toy.id && want.has(toy.id))
  }

  /**
   * Resolve one or more buzz plans for a payment.
   * Pool rules can force pattern + toys + multiples; otherwise tip ladder.
   */
  function plansForPayment(payment: PaymentEvent): TipBuzzPlan[] {
    if (payment.force?.pattern) {
      const one = planForPayment(payment)
      return one ? [one] : []
    }

    if (payment.source === 'pool') {
      const pool = findPoolForPayment(payment)
      const rule = matchPoolBuzzRule(pool, payment.amount, payment.poolSide)
      if (rule) {
        const toyIdsSpecified = rule.toyIds.length > 0
        const toys = filterRuleToys(rule.toyIds)
        // Targeted toys that are all offline must not fall open to every toy.
        if (toyIdsSpecified && !toys.length) return []

        const multiples = Math.min(8, Math.max(1, rule.multiples || 1))
        const out: TipBuzzPlan[] = []

        if (rule.patternId) {
          const id = rule.patternId as PatternId
          const definition = getPattern(id)
          if (definition) {
            const poolToys = toyIdsSpecified ? toys : tipBuzzToys()
            const targets = poolToys.filter((toy) =>
              patternFitsToy(
                patternNeeds(definition),
                toy,
                definition.forProducts,
              ),
            )
            if (targets.length) {
              for (let m = 0; m < multiples; m++) {
                for (const toy of targets) {
                  const forced = planForPayment({
                    amount: payment.amount,
                    force: {
                      pattern: id,
                      toyId: toy.id,
                      name: definition.name,
                      price: payment.amount,
                    },
                  })
                  if (forced) out.push(forced)
                }
              }
              if (out.length) return out
            }
            // Pattern forced but no compatible toy — do not ignore the rule.
            if (toyIdsSpecified || !tipBuzzToys().length) return []
          }
        }

        // Ladder within selected toys (or all when none named), then repeat.
        if (toys.length) {
          for (const toy of toys) {
            const plan = planForAmount(payment.amount, [toy])
            if (!plan) continue
            const labeled = planForPayment({
              amount: payment.amount,
              force: {
                pattern: plan.pattern,
                toyId: plan.toyId,
                name: getPattern(plan.pattern)?.name,
                price: plan.price,
              },
            })
            if (!labeled) continue
            for (let m = 0; m < multiples; m++) out.push(labeled)
          }
          if (out.length) return out
          return []
        }

        const plan = planForPayment(payment)
        if (plan) {
          for (let m = 0; m < multiples; m++) out.push(plan)
          return out
        }
        return []
      }
    }

    // Wallet tips: exact coin-reward rules first, else the price ladder.
    const tokenAddress = payment.token || ''
    const tokenKey = String(tokenAddress).trim().toLowerCase()
    const rules = state().coinRewardRules || []

    // Bridged stables tip by USD when selected (or legacy acceptedStables).
    if (
      isAcceptedStableTip(state().paintCoinKeys, tokenAddress) ||
      isAcceptedStableTip(state().acceptedStables, tokenAddress)
    ) {
      const quotes = peekUsdQuoteMap([tokenAddress])
      const usdPer = quotes[tokenKey] ?? 1
      const usdPaid = Number(payment.amount) * (Number(usdPer) || 1)
      const hit = matchCoinRewardByUsd(rules, usdPaid)
      if (hit) {
        const toyIdsSpecified = hit.rule.toyIds.length > 0
        const toys = filterRuleToys(hit.rule.toyIds)
        if (toyIdsSpecified && !toys.length) return []
        const definition = getPattern(hit.rule.patternId)
        if (!definition) return []
        const candidates = toyIdsSpecified ? toys : tipBuzzToys()
        const targets = candidates.filter((toy) =>
          patternFitsToy(
            patternNeeds(definition),
            toy,
            definition.forProducts,
          ),
        )
        if (!targets.length) return []
        const out: TipBuzzPlan[] = []
        for (const toy of targets) {
          const forced = planForPayment({
            amount: payment.amount,
            force: {
              pattern: hit.rule.patternId,
              toyId: toy.id,
              name: definition.name,
              price: payment.amount,
            },
          })
          if (forced) out.push(forced)
        }
        return out
      }
      // No painted matrix — map USD onto the active tip-coin ladder.
      const tipAddr = (state().tokenAddress || '').trim().toLowerCase()
      const tipQuotes = peekUsdQuoteMap([tipAddr])
      const tipUsdPer =
        tipQuotes[tipAddr] ??
        (tipAddr ? null : tipQuotes['']) ??
        null
      if (tipUsdPer != null && tipUsdPer > 0) {
        const asTipUnits = usdTargetToTokenAmount(usdPaid, tipUsdPer, 18)
        if (asTipUnits != null) {
          return plansForLadderAmount(asTipUnits)
        }
      }
      return []
    }

    const tokenRules = enabledCoinRewardRules(rules).filter(
      (rule) => rule.tokenAddress.toLowerCase() === tokenKey,
    )
    if (tokenRules.length) {
      const quotes = peekUsdQuoteMap([tokenAddress])
      const decimalsByToken: Record<string, number> = { '': 18 }
      for (const saved of state().savedTokens || []) {
        decimalsByToken[saved.address.toLowerCase()] = saved.decimals
      }
      const active = state().tokenAddress.trim()
      if (active) decimalsByToken[active.toLowerCase()] = state().tokenDecimals
      const hit = matchCoinReward(
        rules,
        { amount: payment.amount, tokenAddress },
        quotes,
        decimalsByToken,
      )
      if (!hit) return []

      const toyIdsSpecified = hit.rule.toyIds.length > 0
      const toys = filterRuleToys(hit.rule.toyIds)
      if (toyIdsSpecified && !toys.length) return []

      const definition = getPattern(hit.rule.patternId)
      if (!definition) return []
      const candidates = toyIdsSpecified ? toys : tipBuzzToys()
      const targets = candidates.filter((toy) =>
        patternFitsToy(
          patternNeeds(definition),
          toy,
          definition.forProducts,
        ),
      )
      if (!targets.length) return []

      const out: TipBuzzPlan[] = []
      for (const toy of targets) {
        const forced = planForPayment({
          amount: payment.amount,
          force: {
            pattern: hit.rule.patternId,
            toyId: toy.id,
            name: definition.name,
            price: payment.amount,
          },
        })
        if (forced) out.push(forced)
      }
      return out
    }

    return plansForLadderAmount(payment.amount)
  }

  function resolveToyFeedLabel(toyId?: string, fallback?: string): string {
    if (fallback && fallback.trim()) {
      const raw = fallback.trim()
      if (toyId) {
        const toy = ctx.getDeviceToys().find((candidate) => candidate.id === toyId)
        if (toy) return shortToyLabel(toy.name || '', toy.toyType, toy.id)
      }
      return raw.length > 18 ? raw.slice(0, 16) + '…' : raw
    }
    if (!toyId) return ''
    const toy = ctx.getDeviceToys().find((candidate) => candidate.id === toyId)
    if (toy) return shortToyLabel(toy.name || '', toy.toyType, toy.id)
    return toyId.length > 12 ? toyId.slice(0, 10) + '…' : toyId
  }

  /** Resolve a tip plan; forced simulations must not be re-laddered. */
  function planForPayment(payment: {
    amount: number
    force?: {
      pattern: string
      toyId?: string
      name?: string
      price?: number
      toyLabel?: string
    }
  }): TipBuzzPlan | null {
    const forced = payment.force
    if (forced?.pattern) {
      const id = forced.pattern as PatternId
      const definition = getPattern(id)
      const name = forced.name || definition?.name || patternLabel(id)
      const toyBit = resolveToyFeedLabel(forced.toyId, forced.toyLabel)
      const family = definition
        ? familyLabel(patternFamily(patternNeeds(definition)))
        : ''
      const priceBit =
        forced.price != null && Number.isFinite(forced.price)
          ? `menu ${forced.price}`
          : ''
      return {
        intensity: 1,
        durationMs: patternDurationMs(id),
        pattern: id,
        toyId: forced.toyId || undefined,
        price: forced.price,
        label: [name, toyBit && `on ${toyBit}`, family, priceBit]
          .filter(Boolean)
          .join(' · '),
      }
    }

    const plan = planForAmount(payment.amount)
    if (!plan) return null
    const definition = getPattern(plan.pattern)
    const family = definition
      ? familyLabel(patternFamily(patternNeeds(definition)))
      : ''
    const toyBit = resolveToyFeedLabel(plan.toyId)
    const priceBit =
      plan.price != null && Number.isFinite(plan.price)
        ? `menu ${plan.price}`
        : ''
    const name = definition?.name || patternLabel(plan.pattern)
    return {
      ...plan,
      label: [name, toyBit && `on ${toyBit}`, family, priceBit]
        .filter(Boolean)
        .join(' · '),
    }
  }

  function formatPlanDuration(ms: number): string {
    if (!Number.isFinite(ms) || ms <= 0) return '—'
    if (ms >= 1000) {
      const seconds = ms / 1000
      return `${seconds % 1 === 0 ? seconds.toFixed(0) : seconds.toFixed(1)}s`
    }
    return `${Math.round(ms)}ms`
  }

  function feedFeelLine(
    payment: PaymentLogItem,
    plans: TipBuzzPlan | TipBuzzPlan[],
  ): string {
    const list = Array.isArray(plans) ? plans : [plans]
    const prefix = payment.dryRun ? 'dry-run' : '→'
    if (!list.length) return `${prefix} no pattern`
    return `${prefix} ${list
      .map((plan) => `${plan.label} · ${formatPlanDuration(plan.durationMs)}`)
      .join(' · ')}`
  }

  async function ensureDeviceReady() {
    ctx.applyDeviceSettings()
    if (
      ctx.device.activeBackend !== state().backend ||
      !ctx.device.isConnected
    ) {
      await ctx.device.connect(
        state().backend,
        state().backend === 'bluetooth' ? { skipPicker: true } : undefined,
      )
    }
  }

  async function runPatternTest(
    intensity: number,
    durationMs: number,
    pattern: PatternId,
    label: string,
    toyId?: string,
  ) {
    try {
      await ensureDeviceReady()
      await ctx.buzzQueue.enqueue({
        intensity,
        durationMs: durationMs > 0 ? Math.min(durationMs, 12_000) : 0,
        pattern,
        toyId: toyId || undefined,
        label: `test · ${label}`,
      })
      ctx.showError('')
    } catch (error) {
      ctx.showError(error instanceof Error ? error.message : String(error))
    }
  }

  async function onPayment(payment: PaymentEvent) {
    // Forced sim / Test / Fake a tip always play hardware.
    const isForce = Boolean(payment.force)
    const dryRun = false
    ctx.addPayment({ ...payment, dryRun })

    const plans = plansForPayment(payment)
    const plan = plans[0] || null
    const patternLine =
      plans.length <= 1
        ? plan?.label
        : plans.map((row) => row.label).join(' · ')
    const amountLabel =
      payment.source === 'pool'
        ? `${payment.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${payment.symbol}${
            payment.poolLabel ? ` · ${payment.poolLabel}` : ''
          }`
        : `${payment.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${payment.symbol}`

    const style = ctx.getOverlayStyle()
    const subParts: string[] = []
    if (style.showPoolLabel && payment.source === 'pool' && payment.poolLabel) {
      subParts.push(payment.poolLabel)
    }
    if (style.showPattern) {
      if (patternLine) subParts.push(patternLine)
      else subParts.push('Below menu / no pattern')
    }

    const shouldNotifyOverlay = (() => {
      if (payment.source !== 'pool') return true
      if (!style.showPoolAlerts) return false
      const pool = findPoolForPayment(payment)
      if (pool && pool.overlayAlert === false) return false
      const perPoolMin =
        pool?.overlayMinAmount != null && Number.isFinite(pool.overlayMinAmount)
          ? Number(pool.overlayMinAmount)
          : null
      // Per-pool OBS min replaces the stream default when set (not a floor).
      const minimum =
        perPoolMin != null ? perPoolMin : Number(style.poolMinAmount) || 0
      if (minimum > 0 && payment.amount < minimum) return false
      return true
    })()

    if (shouldNotifyOverlay) {
      void ctx.notifyTip({
        id: payment.id,
        amount: payment.amount,
        symbol: payment.symbol,
        title: `${payment.amount.toLocaleString(undefined, {
          maximumFractionDigits: 4,
        })} ${payment.symbol}`,
        subtitle: subParts.join(' · ') || undefined,
        source:
          payment.source === 'pool' ? 'pool' : isForce ? 'test' : 'wallet',
        eventKind: payment.eventKind,
        dryRun,
        at: payment.timestamp || Date.now(),
      })
    }

    if (!plans.length) {
      ctx.showError('')
      ctx.paintFeed()
      if (!dryRun) {
        ctx.setQueueStatus(
          payment.source === 'pool'
            ? `${chainEventEyebrow(payment.eventKind)} ${amountLabel} below menu (or no patterns on) · no buzz`
            : `Tip ${amountLabel} below menu (or no patterns on) · no buzz`,
        )
      }
      return
    }

    if (dryRun) {
      ctx.showError('')
      return
    }

    try {
      await ensureDeviceReady()
      await Promise.all(
        plans.map((next) =>
          ctx.buzzQueue.enqueue({
            intensity: next.intensity,
            durationMs: next.durationMs,
            pattern: next.pattern,
            toyId: next.toyId,
            label: [amountLabel, next.label].filter(Boolean).join(' · '),
            forcePlay: isForce,
          }),
        ),
      )
      ctx.showError('')
    } catch (error) {
      ctx.showError(error instanceof Error ? error.message : String(error))
    }
  }

  return {
    tipBuzzToys,
    planForAmount,
    planForPayment,
    plansForPayment,
    resolveToyFeedLabel,
    feedFeelLine,
    ensureDeviceReady,
    runPatternTest,
    onPayment,
  }
}
