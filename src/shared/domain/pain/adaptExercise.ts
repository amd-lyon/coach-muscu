import type { Equipment, RiskProfile } from '../../types/common'
import type { Exercise } from '../../types/exercise'
import type { PlannedExercise } from '../../types/program'
import { computePainConstraints, PainConstraints, RiskAxis } from './painRules'
import { findAlternatives, satisfiesConstraints } from './replacement'
import type { Limitation } from '../../types/pain'

export type AdaptationAction = 'keep' | 'modify' | 'replace' | 'remove'

export interface ExerciseAdaptation {
  action: AdaptationAction
  reason: string
  /** Si replace : nouvel exerciseId. */
  replacementId?: string
  /** Modifications appliquées (si modify ou replace). */
  setsDelta: number // ex. -1
  intensityNote?: string
  /** Données ayant motivé la décision (traçabilité, section 24). */
  trace: {
    rule: string
    axis?: RiskAxis
    exerciseRisk?: number
    maxAllowed?: number
    [key: string]: unknown
  }
}

const AXIS_LABEL: Record<RiskAxis, string> = {
  cervical: 'cervicales',
  lombaire: 'lombaires',
  coude: 'coudes',
  biceps: 'biceps',
  epaule: 'épaules',
  poignet: 'poignets',
  genou: 'genoux',
  hanche: 'hanches',
  fatigueSystemique: 'fatigue générale',
}

/** Trouve l'axe le plus violé par un exercice (le plus au-dessus du seuil). */
function worstViolation(
  risk: RiskProfile,
  constraints: PainConstraints,
): { axis: RiskAxis; risk: number; max: number } | null {
  let worst: { axis: RiskAxis; risk: number; max: number } | null = null
  for (const [axis, max] of Object.entries(constraints.maxRiskByAxis)) {
    const a = axis as RiskAxis
    const r = risk[a]
    if (r > (max as number)) {
      const over = r - (max as number)
      if (!worst || over > worst.risk - worst.max) worst = { axis: a, risk: r, max: max as number }
    }
  }
  return worst
}

/**
 * Décide de l'adaptation d'un exercice planifié face aux limitations actives.
 * Logique prudente :
 *  1. exercice compatible -> garder (éventuellement modifier si proche du seuil) ;
 *  2. incompatible -> tenter un remplacement par une alternative sûre ;
 *  3. aucune alternative sûre -> retirer l'exercice, avec justification.
 * Les exercices verrouillés ne sont jamais remplacés/retirés (seulement modifiés).
 */
export function adaptPlannedExercise(
  planned: PlannedExercise,
  exercise: Exercise,
  catalog: Exercise[],
  limitations: Limitation[],
  availableEquipment: Equipment[],
  level: 1 | 2 | 3 = 2,
): ExerciseAdaptation {
  const constraints = computePainConstraints(limitations)

  // Aucune contrainte articulaire : seule la fatigue systémique peut jouer.
  const violation = worstViolation(exercise.risk, constraints)

  if (!violation) {
    // Compatible. Petite modulation si fatigue systémique marquée.
    if (constraints.systemicVolumeMultiplier < 0.85 && planned.sets > 2) {
      return {
        action: 'modify',
        reason: 'Fatigue/récupération dégradée : une série retirée pour préserver la récupération.',
        setsDelta: -1,
        trace: { rule: 'systemic-fatigue', max: constraints.systemicVolumeMultiplier },
      }
    }
    return { action: 'keep', reason: 'Compatible avec ton état actuel.', setsDelta: 0, trace: { rule: 'ok' } }
  }

  const zone = AXIS_LABEL[violation.axis]

  if (planned.locked) {
    // Verrouillé : on ne remplace pas, on adoucit (amplitude/volume/charge).
    return {
      action: 'modify',
      reason: `Exercice verrouillé mais à risque pour les ${zone} : réduis l'amplitude, la charge et une série. Reste vigilant à la douleur.`,
      setsDelta: -1,
      intensityNote: 'Charge modérée, amplitude contrôlée, prise neutre si possible.',
      trace: { rule: 'locked-soften', axis: violation.axis, exerciseRisk: violation.risk, maxAllowed: violation.max },
    }
  }

  // Chercher une alternative sûre.
  const alts = findAlternatives(exercise, catalog, {
    constraints,
    availableEquipment,
    level,
    limit: 3,
  })
  const safeAlt = alts.find((a) => a.safe)

  if (safeAlt) {
    return {
      action: 'replace',
      reason: `Remplacé pour préserver les ${zone} : « ${exercise.nameFr} » sollicite trop cette zone (${violation.risk}/3 > seuil ${violation.max}). Alternative plus tolérante proposée.`,
      replacementId: safeAlt.exercise.id,
      setsDelta: 0,
      trace: { rule: 'replace-unsafe', axis: violation.axis, exerciseRisk: violation.risk, maxAllowed: violation.max },
    }
  }

  // Pas d'alternative : on retire l'exercice.
  return {
    action: 'remove',
    reason: `Retiré temporairement : « ${exercise.nameFr} » sollicite trop les ${zone} et aucune alternative sûre n'est disponible avec ton équipement.`,
    setsDelta: 0,
    trace: { rule: 'remove-unsafe', axis: violation.axis, exerciseRisk: violation.risk, maxAllowed: violation.max },
  }
}

export { satisfiesConstraints }
