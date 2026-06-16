import type { ExperienceLevel, MuscleGroup } from '../../types/common'
import { MUSCLE_LABELS } from '../../types/common'
import type { Exercise, ExerciseRating } from '../../types/exercise'
import type { Limitation } from '../../types/pain'
import type {
  PlannedExercise,
  PlannedSession,
  Program,
  ProgramConfig,
} from '../../types/program'
import { computePainConstraints } from '../pain/painRules'
import { buildPeriodization } from './periodization'
import { selectSessionExercises, SelectionContext } from './selectExercises'
import { buildWeekSessions, chooseSplit, SessionTemplate } from './splits'
import { weeklySetTargets } from './volume'

export interface GenerateInput {
  config: ProgramConfig
  level: ExperienceLevel
  catalog: Exercise[]
  limitations: Limitation[]
  ratings?: ExerciseRating[]
  /** Générateur d'identifiants (déterministe par défaut, pour les tests). */
  makeId?: () => string
  /** Horodatage ISO (injecté pour rester déterministe/testable). */
  now?: string
}

/** Génère un programme complet, déterministe, à partir de la configuration. */
export function generateProgram(input: GenerateInput): Program {
  const { config, level, catalog, limitations } = input
  let counter = 0
  const makeId = input.makeId ?? (() => `id_${++counter}`)
  const now = input.now ?? '1970-01-01T00:00:00.000Z'

  const constraints = computePainConstraints(limitations)
  const ratingsMap = new Map((input.ratings ?? []).map((r) => [r.exerciseId, r]))
  const avoidIds = new Set(
    (input.ratings ?? []).filter((r) => r.evite).map((r) => r.exerciseId),
  )

  const split = chooseSplit(config.sessionsPerWeek, level, config.preferredSplit)
  const weekTemplates = buildWeekSessions(split, config.sessionsPerWeek)

  // Tous les muscles touchés sur la semaine.
  const muscles = [...new Set(weekTemplates.flatMap((t) => t.targetMuscles))] as MuscleGroup[]
  const weeklyTargets = weeklySetTargets(level, config.primaryObjective, config.musclePriorities, muscles)

  // Fréquence hebdomadaire par muscle (nb de séances le sollicitant).
  const freq: Record<string, number> = {}
  for (const t of weekTemplates)
    for (const m of t.targetMuscles) freq[m] = (freq[m] ?? 0) + 1

  const ctx: SelectionContext = {
    catalog,
    availableEquipment: config.availableEquipment,
    level,
    objective: config.primaryObjective,
    constraints,
    ratings: ratingsMap,
    avoidIds,
  }

  // Sélection des exercices une fois par "focus" (réutilisée chaque semaine
  // pour permettre le suivi de progression sur les mêmes mouvements).
  const baseByFocus = new Map<string, PlannedExercise[]>()
  for (const t of weekTemplates) {
    if (baseByFocus.has(t.focus)) continue
    const setsPerMuscle: Record<string, number> = {}
    for (const m of t.targetMuscles) {
      const target = weeklyTargets[m] ?? 6
      setsPerMuscle[m] = Math.max(2, Math.round(target / (freq[m] ?? 1)))
    }
    const exercises = selectSessionExercises(t.targetMuscles, setsPerMuscle, ctx, {
      maxExercises: config.maxExercisesPerSession,
      maxMinutes: config.maxSessionMinutes,
      restSec: config.restBetweenSetsSec,
    })
    appendFinishersAndCardio(exercises, config, catalog, makeId)
    baseByFocus.set(t.focus, exercises)
  }

  const weeks = buildPeriodization(config.weeks)
  const days = resolveTrainingDays(config)

  // Construction de toutes les séances, semaine par semaine.
  const sessions: PlannedSession[] = []
  for (const week of weeks) {
    weekTemplates.forEach((t, i) => {
      const base = baseByFocus.get(t.focus) ?? []
      const exercises = base.map((pe) => ({
        ...pe,
        id: makeId(),
        // Le volume suit la périodisation (au moins 1 série conservée).
        sets: pe.isCardio ? pe.sets : Math.max(1, Math.round(pe.sets * week.volumeMultiplier)),
      }))
      sessions.push({
        id: makeId(),
        weekIndex: week.index,
        dayOfWeek: days[i] ?? i,
        order: i,
        name: `${t.name} — S${week.index + 1}`,
        focus: t.focus,
        targetMuscles: t.targetMuscles,
        estimatedMinutes: estimateMinutes(exercises, config.restBetweenSetsSec),
        warmup: warmupFor(t),
        exercises,
        cooldown: cooldownFor(config),
      })
    })
  }

  const rationale = buildRationale(split, weeklyTargets, constraints, config)

  return {
    id: makeId(),
    name: config.name,
    status: 'brouillon',
    config,
    split,
    weeks,
    sessions,
    rationale,
    createdAt: now,
    updatedAt: now,
  }
}

/** Mappe les jours d'entraînement choisis sur les séances de la semaine. */
function resolveTrainingDays(config: ProgramConfig): number[] {
  const sorted = [...config.trainingDays].sort((a, b) => a - b)
  if (sorted.length >= config.sessionsPerWeek) return sorted.slice(0, config.sessionsPerWeek)
  // Répartition par défaut si non précisé : étaler sur la semaine.
  const defaults = [1, 3, 5, 2, 4, 6]
  return defaults.slice(0, config.sessionsPerWeek)
}

/** Ajoute finishers (abdos, gainage…) et cardio en fin de séance. */
function appendFinishersAndCardio(
  exercises: PlannedExercise[],
  config: ProgramConfig,
  catalog: Exercise[],
  makeId: () => string,
): void {
  let order = exercises.length
  for (const f of config.finishers) {
    const match = catalog.find(
      (ex) =>
        ex.id === `finisher-${f}` ||
        ex.nameFr.toLowerCase().includes(f.replace(/-/g, ' ')),
    )
    if (!match) continue
    exercises.push({
      id: makeId(),
      exerciseId: match.id,
      order: order++,
      sets: 3,
      prescribedSet: { reps: '30-45 s', targetRir: 2 },
      restSec: 45,
      locked: false,
      alternativeIds: [],
      isFinisher: true,
    })
  }
  if (config.cardio.enabled && (config.cardio.placement === 'apres' || config.cardio.placement === 'recuperation')) {
    const cardio = catalog.find((ex) => ex.category === 'cardio' && config.cardio.modes.includes(ex.equipment[0]))
    exercises.push({
      id: makeId(),
      exerciseId: cardio?.id ?? 'cardio-generic',
      order: order++,
      sets: 1,
      prescribedSet: { reps: `${config.cardio.durationMin} min` },
      restSec: 0,
      locked: false,
      alternativeIds: [],
      isCardio: true,
      notes: `Cardio ${config.cardio.intensity} — ${config.cardio.durationMin} min`,
    })
  }
}

function estimateMinutes(exercises: PlannedExercise[], restSec: number): number {
  let min = 8
  for (const e of exercises) {
    if (e.isCardio) {
      const m = parseInt(e.prescribedSet.reps) || 10
      min += m
    } else {
      min += (e.sets * (40 + restSec)) / 60
    }
  }
  return Math.round(min)
}

function warmupFor(t: SessionTemplate): string[] {
  const base = ['5 min cardio léger (montée en température)', 'Mobilité articulaire ciblée']
  if (t.targetMuscles.includes('quadriceps')) base.push('2 séries légères de squat/presse')
  if (t.targetMuscles.includes('pectoraux')) base.push('Rotations d’épaules + 1 série légère de développé')
  return base
}

function cooldownFor(config: ProgramConfig): string[] {
  const out = ['Étirements légers des groupes travaillés', 'Respiration lente 2 min (retour au calme)']
  if (config.finishers.includes('mobilite')) out.push('Routine de mobilité')
  return out
}

function buildRationale(
  split: string,
  weeklyTargets: Record<string, number>,
  constraints: ReturnType<typeof computePainConstraints>,
  config: ProgramConfig,
): string[] {
  const out: string[] = []
  out.push(`Split retenu : ${split} (${config.sessionsPerWeek} séances/sem), adapté à la fréquence et au niveau.`)
  out.push(
    `Volume hebdomadaire cible : ${Object.entries(weeklyTargets)
      .map(([m, s]) => `${MUSCLE_LABELS[m as MuscleGroup] ?? m} ${s} séries`)
      .join(', ')}.`,
  )
  out.push(
    `Objectif principal « ${config.primaryObjective} » : schéma de répétitions et repos calés en conséquence.`,
  )
  if (constraints.affectedAxes.length) {
    out.push(
      `Limitations actives : exercices filtrés et adaptés pour préserver ${constraints.affectedAxes.join(', ')}.`,
    )
  }
  if (constraints.systemicVolumeMultiplier < 1) {
    out.push(
      `Fatigue/récupération prise en compte : volume légèrement réduit (×${constraints.systemicVolumeMultiplier}).`,
    )
  }
  out.push('Périodisation 12 semaines avec délestages réguliers et bilan final.')
  return out
}
