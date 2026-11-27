export * from '@pulsefans/domain/utils/toyMenuPack'
import type { ToyMenuPack } from '@pulsefans/domain/utils/toyMenuPack'
import { APP_SLUG } from '../version'

/** Browser download helper (desktop only). */
export function downloadToyMenuPack(pack: ToyMenuPack, filename?: string) {
  const slug = (pack.label || 'toy')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  const day = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(pack, null, 2)], {
    type: 'application/json',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download =
    filename || `${APP_SLUG}-toy-menu-${slug || 'menu'}-${day}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}
