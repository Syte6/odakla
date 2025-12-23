const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    dbQuery: (sql, params) => ipcRenderer.invoke('db-query', { sql, params }),
    dbRun: (sql, params) => ipcRenderer.invoke('db-run', { sql, params }),
    getPlatform: () => process.platform,
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    setDoNotDisturb: (enabled) => ipcRenderer.invoke('set-do-not-disturb', enabled),

    // Update handlers
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_event, value) => callback(value)),
    onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_event, value) => callback(value)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_event, value) => callback(value)),
    installUpdate: () => ipcRenderer.invoke('install-update')
});
