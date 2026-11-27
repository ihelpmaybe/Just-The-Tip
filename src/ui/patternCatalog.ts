/**
 * Browse built-in pattern catalog (factory stock + live overrides).
 */

import {
  CATALOG_PATTERNS_ALL,
  getPattern,
  patternNeeds,
  type PatternDef,
  type PatternId,
} from '../utils/patterns'
import {
  channelLabel,
  patternFamily,
  patternFitsToy,
  toyChannels,
  type CapabilitySource,
} from '../utils/patternFit'
import { patternRating, type PatternRatings } from '../utils/pricing'
import { buildPatternStarRow } from './patterns'
import { buildPatternSvg, vizMotorLanes, vizStepsForPattern } from './patternViz'

function durationSec(p: PatternDef): number {
  return p.timeSec > 0
    ? p.timeSec
    : ((p.intervalMs || 400) * Math.max(1, p.strengths?.length || 1)) / 1000
}

function toyMotorCount(toy?: CapabilitySource | null): number {
  if (!toy) return 1
  const reported = Math.max(1, Math.min(3, Number(toy.motors) || 1))
  if (toyChannels(toy).has('multi')) return Math.max(reported, 2)
  return reported
}

/** Live catalog entry (override if edited) or stock factory def. */
function liveCatalogEntries(): PatternDef[] {
  return CATALOG_PATTERNS_ALL.map((stock) => {
    const live = getPattern(stock.id)
    return live ? { ...live } : { ...stock, strengths: stock.strengths.slice() }
  })
}

export function paintPatternCatalog(
  body: HTMLElement,
  opts: {
    query: string
    /** When set, only patterns that fit this toy. */
    toy?: CapabilitySource | null
    prices: Record<string, number>
    ratings: PatternRatings
    /** Pattern ids currently off the tip menu. */
    disabled?: string[]
  },
  handlers: {
    onTest: (id: PatternId) => void
    onEdit: (id: PatternId) => void
    onDuplicate: (id: PatternId) => void
    onSelect: (id: PatternId) => void
    onRate: (id: PatternId, stars: number) => void
    /** Put a removed catalog pattern back on the tip menu. */
    onAddToMenu?: (id: PatternId) => void
  },
): { shown: number; total: number } {
  body.replaceChildren()
  const q = opts.query.trim().toLowerCase()
  let items = liveCatalogEntries()
  const total = items.length
  const toy = opts.toy || null
  const disabledSet = new Set(opts.disabled || [])

  if (toy) {
    items = items.filter((p) =>
      patternFitsToy(patternNeeds(p), toy, p.forProducts),
    )
  }
  if (q) {
    items = items.filter((p) => {
      const hay = [
        p.name,
        p.blurb,
        p.tag,
        p.id,
        patternFamily(patternNeeds(p)),
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }

  items.sort((a, b) => {
    const ta = (a.tag || 'other').localeCompare(b.tag || 'other')
    if (ta) return ta
    const priceA = opts.prices[a.id] ?? a.price
    const priceB = opts.prices[b.id] ?? b.price
    if (priceA !== priceB) return priceA - priceB
    return a.name.localeCompare(b.name)
  })

  if (!items.length) {
    const empty = document.createElement('p')
    empty.className = 'hint pattern-catalog-empty'
    empty.textContent = toy
      ? 'No patterns match that toy.'
      : 'No patterns match that filter.'
    body.append(empty)
    return { shown: 0, total }
  }

  const motors = toyMotorCount(toy)
  let lastTag = ''
  let grid: HTMLElement | null = null
  for (const p of items) {
    const tag = p.tag || 'other'
    if (tag !== lastTag) {
      lastTag = tag
      const head = document.createElement('h4')
      head.className = 'pattern-catalog-group'
      head.textContent = tag
      body.append(head)
      grid = document.createElement('div')
      grid.className = 'pattern-catalog-grid'
      body.append(grid)
    }

    const row = document.createElement('article')
    row.className = 'pattern-catalog-row'
    row.dataset.id = p.id
    const offMenu = disabledSet.has(p.id)
    row.classList.toggle('is-off-menu', offMenu)

    const main = document.createElement('div')
    main.className = 'pattern-catalog-row-main'

    const title = document.createElement('button')
    title.type = 'button'
    title.className = 'pattern-catalog-title'
    title.innerHTML = `<strong>${p.name}</strong>`
    title.title = 'Set as selected default pattern'
    title.addEventListener('click', () => handlers.onSelect(p.id))

    const chips = document.createElement('div')
    chips.className = 'pattern-need-chips'
    const needs = patternNeeds(p)
    if (needs.length) {
      for (const n of needs) {
        const chip = document.createElement('span')
        chip.className = `pattern-need chip-${n}`
        chip.textContent = channelLabel(n)
        chips.append(chip)
      }
    } else {
      const chip = document.createElement('span')
      chip.className = 'pattern-need chip-vibe'
      chip.textContent = 'vibe'
      chips.append(chip)
    }

    const meta = document.createElement('p')
    meta.className = 'pattern-catalog-meta'
    const tip = opts.prices[p.id] ?? p.price
    meta.textContent = `${Math.round(durationSec(p))}s · tip ${tip}`

    const blurb = document.createElement('p')
    blurb.className = 'pattern-catalog-blurb'
    blurb.textContent = p.blurb || ''

    const stars = buildPatternStarRow(
      p.name,
      patternRating(p.id, opts.ratings),
      (rating) => handlers.onRate(p.id, rating),
    )
    main.append(title, chips, stars, meta, blurb)

    const viz = document.createElement('div')
    viz.className = 'pattern-catalog-viz'
    const lanes = vizMotorLanes(p, motors)
    if (lanes.length > 1) {
      viz.classList.add('pattern-viz-multi')
      for (let i = 0; i < lanes.length; i++) {
        const lane = document.createElement('span')
        lane.className = 'pattern-viz-lane'
        const lab = document.createElement('span')
        lab.className = 'pattern-viz-lane-label'
        lab.textContent = `M${i + 1}`
        lane.append(
          lab,
          buildPatternSvg(lanes[i]!, {
            w: 120,
            h: 20,
            intervalMs: p.intervalMs,
          }),
        )
        viz.append(lane)
      }
    } else {
      viz.append(
        buildPatternSvg(vizStepsForPattern(p), {
          w: 120,
          h: 32,
          intervalMs: p.intervalMs,
        }),
      )
    }

    const ops = document.createElement('div')
    ops.className = 'pattern-catalog-ops'

    const testBtn = document.createElement('button')
    testBtn.type = 'button'
    testBtn.className = 'btn primary tiny'
    testBtn.textContent = 'Test'
    testBtn.addEventListener('click', () => handlers.onTest(p.id))

    const editBtn = document.createElement('button')
    editBtn.type = 'button'
    editBtn.className = 'btn ghost tiny'
    editBtn.textContent = 'Edit'
    editBtn.addEventListener('click', () => handlers.onEdit(p.id))

    const dupeBtn = document.createElement('button')
    dupeBtn.type = 'button'
    dupeBtn.className = 'btn ghost tiny'
    dupeBtn.textContent = 'Duplicate'
    dupeBtn.title = 'Create a custom pattern from this template'
    dupeBtn.addEventListener('click', () => handlers.onDuplicate(p.id))

    ops.append(testBtn, editBtn, dupeBtn)
    if (offMenu && handlers.onAddToMenu) {
      const addBtn = document.createElement('button')
      addBtn.type = 'button'
      addBtn.className = 'btn primary tiny'
      addBtn.textContent = 'Add to menu'
      addBtn.title = `Put ${p.name} back on the tip menu`
      addBtn.addEventListener('click', () => handlers.onAddToMenu!(p.id))
      ops.append(addBtn)
    } else if (!offMenu) {
      const onBadge = document.createElement('span')
      onBadge.className = 'pattern-catalog-on-menu'
      onBadge.textContent = 'On menu'
      ops.append(onBadge)
    }
    row.append(main, viz, ops)
    ;(grid || body).append(row)
  }

  return { shown: items.length, total }
}
