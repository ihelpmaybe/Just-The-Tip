import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import {
  defineConfig,
  type Connect,
  type Plugin,
  type PreviewServer,
  type ViteDevServer,
} from 'vite'
import { APP_NAME } from './src/version.ts'
import { handleLovensePost, handleAgentDebugPost, readBody, sendJson } from './server/api-common.ts'
import {
  openExternalBrowser,
  sanitizeLocalAppUrl,
} from './server/open-browser.ts'
import {
  emptyTipMenuPage,
  getTipMenuHtml,
  setTipMenuHtml,
  tipMenuMeta,
} from './server/tip-menu-store.ts'
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
} from './server/overlay-hub.ts'

const APP_PORT = 5193
const APP_URL = `http://127.0.0.1:${APP_PORT}/`

/** Local Lovense bridge + tip-menu host on the same origin as the UI. */
function attachApis(middlewares: Connect.Server) {
  middlewares.use(async (req, res, next) => {
    const pathOnly = (req.url || '').split('?')[0] || ''
    const r = res as ServerResponse
    const q = req as IncomingMessage
    const method = (q.method || 'GET').toUpperCase()

    // Live tip menu — MetaMask works on http://127.0.0.1, not file://
    if (pathOnly === '/tip-menu' || pathOnly === '/tip-menu.html') {
      if (method === 'GET' || method === 'HEAD') {
        const html = getTipMenuHtml() || emptyTipMenuPage()
        r.statusCode = 200
        r.setHeader('Content-Type', 'text/html; charset=utf-8')
        r.setHeader('Cache-Control', 'no-store')
        if (method === 'HEAD') {
          r.end()
          return
        }
        r.end(html)
        return
      }
      next()
      return
    }

    // OBS Browser Source tip overlay
    if (pathOnly === '/overlay' || pathOnly === '/overlay.html') {
      if (method === 'GET' || method === 'HEAD') {
        r.statusCode = 200
        r.setHeader('Content-Type', 'text/html; charset=utf-8')
        r.setHeader('Cache-Control', 'no-store')
        if (method === 'HEAD') {
          r.end()
          return
        }
        r.end(overlayPageHtml())
        return
      }
      next()
      return
    }

    // OBS always-on tip QR (receive wallet)
    if (pathOnly === '/overlay/qr' || pathOnly === '/overlay/qr.html') {
      if (method === 'GET' || method === 'HEAD') {
        r.statusCode = 200
        r.setHeader('Content-Type', 'text/html; charset=utf-8')
        r.setHeader('Cache-Control', 'no-store')
        if (method === 'HEAD') {
          r.end()
          return
        }
        r.end(overlayQrPageHtml())
        return
      }
      next()
      return
    }

    // OBS always-on tip menu (prices + patterns)
    if (pathOnly === '/overlay/menu' || pathOnly === '/overlay/menu.html') {
      if (method === 'GET' || method === 'HEAD') {
        r.statusCode = 200
        r.setHeader('Content-Type', 'text/html; charset=utf-8')
        r.setHeader('Cache-Control', 'no-store')
        if (method === 'HEAD') {
          r.end()
          return
        }
        r.end(overlayMenuPageHtml())
        return
      }
      next()
      return
    }

    if (!pathOnly.startsWith('/api/')) {
      next()
      return
    }

    if (pathOnly.startsWith('/api/status') && method === 'GET') {
      sendJson(r, 200, {
        ok: true,
        mode: 'vite',
        app: APP_NAME,
        port: APP_PORT,
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
      attachOverlaySse(r)
      return
    }

    if (pathOnly === '/api/overlay/tip') {
      if (method === 'OPTIONS') {
        r.statusCode = 204
        r.setHeader('Access-Control-Allow-Origin', '*')
        r.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        r.setHeader('Access-Control-Allow-Headers', 'content-type')
        r.end()
        return
      }
      if (method === 'POST') {
        try {
          const raw = await readBody(q)
          const body = raw ? (JSON.parse(raw) as Partial<OverlayTipEvent>) : {}
          const event = publishOverlayTip(overlayTipFromBody(body))
          sendJson(r, 200, {
            ok: true,
            clients: overlayClientCount(),
            event,
            filtered: !event,
          })
        } catch (e) {
          sendJson(r, 500, {
            error: e instanceof Error ? e.message : String(e),
          })
        }
        return
      }
      sendJson(r, 405, { error: 'POST only' })
      return
    }

    if (pathOnly === '/api/overlay/pulse') {
      if (method === 'OPTIONS') {
        r.statusCode = 204
        r.setHeader('Access-Control-Allow-Origin', '*')
        r.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        r.setHeader('Access-Control-Allow-Headers', 'content-type')
        r.end()
        return
      }
      if (method === 'POST') {
        try {
          const raw = await readBody(q)
          const body = raw ? JSON.parse(raw) : {}
          const pulse = ingestOverlayPulseBody(body)
          sendJson(r, 200, { ok: true, pulse })
        } catch (e) {
          sendJson(r, 500, {
            error: e instanceof Error ? e.message : String(e),
          })
        }
        return
      }
      sendJson(r, 405, { error: 'POST only' })
      return
    }

    if (pathOnly === '/api/overlay/ladder') {
      if (method === 'OPTIONS') {
        r.statusCode = 204
        r.setHeader('Access-Control-Allow-Origin', '*')
        r.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        r.setHeader('Access-Control-Allow-Headers', 'content-type')
        r.end()
        return
      }
      if (method === 'POST') {
        try {
          const raw = await readBody(q)
          const body = raw ? JSON.parse(raw) : {}
          const ladder = ingestOverlayLadderBody(body)
          sendJson(r, 200, { ok: true, ladder })
        } catch (e) {
          sendJson(r, 500, {
            error: e instanceof Error ? e.message : String(e),
          })
        }
        return
      }
      sendJson(r, 405, { error: 'POST only' })
      return
    }

    if (pathOnly === '/api/overlay/style') {
      if (method === 'OPTIONS') {
        r.statusCode = 204
        r.setHeader('Access-Control-Allow-Origin', '*')
        r.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS')
        r.setHeader('Access-Control-Allow-Headers', 'content-type')
        r.end()
        return
      }
      if (method === 'GET') {
        sendJson(r, 200, { ok: true, style: getOverlayStyle() })
        return
      }
      if (method === 'PUT' || method === 'POST') {
        try {
          const raw = await readBody(q)
          const body = raw ? JSON.parse(raw) : {}
          const next = setOverlayStyle(
            (body as { style?: unknown }).style ?? body,
          )
          sendJson(r, 200, { ok: true, style: next })
        } catch (e) {
          sendJson(r, 500, {
            error: e instanceof Error ? e.message : String(e),
          })
        }
        return
      }
      sendJson(r, 405, { error: 'GET/PUT/POST only' })
      return
    }

    if (pathOnly === '/api/overlay/menu-style') {
      if (method === 'OPTIONS') {
        r.statusCode = 204
        r.setHeader('Access-Control-Allow-Origin', '*')
        r.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS')
        r.setHeader('Access-Control-Allow-Headers', 'content-type')
        r.end()
        return
      }
      if (method === 'GET') {
        sendJson(r, 200, { ok: true, style: getOverlayMenuStyle() })
        return
      }
      if (method === 'PUT' || method === 'POST') {
        try {
          const raw = await readBody(q)
          const body = raw ? JSON.parse(raw) : {}
          const next = setOverlayMenuStyle(
            (body as { style?: unknown }).style ?? body,
          )
          sendJson(r, 200, { ok: true, style: next })
        } catch (e) {
          sendJson(r, 500, {
            error: e instanceof Error ? e.message : String(e),
          })
        }
        return
      }
      sendJson(r, 405, { error: 'GET/PUT/POST only' })
      return
    }

    if (pathOnly === '/api/overlay/focus') {
      if (method === 'OPTIONS') {
        r.statusCode = 204
        r.setHeader('Access-Control-Allow-Origin', '*')
        r.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        r.setHeader('Access-Control-Allow-Headers', 'content-type')
        r.end()
        return
      }
      if (method === 'POST') {
        try {
          const raw = await readBody(q)
          const body = raw ? JSON.parse(raw) : {}
          const focus = setOverlayFocus(body)
          sendJson(r, 200, { ok: true, focus })
        } catch (e) {
          sendJson(r, 500, {
            error: e instanceof Error ? e.message : String(e),
          })
        }
        return
      }
      sendJson(r, 405, { error: 'POST only' })
      return
    }

    if (pathOnly === '/api/overlay/qr') {
      if (method === 'OPTIONS') {
        r.statusCode = 204
        r.setHeader('Access-Control-Allow-Origin', '*')
        r.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS')
        r.setHeader('Access-Control-Allow-Headers', 'content-type')
        r.end()
        return
      }
      if (method === 'GET') {
        const payload = await ensureOverlayQrPayload()
        sendJson(r, 200, { ok: true, qr: payload })
        return
      }
      if (method === 'PUT' || method === 'POST') {
        try {
          const raw = await readBody(q)
          const body = raw ? JSON.parse(raw) : {}
          const next = await setOverlayQr(
            (body as { qr?: unknown }).qr ?? body,
          )
          sendJson(r, 200, { ok: true, qr: next })
        } catch (e) {
          sendJson(r, 500, {
            error: e instanceof Error ? e.message : String(e),
          })
        }
        return
      }
      sendJson(r, 405, { error: 'GET/PUT/POST only' })
      return
    }

    if (pathOnly === '/api/overlay/status' && method === 'GET') {
      sendJson(r, 200, { ok: true, ...getOverlayHubStatus() })
      return
    }

    // Open Chrome/Edge for Web Bluetooth (Cursor Simple Browser cannot host BLE).
    if (
      (pathOnly === '/api/open-chrome' ||
        pathOnly === '/api/open-external-browser') &&
      method === 'POST'
    ) {
      let url = APP_URL
      try {
        const raw = await readBody(q)
        if (raw) {
          const body = JSON.parse(raw) as { url?: string }
          url = sanitizeLocalAppUrl(body.url, APP_URL)
        }
      } catch {
        /* use default */
      }
      const result = openExternalBrowser(url)
      sendJson(r, result.ok ? 200 : 500, { ...result, url })
      return
    }

    if (pathOnly.startsWith('/api/tip-menu')) {
      if (method === 'OPTIONS') {
        r.statusCode = 204
        r.setHeader('Access-Control-Allow-Origin', '*')
        r.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS')
        r.setHeader('Access-Control-Allow-Headers', 'content-type')
        r.end()
        return
      }
      if (method === 'GET') {
        const html = getTipMenuHtml()
        if (!html) {
          sendJson(r, 404, { error: 'No tip menu published yet' })
          return
        }
        r.statusCode = 200
        r.setHeader('Content-Type', 'text/html; charset=utf-8')
        r.setHeader('Cache-Control', 'no-store')
        r.end(html)
        return
      }
      if (method === 'PUT' || method === 'POST') {
        try {
          const raw = await readBody(q)
          let html = raw
          const ct = String(q.headers['content-type'] || '')
          if (ct.includes('application/json')) {
            const body = raw ? (JSON.parse(raw) as { html?: string }) : {}
            html = String(body.html || '')
          }
          const result = setTipMenuHtml(html)
          if (!result.ok) {
            sendJson(r, 400, { error: result.error })
            return
          }
          sendJson(r, 200, { ok: true, url: '/tip-menu', ...tipMenuMeta() })
        } catch (e) {
          sendJson(r, 500, {
            error: e instanceof Error ? e.message : String(e),
          })
        }
        return
      }
      sendJson(r, 405, { error: 'GET/PUT/POST only' })
      return
    }

    if (pathOnly === '/api/debug-log') {
      if (method === 'OPTIONS') {
        r.statusCode = 204
        r.setHeader('Access-Control-Allow-Origin', '*')
        r.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        r.setHeader('Access-Control-Allow-Headers', 'content-type')
        r.end()
        return
      }
      if (method !== 'POST') {
        sendJson(r, 405, { error: 'POST only' })
        return
      }
      try {
        const raw = await readBody(q)
        const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
        handleAgentDebugPost(body)
        sendJson(r, 200, { ok: true })
      } catch (e) {
        sendJson(r, 500, {
          error: e instanceof Error ? e.message : String(e),
        })
      }
      return
    }

    if (!pathOnly.startsWith('/api/lovense')) {
      next()
      return
    }

    if (method === 'OPTIONS') {
      r.statusCode = 204
      r.setHeader('Access-Control-Allow-Origin', '*')
      r.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      r.setHeader('Access-Control-Allow-Headers', 'content-type')
      r.end()
      return
    }

    if (method !== 'POST') {
      sendJson(r, 405, { error: 'POST only' })
      return
    }

    try {
      const raw = await readBody(q)
      const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      await handleLovensePost(body, r)
    } catch (e) {
      sendJson(r, 500, {
        error: e instanceof Error ? e.message : String(e),
      })
    }
  })
}

function justTheTipApiPlugin(): Plugin {
  return {
    name: 'just-the-tip-api',
    configureServer(server: ViteDevServer) {
      attachApis(server.middlewares)
    },
    configurePreviewServer(server: PreviewServer) {
      attachApis(server.middlewares)
    },
  }
}

const pagesBase = process.env.VITE_PAGES_BASE || '/'

export default defineConfig({
  base: pagesBase,
  plugins: [justTheTipApiPlugin()],
  resolve: {
    alias: {
      '@pulsefans/domain': pathResolveShared(),
    },
  },
  server: {
    host: '127.0.0.1',
    port: APP_PORT,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: APP_PORT,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },
})

function pathResolveShared() {
  return fileURLToPath(new URL('./shared/src', import.meta.url))
}
