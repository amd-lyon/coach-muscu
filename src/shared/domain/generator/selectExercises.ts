import type { Equipment, ExperienceLevel, MuscleGroup, Objective } from '../../types/common'
import type { Exercise, ExerciseRating } from '../../types/exercise'
import type { PlannedExercise } from '../../types/program'
import { repSchemeFor } from './repScheme'
import { isEquipmentAvailable, satisfiesConstraints } from '../pain/replacement'
import type { PainConstraints } from '../pain/painRules'

const LEVEL_NUM: Record<ExperienceLevel, 1 | 2 | 3> = { debutant: 1, intermediaire: 2, confirme: 3 }

export interface SelectionContext {
  catalog: Exercise[]
  availableEquipment: Equipment[]
  level: ExperienceLevel
  objective: Objective
  constraints: PainConstraints
  ratings: Map<string, ExerciseRating>
  /** Exercices à éviter (refusés, douloureux). */
  avoidIds: Set<string>
}

/** Score d'un exercice candidat pour un muscle cible. */
function scoreExercise(ex: Exercise, ctx: SelectionContext): number {
  let score = 0
  // Polyarticulaire d'abord (meilleur rendement, surtout en début de séance).
  score += ex.movementType === 'polyarticulaire' ? 15 : 5
  // Difficulté adaptée au niveau.
  const gap = Math.abs(ex.difficulty - LEVEL_NUM[ctx.level])
  score += (2 - gap) * 6
  // Compatibilité douleur : un exercice non sûr est fortement pénalisé.
  if (!satisfiesConstraints(ex, ctx.constraints)) score -= 100
  // Notations personnelles.
  const r = ctx.ratings.get(ex.id)
  if (r) {
    if (r.favori) score += 12
    score += (r.efficacite - 2.5) * 2
    score += (r.confort - 2.5) * 1.5
    score -= r.douleur * 3
  }
  // Machine guidée privilégiée si des douleurs sont actives.
  if (ctx.constraints.affectedAxes.length && ex.equipment.includes('machine-guidee')) score += 5
  return score
}

/** Combien de séries pour cet exercice, sachant le quota muscle restant. */
function setsForRemaining(remaining: number): number {
  return Math.min(5, Math.max(2, remaining))
}

/**
 * Sélectionne les exercices d'une séance pour atteindre, autant que possible,
 * le quota de séries par muscle, dans la limite du temps et du nombre d'exos.
 */
export function selectSessionExercises(
  targetMuscles: MuscleGroup[],
  setsPerMuscle: Record<string, number>,
  ctx: SelectionContext,
  limits: { maxExercises: number; maxMinutes: number; restSec: number },
): PlannedExercise[] {
  const chosen: PlannedExercise[] = []
  const usedIds = new Set<string>()
  let estMinutes = 8 // échauffement
  let order = 0

  for (const muscle of targetMuscles) {
    if (chosen.length >= limits.maxExercises) break
    let remaining = setsPerMuscle[muscle] ?? 0
    if (remaining <= 0) continue

    // Candidats pour ce muscle, filtrés par équipement et non évités.
    const candidates = ctx.catalog
      .filter(
        (ex) =>
          ex.primaryMuscle === muscle &&
          !usedIds.has(ex.id) &&
          !ctx.avoidIds.has(ex.id) &&
          isEquipmentAvailable(ex, ctx.availableEquipment),
      )
      .map((ex) => ({ ex, score: scoreExercise(ex, ctx) }))
      .sort((a, b) => b.score - a.score)

    for (const { ex } of candidates) {
      if (remaining <= 0 || chosen.length >= limits.maxExercises) break
      const scheme = repSchemeFor(ctx.objective, ex.movementType)
      const sets = setsForRemaining(remaining)
      // Temps estimé : sets * (travail ~40s + repos), converti en minutes.
      const exMinutes = (sets * (40 + limits.restSec)) / 60
      if (estMinutes + exMinutes > limits.maxMinutes && chosen.length > 0) break

      chosen.push({
        id: `pe_${muscle}_${ex.id}`,
        exerciseId: ex.id,
        order: order++,
        sets,
        prescribedSet: {
          reps: scheme.reps,
          targetRpe: scheme.targetRpe,
          targetRir: scheme.targetRir,
        },
        restSec: limits.restSec || scheme.restSec,
        tempo: '2-0-1',
        locked: false,
        alternativeIds: ex.alternativeIds,
      })
      usedIds.add(ex.id)
      remaining -= sets
      estMinutes += exMinutes
    }
  }
  return chosen
}
