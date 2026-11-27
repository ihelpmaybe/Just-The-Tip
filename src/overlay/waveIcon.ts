/**
 * Compact Stream Master–style waveform for the always-on tip menu.
 * Stroke uses currentColor so CSS can theme featured / focus rows.
 */
export function overlayWaveIconSvg(steps: unknown): string {
  const raw = Array.isArray(steps)
    ? steps
        .map((n) => Math.max(0, Math.min(8, Number(n) || 0)))
        .slice(0, 16)
    : []
  const seq = raw.length ? raw : [1.5, 5.5, 2, 6.5, 1.5]
  const w = 54
  const h = 18
  const padX = 2
  const padY = 2.4
  const n = seq.length
  const spanX = w - padX * 2
  const spanY = h - padY * 2
  const pts: string[] = []
  for (let i = 0; i < n; i++) {
    const x =
      n === 1 ? padX + spanX / 2 : padX + (i / Math.max(1, n - 1)) * spanX
    const y = h - padY - (seq[i]! / 8) * spanY
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  if (n === 1) {
    const x = padX + spanX / 2
    pts.unshift(`${(x - 4).toFixed(1)} ${(h - padY).toFixed(1)}`)
    pts.push(`${(x + 4).toFixed(1)} ${(h - padY).toFixed(1)}`)
  }
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p}`).join(' ')
  return (
    `<svg class="menu-wave-svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" fill="none" aria-hidden="true">` +
    `<path d="${d}" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</svg>`
  )
}

export function overlayHoldLabel(row: {
  timeSec?: number
  sellPitch?: string
}): string {
  const t = Math.round(Number(row.timeSec) || 0)
  if (t > 0) return `${t}s`
  const m = String(row.sellPitch || '').match(/^(\d+)\s*s\b/i)
  return m ? `${m[1]}s` : '—'
}
