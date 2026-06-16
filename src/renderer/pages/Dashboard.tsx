import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, Dumbbell, Flame, TrendingUp } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import type { Program } from '@shared/types/program'
import type { SessionLog } from '@shared/types/session'
import type { Profile } from '@shared/types/profile'

export function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [program, setProgram] = useState<Program | null>(null)
  const [sessions, setSessions] = useState<SessionLog[]>([])

  useEffect(() => {
    void (async () => {
      setProfile(await window.api.getProfile())
      const programs = await window.api.listPrograms()
      const active = programs.find((p) => p.status === 'actif') ?? programs[0] ?? null
      setProgram(active)
      setSessions(await window.api.listSessions(active?.id))
    })()
  }, [])

  const totalVolume = sessions.reduce(
    (acc, s) =>
      acc +
      s.exercises.reduce(
        (a, e) => a + e.sets.reduce((x, set) => x + (set.loadKg ?? 0) * (set.reps ?? 0), 0),
        0,
      ),
    0,
  )

  const plannedCount = program?.sessions.length ?? 0
  const doneCount = sessions.filter((s) => s.status === 'terminee').length
  const adherence = plannedCount ? Math.round((doneCount / plannedCount) * 100) : 0

  return (
    <div>
      <PageHeader
        title={`Bonjour ${profile?.name ?? ''}`.trim()}
        subtitle="Vue d’ensemble de ton entraînement"
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat icon={<Dumbbell className="h-5 w-5" />} label="Séances réalisées" value={`${doneCount}`} />
        <Stat icon={<CalendarCheck className="h-5 w-5" />} label="Assiduité" value={`${adherence}%`} />
        <Stat
          icon={<Flame className="h-5 w-5" />}
          label="Volume total"
          value={`${Math.round(totalVolume).toLocaleString('fr-FR')} kg`}
        />
        <Stat
          icon={<TrendingUp className="h-5 w-5" />}
          label="Semaines"
          value={`${program?.weeks.length ?? 0}`}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-semibold">Programme actuel</h2>
          {program ? (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400">{program.name}</p>
              <p className="mt-1 text-xs text-slate-400">
                Split {program.split} · {program.config.sessionsPerWeek} séances/sem ·{' '}
                {program.config.weeks} semaines
              </p>
              <Link to="/programme" className="btn-primary mt-4">
                Voir le programme
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aucun programme actif pour le moment.
              </p>
              <Link to="/creer" className="btn-primary mt-4">
                Créer un programme
              </Link>
            </>
          )}
        </div>

        <div className="card">
          <h2 className="mb-2 font-semibold">Premiers pas</h2>
          <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            <li>1. Complète <Link className="text-brand-500" to="/profil">ton profil</Link></li>
            <li>2. Renseigne tes <Link className="text-brand-500" to="/douleurs">douleurs & limitations</Link></li>
            <li>3. Génère ton <Link className="text-brand-500" to="/creer">programme 12 semaines</Link></li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card">
      <div className="mb-2 inline-flex rounded-lg bg-brand-500/10 p-2 text-brand-500">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  )
}
