import { CHAINS } from '../chain/config'
import { chainEventFeedKind } from '../chain/pools'
import {
  clearPaymentLogStorage,
  exportPaymentsCsv,
  exportPaymentsJson,
  formatPaymentAmount,
  MAX_PAYMENT_LOG,
  savePaymentLog,
  summarizePaymentEarnings,
  type PaymentLogItem,
} from '../state/paymentsLog'
import type { Saved } from '../state/settings'
import { short } from '../ui/dom'

export type PaymentsFeedContext = {
  $: <T extends HTMLElement>(id: string) => T
  getState: () => Saved
  getFeed: () => PaymentLogItem[]
  plansForPayment: (payment: PaymentLogItem) => {
    intensity: number
    durationMs: number
    pattern: string
    price?: number
    label: string
    toyId?: string
  }[]
  feedFeelLine: (
    payment: PaymentLogItem,
    plans: NonNullable<ReturnType<PaymentsFeedContext['plansForPayment']>>,
  ) => string
  resolveToyFeedLabel: (toyId?: string, fallback?: string) => string
  showError: (message: string) => void
}

function isPoolSwap(payment: PaymentLogItem) {
  return payment.source === 'pool'
}

function tipTierClass(amount: number, minAmount: number): string {
  const base = Math.max(minAmount || 0, 1)
  const ratio = amount / base
  if (ratio >= 50) return 'tip-tier-3'
  if (ratio >= 10) return 'tip-tier-2'
  if (ratio >= 3) return 'tip-tier-1'
  return ''
}

function paymentRowHtml(
  ctx: PaymentsFeedContext,
  payment: PaymentLogItem,
  feelState: { dirty: boolean },
): string {
  const poolSwap = isPoolSwap(payment)
  const state = ctx.getState()
  const tierClass = poolSwap ? '' : tipTierClass(payment.amount, state.minAmount)

  const plans = ctx.plansForPayment(payment)
  const plan = plans[0] || null
  const explorer =
    CHAINS[ctx.getState().chainKey].chain.blockExplorers?.default.url
  const link = explorer
    ? `<a href="${explorer}/tx/${payment.hash}" target="_blank" rel="noreferrer">${short(payment.hash)}</a>`
    : short(payment.hash)
  const kind = poolSwap
    ? `${chainEventFeedKind(payment.eventKind)}${payment.poolLabel ? ` · ${payment.poolLabel}` : ''}${
        payment.poolSide && payment.poolSide !== 'all' ? ` · ${payment.poolSide}` : ''
      }`
    : payment.force
      ? 'sim'
      : 'tip'
  const feel = !plans.length
    ? payment.dryRun
      ? 'dry-run · under menu · no pattern'
      : 'under menu · no buzz'
    : ctx.feedFeelLine(payment, plans)
  if (payment.feel !== feel) {
    payment.feel = feel
    feelState.dirty = true
  }
  const paid =
    plan?.price != null &&
    Number.isFinite(plan.price) &&
    Math.abs(plan.price - payment.amount) > 1e-9
      ? ` (pays ${payment.amount.toLocaleString(undefined, {
          maximumFractionDigits: 4,
        })})`
      : ''
  const classes = [
    tierClass,
    payment.dryRun ? 'feed-dry' : '',
    poolSwap ? 'feed-pool' : '',
    payment.force ? 'feed-sim' : '',
  ].filter(Boolean)

  return `<li class="${classes.join(' ')}">
    <div class="pay-main">
      <strong>${payment.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${payment.symbol}${paid}</strong>
      <span class="muted">${kind} · ${feel}</span>
    </div>
    <div class="pay-meta">
      <span>${
        payment.force
          ? plan?.toyId
            ? `target ${ctx.resolveToyFeedLabel(plan.toyId, payment.force.toyLabel)}`
            : 'spoof tip (no linked toy id)'
          : `from ${short(payment.from)}`
      }</span>
      <span>${link}</span>
      <span>${new Date(payment.timestamp).toLocaleTimeString()}</span>
    </div>
  </li>`
}

export function createPaymentsFeed(ctx: PaymentsFeedContext) {
  function persistPaymentLog() {
    savePaymentLog(ctx.getFeed())
  }

  let lastTipCount: number | null = null
  let lastTotalText = ''
  let firstTipTimeout: ReturnType<typeof setTimeout> | null = null

  function punchElement(el: HTMLElement) {
    el.classList.remove('earn-punch')
    // Force reflow so re-adding the class restarts the animation.
    void el.offsetWidth
    el.classList.add('earn-punch')
    setTimeout(() => el.classList.remove('earn-punch'), 400)
  }

  function walletTips() {
    return ctx.getFeed().filter((payment) => !isPoolSwap(payment))
  }

  function poolSwaps() {
    return ctx.getFeed().filter(isPoolSwap)
  }

  function paintWalletEarnings() {
    const totalEl = ctx.$('pay-earnings-total')
    const metaEl = ctx.$('pay-earnings-meta')
    const box = ctx.$('pay-earnings')
    if (!totalEl || !metaEl || !box) return

    const summary = summarizePaymentEarnings(walletTips())
    if (!summary.tipCount) {
      totalEl.textContent = '0'
      metaEl.textContent = summary.excludedCount
        ? `No tips yet · ${summary.excludedCount} dry/sim excluded`
        : 'No tips yet'
      box.classList.toggle('has-earnings', false)
      box.classList.remove('first-tip')
      if (firstTipTimeout) clearTimeout(firstTipTimeout)
      firstTipTimeout = null
      lastTipCount = 0
      lastTotalText = ''
      return
    }

    const nextTotalText = summary.tips
      .map((total) => `${formatPaymentAmount(total.amount)} ${total.symbol}`)
      .join(' · ')
    const metaBits = [
      `${summary.tipCount} tip${summary.tipCount === 1 ? '' : 's'}`,
    ]
    if (summary.excludedCount) metaBits.push(`${summary.excludedCount} dry/sim excluded`)
    metaEl.textContent = metaBits.join(' · ')

    const isFirstPaint = lastTipCount === null
    totalEl.textContent = nextTotalText

    if (!isFirstPaint && nextTotalText !== lastTotalText) {
      punchElement(totalEl)
    }

    if (!isFirstPaint && lastTipCount === 0 && summary.tipCount === 1) {
      box.classList.add('first-tip')
      if (firstTipTimeout) clearTimeout(firstTipTimeout)
      firstTipTimeout = setTimeout(() => {
        box.classList.remove('first-tip')
      }, 2000)
    }

    box.classList.toggle('has-earnings', true)
    lastTipCount = summary.tipCount
    lastTotalText = nextTotalText
  }

  function paintPoolEarnings() {
    const totalEl = ctx.$('pool-earnings-total')
    const metaEl = ctx.$('pool-earnings-meta')
    const box = ctx.$('pool-earnings')
    const pill = ctx.$('pool-feed-pill')
    if (!totalEl || !metaEl || !box) return

    const summary = summarizePaymentEarnings(poolSwaps())
    const count = summary.poolCount
    if (pill) {
      pill.textContent = count
        ? `${count} event${count === 1 ? '' : 's'}`
        : 'no events'
      pill.classList.toggle('on', count > 0)
    }
    if (!count) {
      totalEl.textContent = '0'
      metaEl.textContent = summary.excludedCount
        ? `No chain events yet · ${summary.excludedCount} dry/sim excluded`
        : 'No chain events yet'
      box.classList.toggle('has-earnings', false)
      return
    }

    totalEl.textContent = summary.pools
      .map((total) => `${formatPaymentAmount(total.amount)} ${total.symbol}`)
      .join(' · ')
    const metaBits = [
      `${count} event${count === 1 ? '' : 's'}`,
    ]
    if (summary.excludedCount) metaBits.push(`${summary.excludedCount} dry/sim excluded`)
    metaEl.textContent = metaBits.join(' · ')
    box.classList.toggle('has-earnings', true)
  }

  function paintFeed() {
    const feelState = { dirty: false }
    const tips = walletTips()
    const swaps = poolSwaps()

    const tipList = ctx.$('feed')
    const tipEmpty = ctx.$('feed-empty')
    tipEmpty.hidden = tips.length > 0
    tipList.innerHTML = tips
      .map((payment) => paymentRowHtml(ctx, payment, feelState))
      .join('')
    paintWalletEarnings()

    const poolList = ctx.$('pool-feed')
    const poolEmpty = ctx.$('pool-feed-empty')
    if (poolList && poolEmpty) {
      poolEmpty.hidden = swaps.length > 0
      poolList.innerHTML = swaps
        .map((payment) => paymentRowHtml(ctx, payment, feelState))
        .join('')
      paintPoolEarnings()
    }

    if (feelState.dirty) persistPaymentLog()
  }

  function addPayment(payment: PaymentLogItem) {
    const feed = ctx.getFeed()
    feed.unshift(payment)
    if (feed.length > MAX_PAYMENT_LOG) feed.length = MAX_PAYMENT_LOG
    paintFeed()
    persistPaymentLog()
  }

  function wire() {
    ctx.$('btn-clear').addEventListener('click', () => {
      const feed = ctx.getFeed()
      const tips = feed.filter((payment) => !isPoolSwap(payment))
      if (!tips.length || !confirm('Clear wallet tip history? Chain events stay in Chain events below.')) {
        return
      }
      const kept = feed.filter(isPoolSwap)
      feed.length = 0
      feed.push(...kept)
      if (!feed.length) clearPaymentLogStorage()
      else persistPaymentLog()
      paintFeed()
    })

    const clearPools = ctx.$('btn-clear-pools')
    if (clearPools) {
      clearPools.addEventListener('click', () => {
        const feed = ctx.getFeed()
        const swaps = feed.filter(isPoolSwap)
        if (
          !swaps.length ||
          !confirm('Clear chain event history? Wallet tips stay in Wallet tips above.')
        ) {
          return
        }
        const kept = feed.filter((payment) => !isPoolSwap(payment))
        feed.length = 0
        feed.push(...kept)
        if (!feed.length) clearPaymentLogStorage()
        else persistPaymentLog()
        paintFeed()
      })
    }

    ctx.$('btn-export-payments-json').addEventListener('click', () => {
      const feed = ctx.getFeed()
      if (!feed.length) {
        ctx.showError('No payments to export yet')
        return
      }
      exportPaymentsJson(feed)
      ctx.showError('')
    })
    ctx.$('btn-export-payments-csv').addEventListener('click', () => {
      const feed = ctx.getFeed()
      if (!feed.length) {
        ctx.showError('No payments to export yet')
        return
      }
      exportPaymentsCsv(feed)
      ctx.showError('')
    })
  }

  return { addPayment, persistPaymentLog, paintEarnings: paintWalletEarnings, paintFeed, wire }
}
