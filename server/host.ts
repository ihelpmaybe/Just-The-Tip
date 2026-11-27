/**
 * Standalone Just The Tip host — production UI + Lovense LAN bridge.
 * Usage: npm start  (build + host)  |  npm run host  (dist already built)
 *
 * Always http://127.0.0.1:5193/ — same URL as `npm run dev`. Never dual-port.
 */
import http from 'node:http'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleLovensePost, handleAgentDebugPost, readBody, sendJson } from './api-common.ts'
import {
  openExternalBrowser,
  sanitizeLocalAppUrl,
} from './open-browser.ts'
import {
  emptyTipMenuPage,
  getTipMenuHtml,
  setTipMenuHtml,
  tipMenuMeta,
} from './tip-menu-store.ts'
import {
  attachOverlaySse,
  lastOverlayTip,
  overlayClientCount,
  overlayPageHtml,
  overlayQrPageHtml,
  overlayMenuPageHtml,
  publishOverlayTip,
  overlayTipFromBody,
  getOverlayStyle,
  setOverlayStyle,
  getOverlayHubStatus,
  setOverlayQr,
  ensureOverlayQrPayload,
  ingestOverlayPulseBody,
  ingestOverlayLadderBody,
  getOverlayMenuStyle,
  setOverlayMenuStyle,
  setOverlayFocus,
  type OverlayTipEvent,
} from './overlay-hub.ts'
import { APP_NAME, APP_VERSION } from '../src/version.ts'

const APP = APP_NAME
const VERSION = APP_VERSION

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

/** Single product URL — ignore PORT / host.config leftovers. */
export const HOST = '127.0.0.1'
export const PORT = 5193
export const APP_URL = `http://${HOST}:${PORT}/`

export type StartHostOpts = {
  /** Production UI folder (defaults to <repo>/dist). */
  distDir?: string
  /** When false, EADDRINUSE returns instead of exiting (desktop shell). */
  exitOnListenError?: boolean
}

export type HostHandle = {
  url: string
  alreadyRunning: boolean
  close: () => Promise<void>
}

const startedAt = Date.now()

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
}

async function serveStatic(
  distDir: string,
  urlPath: string,
  res: http.ServerResponse,
) {
  let rel = decodeURIComponent(urlPath.split('?')[0] || '/')
  if (rel === '/') rel = '/index.html'
  if (rel.includes('..')) {
    sendJson(res, 400, { error: 'bad path' })
    return
  }
  const file = path.join(distDir, rel.replace(/^\//, ''))
  try {
    const st = await fsp.stat(file)
    if (st.isDirectory()) {
      await serveStatic(distDir, path.posix.join(rel, 'index.html'), res)
      return
    }
    const ext = path.extname(file).toLowerCase()
    res.statusCode = 200
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.end(await fsp.readFile(file))
  } catch {
    if (!path.extname(rel)) {
      try {
        const index = path.join(distDir, 'index.html')
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(await fsp.readFile(index))
        return
      } catch {
        /* fall through */
      }
    }
    sendJson(res, 404, {
      error: 'Not found — run npm run build so dist/ exists',
    })
  }
}

export async function startHost(opts: StartHostOpts = {}): Promise<HostHandle> {
  const distDir = opts.distDir || path.join(root, 'dist')
  const exitOnListenError = opts.exitOnListenError !== false
  const url = APP_URL

  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    const msg = `[${APP}] dist/ missing. Run: npm run build   or   npm start`
    if (exitOnListenError) {
      console.error(msg)
      process.exit(1)
    }
    throw new Error(msg)
  }

  const server = http.createServer(async (req, res) => {
  const url = req.url || '/'
  const pathOnly = url.split('?')[0] || '/'
  const method = req.method || 'GET'

  // Live tip menu (same origin as UI — MetaMask injects; file:// often does not)
  if (pathOnly === '/tip-menu' || pathOnly === '/tip-menu.html') {
    if (method === 'GET' || method === 'HEAD') {
      const html = getTipMenuHtml() || emptyTipMenuPage()
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      if (method === 'HEAD') {
        res.end()
        return
      }
      res.end(html)
      return
    }
  }

  // OBS tip overlay
  if (pathOnly === '/overlay' || pathOnly === '/overlay.html') {
    if (method === 'GET' || method === 'HEAD') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      if (method === 'HEAD') {
        res.end()
        return
      }
      res.end(overlayPageHtml())
      return
    }
  }

  // OBS tip QR (always-on receive address)
  if (pathOnly === '/overlay/qr' || pathOnly === '/overlay/qr.html') {
    if (method === 'GET' || method === 'HEAD') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      if (method === 'HEAD') {
        res.end()
        return
      }
      res.end(overlayQrPageHtml())
      return
    }
  }

  // OBS tip menu (always-on price list)
  if (pathOnly === '/overlay/menu' || pathOnly === '/overlay/menu.html') {
    if (method === 'GET' || method === 'HEAD') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      if (method === 'HEAD') {
        res.end()
        return
      }
      res.end(overlayMenuPageHtml())
      return
    }
  }

  if (pathOnly.startsWith('/api/status') && method === 'GET') {
    sendJson(res, 200, {
      ok: true,
      app: APP,
      version: VERSION,
      mode: 'standalone',
      host: HOST,
      port: PORT,
      startedAt,
      distReady: fs.existsSync(path.join(distDir, 'index.html')),
      lovenseBridge: true,
      tipMenu: tipMenuMeta(),
      overlay: {
        clients: overlayClientCount(),
        last: lastOverlayTip(),
      },
    })
    return
  }

  if (pathOnly === '/api/overlay/stream' && method === 'GET') {
    attachOverlaySse(res)
    return
  }

  if (pathOnly === '/api/overlay/tip') {
    if (method === 'OPTIONS') {
      res.statusCode = 204
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'content-type')
      res.end()
      return
    }
    if (method === 'POST') {
      try {
        const raw = await readBody(req)
        const body = raw ? (JSON.parse(raw) as Partial<OverlayTipEvent>) : {}
        const event = publishOverlayTip(overlayTipFromBody(body))
        sendJson(res, 200, {
          ok: true,
          clients: overlayClientCount(),
          event,
          filtered: !event,
        })
      } catch (e) {
        sendJson(res, 500, {
          error: e instanceof Error ? e.message : String(e),
        })
      }
      return
    }
    sendJson(res, 405, { error: 'POST only' })
    return
  }

  if (pathOnly === '/api/overlay/pulse') {
    if (method === 'OPTIONS') {
      res.statusCode = 204
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'content-type')
      res.end()
      return
    }
    if (method === 'POST') {
      try {
        const raw = await readBody(req)
        const body = raw ? JSON.parse(raw) : {}
        const pulse = ingestOverlayPulseBody(body)
        sendJson(res, 200, { ok: true, pulse })
      } catch (e) {
        sendJson(res, 500, {
          error: e instanceof Error ? e.message : String(e),
        })
      }
      return
    }
    sendJson(res, 405, { error: 'POST only' })
    return
  }

  if (pathOnly === '/api/overlay/ladder') {
    if (method === 'OPTIONS') {
      res.statusCode = 204
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'content-type')
      res.end()
      return
    }
    if (method === 'POST') {
      try {
        const raw = await readBody(req)
        const body = raw ? JSON.parse(raw) : {}
        const ladder = ingestOverlayLadderBody(body)
        sendJson(res, 200, { ok: true, ladder })
      } catch (e) {
        sendJson(res, 500, {
          error: e instanceof Error ? e.message : String(e),
        })
      }
      return
    }
    sendJson(res, 405, { error: 'POST only' })
    return
  }

  if (pathOnly === '/api/overlay/style') {
    if (method === 'OPTIONS') {
      res.statusCode = 204
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'content-type')
      res.end()
      return
    }
    if (method === 'GET') {
      sendJson(res, 200, { ok: true, style: getOverlayStyle() })
      return
    }
    if (method === 'PUT' || method === 'POST') {
      try {
        const raw = await readBody(req)
        const body = raw ? JSON.parse(raw) : {}
        const next = setOverlayStyle(
          (body as { style?: unknown }).style ?? body,
        )
        sendJson(res, 200, { ok: true, style: next })
      } catch (e) {
        sendJson(res, 500, {
          error: e instanceof Error ? e.message : String(e),
        })
      }
      return
    }
    sendJson(res, 405, { error: 'GET/PUT/POST only' })
    return
  }

  if (pathOnly === '/api/overlay/menu-style') {
    if (method === 'OPTIONS') {
      res.statusCode = 204
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'content-type')
      res.end()
      return
    }
    if (method === 'GET') {
      sendJson(res, 200, { ok: true, style: getOverlayMenuStyle() })
      return
    }
    if (method === 'PUT' || method === 'POST') {
      try {
        const raw = await readBody(req)
        const body = raw ? JSON.parse(raw) : {}
        const next = setOverlayMenuStyle(
          (body as { style?: unknown }).style ?? body,
        )
        sendJson(res, 200, { ok: true, style: next })
      } catch (e) {
        sendJson(res, 500, {
          error: e instanceof Error ? e.message : String(e),
        })
      }
      return
    }
    sendJson(res, 405, { error: 'GET/PUT/POST only' })
    return
  }

  if (pathOnly === '/api/overlay/focus') {
    if (method === 'OPTIONS') {
      res.statusCode = 204
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'content-type')
      res.end()
      return
    }
    if (method === 'POST') {
      try {
        const raw = await readBody(req)
        const body = raw ? JSON.parse(raw) : {}
        const focus = setOverlayFocus(body)
        sendJson(res, 200, { ok: true, focus })
      } catch (e) {
        sendJson(res, 500, {
          error: e instanceof Error ? e.message : String(e),
        })
      }
      return
    }
    sendJson(res, 405, { error: 'POST only' })
    return
  }

  if (pathOnly === '/api/overlay/qr') {
    if (method === 'OPTIONS') {
      res.statusCode = 204
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'content-type')
      res.end()
      return
    }
    if (method === 'GET') {
      const payload = await ensureOverlayQrPayload()
      sendJson(res, 200, { ok: true, qr: payload })
      return
    }
    if (method === 'PUT' || method === 'POST') {
      try {
        const raw = await readBody(req)
        const body = raw ? JSON.parse(raw) : {}
        const next = await setOverlayQr(
          (body as { qr?: unknown }).qr ?? body,
        )
        sendJson(res, 200, { ok: true, qr: next })
      } catch (e) {
        sendJson(res, 500, {
          error: e instanceof Error ? e.message : String(e),
        })
      }
      return
    }
    sendJson(res, 405, { error: 'GET/PUT/POST only' })
    return
  }

  if (pathOnly === '/api/overlay/status' && method === 'GET') {
    sendJson(res, 200, { ok: true, ...getOverlayHubStatus() })
    return
  }

  // Open Chrome/Edge for Web Bluetooth (same as Vite middleware).
  if (
    (pathOnly === '/api/open-chrome' ||
      pathOnly === '/api/open-external-browser') &&
    method === 'POST'
  ) {
    let url = `http://${HOST}:${PORT}/`
    try {
      const raw = await readBody(req)
      if (raw) {
        const body = JSON.parse(raw) as { url?: string }
        url = sanitizeLocalAppUrl(body.url, url)
      }
    } catch {
      /* use default */
    }
    const result = openExternalBrowser(url)
    sendJson(res, result.ok ? 200 : 500, { ...result, url })
    return
  }

  if (pathOnly.startsWith('/api/tip-menu')) {
    if (method === 'OPTIONS') {
      res.statusCode = 204
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'content-type')
      res.end()
      return
    }
    if (method === 'GET') {
      const html = getTipMenuHtml()
      if (!html) {
        sendJson(res, 404, { error: 'No tip menu published yet' })
        return
      }
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.end(html)
      return
    }
    if (method === 'PUT' || method === 'POST') {
      try {
        const raw = await readBody(req)
        let html = raw
        const ct = String(req.headers['content-type'] || '')
        if (ct.includes('application/json')) {
          const body = raw ? (JSON.parse(raw) as { html?: string }) : {}
          html = String(body.html || '')
        }
        const result = setTipMenuHtml(html)
        if (!result.ok) {
          sendJson(res, 400, { error: result.error })
          return
        }
        sendJson(res, 200, { ok: true, url: '/tip-menu', ...tipMenuMeta() })
      } catch (e) {
        sendJson(res, 500, {
          error: e instanceof Error ? e.message : String(e),
        })
      }
      return
    }
    sendJson(res, 405, { error: 'GET/PUT/POST only' })
    return
  }

  if (pathOnly === '/api/debug-log') {
    if (method === 'OPTIONS') {
      res.statusCode = 204
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'content-type')
      res.end()
      return
    }
    if (method !== 'POST') {
      sendJson(res, 405, { error: 'POST only' })
      return
    }
    try {
      const raw = await readBody(req)
      const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      handleAgentDebugPost(body)
      sendJson(res, 200, { ok: true })
    } catch (e) {
      sendJson(res, 500, {
        error: e instanceof Error ? e.message : String(e),
      })
    }
    return
  }

  if (pathOnly.startsWith('/api/lovense')) {
    if (method === 'OPTIONS') {
      res.statusCode = 204
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'content-type')
      res.end()
      return
    }
    if (method !== 'POST') {
      sendJson(res, 405, { error: 'POST only' })
      return
    }
    try {
      const raw = await readBody(req)
      const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      await handleLovensePost(body, res)
    } catch (e) {
      sendJson(res, 500, {
        error: e instanceof Error ? e.message : String(e),
      })
    }
    return
  }

  if (method === 'GET' || method === 'HEAD') {
    await serveStatic(distDir, url, res)
    return
  }

  sendJson(res, 404, { error: 'not found' })
  })

  const close = () =>
    new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    })

  return await new Promise<HostHandle>((resolve, reject) => {
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        if (exitOnListenError) {
          console.error('')
          console.error(`[${APP}] Port ${PORT} is already in use.`)
          console.error(`  Only one ${APP} server at a time.`)
          console.error(`  Open:  ${url}`)
          console.error(`  Or free the port:  npm run stop`)
          console.error('')
          process.exit(1)
        }
        resolve({ url, alreadyRunning: true, close: async () => {} })
        return
      }
      if (exitOnListenError) {
        console.error(`[${APP}] server error:`, err)
        process.exit(1)
      }
      reject(err)
    })
    server.listen(PORT, HOST, () => {
      console.log('')
      console.log(`  ${APP} v${VERSION}`)
      console.log(`  Open this only →  ${url}`)
      console.log('')
      resolve({ url, alreadyRunning: false, close })
    })
  })
}

function launchedAsCli(): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return (
      path.normalize(path.resolve(entry)) ===
      path.normalize(fileURLToPath(import.meta.url))
    )
  } catch {
    return false
  }
}

if (launchedAsCli()) {
  void startHost()
}
