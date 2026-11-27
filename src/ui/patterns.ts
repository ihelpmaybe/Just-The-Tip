import {
  isCatalogPattern,
  isCustomPattern,
  PATTERNS,
  patternNeeds,
  type PatternDef,
  type PatternId,
} from '../utils/patterns'
import {
  channelLabel,
  patternFitsSelectedToys,
  toyChannelLabels,
  toyChannels,
  type CapabilitySource,
} from '../utils/patternFit'
import { shortToyLabel } from '../utils/toySilhouettes'
import {
  MENU_SORTS,
  patternRating,
  patternToyPrice,
  patternsForToyMenu,
  type MenuSort,
  type PatternPrices,
  type PatternRatings,
  type ToyPatternPrices,
} from '../utils/pricing'
import { tipAmountUsdTitle, multiCoinTipTitle, formatUsdApprox } from '../utils/tipUsd'
import { buildPatternSvg, vizMotorLanes } from './patternViz'
import type { DeviceToy } from '../device/controller'

function toyMotorCount(toy?: CapabilitySource): number {
  if (!toy) return 1
  const reported = Math.max(1, Math.min(3, Number(toy.motors) || 1))
  if (toyChannels(toy).has('multi')) return Math.max(reported, 2)
  return reported
}
export function buildPatternStarRow(
  name: string,
  rating: number,
  onRate: (stars: number) => void,
): HTMLElement {
  const row = document.createElement('div')
  row.className = 'pattern-stars'
  row.setAttribute('role', 'group')
  row.setAttribute('aria-label', `Rating for ${name}`)

  const picker = document.createElement('div')
  picker.className = 'pattern-stars-picker'

  for (let n = 1; n <= 5; n++) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'pattern-star'
    btn.classList.toggle('on', n <= rating)
    btn.setAttribute('aria-label', n === 1 ? '1 star' : `${n} stars`)
    btn.setAttribute('aria-pressed', n <= rating ? 'true' : 'false')
    btn.dataset.n = String(n)
    btn.textContent = '★'
    btn.title =
      n === rating ? `Clear rating (now ${rating})` : `Rate ${n} of 5`
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      onRate(n === rating ? 0 : n)
    })
    picker.append(btn)
  }

  const summary = document.createElement('button')
  summary.type = 'button'
  summary.className = 'pattern-stars-summary'
  summary.textContent = `${rating}/5`
  summary.title = rating
    ? `${rating} of 5 — hover to change`
    : 'Not rated — hover to rate'
  summary.setAttribute(
    'aria-label',
    rating ? `${name} rated ${rating} of 5` : `${name} not rated`,
  )
  summary.addEventListener('click', (e) => {
    e.stopPropagation()
    const first = picker.querySelector<HTMLButtonElement>('.pattern-star')
    first?.focus()
  })

  row.append(summary, picker)
  return row
}

function durationSec(p: PatternDef): number {
  return p.timeSec > 0
    ? p.timeSec
    : ((p.intervalMs || 400) * Math.max(1, p.strengths?.length || 1)) / 1000
}

function sortPatterns(
  list: PatternDef[],
  sort: MenuSort,
  prices: PatternPrices,
  ratings: PatternRatings,
  toyPrices?: ToyPatternPrices,
  toyId?: string,
): PatternDef[] {
  const out = [...list]
  const byName = (a: PatternDef, b: PatternDef) => a.name.localeCompare(b.name)
  const priceOf = (id: string) =>
    patternToyPrice(id, prices, toyPrices, toyId)
  switch (sort) {
    case 'duration-desc':
      return out.sort((a, b) => durationSec(b) - durationSec(a) || byName(a, b))
    case 'duration-asc':
      return out.sort((a, b) => durationSec(a) - durationSec(b) || byName(a, b))
    case 'price-desc':
      return out.sort(
        (a, b) => priceOf(b.id) - priceOf(a.id) || byName(a, b),
      )
    case 'price-asc':
      return out.sort(
        (a, b) => priceOf(a.id) - priceOf(b.id) || byName(a, b),
      )
    case 'rating-desc':
      return out.sort(
        (a, b) =>
          patternRating(b.id, ratings) - patternRating(a.id, ratings) ||
          byName(a, b),
      )
    case 'rating-asc':
      return out.sort(
        (a, b) =>
          patternRating(a.id, ratings) - patternRating(b.id, ratings) ||
          byName(a, b),
      )
    case 'catalog':
    default:
      return out
  }
}

export function fillMenuSortSelect(
  sel: HTMLSelectElement,
  current: MenuSort,
) {
  sel.replaceChildren()
  for (const s of MENU_SORTS) {
    const opt = document.createElement('option')
    opt.value = s.id
    opt.textContent = s.label
    if (s.id === current) opt.selected = true
    sel.append(opt)
  }
}

/** Tip-menu toy filter: search to add toys (tabs live on the pattern list). */
export function paintMenuToyTicks(
  root: HTMLElement,
  opts: {
    toys: DeviceToy[]
    selectedIds: string[]
  },
  onChange: (nextIds: string[]) => void,
) {
  root.classList.add('menu-toy-picker')
  root.classList.remove('menu-toy-list', 'menu-toy-tiles')

  let chips = root.querySelector<HTMLElement>('.menu-toy-chips')
  let search = root.querySelector<HTMLInputElement>('#menu-toy-search')
  let results = root.querySelector<HTMLElement>('.menu-toy-results')

  if (!chips || !search || !results) {
    root.replaceChildren()
    chips = document.createElement('div')
    chips.className = 'menu-toy-chips'
    chips.id = 'menu-toy-chips'

    const field = document.createElement('label')
    field.className = 'field menu-toy-search-field'
    const cap = document.createElement('span')
    cap.className = 'visually-hidden'
    cap.textContent = 'Search toys'
    search = document.createElement('input')
    search.id = 'menu-toy-search'
    search.type = 'search'
    search.placeholder = 'Search toys… (e.g. Lush, Nora)'
    search.autocomplete = 'off'
    search.spellcheck = false
    field.append(cap, search)

    results = document.createElement('div')
    results.className = 'menu-toy-results'
    results.id = 'menu-toy-results'
    results.setAttribute('role', 'listbox')
    results.setAttribute('aria-label', 'Matching toys')

    root.append(chips, field, results)
  }

  // Selected toys render as pattern tabs below — keep this slot empty.
  chips.replaceChildren()
  chips.hidden = true
  chips.removeAttribute('role')
  chips.removeAttribute('aria-label')

  const byId = new Map(
    opts.toys.filter((t) => t.id).map((t) => [t.id!, t] as const),
  )
  const selected = opts.selectedIds.filter((id) => byId.has(id))
  const selectedSet = new Set(selected)

  const queryNorm = () =>
    search!.value
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()

  const paintResults = () => {
    const q = queryNorm()
    results!.replaceChildren()
    if (!q) {
      results!.hidden = true
      return
    }

    const matches = opts.toys
      .map((t) => {
        if (!t.id || selectedSet.has(t.id)) return { t, score: 0 }
        const label = shortToyLabel(t.name || '', t.toyType, t.id).toLowerCase()
        const type = String(t.toyType || '')
          .toLowerCase()
          .replace(/[_-]+/g, ' ')
        const name = String(t.name || '')
          .toLowerCase()
          .replace(/[_-]+/g, ' ')
        let score = 0
        // Prefer real spelling: start of name/type first. Mid-string
        // "g"→Ridge/Edge only after a few letters.
        if (label === q || name === q || type === q) score = 100
        else if (label.startsWith(q) || name.startsWith(q)) score = 90
        else if (type.startsWith(q)) score = 80
        else if (
          label.split(/\s+/).some((w) => w.startsWith(q)) ||
          name.split(/\s+/).some((w) => w.startsWith(q)) ||
          type.split(/\s+/).some((w) => w.startsWith(q))
        ) {
          score = 70
        } else if (
          q.length >= 3 &&
          (label.includes(q) || name.includes(q) || type.includes(q))
        ) {
          score = 40
        }
        return { t, score }
      })
      .filter((row) => row.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          shortToyLabel(a.t.name || '', a.t.toyType, a.t.id).localeCompare(
            shortToyLabel(b.t.name || '', b.t.toyType, b.t.id),
          ),
      )
      .map((row) => row.t)

    if (!matches.length) {
      results!.hidden = false
      const empty = document.createElement('p')
      empty.className = 'menu-toy-results-empty'
      empty.textContent = 'No matching toys'
      results!.append(empty)
      return
    }

    results!.hidden = false
    const limit = 6
    for (const t of matches.slice(0, limit)) {
      const label = shortToyLabel(t.name || '', t.toyType, t.id)
      const family = toyChannelLabels(t)
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'menu-toy-result'
      btn.setAttribute('role', 'option')
      btn.setAttribute('aria-label', `Add ${label}`)
      const name = document.createElement('span')
      name.className = 'menu-toy-result-name'
      name.textContent = label
      const meta = document.createElement('span')
      meta.className = 'menu-toy-result-caps'
      meta.textContent = family
      btn.append(name, meta)
      btn.addEventListener('click', () => {
        if (!t.id || selectedSet.has(t.id)) return
        const next = [...selected, t.id]
        search!.value = ''
        onChange(next)
      })
      results!.append(btn)
    }
    if (matches.length > limit) {
      const more = document.createElement('p')
      more.className = 'menu-toy-results-more'
      more.textContent = `${matches.length - limit} more — refine search`
      results!.append(more)
    }
  }

  search.oninput = () => paintResults()
  search.onkeydown = (e) => {
    if (e.key === 'Escape') {
      search!.value = ''
      paintResults()
      search!.blur()
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const first = results!.querySelector<HTMLButtonElement>('.menu-toy-result')
      first?.click()
    }
  }

  paintResults()

  if (!opts.toys.length) {
    results.hidden = false
    results.replaceChildren()
    const empty = document.createElement('p')
    empty.className = 'menu-toy-results-empty'
    empty.textContent = 'No toys available.'
    results.append(empty)
  }
}

export function paintPatternList(
  box: HTMLElement,
  opts: {
    selected: PatternId
    prices: PatternPrices
    /** Per-toy tip overrides */
    toyPrices: ToyPatternPrices
    ratings: PatternRatings
    disabled: string[]
    featured: string[]
    sort: MenuSort
    modified: Set<string>
    /**
     * null → full catalog
     * [] → no toys ticked (empty)
     * toys → only patterns each can play on ≥1 listed toy
     */
    fitToys: CapabilitySource[] | null
    /** When multiple toys are selected, which toy tab is active */
    activeToyId?: string
    /** Active tip coin ticker for hover titles */
    tipSymbol?: string
    /** USD per 1 tip unit (null = unknown) */
    usdPerUnit?: number | null
    /** Static card placed as the first tile of the pattern grid */
    leadCard?: HTMLElement | null
    /** Coin assignment badges + paint-brush hue for tabs/cards */
    assign?: {
      /** Selected paint-coin keys ('' = native); empty = not painting */
      paintKeys: Set<string>
      paintHue: number | null
      /** Pattern id → coin badges currently assigned */
      badges: Record<
        string,
        Array<{
          key: string
          label: string
          hue: number
          skin: string
          /** False = selected on the menu but off for this pattern */
          on?: boolean
          /** USD unlock target for this coin×pattern */
          usdTarget?: number
          /** Token amount at current quote (null = waiting) */
          amount?: number | null
        }>
      >
      /** Toy id → paint skin when that toy has coin assignments */
      toyPaint?: Record<string, { key: string; hue: number; skin: string }>
    }
  },
  handlers: {
    onSelect: (id: PatternId) => void
    onRate: (id: PatternId, stars: number) => void
    onPrice: (id: PatternId, price: number, toyId?: string) => void
    onToggleDisabled: (id: PatternId, disabled: boolean) => void
    onToggleFeatured: (id: PatternId, featured: boolean) => void
    /** Prefer this linked toy when testing from a per-toy column */
    onTest: (id: PatternId, toyId?: string) => void
    onEdit: (id: PatternId) => void
    onReset: (id: PatternId) => void
    onDelete: (id: PatternId) => void
    /** Switch the active toy tab */
    onSelectToyTab?: (toyId: string) => void
    /** Remove a toy from the tip-menu filter */
    onRemoveToyTab?: (toyId: string) => void
    /** Paint selected coin onto this pattern (active toy) */
    onPaintPattern?: (patternId: PatternId) => void
    /** Toggle this coin on/off for the pattern (badge stays visible) */
    onCycleCoinBadge?: (patternId: PatternId, tokenKey: string) => void
    /** Backup this toy’s tip prices + on/off + featured as JSON */
    onBackupToy?: (toyId: string) => void
    /** Import a toy menu pack onto this linked toy */
    onImportToy?: (toyId: string) => void
  },
): { shown: number; total: number } {
  box.replaceChildren()
  box.classList.remove('is-by-toy')
  const disabledSet = new Set(opts.disabled)
  const featuredSet = new Set(opts.featured)

  let items = PATTERNS.slice()
  const total = items.length
  items = items.filter(
    (p) =>
      !disabledSet.has(p.id) &&
      patternFitsSelectedToys(patternNeeds(p), opts.fitToys, p.forProducts),
  )
  const shown = items.length

  const renderCard = (
    p: PatternDef,
    parent: HTMLElement,
    boundToy?: CapabilitySource,
  ) => {
    const tag = p.tag || 'other'
    const off = false
    const feat = featuredSet.has(p.id)
    const card = document.createElement('article')
    card.className = `pattern-card tag-${tag.replace(/[^a-z0-9-]/gi, '')}`
    // Paint mode owns the card click; the "selected" ring would only confuse.
    const paintMode = Boolean(handlers.onPaintPattern)
    card.classList.toggle('selected', !paintMode && p.id === opts.selected)
    card.classList.toggle('is-disabled', off)
    card.classList.toggle('is-featured', feat)
    card.dataset.id = p.id

    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'
    removeBtn.className = 'pattern-card-remove'
    removeBtn.textContent = '×'
    if (isCustomPattern(p.id)) {
      removeBtn.title = `Delete ${p.name}`
      removeBtn.setAttribute('aria-label', `Delete ${p.name}`)
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        handlers.onDelete(p.id)
      })
    } else {
      removeBtn.title = `Remove ${p.name} from tip menu`
      removeBtn.setAttribute('aria-label', `Remove ${p.name} from tip menu`)
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        // Off the tip menu — re-add later from Pattern catalog.
        handlers.onToggleDisabled(p.id, true)
      })
    }

    const main = document.createElement('div')
    main.className = 'pattern-card-main'

    const titleRow = document.createElement('div')
    titleRow.className = 'pattern-card-title-row'

    const pick = document.createElement('button')
    pick.type = 'button'
    pick.className = 'pattern-card-pick'
    pick.innerHTML = `<strong>${p.name}</strong>`
    pick.addEventListener('click', () => {
      if (paintMode) {
        handlers.onPaintPattern!(p.id)
        return
      }
      handlers.onSelect(p.id)
    })
    titleRow.append(pick)
    const ops = document.createElement('div')
    ops.className = 'pattern-card-ops'

    const editBtn = document.createElement('button')
    editBtn.type = 'button'
    editBtn.className = 'btn ghost tiny pattern-edit-btn'
    editBtn.textContent = 'Edit'
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      handlers.onEdit(p.id)
    })

    ops.append(editBtn)

    const featLab = document.createElement('label')
    featLab.className = 'pattern-featured'
    featLab.title = 'Highlight on tip menu export (brighter card)'
    const featIn = document.createElement('input')
    featIn.type = 'checkbox'
    featIn.checked = feat
    featIn.setAttribute('aria-label', `Feature ${p.name} on export`)
    featIn.addEventListener('click', (e) => e.stopPropagation())
    featIn.addEventListener('change', () => {
      handlers.onToggleFeatured(p.id, featIn.checked)
    })
    const featTxt = document.createElement('span')
    featTxt.textContent = 'Feat'
    featLab.append(featIn, featTxt)

    const stars = buildPatternStarRow(
      p.name,
      patternRating(p.id, opts.ratings),
      (n) => handlers.onRate(p.id, n),
    )
    const corner = document.createElement('div')
    corner.className = 'pattern-card-corner'
    corner.append(stars, ops)
    titleRow.append(corner)

    const needs = patternNeeds(p)
    const needChips = document.createElement('div')
    needChips.className = 'pattern-need-chips'
    if (needs.length) {
      for (const n of needs) {
        const chip = document.createElement('span')
        chip.className = `pattern-need chip-${n}`
        chip.textContent = channelLabel(n)
        needChips.append(chip)
      }
    } else {
      const chip = document.createElement('span')
      chip.className = 'pattern-need chip-vibe'
      chip.textContent = 'vibe'
      needChips.append(chip)
    }
    const dur = document.createElement('span')
    dur.className = 'pattern-duration'
    dur.textContent = `${p.timeSec}s`
    dur.title = `${p.timeSec} second pattern`
    needChips.append(dur)
    const coinBadges = opts.assign?.badges[p.id] || []
    const paintKeys = opts.assign?.paintKeys
    const onBadges = coinBadges.filter((b) => b.on !== false)
    const painted =
      paintKeys && paintKeys.size
        ? onBadges.find((b) => paintKeys.has(b.key))
        : onBadges[0]
    if (painted) {
      card.classList.add('is-coin-painted')
      card.classList.add(`coin-skin-${painted.skin || 'hue'}`)
      card.style.setProperty('--coin-hue', String(painted.hue))
    }
    if (paintMode) {
      pick.setAttribute('aria-pressed', painted ? 'true' : 'false')
      pick.title = painted
        ? `Click to remove coin colors from ${p.name}`
        : `Click to paint the selected coins onto ${p.name}`
    } else {
      pick.setAttribute('aria-pressed', p.id === opts.selected ? 'true' : 'false')
    }
    const badgeRow = document.createElement('div')
    badgeRow.className = 'pattern-coin-badges'
    for (const badge of coinBadges) {
      const pill = document.createElement('button')
      pill.type = 'button'
      const on = badge.on !== false
      pill.className = `pattern-coin-badge coin-skin-${badge.skin || 'hue'}${
        on ? '' : ' is-off'
      }`
      pill.style.setProperty('--coin-hue', String(badge.hue))
      pill.textContent = badge.label
      pill.setAttribute('aria-pressed', on ? 'true' : 'false')
      const amt = badge.amount
      const usdBit =
        badge.usdTarget != null && Number.isFinite(badge.usdTarget)
          ? ` ≈ $${formatUsdApprox(badge.usdTarget)}`
          : ''
      const amtBit =
        amt != null && Number.isFinite(amt)
          ? `${amt.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${badge.label}${usdBit}`
          : `${badge.label}${usdBit || ' · waiting for quote'}`
      pill.title = on
        ? `${amtBit}\nClick to turn ${badge.label} off`
        : `${amtBit}\nOff — click to turn ${badge.label} on`
      pill.addEventListener('click', (e) => {
        e.stopPropagation()
        if (handlers.onCycleCoinBadge) {
          handlers.onCycleCoinBadge(p.id, badge.key)
        }
      })
      badgeRow.append(pill)
    }
    badgeRow.append(featLab)
    main.append(titleRow, needChips, badgeRow)

    const tip = patternToyPrice(
      p.id,
      opts.prices,
      opts.toyPrices,
      boundToy?.id,
    )

    const toyName = boundToy
      ? shortToyLabel(
          boundToy.name || '',
          boundToy.toyType,
          boundToy.id,
        )
      : ''
    const vizWrap = document.createElement('button')
    vizWrap.type = 'button'
    vizWrap.className = 'pattern-viz'
    vizWrap.title = toyName
      ? `Test ${p.name} on ${toyName}`
      : `Test ${p.name} on a matching toy`
    vizWrap.setAttribute(
      'aria-label',
      toyName ? `Test ${p.name} on ${toyName}` : `Test ${p.name}`,
    )
    const lanes = vizMotorLanes(p, toyMotorCount(boundToy))
    if (lanes.length > 1) {
      vizWrap.classList.add('pattern-viz-multi')
      for (let i = 0; i < lanes.length; i++) {
        const lane = document.createElement('span')
        lane.className = 'pattern-viz-lane'
        const lab = document.createElement('span')
        lab.className = 'pattern-viz-lane-label'
        lab.textContent = `M${i + 1}`
        lane.append(
          lab,
          buildPatternSvg(lanes[i]!, {
            w: 160,
            h: 28,
            intervalMs: p.intervalMs || 400,
            animate: true,
          }),
        )
        vizWrap.append(lane)
      }
    } else {
      vizWrap.appendChild(
        buildPatternSvg(lanes[0]!, {
          w: 160,
          h: 32,
          intervalMs: p.intervalMs || 400,
          animate: true,
        }),
      )
    }
    vizWrap.addEventListener('click', (e) => {
      e.stopPropagation()
      handlers.onTest(p.id, boundToy?.id)
    })

    const priceLab = document.createElement('label')
    priceLab.className = 'pattern-price-field'
    const tipSymbol = opts.tipSymbol || 'PLS'
    const priceIn = document.createElement('input')
    priceIn.type = 'number'
    priceIn.min = '0'
    priceIn.step = 'any'
    priceIn.inputMode = 'decimal'
    priceIn.value = String(tip)
    priceIn.setAttribute(
      'aria-label',
      boundToy?.id
        ? `Tip price for ${p.name} on this toy (${tipSymbol})`
        : `Tip price for ${p.name} (${tipSymbol})`,
    )
    const syncPriceTitle = () => {
      const n = Number(priceIn.value)
      if (coinBadges.length) {
        priceIn.title = multiCoinTipTitle(
          coinBadges.map((b) => ({
            label: b.label,
            amount: b.amount,
            usdTarget: b.usdTarget,
          })),
          {
            toyNote: boundToy?.id
              ? 'Price field edits this toy’s tip ladder'
              : undefined,
          },
        )
        return
      }
      const usdTitle = tipAmountUsdTitle(
        Number.isFinite(n) ? n : tip,
        tipSymbol,
        opts.usdPerUnit,
      )
      priceIn.title = boundToy?.id
        ? `${usdTitle} · price for this linked toy only`
        : usdTitle
    }
    syncPriceTitle()
    priceIn.addEventListener('click', (e) => e.stopPropagation())
    priceIn.addEventListener('input', syncPriceTitle)
    priceIn.addEventListener('change', () => {
      const n = Number(priceIn.value)
      if (!Number.isFinite(n) || n < 0) {
        priceIn.value = String(
          patternToyPrice(p.id, opts.prices, opts.toyPrices, boundToy?.id),
        )
        syncPriceTitle()
        return
      }
      handlers.onPrice(p.id, n, boundToy?.id)
      syncPriceTitle()
    })
    priceLab.append(priceIn)

    const extras: HTMLButtonElement[] = []
    if (isCatalogPattern(p.id) && opts.modified.has(p.id)) {
      const resetBtn = document.createElement('button')
      resetBtn.type = 'button'
      resetBtn.className = 'btn ghost tiny'
      resetBtn.textContent = 'Reset default'
      resetBtn.title = 'Restore built-in feel and tip price'
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        handlers.onReset(p.id)
      })
      extras.push(resetBtn)
    }

    const side = document.createElement('div')
    side.className = 'pattern-card-side'
    side.append(priceLab)
    if (extras.length) {
      const actions = document.createElement('div')
      actions.className = 'pattern-card-actions'
      actions.append(...extras)
      side.append(actions)
    }

    card.append(removeBtn, main, side, vizWrap)
    parent.append(card)
  }

  const fillSorted = (
    list: PatternDef[],
    parent: HTMLElement,
    boundToy?: CapabilitySource,
  ) => {
    if (opts.sort === 'catalog') {
      const tags = [...new Set(list.map((p) => p.tag || 'other'))]
      for (const tag of tags) {
        const group = list.filter((p) => (p.tag || 'other') === tag)
        if (!group.length) continue
        const head = document.createElement('p')
        head.className = 'pattern-tag'
        head.textContent = tag
        parent.append(head)
        for (const p of group) renderCard(p, parent, boundToy)
      }
    } else {
      const sorted = sortPatterns(
        list,
        opts.sort,
        opts.prices,
        opts.ratings,
        opts.toyPrices,
        boundToy?.id,
      )
      for (const p of sorted) renderCard(p, parent, boundToy)
    }
  }

  const toys = opts.fitToys
  /** Grid that holds the pattern tiles (per-toy stack or the flat catalog). */
  let cardsHost: HTMLElement = box
  if (toys && toys.length > 0) {
    // One toy at a time — imported/selected toys are the pattern tabs
    box.classList.add('is-by-toy')

    const withIds = toys.filter((t) => Boolean(t.id))
    const tabToys = withIds.length ? withIds : toys
    const active =
      tabToys.find((t) => t.id && t.id === opts.activeToyId) || tabToys[0]!

    const tabs = document.createElement('div')
    tabs.className = 'pattern-toy-tabs'
    tabs.setAttribute('role', 'tablist')
    tabs.setAttribute('aria-label', 'Selected toys')
    for (const tabToy of tabToys) {
      const id = tabToy.id || ''
      const label = shortToyLabel(tabToy.name || '', tabToy.toyType, tabToy.id)
      const selected = Boolean(id && id === active.id)
      const wrap = document.createElement('div')
      wrap.className = 'pattern-toy-tab'
      wrap.classList.toggle('is-active', selected)
      const toySkin = id ? opts.assign?.toyPaint?.[id] : undefined
      if (toySkin) {
        wrap.classList.add('is-coin-painted', `coin-skin-${toySkin.skin}`)
        wrap.style.setProperty('--coin-hue', String(toySkin.hue))
      }

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'pattern-toy-tab-select'
      btn.setAttribute('role', 'tab')
      btn.setAttribute('aria-selected', selected ? 'true' : 'false')
      btn.textContent = label
      btn.title = toySkin
        ? `${toyChannelLabels(tabToy)} · painted`
        : toyChannelLabels(tabToy)
      if (id && handlers.onSelectToyTab) {
        btn.addEventListener('click', () => handlers.onSelectToyTab!(id))
      }
      wrap.append(btn)

      if (id && handlers.onRemoveToyTab) {
        const x = document.createElement('button')
        x.type = 'button'
        x.className = 'pattern-toy-tab-x'
        x.title = `Remove ${label}`
        x.setAttribute('aria-label', `Remove ${label}`)
        x.textContent = '×'
        x.addEventListener('click', (e) => {
          e.stopPropagation()
          handlers.onRemoveToyTab!(id)
        })
        wrap.append(x)
      }
      tabs.append(wrap)
    }
    box.append(tabs)

    const toy = active
    const forToy = patternsForToyMenu(toy, {
      disabled: opts.disabled,
      featured: opts.featured,
      includeDisabled: false,
    })
    const col = document.createElement('section')
    col.className = 'pattern-toy-col'
    const head = document.createElement('header')
    head.className = 'pattern-toy-col-head'
    const headRow = document.createElement('div')
    headRow.className = 'pattern-toy-col-title'
    const meta = document.createElement('p')
    meta.className = 'pattern-toy-col-meta'
    meta.textContent = `${toyChannelLabels(toy)} · ${forToy.length} pattern${
      forToy.length === 1 ? '' : 's'
    }`
    meta.title = toyChannelLabels(toy)
    headRow.append(meta)

    if (toy.id && (handlers.onBackupToy || handlers.onImportToy)) {
      const packOps = document.createElement('div')
      packOps.className = 'pattern-toy-col-ops'
      if (handlers.onBackupToy) {
        const bak = document.createElement('button')
        bak.type = 'button'
        bak.className = 'btn ghost tiny pattern-toy-pack-btn'
        bak.textContent = 'Backup'
        bak.title =
          'Download this toy’s tip prices, On/Off, and Featured as JSON'
        bak.addEventListener('click', (e) => {
          e.stopPropagation()
          handlers.onBackupToy!(toy.id!)
        })
        packOps.append(bak)
      }
      if (handlers.onImportToy) {
        const imp = document.createElement('button')
        imp.type = 'button'
        imp.className = 'btn ghost tiny pattern-toy-pack-btn'
        imp.textContent = 'Import'
        imp.title =
          'Import a toy price/menu pack onto this device (prices map to this toy)'
        imp.addEventListener('click', (e) => {
          e.stopPropagation()
          handlers.onImportToy!(toy.id!)
        })
        packOps.append(imp)
      }
      head.append(headRow, packOps)
    } else {
      head.append(headRow)
    }
    const stack = document.createElement('div')
    stack.className = 'pattern-toy-col-cards'
    if (forToy.length) {
      fillSorted(forToy, stack, toy)
    } else {
      const empty = document.createElement('p')
      empty.className = 'hint pattern-toy-col-empty'
      empty.textContent = 'No patterns for this toy family.'
      stack.append(empty)
    }
    col.append(head, stack)
    box.append(col)
    cardsHost = stack
  } else if (items.length) {
    // Flat catalog (no toy filter)
    fillSorted(items, box)
  }

  if (!box.children.length) {
    const empty = document.createElement('p')
    empty.className = 'hint'
    if (opts.fitToys === null) {
      empty.textContent = 'No patterns.'
    } else if (!opts.fitToys.length) {
      empty.textContent = 'Search a toy above to see patterns for that family.'
    } else {
      empty.textContent =
        'No patterns for that family. Vibrators show vibe patterns; thrusters show thrust only. Pick a matching toy or Create pattern.'
    }
    box.append(empty)
  }

  if (opts.leadCard) {
    // Sit in the first row of tiles, after any tag heading, like a pattern.
    const firstCard = cardsHost.querySelector('.pattern-card')
    if (firstCard) cardsHost.insertBefore(opts.leadCard, firstCard)
    else cardsHost.prepend(opts.leadCard)
  }

  return { shown, total }
}
