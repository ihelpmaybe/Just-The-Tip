/**
 * Open system Chrome/Edge so Web Bluetooth works (Cursor shell cannot).
 * Shared by Vite middleware and the production host.
 */
import { spawn } from 'node:child_process'

const DEFAULT_APP_URL = 'http://127.0.0.1:5193/'

export function openExternalBrowser(
  url?: string,
): { ok: boolean; via?: string; error?: string } {
  const target = (url || DEFAULT_APP_URL).trim() || DEFAULT_APP_URL
  if (process.platform === 'win32') {
    const candidates: Array<{ via: string; file: string; args: string[] }> = [
      {
        via: 'chrome',
        file: 'cmd.exe',
        args: ['/c', 'start', '', 'chrome', target],
      },
      {
        via: 'msedge',
        file: 'cmd.exe',
        args: ['/c', 'start', '', 'msedge', target],
      },
      {
        via: 'default',
        file: 'cmd.exe',
        args: ['/c', 'start', '', target],
      },
    ]
    for (const c of candidates) {
      try {
        const child = spawn(c.file, c.args, {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
        })
        child.unref()
        return { ok: true, via: c.via }
      } catch {
        /* try next */
      }
    }
    return { ok: false, error: 'Could not launch a browser' }
  }
  if (process.platform === 'darwin') {
    try {
      const child = spawn('open', ['-a', 'Google Chrome', target], {
        detached: true,
        stdio: 'ignore',
      })
      child.unref()
      return { ok: true, via: 'chrome' }
    } catch {
      try {
        const child = spawn('open', [target], {
          detached: true,
          stdio: 'ignore',
        })
        child.unref()
        return { ok: true, via: 'default' }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        }
      }
    }
  }
  try {
    const child = spawn('xdg-open', [target], {
      detached: true,
      stdio: 'ignore',
    })
    child.unref()
    return { ok: true, via: 'xdg-open' }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

/** Only allow opening local Just The Tip URLs. */
export function sanitizeLocalAppUrl(
  candidate: unknown,
  fallback = DEFAULT_APP_URL,
): string {
  if (typeof candidate !== 'string') return fallback
  const url = candidate.trim()
  if (/^https?:\/\/127\.0\.0\.1(?::\d+)?\/?/i.test(url)) return url
  return fallback
}
