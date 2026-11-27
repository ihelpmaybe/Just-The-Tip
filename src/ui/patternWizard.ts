import {
  normalizePatternDef,
  type PatternDef,
  type PatternKind,
  type StepMotorCode,
} from '../utils/patterns'
import { normalizeNeeds, type ChannelNeed } from '../utils/patternFit'

export type WizardMode = 'create' | 'edit'

export function paintStrengthEditors(
  box: HTMLElement,
  strengths: number[],
  opts?: {
    stepMotors?: StepMotorCode[]
    /** Show L / R / Both per step (multi-motor patterns) */
    showMotors?: boolean
  },
) {
  box.replaceChildren()
  const showMotors = Boolean(opts?.showMotors)
  const motors = opts?.stepMotors || []
  strengths.forEach((s, i) => {
    const cell = document.createElement('label')
    cell.className = 'wizard-step-cell'
    cell.title = `Step ${i + 1}`
    if (showMotors) cell.classList.add('has-motor')
    const num = document.createElement('input')
    num.type = 'number'
    num.min = '0'
    num.max = '8'
    num.step = '1'
    num.value = String(Math.max(0, Math.min(8, Math.round(s))))
    num.setAttribute('aria-label', `Strength step ${i + 1}`)
    cell.append(num)
    if (showMotors) {
      const sel = document.createElement('select')
      sel.className = 'wizard-step-motor'
      sel.setAttribute('aria-label', `Motor step ${i + 1}`)
      for (const [v, lab] of [
        ['0', 'Both'],
        ['1', 'L'],
        ['2', 'R'],
      ] as const) {
        const opt = document.createElement('option')
        opt.value = v
        opt.textContent = lab
        sel.append(opt)
      }
      const code = motors[i]
      sel.value =
        code === 1 || code === 2 || code === 3 ? String(code) : '0'
      cell.append(sel)
    }
    box.append(cell)
  })
}

/**
 * One row of 0–8 boxes per motor (M1, M2…), each lane edited independently.
 */
export function paintMotorStrengthEditors(
  box: HTMLElement,
  lanes: number[][],
) {
  box.replaceChildren()
  lanes.forEach((lane, laneIdx) => {
    const row = document.createElement('div')
    row.className = 'wizard-motor-row'
    row.dataset.motor = String(laneIdx + 1)
    const label = document.createElement('span')
    label.className = 'wizard-motor-label'
    label.textContent = `M${laneIdx + 1}`
    row.append(label)
    const steps = document.createElement('div')
    steps.className = 'wizard-strengths-row'
    lane.forEach((s, i) => {
      const cell = document.createElement('label')
      cell.className = 'wizard-step-cell'
      cell.title = `M${laneIdx + 1} · step ${i + 1}`
      const num = document.createElement('input')
      num.type = 'number'
      num.min = '0'
      num.max = '8'
      num.step = '1'
      num.value = String(Math.max(0, Math.min(8, Math.round(s))))
      num.setAttribute('aria-label', `M${laneIdx + 1} strength step ${i + 1}`)
      cell.append(num)
      steps.append(cell)
    })
    row.append(steps)
    box.append(row)
  })
}

export function readMotorStrengthEditors(box: HTMLElement): number[][] {
  return [...box.querySelectorAll<HTMLElement>('.wizard-motor-row')].map((row) =>
    [...row.querySelectorAll<HTMLInputElement>('input[type="number"]')].map(
      (el) => Math.max(0, Math.min(8, Math.round(Number(el.value) || 0))),
    ),
  )
}

export function readStrengthEditors(box: HTMLElement): number[] {
  return [...box.querySelectorAll<HTMLInputElement>('input[type="number"]')].map(
    (el) => Math.max(0, Math.min(8, Math.round(Number(el.value) || 0))),
  )
}

export function readStepMotorEditors(box: HTMLElement): StepMotorCode[] {
  return [...box.querySelectorAll<HTMLSelectElement>('select.wizard-step-motor')].map(
    (el) => {
      const c = Math.round(Number(el.value) || 0)
      if (c === 1 || c === 2 || c === 3) return c
      return 0
    },
  )
}

export function fillTagList(datalist: HTMLDataListElement, tags: string[]) {
  datalist.replaceChildren()
  for (const t of tags) {
    const opt = document.createElement('option')
    opt.value = t
    datalist.append(opt)
  }
}

export function readWizardNeeds(root: HTMLElement): ChannelNeed[] {
  const out: ChannelNeed[] = []
  for (const el of root.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"]',
  )) {
    if (el.checked) out.push(el.value as ChannelNeed)
  }
  return normalizeNeeds(out)
}

export function fillWizardNeeds(root: HTMLElement, needs: ChannelNeed[]) {
  const set = new Set(needs)
  for (const el of root.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"]',
  )) {
    el.checked = set.has(el.value as ChannelNeed)
  }
}

/** Build a normalized PatternDef from wizard inputs. */
export function defFromWizardFields(fields: {
  id: string
  name: string
  blurb: string
  tag: string
  price: number
  intervalMs: number
  strengths: number[]
  stepMotors?: StepMotorCode[]
  motorStrengths?: number[][]
  kind?: PatternKind
  preset?: string
  intensity?: number
  timeSec?: number
  needs?: ChannelNeed[]
}): PatternDef | null {
  return normalizePatternDef({
    id: fields.id,
    name: fields.name,
    blurb: fields.blurb,
    tag: fields.tag,
    price: fields.price,
    intervalMs: fields.intervalMs,
    strengths: fields.strengths,
    stepMotors: fields.stepMotors,
    motorStrengths: fields.motorStrengths,
    kind: fields.kind ?? 'pattern',
    preset: fields.preset,
    intensity: fields.intensity,
    timeSec: fields.timeSec,
    needs: fields.needs,
  })
}
