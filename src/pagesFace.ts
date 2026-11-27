/**
 * GitHub Pages / *.github.io = showcase peek (same posture as Hearts Gallery / HEXmob).
 * Real tip-to-buzz (toys, Lovense bridge, OBS live) stays on the operator PC.
 */
export function isPagesShowcase(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (/\.github\.io$/i.test(window.location.hostname)) return true
  } catch {
    /* ignore */
  }
  return import.meta.env.VITE_PAGES_SHOWCASE === '1'
}

export const SHOWCASE_BANNER_HTML = `
  <div class="showcase-banner" role="status">
    <strong>Showcase peek</strong>
    — look only. Do not treat GitHub Pages as a tip-to-buzz front end.
    <a href="https://github.com/ihelpmaybe/Just-The-Tip">Clone / download</a>
    → run <code>npm run desktop</code> or the Windows Setup on your PC to watch tips and buzz toys.
  </div>
`
