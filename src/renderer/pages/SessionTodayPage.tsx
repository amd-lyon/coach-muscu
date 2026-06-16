import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronRight,
  Flame,
  HelpCircle,
  Minus,
  Plus,
  Replace,
  Square,
  Timer,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { PageHeader } from '../components/Layout'
import { RestTimer, RestTimerHandle } from '../components/RestTimer'
import { evaluateReadiness } from '@shared/domain/readiness'
import { computePainConstraints } from '@shared/domain/pain/painRules'
import { findAlternatives, AlternativeSuggestion } from '@shared/domain/pain/replacement'
import { recommendProgression } from '@shared/domain/load/progression'
import type { Program, PlannedSession } from '@shared/types/program'
import type { Exercise } from '@shared/types/exercise'
import type { Limitation } from '@shared/types/pain'
import type { Profile } from '@shared/types/profile'
import type { ReadinessResult, SessionLog, SetLog } from '@shared/types/session'
import type { ExperienceLevel } from '@shared/types/common'

const LEVEL_NUM: Record<ExperienceLevel, 1 | 2 | 3> = { debutant: 1, intermediaire: 2, confirme: 3 }
const STEP_KG = 2.5
const uuid = () => crypto.randomUUID()
const today = () => new Date().toISOString().slice(0, 10)

/** Modèle mutable d'un exercice pendant la séance. */
interface LiveExercise {
  plannedExerciseId: string
  exerciseId: string
  isCardio?: boolean
  isFinisher?: boolean
  targetReps: string
  targetRpe?: number
  targetRir?: number
  restSec: number
  suggestedLoad?: number
  sets: SetLog[]
  completed: boolean
  replaced: boolean
  replacedBy?: string
  note?: string
  panel: 'pain' | 'alt' | null
  alts?: AlternativeSuggestion[]
}

type Phase = 'setup' | 'live' | 'done'

export function SessionTodayPage() {
  const [program, setProgram] = useState<Program | null>(null)
  const [catalog, setCatalog] = useState<Map<string, Exercise>>(new Map())
  const [limitations, setLimitations] = useState<Limitation[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [history, setHistory] = useState<SessionLog[]>([])
  const [loaded, setLoaded] = useState(false)

  const [phase, setPhase] = useState<Phase>('setup')
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [sessionId] = useState(uuid)
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null)
  const [live, setLive] = useState<LiveExercise[]>([])
  const timerRef = useRef<RestTimerHandle>(null)

  // État du jour (formulaire).
  const [form, setForm] = useState({
    energy: 7,
    fatigue: 4,
    sleep: 7,
    stress: 3,
    motivation: 7,
    soreness: 3,
    availableMinutes: undefined as number | undefined,
  })

  useEffect(() => {
    void (async () => {
      const programs = await window.api.listPrograms()
      const active = programs.find((p) => p.status === 'actif') ?? programs[0] ?? null
      setProgram(active)
      const ex = await window.api.listExercises()
      setCatalog(new Map(ex.map((e) => [e.id, e])))
      setLimitations((await window.api.listLimitations()).filter((l) => l.active))
      setProfile(await window.api.getProfile())
      const sessions = active ? await window.api.listSessions(active.id) : []
      setHistory(sessions)

      if (active) {
        const doneIds = new Set(
          sessions.filter((s) => s.status === 'terminee').map((s) => s.plannedSessionId),
        )
        const next = active.sessions.find((s) => !doneIds.has(s.id)) ?? active.sessions[0]
        setSelectedSessionId(next?.id ?? '')
      }
      setLoaded(true)
    })()
  }, [])

  const activeLimForState = useMemo(
    () => limitations.map((l) => ({ kind: l.kind, side: l.side, intensity: l.intensity })),
    [limitations],
  )

  // Aperçu temps réel du feu de séance pendant la saisie de l'état du jour.
  const preview = useMemo(
    () =>
      evaluateReadiness({
        id: '',
        date: today(),
        ...form,
        activeLimitations: activeLimForState,
        createdAt: '',
      }),
    [form, activeLimForState],
  )

  const selectedSession = program?.sessions.find((s) => s.id === selectedSessionId) ?? null
  const weekSessions = program?.sessions.filter((s) => s.weekIndex === selectedSession?.weekIndex) ?? []

  /** Dernière charge connue par exercice (préremplissage). */
  const lastLoadByExercise = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of history) {
      for (const e of s.exercises) {
        if (map.has(e.exerciseId)) continue
        const loads = e.sets.map((st) => st.loadKg ?? 0).filter((x) => x > 0)
        if (loads.length) map.set(e.exerciseId, Math.max(...loads))
      }
    }
    return map
  }, [history])

  function startSession() {
    if (!selectedSession) return
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
    const r = evaluateReadiness({
      id: '',
      date: today(),
      ...form,
      activeLimitations: activeLimForState,
      createdAt: '',
    })
    setReadiness(r)
    void window.api.saveDailyState({
      id: '',
      date: today(),
      ...form,
      activeLimitations: activeLimForState,
      createdAt: '',
    })

    setLive(buildLive(selectedSession, r, lastLoadByExercise))
    // Sauvegarde initiale (récupération en cas de fermeture).
    void persist('en-cours', buildLive(selectedSession, r, lastLoadByExercise))
    setPhase('live')
  }

  function persist(status: SessionLog['status'], liveEx: LiveExercise[]) {
    if (!program || !selectedSession) return Promise.resolve()
    const log: SessionLog = {
      id: sessionId,
      programId: program.id,
      plannedSessionId: selectedSession.id,
      date: today(),
      status,
      readiness: readiness ?? undefined,
      durationMin: undefined,
      exercises: liveEx.map((le) => ({
        id: uuid(),
        plannedExerciseId: le.plannedExerciseId,
        exerciseId: le.exerciseId,
        completed: le.completed,
        replaced: le.replaced,
        replacedByExerciseId: le.replacedBy,
        comment: le.note,
        sets: le.sets,
      })),
      createdAt: '',
      updatedAt: '',
    }
    return window.api.saveSession(log)
  }

  // ---- Mises à jour immuables ----
  const patchEx = (i: number, patch: Partial<LiveExercise>) =>
    setLive((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)))

  const patchSet = (ei: number, si: number, patch: Partial<SetLog>) =>
    setLive((prev) =>
      prev.map((e, idx) =>
        idx === ei ? { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) } : e,
      ),
    )

  function openAlternatives(i: number) {
    const le = live[i]
    if (le.panel === 'alt') return patchEx(i, { panel: null })
    const origin = catalog.get(le.exerciseId)
    if (!origin) return
    const constraints = computePainConstraints(limitations)
    const alts = findAlternatives(origin, [...catalog.values()], {
      constraints,
      availableEquipment: program?.config.availableEquipment ?? [],
      level: LEVEL_NUM[profile?.level ?? 'intermediaire'],
      avoidIds: new Set(live.map((x) => x.exerciseId)),
      limit: 4,
    })
    patchEx(i, { panel: 'alt', alts })
  }

  function chooseAlternative(i: number, alt: AlternativeSuggestion) {
    patchEx(i, {
      exerciseId: alt.exercise.id,
      replaced: true,
      replacedBy: alt.exercise.id,
      panel: null,
      note: `Remplacé : ${alt.reason}`,
    })
  }

  function adjustLoad(i: number, delta: number, reason: string) {
    const le = live[i]
    const base = le.suggestedLoad ?? lastLoadByExercise.get(le.exerciseId) ?? 0
    patchEx(i, { suggestedLoad: Math.max(0, Math.round((base + delta) * 4) / 4), note: reason })
  }

  async function finish(status: SessionLog['status']) {
    await persist(status, live)
    setPhase('done')
  }

  if (!loaded) return <div className="p-8 text-sm text-slate-400">Chargement…</div>

  if (!program || !selectedSession) {
    return (
      <div>
        <PageHeader title="Séance du jour" />
        <div className="card text-sm text-slate-500 dark:text-slate-400">
          Aucun programme actif. <Link className="text-brand-500" to="/creer">Crée un programme</Link> pour démarrer une séance.
        </div>
      </div>
    )
  }

  // ---------------- PHASE 1 : ÉTAT DU JOUR ----------------
  if (phase === 'setup') {
    return (
      <div>
        <PageHeader title="Séance du jour" subtitle="Évalue ta forme avant de commencer" />

        <div className="mb-4 card">
          <p className="label">Quelle séance ?</p>
          <div className="flex flex-wrap gap-2">
            {weekSessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSessionId(s.id)}
                className={
                  'rounded-xl px-3 py-2 text-sm ' +
                  (s.id === selectedSessionId
                    ? 'bg-brand-500 text-white'
                    : 'border border-slate-300 dark:border-slate-600')
                }
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">État du jour</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Slider label="Énergie" value={form.energy} onChange={(v) => setForm({ ...form, energy: v })} />
            <Slider label="Fatigue" value={form.fatigue} onChange={(v) => setForm({ ...form, fatigue: v })} />
            <Slider label="Sommeil" value={form.sleep} onChange={(v) => setForm({ ...form, sleep: v })} />
            <Slider label="Stress" value={form.stress} onChange={(v) => setForm({ ...form, stress: v })} />
            <Slider label="Motivation" value={form.motivation} onChange={(v) => setForm({ ...form, motivation: v })} />
            <Slider label="Courbatures" value={form.soreness} onChange={(v) => setForm({ ...form, soreness: v })} />
          </div>

          {limitations.length > 0 && (
            <div className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-700/30">
              <span className="font-medium">Douleurs actives prises en compte : </span>
              {limitations.map((l) => `${l.kind} (${l.intensity}/10)`).join(', ')}.{' '}
              <Link to="/douleurs" className="text-brand-500">Modifier</Link>
            </div>
          )}

          <ReadinessBanner r={preview} />

          <button className="btn-primary w-full py-3 text-base" onClick={startSession}>
            Démarrer la séance <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    )
  }

  // ---------------- PHASE 3 : RÉSUMÉ ----------------
  if (phase === 'done') {
    return (
      <div>
        <PageHeader title="Séance terminée" subtitle="Bilan et recommandations pour la prochaine fois" />
        <div className="space-y-3">
          {live
            .filter((le) => !le.isCardio && !le.isFinisher && le.sets.some((s) => s.done))
            .map((le) => {
              const ex = catalog.get(le.exerciseId)
              const advice = recommendProgression({
                lastSets: le.sets.filter((s) => s.done),
                repRange: le.targetReps,
                stepKg: STEP_KG,
              })
              return (
                <div key={le.plannedExerciseId} className="card">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{ex?.nameFr ?? le.exerciseId}</span>
                    <AdviceBadge action={advice.action} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{advice.message}</p>
                </div>
              )
            })}
          <Link to="/progression" className="btn-primary">Voir ma progression</Link>
        </div>
      </div>
    )
  }

  // ---------------- PHASE 2 : SÉANCE EN COURS ----------------
  return (
    <div className="pb-28">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{selectedSession.name}</h1>
          <p className="text-sm text-slate-400">≈ {selectedSession.estimatedMinutes} min</p>
        </div>
        <button
          className="btn bg-rose-500 text-white hover:bg-rose-600"
          onClick={() => {
            if (confirm('Arrêter et enregistrer la séance ?')) void finish('abandonnee')
          }}
        >
          <Square className="h-4 w-4" /> Arrêter
        </button>
      </div>

      {readiness && readiness.light !== 'vert' && (
        <div className="mb-4">
          <ReadinessBanner r={readiness} />
        </div>
      )}

      <RpeLegend />

      <div className="space-y-4">
        {live.map((le, i) => {
          const ex = catalog.get(le.exerciseId)
          const maxPain = Math.max(0, ...le.sets.map((s) => s.painDuring ?? 0))
          return (
            <div key={le.plannedExerciseId} className={'card ' + (le.completed ? 'opacity-60' : '')}>
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{ex?.nameFr ?? le.exerciseId}</span>
                    {le.replaced && <span className="text-xs text-amber-500">remplacé</span>}
                    {le.isCardio && <span className="text-xs text-brand-500">cardio</span>}
                    {le.isFinisher && <span className="text-xs text-slate-400">finisher</span>}
                  </div>
                  <p className="text-xs text-slate-400">
                    Cible : {le.targetReps} reps
                    {le.targetRpe ? ` · RPE ${le.targetRpe}` : ''}
                    {le.targetRir != null ? ` · RIR ${le.targetRir}` : ''}
                    {le.suggestedLoad ? ` · ~${le.suggestedLoad} kg` : ''}
                  </p>
                </div>
                <label className="flex shrink-0 items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={le.completed}
                    onChange={(e) => patchEx(i, { completed: e.target.checked })}
                  />
                  Terminé
                </label>
              </div>

              {!le.isCardio && (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-[28px_1fr_1fr_1fr_1fr_72px] gap-2 text-[11px] text-slate-400">
                    <span>#</span>
                    <span>Charge</span>
                    <span>Reps</span>
                    <span>RPE</span>
                    <span>Douleur</span>
                    <span></span>
                  </div>
                  {le.sets.map((s, si) => (
                    <div key={s.id} className="grid grid-cols-[28px_1fr_1fr_1fr_1fr_72px] items-center gap-2">
                      <span className="text-sm text-slate-400">{si + 1}</span>
                      <CellInput
                        value={s.loadKg ?? le.suggestedLoad}
                        placeholder="kg"
                        onChange={(v) => patchSet(i, si, { loadKg: v })}
                      />
                      <CellInput value={s.reps} placeholder="reps" onChange={(v) => patchSet(i, si, { reps: v })} />
                      <CellInput value={s.rpe} placeholder="RPE" onChange={(v) => patchSet(i, si, { rpe: v })} />
                      <CellInput
                        value={s.painDuring}
                        placeholder="0-10"
                        danger={(s.painDuring ?? 0) >= 6}
                        onChange={(v) => patchSet(i, si, { painDuring: v })}
                      />
                      <button
                        onClick={() => {
                          patchSet(i, si, { done: true })
                          timerRef.current?.start(le.restSec || 90)
                        }}
                        className={
                          'flex items-center justify-center rounded-lg py-1.5 text-xs ' +
                          (s.done
                            ? 'bg-green-500/15 text-green-600'
                            : 'bg-brand-500 text-white hover:bg-brand-600')
                        }
                        title="Série terminée → lance le repos"
                      >
                        {s.done ? <Check className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => patchEx(i, { sets: [...le.sets, newSet(le.sets.length, le.suggestedLoad)] })}
                      className="btn-ghost px-2 py-1 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" /> Série
                    </button>
                    {le.sets.length > 1 && (
                      <button
                        onClick={() => patchEx(i, { sets: le.sets.slice(0, -1) })}
                        className="btn-ghost px-2 py-1 text-xs"
                      >
                        <Minus className="h-3.5 w-3.5" /> Série
                      </button>
                    )}
                  </div>
                </div>
              )}

              {le.isCardio && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {le.note ?? `Cardio : ${le.targetReps}`}
                </p>
              )}

              {/* Boutons d'action */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => adjustLoad(i, STEP_KG, 'Marqué trop facile : charge augmentée.')} className="btn-ghost px-2.5 py-1 text-xs">
                  <TrendingUp className="h-3.5 w-3.5" /> Trop facile
                </button>
                <button onClick={() => adjustLoad(i, -STEP_KG, 'Marqué trop difficile : charge réduite.')} className="btn-ghost px-2.5 py-1 text-xs">
                  <TrendingDown className="h-3.5 w-3.5" /> Trop difficile
                </button>
                <button
                  onClick={() => patchEx(i, { panel: le.panel === 'pain' ? null : 'pain' })}
                  className="btn-ghost px-2.5 py-1 text-xs text-amber-600"
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Douleur
                </button>
                <button onClick={() => openAlternatives(i)} className="btn-ghost px-2.5 py-1 text-xs">
                  <Replace className="h-3.5 w-3.5" /> Remplacer
                </button>
                <button onClick={() => openAlternatives(i)} className="btn-ghost px-2.5 py-1 text-xs">
                  <Ban className="h-3.5 w-3.5" /> Machine indispo.
                </button>
              </div>

              {/* Panneau douleur */}
              {le.panel === 'pain' && (
                <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700/50 dark:bg-amber-900/20">
                  {maxPain >= 6 ? (
                    <p className="mb-2 font-medium text-rose-600">
                      Douleur élevée ({maxPain}/10) : ne force pas. Arrête cet exercice et, si la douleur
                      persiste/irradie, consulte un professionnel de santé.
                    </p>
                  ) : (
                    <p className="mb-2 text-amber-700 dark:text-amber-300">Que veux-tu faire ?</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => adjustLoad(i, -STEP_KG, 'Charge réduite (douleur).')} className="btn-ghost px-2.5 py-1 text-xs">
                      Diminuer la charge
                    </button>
                    <button onClick={() => patchEx(i, { note: 'Amplitude réduite (douleur).', panel: null })} className="btn-ghost px-2.5 py-1 text-xs">
                      Réduire l’amplitude
                    </button>
                    <button onClick={() => patchEx(i, { note: 'Prise modifiée (douleur).', panel: null })} className="btn-ghost px-2.5 py-1 text-xs">
                      Changer la prise
                    </button>
                    <button onClick={() => openAlternatives(i)} className="btn-ghost px-2.5 py-1 text-xs">
                      Remplacer l’exercice
                    </button>
                    <button
                      onClick={() => patchEx(i, { completed: true, panel: null, note: 'Exercice arrêté (douleur).' })}
                      className="btn bg-rose-500 px-2.5 py-1 text-xs text-white"
                    >
                      Arrêter l’exercice
                    </button>
                  </div>
                </div>
              )}

              {/* Panneau alternatives */}
              {le.panel === 'alt' && (
                <div className="mt-3 space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  {le.alts?.length ? (
                    le.alts.map((alt) => (
                      <div key={alt.exercise.id} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 dark:border-slate-700/40">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            {alt.exercise.nameFr}
                            {alt.safe ? (
                              <span className="rounded bg-green-500/15 px-1.5 text-[11px] text-green-600">sûr</span>
                            ) : (
                              <span className="rounded bg-amber-500/15 px-1.5 text-[11px] text-amber-600">prudence</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            {alt.advantages[0] ?? alt.reason}
                            {alt.drawbacks[0] ? ` · ${alt.drawbacks[0]}` : ''}
                          </p>
                        </div>
                        <button onClick={() => chooseAlternative(i, alt)} className="btn-primary px-2.5 py-1 text-xs">
                          Choisir
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">Aucune alternative disponible avec ton équipement.</p>
                  )}
                </div>
              )}

              {le.note && <p className="mt-2 text-xs text-slate-400">ℹ️ {le.note}</p>}
            </div>
          )
        })}
      </div>

      <button onClick={() => void finish('terminee')} className="btn-primary mt-6 w-full py-3 text-base">
        <Flame className="h-5 w-5" /> Terminer la séance
      </button>

      <RestTimer ref={timerRef} />
    </div>
  )
}

// ---------------- Helpers ----------------
function newSet(index: number, suggested?: number): SetLog {
  return { id: uuid(), setIndex: index, loadKg: suggested, done: false }
}

function buildLive(
  session: PlannedSession,
  r: ReadinessResult,
  lastLoad: Map<string, number>,
): LiveExercise[] {
  return session.exercises.map((pe) => {
    const sets = Math.max(1, Math.round(pe.sets * r.adjustments.volumeMultiplier))
    const suggested = lastLoad.get(pe.exerciseId) ?? pe.prescribedSet.suggestedLoadKg
    return {
      plannedExerciseId: pe.id,
      exerciseId: pe.exerciseId,
      isCardio: pe.isCardio,
      isFinisher: pe.isFinisher,
      targetReps: pe.prescribedSet.reps,
      targetRpe: pe.prescribedSet.targetRpe,
      targetRir: pe.prescribedSet.targetRir,
      restSec: pe.restSec,
      suggestedLoad: suggested,
      sets: Array.from({ length: pe.isCardio ? 1 : sets }, (_, i) => newSet(i, suggested)),
      completed: false,
      replaced: false,
      panel: null,
    }
  })
}

/** Rappel pédagogique du RPE / RIR (replié par défaut). */
function RpeLegend() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-700/20">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-left font-medium">
        <HelpCircle className="h-4 w-4 text-brand-500" />
        Qu’est-ce que le RPE et le RIR ?
        <span className="ml-auto text-xs text-slate-400">{open ? 'masquer' : 'afficher'}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
          <p>
            <strong>RPE</strong> (effort perçu, /10) : à quel point la série était dure. <strong>RPE 8</strong> ≈ il
            te restait ~2 répétitions en réserve ; RPE 10 = échec.
          </p>
          <p>
            <strong>RIR</strong> (répétitions en réserve) : combien de reps tu aurais pu faire en plus.
            <strong> RIR ≈ 10 − RPE</strong> (RPE 8 ↔ RIR 2).
          </p>
          <p className="text-xs text-slate-400">
            Vise le RPE/RIR cible affiché : c’est ce qui pilote la progression des charges.
          </p>
        </div>
      )}
    </div>
  )
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="label">
        {label} : <span className="font-semibold text-slate-700 dark:text-slate-200">{value}/10</span>
      </label>
      <input type="range" min={0} max={10} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </div>
  )
}

function CellInput({
  value,
  placeholder,
  danger,
  onChange,
}: {
  value?: number
  placeholder: string
  danger?: boolean
  onChange: (v?: number) => void
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      className={
        'w-full rounded-lg border bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-500 dark:bg-surface-dark ' +
        (danger ? 'border-rose-400 text-rose-600' : 'border-slate-300 dark:border-slate-600')
      }
    />
  )
}

function ReadinessBanner({ r }: { r: ReadinessResult }) {
  const styles: Record<ReadinessResult['light'], string> = {
    vert: 'border-green-300 bg-green-50 text-green-700 dark:border-green-700/50 dark:bg-green-900/20 dark:text-green-300',
    orange: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300',
    rouge: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/50 dark:bg-rose-900/20 dark:text-rose-300',
  }
  const dot: Record<ReadinessResult['light'], string> = {
    vert: 'bg-green-500',
    orange: 'bg-amber-500',
    rouge: 'bg-rose-500',
  }
  return (
    <div className={'rounded-xl border p-3 ' + styles[r.light]}>
      <div className="flex items-center gap-2 font-semibold">
        <span className={'h-3 w-3 rounded-full ' + dot[r.light]} />
        Feu {r.light} · forme {r.score}/100
      </div>
      <p className="mt-1 text-sm">{r.recommendation}</p>
      {r.reasons.length > 0 && <p className="mt-1 text-xs opacity-80">{r.reasons.join(' · ')}</p>}
    </div>
  )
}

function AdviceBadge({ action }: { action: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    'augmenter-charge': { label: 'Augmenter la charge', cls: 'bg-green-500/15 text-green-600' },
    'ajouter-repetition': { label: '+1 répétition', cls: 'bg-brand-500/15 text-brand-600' },
    conserver: { label: 'Conserver', cls: 'bg-slate-500/15 text-slate-500' },
    'diminuer-charge': { label: 'Diminuer la charge', cls: 'bg-amber-500/15 text-amber-600' },
    'reduire-volume': { label: 'Réduire le volume', cls: 'bg-amber-500/15 text-amber-600' },
    remplacer: { label: 'Remplacer / prudence', cls: 'bg-rose-500/15 text-rose-600' },
  }
  const m = map[action] ?? map.conserver
  return <span className={'rounded-full px-2.5 py-1 text-xs font-medium ' + m.cls}>{m.label}</span>
}
