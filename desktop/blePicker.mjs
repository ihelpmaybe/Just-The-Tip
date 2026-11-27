/**
 * Modal Bluetooth device picker for the Electron shell.
 * Chrome has a built-in chooser; Electron only emits select-bluetooth-device.
 * Web Bluetooth returns one device per requestDevice — multi-select queues the
 * rest and auto-picks them on the next chooser rounds.
 */
import { BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {BrowserWindow | null} */
let pickerWin = null
/** @type {BrowserWindow | null} */
let parentWin = null
/** @type {((deviceId: string) => void) | null} */
let bleCallback = null
/** @type {ReturnType<typeof setTimeout> | null} */
let bleTimer = null
const seen = new Map()
/** @type {Array<{ id: string, name: string, mac: string, connected: boolean }>} */
let linkedToys = []
/** Remaining deviceIds to auto-select on the next requestDevice rounds. */
let autoQueue = []
/** When auto-picking, wait until this id appears in Chromium's scan list. */
let waitingForId = ''
let ipcWired = false
let linkingBatch = false

function scoreName(n) {
  const s = String(n || '').toUpperCase()
  if (s.includes('LVS') || s.includes('NORA') || s.includes('LOVE')) return 3
  if (s) return 1
  return 0
}

/** Normalize LVS-Nora / Nora 0540 / Lush352 → comparable key. */
export function bleNameKey(raw) {
  let t = String(raw || '')
    .trim()
    .replace(/^LVS-/i, '')
  t = t.replace(/\s+\S*$/u, (tail) => (/^\s+\d+$/u.test(tail) ? '' : tail))
  t = t.replace(/\d+$/u, '')
  return t.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function namesMatch(deviceName, linkedName) {
  const dk = bleNameKey(deviceName)
  const lk = bleNameKey(linkedName)
  // Reject tiny keys — "N0104" → "n" must not match "Nora" → "nora".
  if (!dk || dk.length < 3 || !lk || lk.length < 3) return false
  if (dk === lk) return true
  // Prefix only when both sides are long enough (Lush352 ↔ Lush).
  return (
    dk.length >= 4 &&
    lk.length >= 4 &&
    (dk.startsWith(lk) || lk.startsWith(dk))
  )
}

function normalizeMac(raw) {
  const hex = String(raw || '')
    .toUpperCase()
    .replace(/[^0-9A-F]/g, '')
  return hex.length >= 12 ? hex.slice(-12) : ''
}

function linkKey(row) {
  if (row?.id) return `id:${row.id}`
  const mac = normalizeMac(row?.mac)
  if (mac) return `mac:${mac}`
  const nk = bleNameKey(row?.name)
  return nk ? `name:${nk}:${row?.name || ''}` : ''
}

/**
 * Map scan rows → linked toys 1:1.
 * Two nearby LVS-Nora ads must not both badge when only one Nora is linked.
 */
function annotateLinked(devices) {
  /** @type {Map<string, (typeof linkedToys)[number]>} */
  const hits = new Map()
  const claimed = new Set()

  const claim = (deviceId, row) => {
    const key = linkKey(row)
    if (!deviceId || !key || claimed.has(key) || hits.has(deviceId)) return false
    claimed.add(key)
    hits.set(deviceId, row)
    return true
  }

  // Pass 1: Electron / Web Bluetooth device id (unique per unit).
  for (const d of devices) {
    const row = linkedToys.find(
      (t) => t.id && d.deviceId && t.id === d.deviceId && !claimed.has(linkKey(t)),
    )
    if (row) claim(d.deviceId, row)
  }

  // Pass 2: MAC when Windows appends it to the advertisement name.
  for (const d of devices) {
    if (hits.has(d.deviceId)) continue
    const nameMac = normalizeMac(d.deviceName)
    if (!nameMac) continue
    const row = linkedToys.find(
      (t) =>
        normalizeMac(t.mac) === nameMac && !claimed.has(linkKey(t)),
    )
    if (row) claim(d.deviceId, row)
  }

  // Pass 3: name — at most one scan row per linked toy.
  for (const d of devices) {
    if (hits.has(d.deviceId)) continue
    const row = linkedToys.find(
      (t) => !claimed.has(linkKey(t)) && namesMatch(d.deviceName, t.name),
    )
    if (row) claim(d.deviceId, row)
  }

  return devices.map((d) => {
    const hit = hits.get(d.deviceId) || null
    return {
      ...d,
      alreadyLinked: Boolean(hit),
      linkedLabel: hit
        ? hit.connected
          ? 'Already linked'
          : 'Already linked · offline'
        : '',
      linkedOnline: Boolean(hit?.connected),
    }
  })
}

function wireIpc() {
  if (ipcWired) return
  ipcWired = true
  ipcMain.on('ble-pick', (_e, deviceIdOrIds) => {
    const ids = Array.isArray(deviceIdOrIds)
      ? deviceIdOrIds.map((id) => String(id || '')).filter(Boolean)
      : [String(deviceIdOrIds || '')].filter(Boolean)
    void acceptPicks(ids)
  })
  ipcMain.on('ble-cancel', () => {
    finish('')
  })
}

function clearTimer() {
  if (bleTimer) {
    clearTimeout(bleTimer)
    bleTimer = null
  }
}

function closePickerWindow() {
  if (pickerWin && !pickerWin.isDestroyed()) {
    pickerWin.removeAllListeners('closed')
    pickerWin.close()
  }
  pickerWin = null
}

function resetSession() {
  clearTimer()
  if (publishTimer) {
    clearTimeout(publishTimer)
    publishTimer = null
  }
  seen.clear()
  linkedToys = []
  autoQueue = []
  waitingForId = ''
  linkingBatch = false
  parentWin = null
}

function finish(deviceId) {
  const cb = bleCallback
  bleCallback = null
  resetSession()
  closePickerWindow()
  if (cb) cb(deviceId)
}

/** Tell the renderer how many extra requestDevice rounds to run. */
async function setPendingExtra(count) {
  const win = parentWin
  if (!win || win.isDestroyed()) return
  try {
    await win.webContents.executeJavaScript(
      `window.__jttBlePendingLinks = ${Math.max(0, Number(count) || 0)}`,
      true,
    )
  } catch {
    /* ignore */
  }
}

function sendStatus(text) {
  if (!pickerWin || pickerWin.isDestroyed()) return
  pickerWin.webContents.send('ble-status', String(text || ''))
}

/**
 * Resolve the current chooser with deviceId. If more are queued, keep the
 * picker open so the renderer can chain more requestDevice calls.
 */
function resolveChooser(deviceId) {
  clearTimer()
  const cb = bleCallback
  bleCallback = null
  waitingForId = ''
  if (!cb) return

  if (autoQueue.length === 0) {
    linkingBatch = false
    resetSession()
    closePickerWindow()
    cb(deviceId)
    return
  }

  linkingBatch = true
  sendStatus(
    `Linking… ${autoQueue.length} more after this one. Keep toys powered on.`,
  )
  cb(deviceId)
}

async function acceptPicks(ids) {
  const unique = []
  const used = new Set()
  for (const id of ids) {
    if (!id || used.has(id)) continue
    used.add(id)
    unique.push(id)
  }
  if (!unique.length) {
    finish('')
    return
  }
  const [first, ...rest] = unique
  autoQueue = rest
  waitingForId = ''
  await setPendingExtra(rest.length)
  if (rest.length) {
    linkingBatch = true
    sendStatus(`Linking ${unique.length} toys…`)
  }
  resolveChooser(first)
}

function ingestDevices(devices) {
  for (const d of devices || []) {
    const id = String(d?.deviceId || '')
    if (!id) continue
    seen.set(id, {
      deviceId: id,
      deviceName: String(d.deviceName || '').trim() || 'Unknown device',
    })
  }
}

async function refreshLinkedFromParent() {
  const win = parentWin
  if (!win || win.isDestroyed()) {
    linkedToys = []
    return
  }
  try {
    const rows = await win.webContents.executeJavaScript(
      `(() => {
        const raw = window.__jttBleLinked
        if (!Array.isArray(raw)) return []
        return raw.map((t) => ({
          id: String(t && t.id || ''),
          name: String(t && t.name || ''),
          mac: String(t && t.mac || ''),
          connected: t && t.connected !== false,
        }))
      })()`,
      true,
    )
    linkedToys = Array.isArray(rows) ? rows : []
  } catch {
    linkedToys = []
  }
}

function ensureWindow(parent) {
  parentWin = parent && !parent.isDestroyed() ? parent : null
  if (pickerWin && !pickerWin.isDestroyed()) {
    pickerWin.focus()
    return pickerWin
  }
  pickerWin = new BrowserWindow({
    parent: parentWin || undefined,
    modal: Boolean(parentWin),
    width: 440,
    height: 560,
    minWidth: 360,
    minHeight: 420,
    backgroundColor: '#0a1524',
    autoHideMenuBar: true,
    title: 'Choose a Bluetooth toy',
    webPreferences: {
      preload: path.join(__dirname, 'ble-picker-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  void pickerWin.loadFile(path.join(__dirname, 'ble-picker.html'))
  pickerWin.on('closed', () => {
    pickerWin = null
    if (bleCallback) finish('')
    else {
      autoQueue = []
      waitingForId = ''
      linkingBatch = false
    }
  })
  pickerWin.webContents.on('did-finish-load', () => {
    void publishList()
  })
  return pickerWin
}

async function publishList() {
  if (!pickerWin || pickerWin.isDestroyed()) return
  await refreshLinkedFromParent()
  const list = annotateLinked([...seen.values()]).sort((a, b) => {
    if (a.alreadyLinked !== b.alreadyLinked) return a.alreadyLinked ? 1 : -1
    return scoreName(b.deviceName) - scoreName(a.deviceName)
  })
  pickerWin.webContents.send('ble-devices', list)
}

let publishTimer = null
function schedulePublishList() {
  if (publishTimer) return
  publishTimer = setTimeout(() => {
    publishTimer = null
    void publishList()
  }, 120)
}

/**
 * Arm the Web Bluetooth callback and open/update the picker.
 * Call from select-bluetooth-device (after preventDefault).
 */
export function handleSelectBluetoothDevice(parent, devices, callback) {
  wireIpc()
  parentWin = parent && !parent.isDestroyed() ? parent : null
  ingestDevices(devices)
  bleCallback = callback
  if (!bleTimer) {
    bleTimer = setTimeout(() => finish(''), 45_000)
  }

  // Still waiting for a queued id to show up in Chromium's scan list.
  if (waitingForId) {
    if (seen.has(waitingForId)) {
      const id = waitingForId
      waitingForId = ''
      resolveChooser(id)
    } else {
      sendStatus('Waiting for the next toy to advertise…')
      schedulePublishList()
    }
    return
  }

  // Multi-link follow-up: auto-pick the next queued id (no second UI click).
  if (autoQueue.length > 0) {
    const next = autoQueue.shift()
    void setPendingExtra(autoQueue.length)
    if (seen.has(next)) {
      resolveChooser(next)
    } else {
      waitingForId = next
      sendStatus('Waiting for the next toy to advertise…')
      schedulePublishList()
    }
    return
  }

  // Fresh chooser — user picks (possibly many) in the modal.
  if (!linkingBatch) {
    ensureWindow(parent)
  }
  schedulePublishList()
}
