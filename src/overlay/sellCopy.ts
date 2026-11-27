/**
 * On-stream sell copy — feel + time + price, not catalog ids.
 * Shared by the tip-menu overlay and the QR carousel.
 */

const CHANNEL_PREFIX =
  /^(vibe|thrust|rotate|air|multi|science|feature|gemini)\s*·\s*/i

export function intensityFeel(
  strengths?: number[],
  intensity?: number,
): string {
  const peak = Math.max(
    0,
    Number(intensity) || 0,
    ...(Array.isArray(strengths) ? strengths.map((n) => Number(n) || 0) : [0]),
  )
  if (peak <= 0) return ''
  if (peak <= 2) return 'soft'
  if (peak <= 4) return 'medium'
  if (peak <= 6) return 'hard'
  return 'max'
}

export function cleanFeelBlurb(raw: string): string {
  let s = String(raw || '').replace(/\s+/g, ' ').trim()
  for (let i = 0; i < 4; i++) {
    if (!CHANNEL_PREFIX.test(s)) break
    s = s.replace(CHANNEL_PREFIX, '').trim()
  }
  return s.slice(0, 42)
}

export type SellPitchInput = {
  name: string
  blurb?: string
  timeSec?: number
  strengths?: number[]
  intensity?: number
}

export type SellPitch = {
  /** Primary on-stream line, e.g. "12s · rolling climb" */
  pitch: string
  hold: string
  feel: string
}

export function buildSellPitch(input: SellPitchInput): SellPitch {
  const name = String(input.name || '').trim()
  const sec = Math.round(Number(input.timeSec) || 0)
  const hold = sec > 0 ? `${sec}s` : ''
  const feel = intensityFeel(input.strengths, input.intensity)
  const cleaned = cleanFeelBlurb(input.blurb || '')
  const useful =
    Boolean(cleaned) && cleaned.toLowerCase() !== name.toLowerCase()
  const treat = useful ? cleaned : [feel, name].filter(Boolean).join(' ')
  const pitch = ([hold, treat].filter(Boolean).join(' · ') || name).slice(0, 56)
  return { pitch, hold, feel }
}

export function offerFocusKey(name: string, amountLabel: string): string {
  return `${String(name || '').trim().toLowerCase()}|${String(amountLabel || '').trim().toLowerCase()}`
}
