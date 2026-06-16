import type { Exercise } from '../../types/exercise'
import type { MuscleGroup } from '../../types/common'
import type { BodyMeasure, DailyState, SessionLog } from '../../types/session'
import { estimate1RM } from '../load/progression'

/** Volume d'une série terminée (charge × répétitions). */
function setVolume(loadKg?: number, reps?: number): number {
  return (loadKg ?? 0) * (reps ?? 0)
}

/** Filtre une liste datée sur les N derniers jours (0 = tout). */
export function filterSince<T extends { date: string }>(items: T[], sinceDays: number, today: string): T[] {
  if (!sinceDays) return items
  const limit = new Date(today)
  limit.setDate(limit.getDate() - sinceDays)
  return items.filter((i) => new Date(i.date) >= limit)
}

export interface Kpis {
  doneSessions: number
  adherencePct: number
  totalVolume: number
  avgDurationMin: number
  totalSets: number
}

export function computeKpis(sessions: SessionLog[], plannedCount: number): Kpis {
  const done = sessions.filter((s) => s.status === 'terminee')
  let totalVolume = 0
  let totalSets = 0
  let durationSum = 0
  let durationN = 0
  for (const s of done) {
    for (const e of s.exercises) {
      for (const st of e.sets) {
        if (!st.done) continue
        totalVolume += setVolume(st.loadKg, st.reps)
        totalSets += 1
      }
    }
    if (s.durationMin) {
      durationSum += s.durationMin
      durationN += 1
    }
  }
  return {
    doneSessions: done.length,
    adherencePct: plannedCount ? Math.round((done.length / plannedCount) * 100) : 0,
    totalVolume: Math.round(totalVolume),
    avgDurationMin: durationN ? Math.round(durationSum / durationN) : 0,
    totalSets,
  }
}

/** Volume total par séance (point = date). */
export function volumePerSession(sessions: SessionLog[]): { date: string; volume: number }[] {
  return sessions
    .filter((s) => s.status !== 'en-cours')
    .map((s) => ({
      date: s.date,
      volume: Math.round(
        s.exercises.reduce(
          (a, e) => a + e.sets.reduce((x, st) => x + (st.done ? setVolume(st.loadKg, st.reps) : 0), 0),
          0,
        ),
      ),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Répartition du volume et des séries par groupe musculaire principal. */
export function volumePerMuscle(
  sessions: SessionLog[],
  catalog: Map<string, Exercise>,
): { muscle: MuscleGroup; volume: number; sets: number }[] {
  const acc = new Map<MuscleGroup, { volume: number; sets: number }>()
  for (const s of sessions) {
    for (const e of s.exercises) {
      const muscle = catalog.get(e.exerciseId)?.primaryMuscle
      if (!muscle) continue
      const cur = acc.get(muscle) ?? { volume: 0, sets: 0 }
      for (const st of e.sets) {
        if (!st.done) continue
        cur.volume += setVolume(st.loadKg, st.reps)
        cur.sets += 1
      }
      acc.set(muscle, cur)
    }
  }
  return [...acc.entries()]
    .map(([muscle, v]) => ({ muscle, volume: Math.round(v.volume), sets: v.sets }))
    .sort((a, b) => b.sets - a.sets)
}

/** Évolution de la charge max et du 1RM estimé pour un exercice. */
export function loadProgression(
  sessions: SessionLog[],
  exerciseId: string,
): { date: string; maxLoad: number; est1RM: number | null }[] {
  const out: { date: string; maxLoad: number; est1RM: number | null }[] = []
  for (const s of sessions.filter((x) => x.status !== 'en-cours')) {
    let maxLoad = 0
    let best1RM: number | null = null
    let found = false
    for (const e of s.exercises) {
      if (e.exerciseId !== exerciseId) continue
      for (const st of e.sets) {
        if (!st.done || !st.loadKg) continue
        found = true
        maxLoad = Math.max(maxLoad, st.loadKg)
        const rm = estimate1RM(st.loadKg, st.reps ?? 0)
        if (rm != null) best1RM = Math.max(best1RM ?? 0, rm)
      }
    }
    if (found) out.push({ date: s.date, maxLoad: Math.round(maxLoad * 4) / 4, est1RM: best1RM })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

/** Liste des exercices ayant un historique (pour le sélecteur). */
export function exercisesWithHistory(
  sessions: SessionLog[],
  catalog: Map<string, Exercise>,
): { id: string; name: string }[] {
  const ids = new Set<string>()
  for (const s of sessions)
    for (const e of s.exercises)
      if (e.sets.some((st) => st.done && st.loadKg)) ids.add(e.exerciseId)
  return [...ids]
    .map((id) => ({ id, name: catalog.get(id)?.nameFr ?? id }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Poids corporel dans le temps. */
export function bodyWeightSeries(measures: BodyMeasure[]): { date: string; weight: number }[] {
  return measures
    .filter((m) => m.weightKg != null)
    .map((m) => ({ date: m.date, weight: m.weightKg as number }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Énergie / fatigue / sommeil / stress dans le temps. */
export function readinessSeries(
  states: DailyState[],
): { date: string; energie: number; fatigue: number; sommeil: number; stress: number }[] {
  return states
    .map((s) => ({ date: s.date, energie: s.energy, fatigue: s.fatigue, sommeil: s.sleep, stress: s.stress }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Fréquence des douleurs (depuis les états du jour ET les douleurs notées en séance). */
export function painFrequency(
  states: DailyState[],
  sessions: SessionLog[],
): { label: string; count: number }[] {
  const acc = new Map<string, number>()
  for (const s of states)
    for (const l of s.activeLimitations) acc.set(l.kind, (acc.get(l.kind) ?? 0) + 1)
  // Douleurs ressenties pendant les séances (>=3/10).
  let inSession = 0
  for (const s of sessions)
    for (const e of s.exercises)
      if (e.sets.some((st) => (st.painDuring ?? 0) >= 3)) inSession += 1
  if (inSession) acc.set('en séance (≥3/10)', inSession)
  return [...acc.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
}

/** Nombre de séances par semaine calendaire (clé ISO année-semaine). */
export function sessionsPerWeek(sessions: SessionLog[]): { week: string; count: number }[] {
  const acc = new Map<string, number>()
  for (const s of sessions.filter((x) => x.status === 'terminee')) {
    const key = isoWeekKey(s.date)
    acc.set(key, (acc.get(key) ?? 0) + 1)
  }
  return [...acc.entries()].map(([week, count]) => ({ week, count })).sort((a, b) => a.week.localeCompare(b.week))
}

/** Clé "AAAA-Sxx" pour regrouper par semaine ISO. */
export function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr)
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const week =
    1 +
    Math.round(
      ((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
    )
  return `${target.getUTCFullYear()}-S${String(week).padStart(2, '0')}`
}
