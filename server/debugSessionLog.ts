/**
 * Session debug logger → workspace debug-c3be18.log (NDJSON) + optional ingest.
 * Used only during agent debug sessions.
 */
import { appendFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const LOG = resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../debug-c3be18.log',
)
const ENDPOINT =
  'http://127.0.0.1:7339/ingest/1502796b-1cc2-4fac-b379-bccddd17a74e'
const SESSION = 'c3be18'

export function agentLog(
  location: string,
  message: string,
  data: Record<string, unknown> = {},
  hypothesisId = '',
  runId = 'emu-session',
) {
  const payload = {
    sessionId: SESSION,
    location,
    message,
    data,
    hypothesisId,
    runId,
    timestamp: Date.now(),
  }
  try {
    appendFileSync(LOG, JSON.stringify(payload) + '\n', 'utf8')
  } catch {
    /* ignore disk */
  }
  // fire-and-forget ingest (browser/node with fetch)
  try {
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': SESSION,
      },
      body: JSON.stringify(payload),
    }).catch(() => {})
  } catch {
    /* ignore */
  }
}
