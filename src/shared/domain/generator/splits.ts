import type { ExperienceLevel, MuscleGroup, SplitType } from '../../types/common'
import type { SessionFocus } from '../../types/program'

export interface SessionTemplate {
  focus: SessionFocus
  name: string
  /** Muscles ciblés dans l'ordre de priorité d'entraînement. */
  targetMuscles: MuscleGroup[]
}

const TEMPLATES: Record<SessionFocus, Omit<SessionTemplate, 'focus'>> = {
  'full-body': {
    name: 'Full Body',
    targetMuscles: [
      'quadriceps',
      'pectoraux',
      'dos',
      'ischio-jambiers',
      'epaules',
      'biceps',
      'triceps',
      'abdominaux',
    ],
  },
  upper: {
    name: 'Haut du corps',
    targetMuscles: ['pectoraux', 'dos', 'epaules', 'triceps', 'biceps', 'avant-bras'],
  },
  lower: {
    name: 'Bas du corps',
    targetMuscles: ['quadriceps', 'ischio-jambiers', 'fessiers', 'mollets', 'abdominaux'],
  },
  push: { name: 'Push (poussée)', targetMuscles: ['pectoraux', 'epaules', 'triceps'] },
  pull: { name: 'Pull (tirage)', targetMuscles: ['dos', 'biceps', 'avant-bras'] },
  legs: {
    name: 'Legs (jambes)',
    targetMuscles: ['quadriceps', 'ischio-jambiers', 'fessiers', 'mollets'],
  },
  cardio: { name: 'Cardio', targetMuscles: ['cardio'] },
  recuperation: { name: 'Récupération active', targetMuscles: ['mobilite', 'gainage'] },
}

/**
 * Choisit automatiquement le split en fonction de la fréquence et du niveau,
 * sauf si un split est imposé manuellement.
 */
export function chooseSplit(
  sessionsPerWeek: number,
  level: ExperienceLevel,
  preferred?: SplitType,
): SplitType {
  if (preferred && preferred !== 'custom') return preferred
  switch (sessionsPerWeek) {
    case 2:
      return 'full-body'
    case 3:
      return level === 'debutant' ? 'full-body' : 'push-pull-legs'
    case 4:
      return 'upper-lower'
    case 5:
    case 6:
      return 'push-pull-legs'
    default:
      return 'full-body'
  }
}

/**
 * Construit la liste ordonnée des séances d'une semaine pour un split donné.
 * Le nombre de séances effectives correspond à sessionsPerWeek.
 */
export function buildWeekSessions(split: SplitType, sessionsPerWeek: number): SessionTemplate[] {
  const focusOrder = sessionPattern(split, sessionsPerWeek)
  return focusOrder.map((focus) => ({ focus, ...TEMPLATES[focus] }))
}

function sessionPattern(split: SplitType, n: number): SessionFocus[] {
  switch (split) {
    case 'full-body':
      return Array.from({ length: n }, () => 'full-body' as SessionFocus)
    case 'half-body': {
      const pat: SessionFocus[] = []
      for (let i = 0; i < n; i++) pat.push(i % 2 === 0 ? 'upper' : 'lower')
      return pat
    }
    case 'upper-lower': {
      const pat: SessionFocus[] = []
      for (let i = 0; i < n; i++) pat.push(i % 2 === 0 ? 'upper' : 'lower')
      return pat
    }
    case 'push-pull-legs': {
      const cycle: SessionFocus[] = ['push', 'pull', 'legs']
      const pat: SessionFocus[] = []
      for (let i = 0; i < n; i++) pat.push(cycle[i % 3])
      return pat
    }
    default:
      return Array.from({ length: n }, () => 'full-body' as SessionFocus)
  }
}

export { TEMPLATES as SESSION_TEMPLATES }
