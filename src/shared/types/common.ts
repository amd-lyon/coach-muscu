// Énumérations et constantes partagées par tout le domaine.
// Tout est typé en union de chaînes pour rester lisible en base et en JSON.

/** Groupes musculaires gérés par l'application. */
export const MUSCLE_GROUPS = [
  'pectoraux',
  'dos',
  'epaules',
  'biceps',
  'triceps',
  'avant-bras',
  'abdominaux',
  'fessiers',
  'quadriceps',
  'ischio-jambiers',
  'mollets',
  'chaine-posterieure',
  'gainage',
  'mobilite',
  'cardio',
] as const
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

/** Libellés français lisibles pour l'UI. */
export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  pectoraux: 'Pectoraux',
  dos: 'Dos',
  epaules: 'Épaules',
  biceps: 'Biceps',
  triceps: 'Triceps',
  'avant-bras': 'Avant-bras',
  abdominaux: 'Abdominaux',
  fessiers: 'Fessiers',
  quadriceps: 'Quadriceps',
  'ischio-jambiers': 'Ischio-jambiers',
  mollets: 'Mollets',
  'chaine-posterieure': 'Chaîne postérieure',
  gainage: 'Gainage',
  mobilite: 'Mobilité',
  cardio: 'Cardio',
}

/** Équipements disponibles (salle / maison). */
export const EQUIPMENT = [
  'machine-guidee',
  'poulie',
  'halteres',
  'barre',
  'banc',
  'smith-machine',
  'presse-cuisses',
  'hack-squat',
  'machine-convergente',
  'cage-squat',
  'poids-corps',
  'elastique',
  'kettlebell',
  'tapis',
  'velo',
  'velo-elliptique',
  'rameur',
  'stairmaster',
] as const
export type Equipment = (typeof EQUIPMENT)[number]

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  'machine-guidee': 'Machine guidée',
  poulie: 'Poulie',
  halteres: 'Haltères',
  barre: 'Barre',
  banc: 'Banc',
  'smith-machine': 'Smith machine',
  'presse-cuisses': 'Presse à cuisses',
  'hack-squat': 'Hack squat',
  'machine-convergente': 'Machine convergente',
  'cage-squat': 'Cage à squat',
  'poids-corps': 'Poids du corps',
  elastique: 'Élastique',
  kettlebell: 'Kettlebell',
  tapis: 'Tapis de course',
  velo: 'Vélo',
  'velo-elliptique': 'Vélo elliptique',
  rameur: 'Rameur',
  stairmaster: 'StairMaster / Escalier',
}

/** Objectif d'entraînement. */
export const OBJECTIVES = [
  'prise-de-masse',
  'hypertrophie',
  'recomposition',
  'perte-de-gras',
  'perte-de-poids',
  'maintien',
  'force',
  'condition-physique',
  'reprise',
] as const
export type Objective = (typeof OBJECTIVES)[number]

export const OBJECTIVE_LABELS: Record<Objective, string> = {
  'prise-de-masse': 'Prise de masse musculaire',
  hypertrophie: 'Hypertrophie',
  recomposition: 'Recomposition corporelle',
  'perte-de-gras': 'Perte de gras',
  'perte-de-poids': 'Perte de poids',
  maintien: 'Maintien de la masse musculaire',
  force: 'Amélioration de la force',
  'condition-physique': 'Condition physique générale',
  reprise: 'Reprise progressive',
}

export type ExperienceLevel = 'debutant' | 'intermediaire' | 'confirme'
export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  confirme: 'Confirmé',
}

export type ActivityLevel = 'sedentaire' | 'moderement-active' | 'physique'

/** Type de découpe hebdomadaire (split). */
export type SplitType = 'full-body' | 'upper-lower' | 'push-pull-legs' | 'half-body' | 'custom'
export const SPLIT_LABELS: Record<SplitType, string> = {
  'full-body': 'Full Body',
  'upper-lower': 'Upper / Lower',
  'push-pull-legs': 'Push / Pull / Legs',
  'half-body': 'Haut / Bas du corps',
  custom: 'Personnalisé',
}

/** Niveau de priorité d'un groupe musculaire dans un programme. */
export type Priority = 'faible' | 'normale' | 'elevee'

/** Mouvement polyarticulaire ou d'isolation. */
export type MovementType = 'polyarticulaire' | 'isolation'

/** Catégorie d'exercice (utile pour le filtrage et le PDF). */
export type ExerciseCategory =
  | 'pectoraux'
  | 'dos'
  | 'epaules'
  | 'bras'
  | 'jambes'
  | 'fessiers'
  | 'mollets'
  | 'abdominaux'
  | 'gainage'
  | 'mobilite'
  | 'cardio'

/**
 * Axes de risque articulaire/musculaire d'un exercice, notés 0 à 3.
 * 0 = aucun risque pour la zone · 3 = sollicitation/risque élevé.
 * C'est le socle de l'adaptation aux douleurs sans IA.
 */
export interface RiskProfile {
  cervical: 0 | 1 | 2 | 3
  lombaire: 0 | 1 | 2 | 3
  coude: 0 | 1 | 2 | 3
  biceps: 0 | 1 | 2 | 3
  epaule: 0 | 1 | 2 | 3
  poignet: 0 | 1 | 2 | 3
  genou: 0 | 1 | 2 | 3
  hanche: 0 | 1 | 2 | 3
  /** Coût de fatigue systémique (0 = nul, 3 = très exigeant — squat/SDT lourds). */
  fatigueSystemique: 0 | 1 | 2 | 3
}

export const ZERO_RISK: RiskProfile = {
  cervical: 0,
  lombaire: 0,
  coude: 0,
  biceps: 0,
  epaule: 0,
  poignet: 0,
  genou: 0,
  hanche: 0,
  fatigueSystemique: 0,
}
