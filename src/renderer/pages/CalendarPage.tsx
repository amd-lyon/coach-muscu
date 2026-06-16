import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Play } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import type { Program, WeekBlock } from '@shared/types/program'
import type { SessionLog } from '@shared/types/session'

const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

const BLOCK_STYLE: Record<WeekBlock, { label: string; badge: string; bar: string }> = {
  'prise-en-main': { label: 'Prise en main', badge: 'bg-brand-500/15 text-brand-600', bar: 'bg-brand-500' },
  progression: { label: 'Progression', badge: 'bg-green-500/15 text-green-600', bar: 'bg-green-500' },
  delestage: { label: 'Délestage', badge: 'bg-amber-500/15 text-amber-600', bar: 'bg-amber-500' },
  consolidation: { label: 'Consolidation', badge: 'bg-violet-500/15 text-violet-600', bar: 'bg-violet-500' },
  bilan: { label: 'Bilan', badge: 'bg-slate-500/15 text-slate-500', bar: 'bg-slate-400' },
}

export function CalendarPage() {
  const [program, setProgram] = useState<Program | null>(null)
  const [sessions, setSessions] = useState<SessionLog[]>([])

  useEffect(() => {
    void (async () => {
      const programs = await window.api.listPrograms()
      const active = programs.find((p) => p.status === 'actif') ?? programs[0] ?? null
      setProgram(active)
      setSessions(await window.api.listSessions(active?.id))
    })()
  }, [])

  // Ensemble des séances planifiées déjà réalisées.
  const doneIds = useMemo(
    () => new Set(sessions.filter((s) => s.status === 'terminee').map((s) => s.plannedSessionId)),
    [sessions],
  )

  // Semaine en cours estimée à partir de la date de création du programme.
  const currentWeek = useMemo(() => {
    if (!program) return -1
    const start = new Date(program.createdAt).getTime()
    if (Number.isNaN(start)) return -1
    const elapsed = Math.floor((Date.now() - start) / (7 * 86400000))
    return Math.max(0, Math.min(program.weeks.length - 1, elapsed))
  }, [program])

  if (!program) {
    return (
      <div>
        <PageHeader title="Calendrier des 12 semaines" />
        <div className="card text-sm text-slate-500 dark:text-slate-400">
          Aucun programme actif. <Link className="text-brand-500" to="/creer">Crée un programme</Link>.
        </div>
      </div>
    )
  }

  const totalPlanned = program.sessions.length
  const totalDone = program.sessions.filter((s) => doneIds.has(s.id)).length
  const progressPct = totalPlanned ? Math.round((totalDone / totalPlanned) * 100) : 0

  return (
    <div>
      <PageHeader
        title="Calendrier des 12 semaines"
        subtitle={`${program.name} · ${totalDone}/${totalPlanned} séances réalisées (${progressPct}%)`}
      />

      {/* Barre de progression globale */}
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className="h-full bg-brand-500" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Légende des blocs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {Object.values(BLOCK_STYLE).map((b) => (
          <span key={b.label} className={'rounded-full px-2.5 py-1 text-xs font-medium ' + b.badge}>
            {b.label}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {program.weeks.map((week) => {
          const style = BLOCK_STYLE[week.block]
          const weekSessions = program.sessions
            .filter((s) => s.weekIndex === week.index)
            .sort((a, b) => a.order - b.order)
          const isCurrent = week.index === currentWeek
          return (
            <div
              key={week.index}
              className={
                'card flex gap-4 ' + (isCurrent ? 'ring-2 ring-brand-500' : '')
              }
            >
              <div className={'w-1.5 shrink-0 rounded-full ' + style.bar} />
              <div className="flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-semibold">Semaine {week.index + 1}</span>
                  <span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + style.badge}>{style.label}</span>
                  {isCurrent && (
                    <span className="rounded-full bg-brand-500 px-2 py-0.5 text-xs text-white">en cours (est.)</span>
                  )}
                  <span className="text-xs text-slate-400">
                    volume ×{week.volumeMultiplier} · intensité ×{week.intensityMultiplier}
                  </span>
                </div>
                <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{week.note}</p>
                <div className="flex flex-wrap gap-2">
                  {weekSessions.map((s) => {
                    const done = doneIds.has(s.id)
                    return (
                      <div
                        key={s.id}
                        className={
                          'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs ' +
                          (done
                            ? 'bg-green-500/15 text-green-600'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300')
                        }
                        title={s.name}
                      >
                        {done ? <Check className="h-3.5 w-3.5" /> : <span className="text-slate-400">{DAY_NAMES[s.dayOfWeek]}</span>}
                        <span className="font-medium">{s.focus}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex gap-2">
        <Link to="/seance" className="btn-primary">
          <Play className="h-4 w-4" /> Séance du jour
        </Link>
        <Link to="/programme" className="btn-ghost">
          Voir le détail du programme
        </Link>
      </div>
    </div>
  )
}
