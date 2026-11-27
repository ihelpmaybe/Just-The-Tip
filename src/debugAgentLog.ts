/** Debug-session logger: ingest + same-origin file (CORS-safe). */
export function agentDbg(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {},
) {
  const payload = {
    sessionId: '63e21f',
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  }
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/a8dbc250-d2c6-4438-81d4-34466a52f5b1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '63e21f',
    },
    body: JSON.stringify(payload),
  }).catch(() => {})
  fetch('/api/debug-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {})
  // #endregion
}
