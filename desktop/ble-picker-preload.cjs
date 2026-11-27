const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('blePicker', {
  onDevices(cb) {
    const handler = (_event, list) => {
      try {
        cb(Array.isArray(list) ? list : [])
      } catch {
        /* ignore */
      }
    }
    ipcRenderer.on('ble-devices', handler)
    return () => ipcRenderer.removeListener('ble-devices', handler)
  },
  onStatus(cb) {
    const handler = (_event, text) => {
      try {
        cb(String(text || ''))
      } catch {
        /* ignore */
      }
    }
    ipcRenderer.on('ble-status', handler)
    return () => ipcRenderer.removeListener('ble-status', handler)
  },
  pick(deviceIdOrIds) {
    if (Array.isArray(deviceIdOrIds)) {
      ipcRenderer.send(
        'ble-pick',
        deviceIdOrIds.map((id) => String(id || '')).filter(Boolean),
      )
      return
    }
    ipcRenderer.send('ble-pick', String(deviceIdOrIds || ''))
  },
  cancel() {
    ipcRenderer.send('ble-cancel')
  },
})
