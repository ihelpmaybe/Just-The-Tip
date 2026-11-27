/**
 * Windows desktop shell — same 127.0.0.1:5193 host, Chromium window.
 * Web Bluetooth is enabled so operators do not need a separate Chrome window.
 */
import { app, BrowserWindow, Menu, dialog, session, shell, nativeImage } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { startHost } from './host.mjs'
import { handleSelectBluetoothDevice } from './blePicker.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function appIcon() {
  const packed = path.join(process.resourcesPath, 'icon.png')
  const local = path.join(__dirname, '..', 'build', 'icon.png')
  const file = app.isPackaged ? packed : local
  return nativeImage.createFromPath(file)
}

app.commandLine.appendSwitch('enable-experimental-web-platform-features')
app.commandLine.appendSwitch('enable-features', 'WebBluetooth')

function uiDir() {
  if (app.isPackaged) return path.join(process.resourcesPath, 'ui')
  return path.join(__dirname, '..', 'dist')
}

/** Right-click Cut / Copy / Paste for inputs (Electron has no default edit menu). */
function attachEditContextMenu(win) {
  win.webContents.on('context-menu', (_event, params) => {
    const { editFlags } = params
    const items = []
    if (params.isEditable) {
      items.push(
        { role: 'undo', enabled: editFlags.canUndo },
        { role: 'redo', enabled: editFlags.canRedo },
        { type: 'separator' },
        { role: 'cut', enabled: editFlags.canCut },
        { role: 'copy', enabled: editFlags.canCopy },
        { role: 'paste', enabled: editFlags.canPaste },
        { role: 'delete', enabled: editFlags.canDelete },
        { type: 'separator' },
        { role: 'selectAll', enabled: editFlags.canSelectAll },
      )
    } else if (params.selectionText?.trim()) {
      items.push({ role: 'copy', enabled: editFlags.canCopy })
    }
    if (!items.length) return
    Menu.buildFromTemplate(items).popup({ window: win })
  })
}

function createWindow(url) {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#050d18',
    icon: appIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  })
  attachEditContextMenu(win)
  win.webContents.setWindowOpenHandler(({ url: next }) => {
    // Overlay / menu / QR previews → child window (do not replace the operator UI).
    if (
      next.startsWith('http://127.0.0.1:5193/') &&
      /\/overlay(?:\/|\?|$)/.test(next)
    ) {
      const preview = new BrowserWindow({
        width: 1280,
        height: 720,
        minWidth: 640,
        minHeight: 360,
        backgroundColor: '#050d18',
        icon: appIcon(),
        autoHideMenuBar: true,
        title: 'Just The Tip — preview',
        webPreferences: {
          contextIsolation: true,
          sandbox: true,
          nodeIntegration: false,
        },
      })
      attachEditContextMenu(preview)
      void preview.loadURL(next)
      return { action: 'deny' }
    }
    // Never navigate the main shell away for other local links.
    if (next.startsWith('http://127.0.0.1:5193/')) {
      return { action: 'deny' }
    }
    void shell.openExternal(next)
    return { action: 'deny' }
  })
  win.webContents.on('select-bluetooth-device', (event, devices, callback) => {
    event.preventDefault()
    handleSelectBluetoothDevice(win, devices, callback)
  })
  void win.loadURL(url)
  return win
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => {
    return (
      permission === 'clipboard-read' ||
      permission === 'clipboard-sanitized-write' ||
      permission === 'clipboard-write' ||
      permission === 'bluetooth'
    )
  })
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(
      permission === 'clipboard-read' ||
        permission === 'clipboard-sanitized-write' ||
        permission === 'clipboard-write' ||
        permission === 'bluetooth',
    )
  })
  try {
    const { url } = await startHost({
      distDir: uiDir(),
      exitOnListenError: false,
    })
    createWindow(url)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(url)
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Just The Tip] failed to start host:', msg)
    dialog.showErrorBox(
      'Just The Tip failed to start',
      `${msg}\n\nUI folder: ${uiDir()}\nReinstall from the latest Setup exe, or run npm start.`,
    )
    app.quit()
  }
})

app.on('window-all-closed', () => {
  app.quit()
})
