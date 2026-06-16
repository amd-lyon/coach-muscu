import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import type { Program } from '@shared/types/program'
import type { Exercise } from '@shared/types/exercise'

export function ProgramPage() {
  const [program, setProgram] = useState<Program | null>(null)
  const [catalog, setCatalog] = useState<Map<string, Exercise>>(new Map())
  const [week, setWeek] = useState(0)

  useEffect(() => {
    void (async () => {
      const programs = await window.api.listPrograms()
      const active = programs.find((p) => p.status === 'actif') ?? programs[0] ?? null
      setProgram(active)
      const ex = await window.api.listExercises()
      setCatalog(new Map(ex.map((e) => [e.id, e])))
    })()
  }, [])

  const weekSessions = useMemo(
    () => program?.sessions.filter((s) => s.weekIndex === week) ?? [],
    [program, week],
  )

  if (!program) {
    return (
      <div>
        <PageHeader title="Programme actuel" />
        <div className="card">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aucun programme. <Link className="text-brand-500" to="/creer">Créer un programme</Link>.
          </p>
        </div>
      </div>
    )
  }

  const w = program.weeks[week]

  return (
    <div>
      <PageHeader
        title={program.name}
        subtitle={`Split ${program.split} · ${program.config.sessionsPerWeek} séances/sem · ${program.weeks.length} semaines`}
      />

      {program.rationale.length > 0 && (
        <div className="mb-4 rounded-2xl border border-brand-300/40 bg-brand-500/5 p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-brand-600 dark:text-brand-300">
            <Info className="h-4 w-4" /> Pourquoi ce programme
          </div>
          <ul className="list-inside list-disc text-sm text-slate-600 dark:text-slate-300">
            {program.rationale.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5">
        {program.weeks.map((wk) => (
          <button
            key={wk.index}
            onClick={() => setWeek(wk.index)}
            title={wk.label}
            className={
              'h-9 w-9 rounded-lg text-sm font-medium ' +
              (wk.index === week
                ? 'bg-brand-500 text-white'
                : wk.block === 'delestage'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300')
            }
          >
            {wk.index + 1}
          </button>
        ))}
      </div>

      <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        <span className="font-medium text-slate-700 dark:text-slate-200">{w.label}.</span> {w.note}{' '}
        (volume ×{w.volumeMultiplier}, intensité ×{w.intensityMultiplier})
      </div>

      <div className="space-y-4">
        {weekSessions.map((s) => (
          <div key={s.id} className="card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{s.name}</h3>
              <span className="text-xs text-slate-400">≈ {s.estimatedMinutes} min</span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-400">
                <tr>
                  <th className="pb-2">Exercice</th>
                  <th className="pb-2">Séries</th>
                  <th className="pb-2">Reps</th>
                  <th className="pb-2">RPE/RIR</th>
                  <th className="pb-2">Repos</th>
                </tr>
              </thead>
              <tbody>
                {s.exercises.map((pe) => {
                  const ex = catalog.get(pe.exerciseId)
                  return (
                    <tr key={pe.id} className="border-t border-slate-100 dark:border-slate-700/40">
                      <td className="py-2">
                        {ex?.nameFr ?? pe.exerciseId}
                        {pe.isCardio && <span className="ml-2 text-xs text-brand-500">cardio</span>}
                        {pe.isFinisher && <span className="ml-2 text-xs text-slate-400">finisher</span>}
                        {pe.adaptationReason && (
                          <span className="ml-2 text-xs text-amber-500" title={pe.adaptationReason}>
                            adapté
                          </span>
                        )}
                      </td>
                      <td className="py-2">{pe.sets}</td>
                      <td className="py-2">{pe.prescribedSet.reps}</td>
                      <td className="py-2">
                        {pe.prescribedSet.targetRpe ? `RPE ${pe.prescribedSet.targetRpe}` : ''}
                        {pe.prescribedSet.targetRir != null ? ` · RIR ${pe.prescribedSet.targetRir}` : ''}
                      </td>
                      <td className="py-2">{pe.restSec ? `${pe.restSec}s` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
