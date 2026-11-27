/**
 * Tip-menu HTML — pure builder from shared domain; browser publish/download here.
 */
export {
  buildTipMenuHtml,
  tipMenuDownloadName,
} from '@pulsefans/domain/utils/exportTipMenuHtml'
export type {
  TipMenuExportInput,
  TipMenuExportRow,
  TipMenuLink,
  MenuExportOrientation,
} from '@pulsefans/domain/utils/tipMenuTypes'

import {
  buildTipMenuHtml,
  tipMenuDownloadName,
} from '@pulsefans/domain/utils/exportTipMenuHtml'
import type { TipMenuExportInput } from '@pulsefans/domain/utils/tipMenuTypes'

export function downloadTipMenuHtml(
  html: string,
  _input?: TipMenuExportInput,
): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = tipMenuDownloadName()
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Optional local preview while Just The Tip is running. */
export async function publishTipMenuHtml(html: string): Promise<string> {
  const res = await fetch('/api/tip-menu', {
    method: 'PUT',
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: html,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const j = (await res.json()) as { error?: string }
      if (j.error) detail = j.error
    } catch {
      /* ignore */
    }
    throw new Error(`Could not publish tip menu (${res.status}): ${detail}`)
  }
  return '/tip-menu'
}

/** Download customer menu HTML (and optional local preview tab). */
export async function exportTipMenuHtml(
  input: TipMenuExportInput,
): Promise<{ opened: boolean; downloaded: boolean }> {
  const html = buildTipMenuHtml(input)
  let opened = false
  try {
    const path = await publishTipMenuHtml(html)
    window.open(path, '_blank', 'noopener,noreferrer')
    opened = true
  } catch {
    opened = false
  }
  downloadTipMenuHtml(html, input)
  return { opened, downloaded: true }
}
