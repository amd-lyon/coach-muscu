import { app, BrowserWindow, shell } from 'electron'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDatabase, closeDatabase } from './db/database'
import { registerIpcHandlers } from './ipc/handlers'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    show: false,
    title: 'Coach Muscu',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#16181d',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false, // requis pour le preload ESM avec contextBridge
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.on('ready-to-show', () => win.show())

  // Tout lien externe s'ouvre dans le navigateur, jamais dans l'app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Base de données + dossiers locaux dans userData (100% local).
  const userData = app.getPath('userData')
  const backupsDir = join(userData, 'backups')
  if (!existsSync(backupsDir)) mkdirSync(backupsDir, { recursive: true })
  initDatabase(join(userData, 'coach-muscu.sqlite'))
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDatabase()
    app.quit()
  }
})

app.on('before-quit', () => closeDatabase())
