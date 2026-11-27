/**
 * In-memory tip-menu HTML served at GET /tip-menu while Just The Tip is running.
 * Lets MetaMask inject on http://127.0.0.1 (file:// does not).
 */
import { APP_LOGO, APP_NAME } from '../src/version.ts'

let storedHtml = ''
let updatedAt: number | null = null

const MAX_BYTES = 4_000_000

export function setTipMenuHtml(html: string): { ok: true } | { ok: false; error: string } {
  if (typeof html !== 'string' || !html.trim()) {
    return { ok: false, error: 'empty html' }
  }
  if (html.length > MAX_BYTES) {
    return { ok: false, error: 'html too large' }
  }
  storedHtml = html
  updatedAt = Date.now()
  return { ok: true }
}

export function getTipMenuHtml(): string | null {
  return storedHtml.trim() ? storedHtml : null
}

export function tipMenuMeta(): { hasMenu: boolean; updatedAt: number | null; bytes: number } {
  return {
    hasMenu: Boolean(storedHtml.trim()),
    updatedAt,
    bytes: storedHtml.length,
  }
}

export function clearTipMenuHtml() {
  storedHtml = ''
  updatedAt = null
}

export function emptyTipMenuPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${APP_NAME} · Tip menu</title>
<style>
  body { font-family: "Avenir Next", "Segoe UI", system-ui, sans-serif; background: #050d18; color: #e8f4ff; padding: 2rem; max-width: 36rem; margin: 0 auto; line-height: 1.5; }
  a { color: #00c8ff; }
  code { background: #0a1830; padding: 0.1em 0.35em; border-radius: 4px; }
  .mark { width: 4.5rem; height: 4.5rem; vertical-align: middle; margin-right: 0.5rem; object-fit: contain; }
</style>
</head>
<body>
  <p><img class="mark" src="${APP_LOGO}" alt="" width="72" height="72"/><strong>${APP_NAME}</strong> · PulseChain</p>
  <h1>No tip menu loaded</h1>
  <p>In ${APP_NAME} open <strong>Tip menu → Share card → Export HTML</strong>. Host the file on HTTPS so fans can scan EIP-681 QRs (token, amount, network) — or open this page while testing when a menu is published.</p>
  <p><a href="/">← Back to ${APP_NAME}</a></p>
</body>
</html>`
}
