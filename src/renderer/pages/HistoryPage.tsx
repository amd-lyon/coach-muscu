import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import type { Exercise } from '@shared/types/exercise'
import type { Program } from '@shared/types/program'
import type { ExerciseLog, SessionLog } from '@shared/types/session'

const STATUS_LABELS: Record<SessionLog['status'], string> = {
  terminee: 'Terminée',
  abandonnee: 'Abandonnée',
  'en-cours': 'En cours',
}
const LIGHT_DOT: Record<string, string> = { vert: 'bg-green-500', orange: 'bg-amber-500', rouge: 'bg-rose-500' }

function sessionVolume(s: SessionLog): number {
  return Math.round(
    s.exercises.reduce(
      (a, e) => a + e.sets.reduce((x, st) => x + (st.done ? (st.loadKg ?? 0) * (st.reps ?? 0) : 0), 0),
      0,
    ),
  )
}
function maxPain(s: SessionLog): number {
  return Math.max(0, ...s.exercises.flatMap((e) => e.sets.map((st) => st.painDuring ?? 0)))
}

export function HistoryPage() {
  const [sessions, setSessions] = useState<SessionLog[]>([])
  const [catalog, setCatalog] = useState<Map<string, Exercise>>(new Map())
  const [programs, setPrograms] = useState<Program[]>([])
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<'tous' | SessionLog['status']>('tous')

  const reload = () => window.api.listSessions().then(setSessions)
  useEffect(() => {
    void (async () => {
      await reload()
      setPrograms(await window.api.listPrograms())
      const ex = await window.api.listExercises()
      setCatalog(new Map(ex.map((e) => [e.id, e])))
    })()
  }, [])

  const programName = useMemo(() => new Map(programs.map((p) => [p.id, p.name])), [programs])
  const plannedName = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of programs) for (const s of p.sessions) m.set(s.id, s.name)
    return m
  }, [programs])

  const filtered = useMemo(
    () =>
      [...sessions]
        .filter((s) => statusFilter === 'tous' || s.status === statusFilter)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [sessions, statusFilter],
  )

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette séance de l’historique ?')) return
    await window.api.deleteSession(id)
    await reload()
  }

  return (
    <div>
      <PageHeader title="Historique des séances" subtitle={`${sessions.length} séance(s) enregistrée(s)`} />

      <div className="mb-4 flex gap-2">
        {(['tous', 'terminee', 'abandonnee'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={
              'rounded-lg px-3 py-1.5 text-sm ' +
              (statusFilter === f ? 'bg-brand-500 text-white' : 'border border-slate-300 dark:border-slate-600')
            }
          >
            {f === 'tous' ? 'Toutes' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-sm text-slate-500 dark:text-slate-400">
          Aucune séance enregistrée.{' '}
          <Link to="/seance" className="text-brand-500">
            Démarrer une séance
          </Link>{' '}
          ou charge la démo dans Paramètres.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const isOpen = open.has(s.id)
            const pain = maxPain(s)
            return (
              <div key={s.id} className="card">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggle(s.id)} className="flex flex-1 items-center gap-3 text-left">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {s.plannedSessionId ? (plannedName.get(s.plannedSessionId) ?? 'Séance') : 'Séance libre'}
                        </span>
                        {s.readiness && <span className={'h-2.5 w-2.5 rounded-full ' + (LIGHT_DOT[s.readiness.light] ?? '')} />}
                        {pain >= 5 && (
                          <span className="flex items-center gap-1 text-xs text-rose-500">
                            <AlertTriangle className="h-3 w-3" /> douleur {pain}/10
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {s.date} · {STATUS_LABELS[s.status]} · {sessionVolume(s).toLocaleString('fr-FR')} kg
                        {s.durationMin ? ` · ${s.durationMin} min` : ''}
                        {s.programId && programName.get(s.programId) ? ` · ${programName.get(s.programId)}` : ''}
                      </div>
                    </div>
                  </button>
                  <button onClick={() => remove(s.id)} className="text-slate-400 hover:text-rose-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-700/40">
                    {s.exercises.map((e) => (
                      <ExerciseRow key={e.id} log={e} catalog={catalog} />
                    ))}
                    {s.globalComment && (
                      <p className="text-xs text-slate-400">Commentaire : {s.globalComment}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ExerciseRow({ log, catalog }: { log: ExerciseLog; catalog: Map<string, Exercise> }) {
  const ex = catalog.get(log.exerciseId)
  const doneSets = log.sets.filter((s) => s.done)
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-700/20">
      <div className="flex items-center justify-between">
        <span className="font-medium">
          {ex?.nameFr ?? log.exerciseId}
          {log.replaced && <span className="ml-2 text-xs text-amber-500">remplacé</span>}
          {!log.completed && <span className="ml-2 text-xs text-slate-400">non terminé</span>}
        </span>
      </div>
      {doneSets.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {doneSets.map((st, i) => (
            <span
              key={i}
              className={
                'rounded px-1.5 py-0.5 text-xs tabular-nums ' +
                ((st.painDuring ?? 0) >= 5
                  ? 'bg-rose-500/15 text-rose-600'
                  : 'bg-white text-slate-600 dark:bg-surface-dark dark:text-slate-300')
              }
              title={st.rpe ? `RPE ${st.rpe}` : undefined}
            >
              {st.loadKg ? `${st.loadKg} kg` : '—'} × {st.reps ?? '—'}
              {st.rpe ? ` · RPE${st.rpe}` : ''}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-xs text-slate-400">Aucune série enregistrée.</p>
      )}
      {log.comment && <p className="mt-1 text-xs text-slate-400">{log.comment}</p>}
    </div>
  )
}
