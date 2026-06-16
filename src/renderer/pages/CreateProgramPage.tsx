import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import {
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  OBJECTIVE_LABELS,
  OBJECTIVES,
} from '@shared/types/common'
import type { MuscleGroup, Objective, Priority } from '@shared/types/common'
import type { FinisherKind, ProgramConfig } from '@shared/types/program'
import type { Profile } from '@shared/types/profile'

const FINISHERS: { k: FinisherKind; label: string }[] = [
  { k: 'gainage-frontal', label: 'Gainage frontal' },
  { k: 'gainage-lateral', label: 'Gainage latéral' },
  { k: 'dead-bug', label: 'Dead bug' },
  { k: 'bird-dog', label: 'Bird dog' },
  { k: 'abdominaux', label: 'Abdominaux' },
  { k: 'mobilite', label: 'Mobilité' },
]

const OBJECTIVE_HELP: Partial<Record<Objective, string>> = {
  'perte-de-poids': 'Réduire le poids total sur la balance (eau, gras, parfois muscle).',
  'perte-de-gras': 'Réduire la masse grasse en préservant le muscle (déficit modéré + force).',
  hypertrophie: 'Augmenter la taille des muscles (volume élevé, 6–12 reps).',
  force: 'Augmenter la charge maximale (lourd, 3–6 reps, repos longs).',
  recomposition: 'Gagner du muscle et perdre du gras simultanément (réaliste si intermédiaire).',
}

export function CreateProgramPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [generating, setGenerating] = useState(false)

  const [config, setConfig] = useState<ProgramConfig>({
    name: 'Mon cycle 12 semaines',
    primaryObjective: 'recomposition',
    secondaryObjectives: [],
    weeks: 12,
    sessionsPerWeek: 4,
    trainingDays: [1, 2, 4, 5],
    maxSessionMinutes: 75,
    restBetweenSetsSec: 90,
    maxExercisesPerSession: 6,
    location: 'salle',
    availableEquipment: [],
    musclePriorities: { dos: 'elevee', epaules: 'elevee' },
    cardio: {
      enabled: true,
      modes: ['velo'],
      placement: 'apres',
      frequencyPerWeek: 2,
      durationMin: 15,
      intensity: 'leger',
      prioritizeRecovery: true,
    },
    finishers: ['gainage-frontal', 'dead-bug'],
  })

  useEffect(() => {
    void window.api.getProfile().then((p) => {
      if (p) {
        setProfile(p)
        setConfig((c) => ({
          ...c,
          availableEquipment: p.availableEquipment,
          maxSessionMinutes: p.maxSessionMinutes ?? c.maxSessionMinutes,
          sessionsPerWeek: (p.weeklyFrequency as ProgramConfig['sessionsPerWeek']) ?? c.sessionsPerWeek,
        }))
      }
    })
  }, [])

  const set = <K extends keyof ProgramConfig>(k: K, v: ProgramConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }))

  const setPriority = (m: MuscleGroup, p: Priority) =>
    setConfig((c) => ({ ...c, musclePriorities: { ...c.musclePriorities, [m]: p } }))

  const generate = async () => {
    setGenerating(true)
    try {
      const program = await window.api.generateProgram(config)
      await window.api.setActiveProgram(program.id)
      navigate('/programme')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Créer un programme"
        subtitle="Assistant de configuration — génération par règles, jamais aléatoire"
      />

      {!profile && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300">
          Pense à compléter ton profil d’abord (équipement, niveau).
        </div>
      )}

      <div className="space-y-4">
        <section className="card space-y-4">
          <h2 className="font-semibold">1. Objectif & cadre</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Nom du programme</label>
              <input className="input" value={config.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Objectif principal</label>
              <select
                className="input"
                value={config.primaryObjective}
                onChange={(e) => set('primaryObjective', e.target.value as Objective)}
              >
                {OBJECTIVES.map((o) => (
                  <option key={o} value={o}>
                    {OBJECTIVE_LABELS[o]}
                  </option>
                ))}
              </select>
              {OBJECTIVE_HELP[config.primaryObjective] && (
                <p className="mt-1 text-xs text-slate-400">{OBJECTIVE_HELP[config.primaryObjective]}</p>
              )}
            </div>
            <div>
              <label className="label">Séances / semaine</label>
              <select
                className="input"
                value={config.sessionsPerWeek}
                onChange={(e) => set('sessionsPerWeek', Number(e.target.value) as ProgramConfig['sessionsPerWeek'])}
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 6 ? '(récupération à surveiller)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Durée max / séance (min)</label>
              <input
                type="number"
                className="input"
                value={config.maxSessionMinutes}
                onChange={(e) => set('maxSessionMinutes', Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Repos entre séries (s)</label>
              <input
                type="number"
                className="input"
                value={config.restBetweenSetsSec}
                onChange={(e) => set('restBetweenSetsSec', Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Exercices max / séance</label>
              <input
                type="number"
                className="input"
                value={config.maxExercisesPerSession}
                onChange={(e) => set('maxExercisesPerSession', Number(e.target.value))}
              />
            </div>
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">2. Groupes musculaires prioritaires</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {MUSCLE_GROUPS.filter((m) => !['cardio', 'mobilite', 'gainage'].includes(m)).map((m) => (
              <div key={m} className="flex items-center justify-between rounded-lg px-1">
                <span className="text-sm">{MUSCLE_LABELS[m]}</span>
                <select
                  className="input w-36 py-1 text-xs"
                  value={config.musclePriorities[m] ?? 'normale'}
                  onChange={(e) => setPriority(m, e.target.value as Priority)}
                >
                  <option value="faible">Faible</option>
                  <option value="normale">Normale</option>
                  <option value="elevee">Élevée</option>
                </select>
              </div>
            ))}
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">3. Cardio & fin de séance</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.cardio.enabled}
              onChange={(e) => set('cardio', { ...config.cardio, enabled: e.target.checked })}
            />
            Inclure du cardio ({config.cardio.durationMin} min, {config.cardio.intensity}, après la séance)
          </label>
          <div>
            <p className="label">Exercices de fin de séance</p>
            <div className="flex flex-wrap gap-2">
              {FINISHERS.map(({ k, label }) => {
                const on = config.finishers.includes(k)
                return (
                  <button
                    key={k}
                    onClick={() =>
                      set(
                        'finishers',
                        on ? config.finishers.filter((x) => x !== k) : [...config.finishers, k],
                      )
                    }
                    className={
                      on
                        ? 'rounded-full bg-brand-500 px-3 py-1 text-xs text-white'
                        : 'rounded-full border border-slate-300 px-3 py-1 text-xs dark:border-slate-600'
                    }
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <button className="btn-primary w-full py-3 text-base" onClick={generate} disabled={generating}>
          <Sparkles className="h-5 w-5" />
          {generating ? 'Génération…' : 'Générer mon programme 12 semaines'}
        </button>
      </div>
    </div>
  )
}
