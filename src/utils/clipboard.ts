/**
 * Reliable copy for Electron + browsers (clipboard API often needs write permission).
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = String(text || '')
  if (!value) return false
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = value
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    ta.style.top = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    ta.setSelectionRange(0, value.length)
    const ok = document.execCommand('copy')
    ta.remove()
    return Boolean(ok)
  } catch {
    return false
  }
}
