// Contrat IPC partagé entre le main et le renderer.
// La surface est volontairement limitée et entièrement typée.
import type { Exercise } from '../types/exercise'
import type { Limitation } from '../types/pain'
import type { Profile } from '../types/profile'
import type { Program, ProgramConfig } from '../types/program'
import type { BodyMeasure, DailyState, SessionLog } from '../types/session'

/** Noms de canaux IPC (centralisés pour éviter les fautes de frappe). */
export const IPC = {
  profileGet: 'profile:get',
  profileSave: 'profile:save',
  exercisesList: 'exercises:list',
  exerciseSave: 'exercise:save',
  exerciseDelete: 'exercise:delete',
  limitationsList: 'limitations:list',
  limitationSave: 'limitation:save',
  limitationDelete: 'limitation:delete',
  programGenerate: 'program:generate',
  programsList: 'programs:list',
  programGet: 'program:get',
  programSave: 'program:save',
  programSetActive: 'program:setActive',
  programDelete: 'program:delete',
  sessionsList: 'sessions:list',
  sessionSave: 'session:save',
  sessionDelete: 'session:delete',
  dailyStateSave: 'dailyState:save',
  dailyStateGet: 'dailyState:get',
  dailyStatesList: 'dailyState:list',
  measuresList: 'measures:list',
  measureSave: 'measure:save',
  measureDelete: 'measure:delete',
  backupExport: 'backup:export',
  backupImport: 'backup:import',
  backupCreate: 'backup:create',
  imageResolve: 'image:resolve',
  imageImport: 'image:import',
  openExternal: 'app:openExternal',
  seedDemo: 'app:seedDemo',
  resetApp: 'app:reset',
} as const

/** Signatures du pont exposé au renderer (window.api). */
export interface Api {
  getProfile(): Promise<Profile | null>
  saveProfile(profile: Profile): Promise<Profile>
  listExercises(): Promise<Exercise[]>
  saveExercise(ex: Exercise): Promise<Exercise>
  deleteExercise(id: string): Promise<void>
  listLimitations(): Promise<Limitation[]>
  saveLimitation(l: Limitation): Promise<Limitation>
  deleteLimitation(id: string): Promise<void>
  generateProgram(config: ProgramConfig): Promise<Program>
  listPrograms(): Promise<Program[]>
  getProgram(id: string): Promise<Program | null>
  saveProgram(p: Program): Promise<Program>
  setActiveProgram(id: string): Promise<void>
  deleteProgram(id: string): Promise<void>
  listSessions(programId?: string): Promise<SessionLog[]>
  saveSession(s: SessionLog): Promise<SessionLog>
  deleteSession(id: string): Promise<void>
  saveDailyState(s: DailyState): Promise<DailyState>
  getDailyState(date: string): Promise<DailyState | null>
  listDailyStates(): Promise<DailyState[]>
  listMeasures(): Promise<BodyMeasure[]>
  saveMeasure(m: BodyMeasure): Promise<BodyMeasure>
  deleteMeasure(id: string): Promise<void>
  exportBackup(): Promise<string> // chemin du fichier exporté
  importBackup(): Promise<boolean>
  createBackup(): Promise<void>
  resolveImage(spec: { url?: string; localPath?: string }): Promise<{ dataUrl: string; localPath: string } | null>
  importImage(): Promise<{ dataUrl: string; localPath: string } | null>
  openExternal(url: string): Promise<void>
  seedDemo(): Promise<void>
  resetApp(): Promise<void>
}
