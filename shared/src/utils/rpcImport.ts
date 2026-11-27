import { formatRpcList, parseRpcList } from '../chain/config'

/** Parse pasted/imported RPC list content (text or JSON). */
export function parseRpcImportText(text: string): string[] {
  let merged = text
  try {
    const j = JSON.parse(text) as unknown
    if (Array.isArray(j)) {
      merged = j.map(String).join('\n')
    } else if (
      j &&
      typeof j === 'object' &&
      Array.isArray((j as { rpcs?: string[] }).rpcs)
    ) {
      merged = (j as { rpcs: string[] }).rpcs.join('\n')
    }
  } catch {
    /* plain text */
  }
  return parseRpcList(merged)
}

export function mergeRpcLists(existingText: string, incoming: string[]): string {
  const existing = parseRpcList(existingText)
  const all = parseRpcList([...existing, ...incoming].join('\n'))
  return formatRpcList(all)
}
