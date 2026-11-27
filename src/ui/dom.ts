export function qs<T extends HTMLElement>(
  root: ParentNode,
  id: string,
): T {
  const el = root.querySelector<T>(`#${id}`)
  if (!el) throw new Error(`#${id} missing`)
  return el
}

export function short(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a
}

export function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}
