import type { DeviceToy } from '../device/controller'
import { TOY_PRODUCT_PROFILES } from '../utils/toyIdentity'

export type ToyFeatureChannel = {
  id: string
  label: string
  kind: 'motor' | 'thrust' | 'rotate' | 'air' | 'pump' | 'all' | 'other'
}

function appendToyMeta(
  dl: HTMLDListElement,
  label: string,
  value: string | null | undefined,
) {
  if (value == null || value === '') return
  const dt = document.createElement('dt')
  dt.textContent = label
  const dd = document.createElement('dd')
  dd.textContent = value
  dl.append(dt, dd)
}

/** Detect motors + secondary channels for Test buttons. */
export function listToyFeatures(toy: DeviceToy): ToyFeatureChannel[] {
  const out: ToyFeatureChannel[] = []
  let motors = Math.max(1, Math.min(3, Number(toy.motors) || 1))
  const blob = [
    toy.toyType,
    toy.name,
    ...(toy.functions || []),
  ]
    .join(' ')
    .toLowerCase()

  if (/gemini|edge|dolce|lapis|magnet|clamp|twin|dual/.test(blob)) {
    motors = Math.max(motors, 2)
  }
  if (/vibrate3|v3:/.test(blob)) motors = Math.max(motors, 3)

  // Nora is 1 vibe + head rotate (not dual vibe motors).
  const hasRotate =
    Boolean(toy.secondary?.rotate) ||
    /\brotate\b|\bnora\b/.test(blob)
  const hasThrust =
    Boolean(toy.secondary?.thrust) ||
    /\bthrust|\bsolace\b/.test(blob)
  const hasAir =
    Boolean(toy.secondary?.air) ||
    Boolean(toy.secondary?.pump) ||
    /\bair\b|\bmax\b|\bpump\b|\bsuction\b/.test(blob)
  const hasPump =
    Boolean(toy.secondary?.pump) || /\bpump\b|\bsuction\b/.test(blob)
  const hasSecondary = hasRotate || hasThrust || hasAir || hasPump

  if (motors <= 1) {
    out.push({ id: 'vibrate', label: 'Vibe', kind: 'motor' })
  } else {
    for (let m = 1; m <= motors; m++) {
      out.push({
        id: `vibrate${m}`,
        label: `M${m}`,
        kind: 'motor',
      })
    }
    // All vibe motors only (Gemini M1+M2)
    out.push({ id: 'vibrate', label: 'Both', kind: 'all' })
  }

  if (hasRotate) out.push({ id: 'rotate', label: 'Rotate', kind: 'rotate' })
  if (hasThrust) out.push({ id: 'thrust', label: 'Thrust', kind: 'thrust' })
  if (hasAir && !hasPump) out.push({ id: 'air', label: 'Air', kind: 'air' })
  if (hasPump) out.push({ id: 'pump', label: 'Pump', kind: 'pump' })

  // Single-motor multi-feature (Nora vibe+rotate, Max vibe+air…): Both = every channel
  if (motors <= 1 && hasSecondary) {
    out.push({ id: 'both', label: 'Both', kind: 'all' })
  }
  // Dual-motor + secondary: all motors already “Both”; All = vibe + thrusters/etc.
  if (motors > 1 && hasSecondary) {
    out.push({ id: 'all', label: 'All', kind: 'all' })
  }

  // Extra function names from Connect not already covered
  const known = new Set(out.map((x) => x.id))
  for (const f of toy.functions || []) {
    const low = String(f).toLowerCase().replace(/\s+/g, '')
    if (!low || known.has(low)) continue
    if (/^vibrate\d*$/.test(low) || low === 'all' || low === 'both') continue
    if (low === 'rotate' && hasRotate) continue
    if ((low === 'thrusting' || low === 'thrust') && hasThrust) continue
    if ((low === 'air' || low === 'absoluteair') && (hasAir || hasPump)) continue
    if (low === 'pump' && hasPump) continue
    if (low === 'stop') continue
    out.push({
      id: low === 'thrusting' ? 'thrust' : low,
      label: f.length > 10 ? f.slice(0, 9) + '…' : f,
      kind: 'other',
    })
    known.add(low)
  }

  return out
}

/**
 * Short MAC / id tail for internal twin disambiguation (not shown on Linked toys).
 */
export function toyDiscriminator(toy: DeviceToy): string {
  const mac = toy.extra?.mac != null ? String(toy.extra.mac).trim() : ''
  if (mac) {
    const tail = mac.replace(/[^0-9a-fA-F]/g, '').slice(-4).toUpperCase()
    if (tail) return tail
  }
  // Prefer last-4 of a colon MAC embedded in the display name (Windows chooser).
  const fromName = String(toy.name || '').match(
    /\(([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5})\)/,
  )
  if (fromName) {
    const tail = fromName[1]!.replace(/[^0-9a-fA-F]/g, '').slice(-4).toUpperCase()
    if (tail) return tail
  }
  const id = String(toy.id || '').trim()
  if (!id) return ''
  // Base64 Chrome ids are opaque — show last 4 chars, not the whole blob.
  return id.replace(/[^0-9a-zA-Z]/g, '').slice(-4).toUpperCase()
}

export function paintToyCard(
  toy: DeviceToy,
  opts?: {
    buzzOn?: boolean
    onToggleBuzz?: (id: string, enabled: boolean) => void
    /** 1-based motors allowed for tips; empty/omit = both */
    motorMask?: number[]
    onMotorMask?: (id: string, motors: number[]) => void
    /** Reassign product profile ('' = auto). May call repeatedly. */
    onIdentity?: (id: string, product: string) => void
    /** Test one feature ~3s */
    onTestFeature?: (id: string, channel: string) => void
    testing?: boolean
  },
): HTMLElement {
  const card = document.createElement('article')
  card.className = 'toy-card'
  if (toy.connected) card.classList.add('online')
  let motorN = Math.max(1, Math.min(3, Number(toy.motors) || 1))
  const blob = [toy.toyType, toy.name, ...(toy.functions || [])]
    .join(' ')
    .toLowerCase()
  if (/gemini|edge|dolce|lapis|magnet|clamp|twin|dual/.test(blob)) {
    motorN = Math.max(motorN, 2)
  }
  if (motorN > 1) card.classList.add('multi-motor')
  if (toy.secondary?.thrust) card.classList.add('has-thrust')
  if (toy.secondary?.rotate) card.classList.add('has-rotate')
  if (toy.secondary?.air) card.classList.add('has-air')
  const buzzOn = opts?.buzzOn !== false
  if (!buzzOn) card.classList.add('buzz-off')

  const head = document.createElement('div')
  head.className = 'toy-card-head'
  const title = document.createElement('strong')
  title.className = 'toy-card-name'
  title.textContent = toy.name || toy.toyType || 'Toy'
  if (toy.toyType) {
    card.title = [title.textContent, toy.toyType].filter(Boolean).join(' · ')
  }
  const badge = document.createElement('span')
  badge.className = 'toy-badge'
  const st = String(toy.status || '').toLowerCase()
  if (st === 'reconnecting' || st === 'recovering') {
    badge.textContent = 'reconnecting'
    badge.classList.add('recover')
  } else if (toy.connected === false || st === '0' || st === 'offline' || st === 'off') {
    badge.textContent = 'offline'
  } else if (st === '1' || st === 'on' || st === 'online' || toy.connected) {
    badge.textContent = 'online'
    badge.classList.add('on')
  } else {
    badge.textContent = toy.status || '—'
  }
  head.append(title, badge)
  card.append(head)

  if (opts?.onToggleBuzz && toy.id) {
    const buzzLab = document.createElement('label')
    buzzLab.className = 'toy-buzz-toggle'
    const buzzIn = document.createElement('input')
    buzzIn.type = 'checkbox'
    buzzIn.checked = buzzOn
    buzzIn.setAttribute('aria-label', `Include ${title.textContent} in buzz`)
    buzzIn.addEventListener('change', () => {
      opts.onToggleBuzz!(toy.id, buzzIn.checked)
    })
    const buzzTxt = document.createElement('span')
    buzzTxt.textContent = buzzOn ? 'Buzz on' : 'Buzz off'
    buzzLab.append(buzzIn, buzzTxt)
    card.append(buzzLab)
  }

  if (opts?.onIdentity && toy.id) {
    const wrap = document.createElement('label')
    wrap.className = 'toy-identity'
    const cap = document.createElement('span')
    cap.className = 'toy-identity-cap'
    cap.textContent = 'Model'
    const sel = document.createElement('select')
    sel.className = 'toy-identity-select'
    sel.setAttribute('aria-label', `Model for ${title.textContent}`)
    const auto = document.createElement('option')
    auto.value = 'auto'
    const autoName =
      toy.extra?.autoName != null
        ? String(toy.extra.autoName)
        : toy.extra?.autoType != null
          ? String(toy.extra.autoType)
          : 'advertised'
    auto.textContent = `Auto (${autoName})`
    sel.append(auto)
    const current =
      toy.extra?.identityProduct != null
        ? String(toy.extra.identityProduct).toLowerCase()
        : 'auto'
    for (const p of TOY_PRODUCT_PROFILES) {
      const opt = document.createElement('option')
      opt.value = p.id
      opt.textContent = p.title
      if (p.id === current) opt.selected = true
      sel.append(opt)
    }
    if (current === 'auto') auto.selected = true
    // Unknown manual still shows selected product text
    if (
      current !== 'auto' &&
      !TOY_PRODUCT_PROFILES.some((p) => p.id === current)
    ) {
      const opt = document.createElement('option')
      opt.value = current
      opt.textContent = current
      opt.selected = true
      sel.append(opt)
    }
    sel.addEventListener('change', () => {
      opts.onIdentity!(toy.id, sel.value === 'auto' ? '' : sel.value)
    })
    wrap.append(cap, sel)
    card.append(wrap)
  }

  // L / Both / R lock for tip drive (multi-motor only)
  if (opts?.onMotorMask && toy.id && motorN >= 2) {
    const mask = (opts.motorMask || []).filter((m) => m >= 1 && m <= motorN)
    let mode: 'both' | '1' | '2' | '3' = 'both'
    if (mask.length === 1 && mask[0] === 1) mode = '1'
    else if (mask.length === 1 && mask[0] === 2) mode = '2'
    else if (mask.length === 1 && mask[0] === 3) mode = '3'

    const sideRow = document.createElement('div')
    sideRow.className = 'toy-motor-lock'
    sideRow.setAttribute('role', 'group')
    sideRow.setAttribute('aria-label', 'Tip motors')
    const cap = document.createElement('span')
    cap.className = 'toy-motor-lock-cap'
    cap.textContent = 'Tips'
    sideRow.append(cap)

    const optsList: { id: 'both' | '1' | '2' | '3'; label: string; motors: number[] }[] =
      motorN >= 3
        ? [
            { id: '1', label: 'M1', motors: [1] },
            { id: '2', label: 'M2', motors: [2] },
            { id: '3', label: 'M3', motors: [3] },
            { id: 'both', label: 'All', motors: [] },
          ]
        : [
            { id: '1', label: 'Left', motors: [1] },
            { id: 'both', label: 'Both', motors: [] },
            { id: '2', label: 'Right', motors: [2] },
          ]

    for (const o of optsList) {
      const lab = document.createElement('label')
      lab.className = 'toy-motor-lock-opt'
      const rad = document.createElement('input')
      rad.type = 'radio'
      rad.name = `motor-mask-${toy.id}`
      rad.value = o.id
      rad.checked = mode === o.id
      rad.addEventListener('change', () => {
        if (rad.checked) opts.onMotorMask!(toy.id, o.motors)
      })
      const txt = document.createElement('span')
      txt.textContent = o.label
      lab.append(rad, txt)
      sideRow.append(lab)
    }
    card.append(sideRow)
  }

  const features = listToyFeatures(toy)
  if (opts?.onTestFeature && toy.id && features.length) {
    const row = document.createElement('div')
    row.className = 'toy-feature-tests'
    row.setAttribute('role', 'group')
    row.setAttribute('aria-label', 'Test features')
    for (const feat of features) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `btn ghost tiny toy-feat-test toy-feat-${feat.kind}`
      btn.textContent = feat.label
      btn.title = `Test ${feat.label} ~3s`
      btn.disabled = Boolean(opts.testing)
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        opts.onTestFeature!(toy.id, feat.id)
      })
      row.append(btn)
    }
    card.append(row)
  }

  const chips = document.createElement('div')
  chips.className = 'toy-feature-chips'
  chips.setAttribute('aria-label', 'Toy features')
  const chipLabels = [
    motorN === 1 ? '1 motor' : `${motorN} motors`,
    ...(toy.secondary?.rotate ? ['rotate'] : []),
    ...(toy.secondary?.air ? ['air'] : []),
    ...(toy.secondary?.pump ? ['pump'] : []),
    ...(toy.secondary?.thrust ? ['thrust'] : []),
  ]
  for (const label of chipLabels) {
    const chip = document.createElement('span')
    chip.className = 'toy-chip'
    if (label.includes('motor')) chip.classList.add('chip-motors')
    if (label === 'rotate') chip.classList.add('chip-rotate')
    if (label === 'air' || label === 'pump') chip.classList.add('chip-air')
    if (label === 'thrust') chip.classList.add('chip-thrust')
    chip.textContent = label
    chips.append(chip)
  }
  if (chipLabels.length) card.append(chips)

  const dl = document.createElement('dl')
  dl.className = 'toy-meta'
  // Keep cards compact in multi-column layout; full browser id is on hover.
  if (toy.toyType && toy.toyType !== toy.name) {
    appendToyMeta(dl, 'Type', toy.toyType)
  }
  if (toy.nickName && toy.nickName !== toy.name) {
    appendToyMeta(dl, 'Nick', toy.nickName)
  }
  appendToyMeta(
    dl,
    'Bat',
    toy.battery != null && Number.isFinite(toy.battery)
      ? `${Math.round(Number(toy.battery))}%`
      : undefined,
  )
  const ex = toy.extra || {}
  const modelCode = ex.modelCode != null ? String(ex.modelCode) : ''
  const firmware = ex.firmware != null ? String(ex.firmware) : ''
  const mac = ex.mac != null ? String(ex.mac) : ''
  const batch = ex.batch != null ? String(ex.batch) : ''
  const devStatus = ex.deviceStatus != null ? String(ex.deviceStatus) : ''
  const typeRaw = ex.typeRaw != null ? String(ex.typeRaw) : ''
  if (modelCode && !/^unkn?own$/i.test(modelCode)) {
    appendToyMeta(dl, 'Code', modelCode)
  }
  if (
    firmware &&
    !/^status$/i.test(firmware) &&
    !/^getbatch$/i.test(firmware)
  ) {
    appendToyMeta(dl, 'FW', firmware)
  }
  if (mac) appendToyMeta(dl, 'MAC', mac)
  if (batch) appendToyMeta(dl, 'Batch', batch)
  if (devStatus) appendToyMeta(dl, 'State', devStatus)
  if (toy.extra?.identityManual) {
    const autoN =
      toy.extra.autoName != null ? String(toy.extra.autoName) : ''
    if (autoN) appendToyMeta(dl, 'Adv', autoN)
  }
  if (
    typeRaw &&
    typeRaw !== modelCode &&
    !/^unkn?own:/i.test(typeRaw)
  ) {
    // Full DeviceType; line — useful while debugging / verifying probe
    appendToyMeta(dl, 'Type;', typeRaw)
  }
  if (dl.childElementCount) card.append(dl)
  return card
}
