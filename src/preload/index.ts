import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc/contract'
import type { Api } from '@shared/ipc/contract'

/**
 * Pont sécurisé exposé au renderer sous `window.api`.
 * Surface fermée : le renderer n'a accès à rien d'autre qu'à ces méthodes.
 */
const api: Api = {
  getProfile: () => ipcRenderer.invoke(IPC.profileGet),
  saveProfile: (p) => ipcRenderer.invoke(IPC.profileSave, p),
  listExercises: () => ipcRenderer.invoke(IPC.exercisesList),
  saveExercise: (ex) => ipcRenderer.invoke(IPC.exerciseSave, ex),
  deleteExercise: (id) => ipcRenderer.invoke(IPC.exerciseDelete, id),
  listLimitations: () => ipcRenderer.invoke(IPC.limitationsList),
  saveLimitation: (l) => ipcRenderer.invoke(IPC.limitationSave, l),
  deleteLimitation: (id) => ipcRenderer.invoke(IPC.limitationDelete, id),
  generateProgram: (config) => ipcRenderer.invoke(IPC.programGenerate, config),
  listPrograms: () => ipcRenderer.invoke(IPC.programsList),
  getProgram: (id) => ipcRenderer.invoke(IPC.programGet, id),
  saveProgram: (p) => ipcRenderer.invoke(IPC.programSave, p),
  setActiveProgram: (id) => ipcRenderer.invoke(IPC.programSetActive, id),
  deleteProgram: (id) => ipcRenderer.invoke(IPC.programDelete, id),
  listSessions: (programId) => ipcRenderer.invoke(IPC.sessionsList, programId),
  saveSession: (s) => ipcRenderer.invoke(IPC.sessionSave, s),
  deleteSession: (id) => ipcRenderer.invoke(IPC.sessionDelete, id),
  saveDailyState: (s) => ipcRenderer.invoke(IPC.dailyStateSave, s),
  getDailyState: (date) => ipcRenderer.invoke(IPC.dailyStateGet, date),
  listDailyStates: () => ipcRenderer.invoke(IPC.dailyStatesList),
  listMeasures: () => ipcRenderer.invoke(IPC.measuresList),
  saveMeasure: (m) => ipcRenderer.invoke(IPC.measureSave, m),
  deleteMeasure: (id) => ipcRenderer.invoke(IPC.measureDelete, id),
  exportBackup: () => ipcRenderer.invoke(IPC.backupExport),
  importBackup: () => ipcRenderer.invoke(IPC.backupImport),
  createBackup: () => ipcRenderer.invoke(IPC.backupCreate),
  resolveImage: (spec) => ipcRenderer.invoke(IPC.imageResolve, spec),
  importImage: () => ipcRenderer.invoke(IPC.imageImport),
  openExternal: (url) => ipcRenderer.invoke(IPC.openExternal, url),
  seedDemo: () => ipcRenderer.invoke(IPC.seedDemo),
  resetApp: () => ipcRenderer.invoke(IPC.resetApp),
}

contextBridge.exposeInMainWorld('api', api)
