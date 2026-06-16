import { app, dialog, ipcMain, shell } from 'electron'
import { randomUUID } from 'node:crypto'
import { writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { IPC } from '@shared/ipc/contract'
import { generateProgram } from '@shared/domain/generator/generateProgram'
import type { ProgramConfig } from '@shared/types/program'
import {
  dailyStateRepo,
  exerciseRepo,
  limitationRepo,
  measureRepo,
  profileRepo,
  programRepo,
  ratingRepo,
  sessionRepo,
} from '../db/repositories'
import { seedDemoData } from '../db/seed/demo.seed'
import { getDb } from '../db/database'
import { importImage, resolveImage } from '../images'

const nowIso = () => new Date().toISOString()

/** Enregistre tous les handlers IPC. Chaque canal renvoie des données typées. */
export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.profileGet, () => profileRepo.get())
  ipcMain.handle(IPC.profileSave, (_e, p) => profileRepo.save({ ...p, updatedAt: nowIso() }))

  ipcMain.handle(IPC.exercisesList, () => exerciseRepo.list())
  ipcMain.handle(IPC.exerciseSave, (_e, ex) => exerciseRepo.save({ ...ex, id: ex.id || randomUUID() }))
  ipcMain.handle(IPC.exerciseDelete, (_e, id: string) => exerciseRepo.delete(id))

  ipcMain.handle(IPC.limitationsList, () => limitationRepo.list())
  ipcMain.handle(IPC.limitationSave, (_e, l) =>
    limitationRepo.save({ ...l, id: l.id || randomUUID(), updatedAt: nowIso(), createdAt: l.createdAt || nowIso() }),
  )
  ipcMain.handle(IPC.limitationDelete, (_e, id: string) => limitationRepo.delete(id))

  ipcMain.handle(IPC.programGenerate, (_e, config: ProgramConfig) => {
    const profile = profileRepo.get()
    const program = generateProgram({
      config,
      level: profile?.level ?? 'intermediaire',
      catalog: exerciseRepo.list(),
      limitations: limitationRepo.list(),
      ratings: ratingRepo.list(),
      makeId: () => randomUUID(),
      now: nowIso(),
    })
    programRepo.save(program)
    return program
  })
  ipcMain.handle(IPC.programsList, () => programRepo.list())
  ipcMain.handle(IPC.programGet, (_e, id: string) => programRepo.get(id))
  ipcMain.handle(IPC.programSave, (_e, p) => programRepo.save({ ...p, updatedAt: nowIso() }))
  ipcMain.handle(IPC.programSetActive, (_e, id: string) => programRepo.setActive(id))
  ipcMain.handle(IPC.programDelete, (_e, id: string) => programRepo.delete(id))

  ipcMain.handle(IPC.sessionsList, (_e, programId?: string) => sessionRepo.list(programId))
  ipcMain.handle(IPC.sessionSave, (_e, s) =>
    sessionRepo.save({ ...s, id: s.id || randomUUID(), updatedAt: nowIso(), createdAt: s.createdAt || nowIso() }),
  )
  ipcMain.handle(IPC.sessionDelete, (_e, id: string) => sessionRepo.delete(id))

  ipcMain.handle(IPC.dailyStateGet, (_e, date: string) => dailyStateRepo.get(date))
  ipcMain.handle(IPC.dailyStatesList, () => dailyStateRepo.list())
  ipcMain.handle(IPC.dailyStateSave, (_e, s) =>
    dailyStateRepo.save({ ...s, id: s.id || randomUUID(), createdAt: s.createdAt || nowIso() }),
  )

  ipcMain.handle(IPC.measuresList, () => measureRepo.list())
  ipcMain.handle(IPC.measureSave, (_e, m) => measureRepo.save({ ...m, id: m.id || randomUUID() }))
  ipcMain.handle(IPC.measureDelete, (_e, id: string) => measureRepo.delete(id))

  ipcMain.handle(IPC.imageResolve, (_e, spec) => resolveImage(spec))
  ipcMain.handle(IPC.imageImport, () => importImage())

  ipcMain.handle(IPC.openExternal, (_e, url: string) => shell.openExternal(url))

  // ---------- Sauvegardes ----------
  ipcMain.handle(IPC.backupExport, async () => {
    const snapshot = buildSnapshot()
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Exporter une sauvegarde',
      defaultPath: join(app.getPath('downloads'), `coach-muscu-backup-${Date.now()}.json`),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (canceled || !filePath) return ''
    writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8')
    return filePath
  })

  ipcMain.handle(IPC.backupImport, async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Importer une sauvegarde',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (canceled || !filePaths[0]) return false
    const snapshot = JSON.parse(readFileSync(filePaths[0], 'utf-8'))
    restoreSnapshot(snapshot)
    return true
  })

  ipcMain.handle(IPC.backupCreate, () => {
    const dir = join(app.getPath('userData'), 'backups')
    const snapshot = buildSnapshot()
    writeFileSync(join(dir, `auto-${Date.now()}.json`), JSON.stringify(snapshot), 'utf-8')
  })

  ipcMain.handle(IPC.seedDemo, () => seedDemoData())

  ipcMain.handle(IPC.resetApp, () => {
    const db = getDb()
    for (const t of ['profile', 'limitations', 'programs', 'sessions', 'daily_states', 'measures', 'ratings']) {
      db.prepare(`DELETE FROM ${t}`).run()
    }
  })
}

/** Instantané complet des données (pour export/sauvegarde). */
function buildSnapshot() {
  return {
    version: 1,
    exportedAt: nowIso(),
    profile: profileRepo.get(),
    exercises: exerciseRepo.list(),
    limitations: limitationRepo.list(),
    programs: programRepo.list(),
    sessions: sessionRepo.list(),
    measures: measureRepo.list(),
    ratings: ratingRepo.list(),
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function restoreSnapshot(snap: any): void {
  if (snap.profile) profileRepo.save(snap.profile)
  for (const ex of snap.exercises ?? []) exerciseRepo.save(ex)
  for (const l of snap.limitations ?? []) limitationRepo.save(l)
  for (const p of snap.programs ?? []) programRepo.save(p)
  for (const s of snap.sessions ?? []) sessionRepo.save(s)
  for (const m of snap.measures ?? []) measureRepo.save(m)
  for (const r of snap.ratings ?? []) ratingRepo.save(r)
}
