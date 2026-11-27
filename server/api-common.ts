import type { IncomingMessage, ServerResponse } from 'node:http'
import { appendFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  probeLocalIp,
  probeLocalIpRemote,
  discoverConnect,
  stopOnBase,
  vibrateOnBase,
  channelTestOnBase,
  getToys,
  type ToyRow,
} from './lovense-node.ts'

const AGENT_DEBUG_LOG = resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../debug-63e21f.log',
)

/** Same-origin sink so browser BLE logs land in the workspace NDJSON file. */
export function handleAgentDebugPost(body: Record<string, unknown>): void {
  const payload = {
    sessionId: '63e21f',
    hypothesisId: body.hypothesisId || '',
    location: String(body.location || ''),
    message: String(body.message || ''),
    data: body.data && typeof body.data === 'object' ? body.data : {},
    timestamp: Number(body.timestamp) || Date.now(),
  }
  try {
    appendFileSync(AGENT_DEBUG_LOG, JSON.stringify(payload) + '\n', 'utf8')
  } catch {
    /* packaged installs may not be writable next to the app */
  }
}

export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

/** Handle POST /api/lovense — returns true when response written. */
export async function handleLovensePost(
  body: Record<string, unknown>,
  res: ServerResponse,
): Promise<void> {
  const op = String(body.op || '')

  if (op === 'probe') {
    const localIp = String(body.localIp || body.host || '')
    const mode = String(body.mode || '').toLowerCase()
    const result =
      mode === 'remote' ? await probeLocalIpRemote(localIp) : await probeLocalIp(localIp)
    sendJson(res, result.ok ? 200 : 502, result)
    return
  }

  if (op === 'discover') {
    const result = await discoverConnect()
    sendJson(res, 200, result)
    return
  }

  if (op === 'vibrate') {
    const base = String(body.base || '')
    if (!base) {
      sendJson(res, 400, { error: 'base required (call probe first)' })
      return
    }
    let intensity = Number(body.intensity)
    if (!Number.isFinite(intensity)) intensity = 10
    if (intensity > 0 && intensity <= 1) intensity = intensity * 20
    const durationSec = Number(body.durationSec) || 2
    const toys = Array.isArray(body.toys) ? (body.toys as ToyRow[]) : []
    const result = await vibrateOnBase(base, intensity, durationSec, toys)
    sendJson(res, 200, result)
    return
  }

  if (op === 'channel') {
    const base = String(body.base || '')
    if (!base) {
      sendJson(res, 400, { error: 'base required (call probe first)' })
      return
    }
    let intensity = Number(body.intensity)
    if (!Number.isFinite(intensity)) intensity = 18
    if (intensity > 0 && intensity <= 1) intensity = intensity * 20
    const durationSec = Number(body.durationSec) || 3
    const channel = String(body.channel || body.feature || 'vibrate')
    const toyId = body.toyId != null ? String(body.toyId) : undefined
    const toys = Array.isArray(body.toys) ? (body.toys as ToyRow[]) : []
    try {
      const result = await channelTestOnBase(
        base,
        channel,
        intensity,
        durationSec,
        toys,
        toyId,
      )
      sendJson(res, 200, result)
    } catch (e) {
      sendJson(res, 502, {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      })
    }
    return
  }

  if (op === 'stop') {
    const base = String(body.base || '')
    if (!base) {
      sendJson(res, 400, { error: 'base required' })
      return
    }
    const toys = Array.isArray(body.toys) ? (body.toys as ToyRow[]) : []
    await stopOnBase(base, toys)
    sendJson(res, 200, { ok: true })
    return
  }

  if (op === 'toys') {
    const base = String(body.base || '')
    if (!base) {
      sendJson(res, 400, { error: 'base required' })
      return
    }
    try {
      const { list, raw } = await getToys(base)
      sendJson(res, 200, { ok: true, list, raw })
    } catch (e) {
      sendJson(res, 502, {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      })
    }
    return
  }

  sendJson(res, 400, {
    error: 'unknown op — use probe | discover | vibrate | channel | stop | toys',
  })
}
